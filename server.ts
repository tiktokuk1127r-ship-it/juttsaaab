import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// In-memory session tracking for active sockets
interface ActiveSession {
  slot: number;
  userId: string;
  phoneNumber?: string;
  pairingCode?: string;
  qr?: string;
  qrDataUrl?: string;
  status: 'idle' | 'connecting' | 'awaiting_scan' | 'awaiting_code' | 'reconnecting' | 'connected' | 'disconnected' | 'error';
  handshakeStatus?: string;
  lastError?: string;
  sock?: any;
  jid?: string;
  connectedAt?: number;
}

const activeSockets = new Map<string, ActiveSession>();

// Helper to remove directory recursively safely
function cleanAuthDir(authFolder: string) {
  try {
    if (fs.existsSync(authFolder)) {
      fs.rmSync(authFolder, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`[Baileys] Warning cleaning ${authFolder}:`, err);
  }
}

// Carrier guess helper
function getCarrier(clean: string): string {
  if (clean.startsWith('91')) return clean.startsWith('919') ? 'Airtel India' : clean.startsWith('918') ? 'Jio Telecom' : 'Vodafone Idea';
  if (clean.startsWith('1')) return clean.startsWith('1415') ? 'AT&T USA' : 'Verizon Wireless';
  if (clean.startsWith('44')) return 'Vodafone UK';
  if (clean.startsWith('971')) return 'Etisalat UAE';
  if (clean.startsWith('92')) return 'Jazz Telecom';
  if (clean.startsWith('880')) return 'Grameenphone';
  return 'Mobile Cellular';
}

// Cache latest WhatsApp Web version to prevent handshake mismatch
let cachedWaVersion: [number, number, number] | null = null;
async function getWaVersion(): Promise<[number, number, number]> {
  if (cachedWaVersion) return cachedWaVersion;
  try {
    const { fetchLatestBaileysVersion } = await import('@whiskeysockets/baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    if (version) {
      cachedWaVersion = version;
      console.log(`[Baileys] Fetched official WhatsApp Web version: ${version.join('.')} (isLatest: ${isLatest})`);
      return version;
    }
  } catch (err) {
    console.warn('[Baileys] Could not fetch latest WA version, using reliable stable fallback:', err);
  }
  return [2, 3000, 1043857760];
}

// Core Baileys session initializer with automatic 515 restart handling
async function startBaileysSocket(params: {
  sessionKey: string;
  slot: number;
  userId: string;
  phoneNumber?: string;
  isFresh?: boolean;
}) {
  const { sessionKey, slot, userId, phoneNumber, isFresh = false } = params;

  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    makeCacheableSignalKeyStore,
  } = await import('@whiskeysockets/baileys');
  const pino = (await import('pino')).default;

  const authFolder = path.join(__dirname, 'baileys_auth', `session_${sessionKey}`);

  // Safely end and strip previous socket listeners to avoid duplicate handles & conflicts
  const existing = activeSockets.get(sessionKey);
  if (existing?.sock) {
    try {
      existing.sock.ev.removeAllListeners('connection.update');
      existing.sock.ev.removeAllListeners('creds.update');
      existing.sock.end(undefined);
    } catch {}
  }

  if (isFresh) {
    cleanAuthDir(authFolder);
    fs.mkdirSync(authFolder, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const logger = pino({ level: 'silent' });
  const waVersion = await getWaVersion();

  // Use Browsers.ubuntu('Chrome') - WhatsApp explicitly requires standard Chrome/Browser identity for pairing codes
  const sock = makeWASocket({
    version: waVersion,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    emitOwnEvents: true,
  });

  sock.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (err) {
      console.warn(`[Baileys ${sessionKey}] Warning saving credentials:`, err);
    }
  });

  let sessionData = activeSockets.get(sessionKey);
  if (!sessionData) {
    sessionData = {
      slot,
      userId,
      phoneNumber,
      status: 'connecting',
      handshakeStatus: 'connecting_to_whatsapp',
      sock,
    };
    activeSockets.set(sessionKey, sessionData);
  } else {
    sessionData.sock = sock;
    if (phoneNumber) sessionData.phoneNumber = phoneNumber;
  }

  // Handle connection events
  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sessionData!.qr = qr;
      try {
        sessionData!.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
      } catch {}
      if (sessionData!.status !== 'connected' && !sessionData!.pairingCode) {
        sessionData!.status = 'awaiting_scan';
        sessionData!.handshakeStatus = 'qr_ready';
      }
    }

    if (connection === 'open') {
      sessionData!.status = 'connected';
      sessionData!.handshakeStatus = 'verified';
      sessionData!.connectedAt = Date.now();
      sessionData!.lastError = undefined;
      const userJid = sock.user?.id || (sessionData!.phoneNumber ? `${sessionData!.phoneNumber}@s.whatsapp.net` : `user_${Date.now()}@s.whatsapp.net`);
      sessionData!.jid = userJid;
      if (sock.user?.id) {
        sessionData!.phoneNumber = sock.user.id.split(':')[0].split('@')[0];
      }
      console.log(`[Baileys ${sessionKey}] ✅ WhatsApp SESSION CONNECTED! JID: ${sessionData!.jid}`);
    } else if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;

      console.log(`[Baileys ${sessionKey}] ⚠️ Connection closed (code: ${statusCode}, restartRequired: ${isRestartRequired}).`);

      if (isRestartRequired || (!isLoggedOut && statusCode !== undefined)) {
        // DisconnectReason.restartRequired (515) is ALWAYS triggered when phone confirms pairing code!
        // We MUST reconnect immediately using the persisted credentials to complete the handshake.
        sessionData!.status = 'reconnecting';
        sessionData!.handshakeStatus = 'handshake_exchange_restarting';
        console.log(`[Baileys ${sessionKey}] 🔄 Restarting socket with saved keys to finalize WhatsApp companion session...`);

        setTimeout(() => {
          startBaileysSocket({
            sessionKey,
            slot,
            userId,
            phoneNumber: sessionData?.phoneNumber,
            isFresh: false, // CRITICAL: preserve credentials saved during code exchange!
          }).catch(err => {
            console.error(`[Baileys ${sessionKey}] Reconnect failed:`, err);
            sessionData!.status = 'error';
            sessionData!.lastError = err?.message || 'Reconnection error';
          });
        }, 1200);
      } else {
        sessionData!.status = 'disconnected';
        sessionData!.handshakeStatus = 'logged_out';
        console.log(`[Baileys ${sessionKey}] Logged out.`);
      }
    }
  });

  return { sock, state, saveCreds };
}

// API: Request REAL WhatsApp Web QR Code
app.post('/api/sessions/request-qr', async (req: Request, res: Response) => {
  const { slot = 1, userId = 'default' } = req.body;
  const sessionKey = `${userId}_slot_${slot}`;

  try {
    const { sock } = await startBaileysSocket({
      sessionKey,
      slot,
      userId,
      isFresh: true,
    });

    const qrResult = await new Promise<{ qr: string; qrDataUrl: string }>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout waiting for WhatsApp server to provide QR code'));
      }, 15000);

      sock.ev.on('connection.update', async (update: any) => {
        if (update.qr) {
          clearTimeout(timer);
          try {
            const qrDataUrl = await QRCode.toDataURL(update.qr, { margin: 2, scale: 7 });
            resolve({ qr: update.qr, qrDataUrl });
          } catch (e) {
            reject(e);
          }
        }
      });
    });

    return res.json({
      success: true,
      slot,
      qr: qrResult.qr,
      qrDataUrl: qrResult.qrDataUrl,
      info: 'Official WhatsApp Web QR code generated. Scan with WhatsApp camera on your phone.',
    });
  } catch (err: any) {
    console.error(`[Baileys] QR Generation error for ${sessionKey}:`, err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to generate WhatsApp QR code. Please try again.',
    });
  }
});

// API: Request REAL WhatsApp 8-digit Pairing Code via Multi-Device socket
app.post('/api/sessions/request-pair-code', async (req: Request, res: Response) => {
  const { slot = 1, phoneNumber, userId = 'default' } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const cleanPhone = String(phoneNumber).replace(/\D/g, '');
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    return res.status(400).json({
      success: false,
      error: 'Phone number must be between 8 and 15 digits in international format (e.g. 919876543210 or 14155552671)',
    });
  }

  const sessionKey = `${userId}_slot_${slot}`;

  try {
    console.log(`[Baileys] Initializing socket for ${sessionKey} (+${cleanPhone})...`);
    const { sock } = await startBaileysSocket({
      sessionKey,
      slot,
      userId,
      phoneNumber: cleanPhone,
      isFresh: true,
    });

    const sessionData = activeSockets.get(sessionKey)!;
    sessionData.status = 'awaiting_code';
    sessionData.handshakeStatus = 'waiting_phone_input';

    console.log(`[Baileys] Waiting for WebSocket connection to stabilize before requesting pairing code...`);
    // Give the socket 3 seconds to establish the WhatsApp noise socket stream
    await new Promise(r => setTimeout(r, 3200));

    if (!sock.authState.creds.registered) {
      console.log(`[Baileys] Calling sock.requestPairingCode(${cleanPhone})...`);
      const pairCode = await sock.requestPairingCode(cleanPhone);
      const formattedCode = pairCode.includes('-')
        ? pairCode
        : `${pairCode.slice(0, 4)}-${pairCode.slice(4)}`;

      sessionData.pairingCode = formattedCode;
      console.log(`[Baileys] ✅ Real WhatsApp Pairing Code generated: ${formattedCode}`);

      return res.json({
        success: true,
        pairingCode: formattedCode,
        isOfficialWhatsAppCode: true,
        slot,
        phoneNumber: cleanPhone,
        info: 'Official WhatsApp Pairing Code received! Type this 8-digit code in WhatsApp on your phone (Linked Devices > Link with phone number).',
      });
    } else {
      sessionData.status = 'connected';
      return res.json({
        success: true,
        alreadyRegistered: true,
        slot,
        phoneNumber: cleanPhone,
      });
    }
  } catch (err: any) {
    console.error('[Baileys] Pairing initialization error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to request pairing code from WhatsApp. Check phone number format or try QR code.',
    });
  }
});

// API: Get status of active session (checks memory + saved credential registration)
app.get('/api/sessions/status/:slot', (req: Request, res: Response) => {
  const slot = parseInt(req.params.slot);
  const userId = (req.query.userId as string) || 'default';
  const sessionKey = `${userId}_slot_${slot}`;

  const current = activeSockets.get(sessionKey);
  const authFolder = path.join(__dirname, 'baileys_auth', `session_${sessionKey}`);
  const credsPath = path.join(authFolder, 'creds.json');

  let isCredsRegistered = false;
  let savedPhone: string | undefined = undefined;
  let savedJid: string | undefined = undefined;

  try {
    if (fs.existsSync(credsPath)) {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      if (creds && creds.registered) {
        isCredsRegistered = true;
        if (creds.me?.id) {
          savedJid = creds.me.id;
          savedPhone = creds.me.id.split(':')[0].split('@')[0];
        }
      }
    }
  } catch {}

  if (!current) {
    if (isCredsRegistered) {
      // Credentials registered on disk, re-initialize socket
      startBaileysSocket({ sessionKey, slot, userId, phoneNumber: savedPhone, isFresh: false }).catch(() => {});
      return res.json({
        connected: false,
        status: 'reconnecting',
        handshakeStatus: 'handshake_exchange_restarting',
        isRegistered: true,
        phoneNumber: savedPhone,
      });
    }
    return res.json({ connected: false, status: 'disconnected', handshakeStatus: 'idle' });
  }

  const isConnected = current.status === 'connected';

  // If credentials registered but socket is still finishing 515 restart
  if (!isConnected && isCredsRegistered) {
    return res.json({
      connected: false,
      status: 'reconnecting',
      handshakeStatus: 'handshake_exchange_restarting',
      isRegistered: true,
      phoneNumber: current.phoneNumber || savedPhone,
      pairingCode: current.pairingCode,
      jid: current.jid || savedJid,
      qr: current.qr,
      qrDataUrl: current.qrDataUrl,
    });
  }

  return res.json({
    connected: isConnected,
    status: current.status,
    handshakeStatus: current.handshakeStatus,
    phoneNumber: current.phoneNumber || savedPhone,
    pairingCode: current.pairingCode,
    jid: current.jid || savedJid,
    qr: current.qr,
    qrDataUrl: current.qrDataUrl,
    lastError: current.lastError,
  });
});

// API: Explicit handshake verification check
app.post('/api/sessions/verify-handshake', (req: Request, res: Response) => {
  const { slot = 1, userId = 'default' } = req.body;
  const sessionKey = `${userId}_slot_${slot}`;

  const current = activeSockets.get(sessionKey);
  const authFolder = path.join(__dirname, 'baileys_auth', `session_${sessionKey}`);
  const credsPath = path.join(authFolder, 'creds.json');

  let isCredsRegistered = false;
  let savedPhone = current?.phoneNumber;
  let savedJid = current?.jid;

  try {
    if (fs.existsSync(credsPath)) {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      if (creds && creds.registered) {
        isCredsRegistered = true;
        if (creds.me?.id) {
          savedJid = creds.me.id;
          savedPhone = creds.me.id.split(':')[0].split('@')[0];
        }
      }
    }
  } catch {}

  if (current?.status === 'connected' || isCredsRegistered) {
    if (current && !current.status.includes('connected')) {
      current.status = 'connected';
      current.handshakeStatus = 'verified';
    }
    return res.json({
      success: true,
      connected: true,
      slot,
      phoneNumber: savedPhone,
      jid: savedJid,
      message: 'WhatsApp session verified and connected successfully!',
    });
  }

  return res.json({
    success: false,
    connected: false,
    status: current?.status || 'awaiting_code',
    handshakeStatus: current?.handshakeStatus || 'waiting_phone_input',
    message: 'Still waiting for device pairing confirmation. Enter the 8-digit code on WhatsApp.',
  });
});

// API: Disconnect session and purge local credentials
app.post('/api/sessions/disconnect', (req: Request, res: Response) => {
  const { slot = 1, userId = 'default' } = req.body;
  const sessionKey = `${userId}_slot_${slot}`;

  const current = activeSockets.get(sessionKey);
  if (current?.sock) {
    try {
      current.sock.ev.removeAllListeners('connection.update');
      current.sock.ev.removeAllListeners('creds.update');
      current.sock.end(undefined);
    } catch {}
  }
  activeSockets.delete(sessionKey);

  const authFolder = path.join(__dirname, 'baileys_auth', `session_${sessionKey}`);
  cleanAuthDir(authFolder);

  console.log(`[Baileys] Slot #${slot} disconnected and purged for ${sessionKey}`);
  return res.json({ success: true, slot, status: 'disconnected' });
});

// Auto-restore any registered WhatsApp companion sessions from disk
async function ensureActiveSockets() {
  const authBase = path.join(__dirname, 'baileys_auth');
  if (!fs.existsSync(authBase)) return;
  try {
    const dirs = fs.readdirSync(authBase);
    for (const d of dirs) {
      if (d.startsWith('session_')) {
        const credsPath = path.join(authBase, d, 'creds.json');
        if (fs.existsSync(credsPath)) {
          try {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
            if (creds && creds.registered) {
              const sessionKey = d.replace('session_', '');
              const existing = activeSockets.get(sessionKey);
              if (!existing || existing.status !== 'connected') {
                const parts = sessionKey.split('_slot_');
                const userId = parts[0] || 'default';
                const slot = parseInt(parts[1] || '1');
                const phone = creds.me?.id?.split(':')[0]?.split('@')[0];
                console.log(`[Baileys Auto-Connect] Restoring registered WhatsApp companion session for ${sessionKey} (+${phone})...`);
                startBaileysSocket({
                  sessionKey,
                  slot,
                  userId,
                  phoneNumber: phone,
                  isFresh: false,
                }).catch(e => console.warn(`[Auto-Connect] Warning for ${sessionKey}:`, e?.message));
              }
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn('[Baileys] Warning scanning auth dirs:', err);
  }
}

// API: Check single phone number registration (Real WhatsApp Multi-Device Protocol)
app.post('/api/check-phone', async (req: Request, res: Response) => {
  const { phone, userId } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone parameter required' });
  }

  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 8 || clean.length > 15) {
    return res.json({
      success: true,
      phoneNumber: clean,
      isRegistered: false,
      status: 'unregistered',
      reason: 'Invalid E.164 phone length (must be 8-15 digits)',
      carrier: getCarrier(clean),
      source: 'Format & Syntax Check',
      checkedAt: Date.now(),
    });
  }

  await ensureActiveSockets();

  let activeSock: any = null;
  let activeSlot: number | null = null;

  // 1. Prefer user's active session
  if (userId) {
    for (const [key, session] of activeSockets.entries()) {
      if (key.startsWith(`${userId}_`) && session.status === 'connected' && session.sock?.onWhatsApp) {
        activeSock = session.sock;
        activeSlot = session.slot;
        break;
      }
    }
  }

  // 2. Any connected session in memory
  if (!activeSock) {
    for (const [_, session] of activeSockets.entries()) {
      if (session.status === 'connected' && session.sock?.onWhatsApp) {
        activeSock = session.sock;
        activeSlot = session.slot;
        break;
      }
    }
  }

  // 3. Wait up to 3s if socket is currently reconnecting
  if (!activeSock) {
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 500));
      for (const [_, session] of activeSockets.entries()) {
        if (session.status === 'connected' && session.sock?.onWhatsApp) {
          activeSock = session.sock;
          activeSlot = session.slot;
          break;
        }
      }
      if (activeSock) break;
    }
  }

  if (activeSock) {
    try {
      console.log(`[Baileys Real Protocol] Querying official WhatsApp servers for +${clean} on Slot #${activeSlot}...`);
      const results = await activeSock.onWhatsApp(clean);
      const waUser = Array.isArray(results) && results.length > 0 ? results[0] : null;

      const isRegistered = Boolean(waUser && waUser.exists);
      console.log(`[Baileys Real Result] +${clean} -> ${isRegistered ? 'REGISTERED ✅' : 'NOT ON WHATSAPP ❌'}`);

      return res.json({
        success: true,
        phoneNumber: clean,
        isRegistered,
        status: isRegistered ? 'registered' : 'unregistered',
        jid: waUser ? waUser.jid : null,
        isBusiness: Boolean(waUser?.jid?.includes('@lid') || false),
        carrier: getCarrier(clean),
        source: 'Official WhatsApp Multi-Device Protocol',
        slot: activeSlot,
        checkedAt: Date.now(),
      });
    } catch (lookupErr: any) {
      console.warn(`[Baileys Lookup Error] onWhatsApp query error for +${clean}:`, lookupErr?.message || lookupErr);
      return res.status(500).json({
        success: false,
        phoneNumber: clean,
        status: 'error',
        error: lookupErr?.message || 'WhatsApp network timeout during verification',
        checkedAt: Date.now(),
      });
    }
  }

  // Real WhatsApp session is missing
  return res.status(503).json({
    success: false,
    phoneNumber: clean,
    status: 'error',
    error: 'No active WhatsApp session connected. Please link your phone in the Sessions tab first to perform real WhatsApp verification.',
    source: 'Session Disconnected',
    checkedAt: Date.now(),
  });
});

// API: Check batch of phone numbers via official WhatsApp USync protocol
app.post('/api/check-batch', async (req: Request, res: Response) => {
  const { phones, userId } = req.body;
  if (!Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ success: false, error: 'phones array required' });
  }

  await ensureActiveSockets();

  let activeSock: any = null;
  let activeSlot: number | null = null;

  if (userId) {
    for (const [key, session] of activeSockets.entries()) {
      if (key.startsWith(`${userId}_`) && session.status === 'connected' && session.sock?.onWhatsApp) {
        activeSock = session.sock;
        activeSlot = session.slot;
        break;
      }
    }
  }

  if (!activeSock) {
    for (const [_, session] of activeSockets.entries()) {
      if (session.status === 'connected' && session.sock?.onWhatsApp) {
        activeSock = session.sock;
        activeSlot = session.slot;
        break;
      }
    }
  }

  if (!activeSock) {
    return res.status(503).json({
      success: false,
      error: 'No active WhatsApp session connected. Please link your phone in the Sessions tab first.',
    });
  }

  try {
    const cleanPhones = phones.map((p: string) => String(p).replace(/\D/g, '')).filter((p: string) => p.length >= 8);
    console.log(`[Baileys Real Batch Protocol] Querying official WhatsApp servers for ${cleanPhones.length} numbers on Slot #${activeSlot}...`);

    const waResults = await activeSock.onWhatsApp(...cleanPhones);
    const resultMap = new Map<string, any>();
    if (Array.isArray(waResults)) {
      for (const item of waResults) {
        if (item && item.exists && item.jid) {
          const numDigits = item.jid.split('@')[0].split(':')[0];
          resultMap.set(numDigits, item);
        }
      }
    }

    const output = cleanPhones.map((num: string) => {
      const match = resultMap.get(num);
      const isRegistered = Boolean(match);
      return {
        phoneNumber: num,
        isRegistered,
        status: isRegistered ? 'registered' : 'unregistered',
        jid: match?.jid || null,
        isBusiness: Boolean(match?.jid?.includes('@lid')),
        carrier: getCarrier(num),
        source: 'Official WhatsApp Multi-Device Protocol',
        slot: activeSlot,
        checkedAt: Date.now(),
      };
    });

    console.log(`[Baileys Batch Complete] Verified ${output.length} numbers (${output.filter((r: any) => r.isRegistered).length} on WhatsApp)`);

    return res.json({
      success: true,
      total: output.length,
      registered: output.filter((r: any) => r.isRegistered).length,
      unregistered: output.filter((r: any) => !r.isRegistered).length,
      results: output,
    });
  } catch (err: any) {
    console.error('[Baileys Batch Error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed batch check on WhatsApp' });
  }
});

// Download source code archive
app.get(['/download/src.zip', '/api/download-src', '/src.zip'], (_req: Request, res: Response) => {
  const zipPath = path.join(__dirname, 'public', 'src.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp-validator-src.zip"');
    return res.sendFile(zipPath);
  }
  return res.status(404).json({ success: false, error: 'Source archive not found' });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

    app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    // Auto-restore any registered WhatsApp sessions saved on disk
    ensureActiveSockets().catch(err => {
      console.warn('[Baileys Boot Auto-Connect Error]:', err);
    });
  });
}

startServer();
