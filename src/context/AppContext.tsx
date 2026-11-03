import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  WhatsAppSession,
  CheckResult,
  JobState,
  AppConfig,
  AuthUser,
  AccessRequest,
  LogEntry,
  UserRole,
  NumberStatus,
  Campaign,
  MessageTemplate,
} from '../types';
import { parseBatchNumbers, normalizePhoneNumber, generateSampleNumbers, detectCountryCode } from '../utils/phone';
import { soundFx } from '../utils/audio';

const STORAGE_KEY_RESULTS = 'wa_checker_results_v3';
const STORAGE_KEY_QUEUE = 'wa_checker_queue_v3';
const STORAGE_KEY_CONFIG = 'wa_checker_config_v3';
const STORAGE_KEY_USERS = 'wa_checker_users_v3';
const STORAGE_KEY_CURRENT_USER = 'wa_checker_current_user_v3';
const STORAGE_KEY_CAMPAIGNS = 'wa_checker_campaigns_v3';
const STORAGE_KEY_TEMPLATES = 'wa_checker_templates_v3';

const DEFAULT_CONFIG: AppConfig = {
  minDelay: 4,
  maxDelay: 8,
  maxPerRun: 5000,
  defaultCountryCode: '1',
  acceptRequests: true,
  soundEnabled: true,
  soundTheme: 'crisp',
  waSlots: 2,
  maintenance: {
    on: false,
    message: 'System upgrade in progress. Normal checks will resume shortly.',
    since: 0,
  },
  memberDefaults: {
    dailyLimit: 200,
    maxPerRun: 100,
    maxQueue: 2000,
  },
  requireApprovalForNewUsers: true,
  webhookUrl: 'https://api.wachecker.pro/v1/webhook',
};

const INITIAL_USERS: AuthUser[] = [
  {
    id: 'usr_owner_root',
    name: 'Chief Administrator (Owner)',
    username: 'exsuzume',
    email: 'exsuzume@gmail.com',
    password: 'EGOSRT',
    role: 'owner',
    dailyLimit: 0, // unlimited
    usedToday: 320,
    totalChecked: 28400,
    maxPerRun: 10000,
    expiresAt: 0, // no expiry
    isBanned: false,
    joinedAt: Date.now() - 90 * 86400 * 1000,
    apiKey: 'wac_live_99a81f3d4e07b2c8e1a4d9c72e4b',
  },
  {
    id: 'usr_admin_ops',
    name: 'Elena Rostova (Operations)',
    username: 'elena_admin',
    email: 'admin@wachecker.pro',
    password: 'AdminPass123',
    role: 'admin',
    dailyLimit: 0,
    usedToday: 180,
    totalChecked: 14200,
    maxPerRun: 5000,
    expiresAt: 0,
    isBanned: false,
    joinedAt: Date.now() - 45 * 86400 * 1000,
    apiKey: 'wac_live_12c77d94e803a1f9e2b5c81d0f',
  },
  {
    id: 'usr_member_alex',
    name: 'Alex Rivera (Growth)',
    username: 'alex_outreach',
    email: 'alex.r@apextech.com',
    password: 'MemberPass123',
    role: 'member',
    dailyLimit: 250,
    usedToday: 42,
    totalChecked: 2150,
    maxPerRun: 150,
    expiresAt: Date.now() + 25 * 86400 * 1000,
    isBanned: false,
    joinedAt: Date.now() - 14 * 86400 * 1000,
    apiKey: 'wac_live_77b31e9a2f44c8d1a0e9b63c45',
  },
  {
    id: 'usr_member_sarah',
    name: 'Sarah Jenkins (E-Commerce)',
    username: 'sarah_growth',
    email: 'sarah@velocitylead.io',
    password: 'SarahPass123',
    role: 'member',
    dailyLimit: 500,
    usedToday: 189,
    totalChecked: 5200,
    maxPerRun: 250,
    expiresAt: Date.now() + 18 * 86400 * 1000,
    isBanned: false,
    joinedAt: Date.now() - 20 * 86400 * 1000,
    apiKey: 'wac_live_55f24a1b8c93d7e0f4a2b16e88',
  },
];

const INITIAL_REQUESTS: AccessRequest[] = [
  {
    id: 'req_98124',
    name: 'Marcus Brody',
    username: 'mbrody_crm',
    email: 'marcus@brodymarketing.com',
    requestedAt: Date.now() - 3600 * 1000 * 4,
    note: 'Wholesale B2B distributor client directory verification',
  },
];

const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: 'cmp_all', name: 'General Inbound Queue', tag: 'GENERAL', createdAt: Date.now() - 86400000 * 3, color: 'emerald' },
  { id: 'cmp_us_b2b', name: 'US B2B Technology Leads', tag: 'US-TECH', createdAt: Date.now() - 86400000 * 2, color: 'blue' },
  { id: 'cmp_latam_ecom', name: 'LATAM WhatsApp Buyers', tag: 'LATAM', createdAt: Date.now() - 86400000, color: 'amber' },
];

const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_1',
    title: 'Warm Welcome & Offer',
    category: 'onboarding',
    body: 'Hello {name}! 👋 Thank you for connecting with us. Here is your exclusive 20% discount code: WELCOME20.',
  },
  {
    id: 'tmpl_2',
    title: 'Order Status Notification',
    category: 'reminder',
    body: 'Hi {name}, your recent request has been verified and processed! Track your updates directly on our portal.',
  },
  {
    id: 'tmpl_3',
    title: 'VIP Invitation',
    category: 'promo',
    body: 'Exclusive invite for {phone}: Access early beta features and high-throughput WhatsApp marketing tools today.',
  },
];

interface AppContextType {
  config: AppConfig;
  updateConfig: (patch: Partial<AppConfig>) => void;
  // Auth & Roles
  currentUser: AuthUser | null;
  allUsers: AuthUser[];
  signIn: (emailOrUsername: string, password?: string, roleHint?: UserRole) => { success: boolean; message: string };
  signUp: (name: string, email: string, username: string, password?: string, targetRole?: UserRole) => { success: boolean; message: string };
  signOut: () => void;
  switchAccount: (userId: string) => void;
  regenerateApiKey: (userId: string) => string;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateUserQuota: (userId: string, delta: number) => void;
  updateUserDailyLimit: (userId: string, limit: number) => void;
  updateUserPassword: (userId: string, newPassword: string) => void;
  setUserUnlimitedQuota: (userId: string) => void;
  extendUserValidity: (userId: string, days: number) => void;
  toggleUserBan: (userId: string) => void;
  deleteUser: (userId: string) => void;
  approveUser: (userId: string) => void;
  rejectUser: (userId: string) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signin' | 'signup' | 'profile';
  setAuthModalMode: (mode: 'signin' | 'signup' | 'profile') => void;
  // Sessions (User-isolated)
  sessions: WhatsAppSession[];
  allSessions: WhatsAppSession[];
  readySessionsCount: number;
  addSessionSlot: () => void;
  removeSessionSlot: (slot: number) => void;
  resetSession: (slot: number) => void;
  generatePairingCode: (slot: number, phone: string) => Promise<string>;
  simulateConnect: (slot: number, customNumber?: string) => void;
  simulateDisconnect: (slot: number) => void;
  // Queue & Range Generator
  queue: string[];
  addNumbersToQueue: (rawText: string, campaignId?: string) => { added: number; skipped: number };
  clearQueue: () => void;
  removeQueueItem: (index: number) => void;
  seedDemoQueue: (count?: number) => void;
  generateNumberRange: (countryCode: string, areaCode: string, startNumber: string, count: number) => number;
  // Results & Audit
  results: CheckResult[];
  lastRunResults: CheckResult[];
  clearResults: () => void;
  retryErrors: () => number;
  // Engine
  job: JobState;
  startJob: () => string | null;
  pauseJob: () => void;
  resumeJob: () => void;
  stopJob: () => void;
  isLiveModalOpen: boolean;
  setIsLiveModalOpen: (open: boolean) => void;
  // Access Requests & Global Broadcast
  pendingRequests: AccessRequest[];
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  blockRequest: (id: string) => void;
  broadcastMessage: string | null;
  setBroadcastMessage: (msg: string | null) => void;
  // Campaigns & Templates
  campaigns: Campaign[];
  activeCampaignId: string;
  setActiveCampaignId: (id: string) => void;
  createCampaign: (name: string, tag: string, color?: string) => Campaign;
  templates: MessageTemplate[];
  addTemplate: (title: string, body: string, category: MessageTemplate['category']) => void;
  deleteTemplate: (id: string) => void;
  // Single probe & Logs
  singleCheck: (phone: string) => Promise<CheckResult>;
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string) => void;
  clearLogs: () => void;
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Config state
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const updateConfig = (patch: Partial<AppConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    soundFx.enabled = config.soundEnabled;
  }, [config.soundEnabled]);

  // All registered accounts
  const [allUsers, setAllUsers] = useState<AuthUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Theme state (defaults to light for pristine white aesthetic)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('wa_checker_theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wa_checker_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Current authenticated user (null when logged out to enforce gatekeeping)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'profile'>('signin');

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
      return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
    } catch {
      return INITIAL_CAMPAIGNS;
    }
  });
  const [activeCampaignId, setActiveCampaignId] = useState<string>('cmp_all');

  // Message templates
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
    } catch {
      return INITIAL_TEMPLATES;
    }
  });

  // Storage key for multi-user sessions
  const STORAGE_KEY_SESSIONS = 'wa_checker_multi_sessions_v3';

  // Master sessions pool (contains all instances across all users with user IDs)
  const [allSessions, setAllSessions] = useState<WhatsAppSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed: WhatsAppSession[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(s => ({
            ...s,
            userId: s.userId || 'usr_owner_root',
            userEmail: s.userEmail || (s.userId === 'usr_owner_root' ? 'exsuzume@gmail.com' : undefined),
          }));
        }
      }
    } catch {}
    return [
      {
        slot: 1,
        userId: 'usr_owner_root',
        userEmail: 'exsuzume@gmail.com',
        status: 'ready',
        phoneNumber: '14155552671',
        jid: '14155552671@s.whatsapp.net',
        qrGeneratedAt: Date.now() - 3600000,
        checksCount: 312,
        isBusy: false,
        connectedSince: Date.now() - 3600000 * 4,
        batteryLevel: 94,
        platform: 'WhatsApp Multi-Device Web (Chrome)',
      },
      {
        slot: 2,
        userId: 'usr_owner_root',
        userEmail: 'exsuzume@gmail.com',
        status: 'ready',
        phoneNumber: '447911123456',
        jid: '447911123456@s.whatsapp.net',
        qrGeneratedAt: Date.now() - 1800000,
        checksCount: 228,
        isBusy: false,
        connectedSince: Date.now() - 3600000 * 2,
        batteryLevel: 88,
        platform: 'WhatsApp Multi-Device Web (macOS)',
      },
    ];
  });

  // Automatically persist all sessions to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(allSessions));
    } catch {}
  }, [allSessions]);

  // Ensure current logged-in user always has their own private session slot initialized
  useEffect(() => {
    if (currentUser) {
      setAllSessions(prev => {
        const hasSession = prev.some(s => s.userId === currentUser.id);
        if (!hasSession) {
          const initSlot: WhatsAppSession = {
            slot: 1,
            userId: currentUser.id,
            userEmail: currentUser.email,
            status: 'qr',
            qrGeneratedAt: Date.now(),
            checksCount: 0,
            isBusy: false,
            batteryLevel: 94,
            platform: 'WhatsApp Multi-Device Web',
          };
          return [...prev, initSlot];
        }
        return prev;
      });
    }
  }, [currentUser?.id, currentUser?.email]);

  // Synchronize real backend WhatsApp session state on mount / account switch
  useEffect(() => {
    if (!currentUser) return;
    const activeUserId = currentUser.id;

    const checkSlots = async () => {
      for (const slot of [1, 2, 3]) {
        try {
          const res = await fetch(`/api/sessions/status/${slot}?userId=${activeUserId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.connected || data.isRegistered) {
              setAllSessions(prev =>
                prev.map(s =>
                  s.userId === activeUserId && s.slot === slot
                    ? {
                        ...s,
                        status: 'ready',
                        phoneNumber: data.phoneNumber || s.phoneNumber,
                        jid: data.jid || s.jid,
                        pairingCode: undefined,
                        platform: 'WhatsApp Multi-Device Web (Live Protocol)',
                      }
                    : s
                )
              );
            }
          }
        } catch {}
      }
    };

    checkSlots();
  }, [currentUser?.id]);

  // Strictly user-isolated sessions view: Each user only sees and interacts with their OWN linked sessions!
  const sessions = useMemo(() => {
    const activeUserId = currentUser?.id || 'usr_owner_root';
    return allSessions.filter(s => s.userId === activeUserId);
  }, [allSessions, currentUser?.id]);

  const readySessionsCount = sessions.filter(s => s.status === 'ready').length;

  // Queue state
  const [queue, setQueue] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUEUE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return generateSampleNumbers(35, '1');
  });

  // Results state
  const [results, setResults] = useState<CheckResult[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RESULTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'res-init-1',
        number: '14155552671',
        formattedNumber: '+1 415 555 2671',
        status: 'registered',
        countryCode: '1',
        checkedAt: Date.now() - 3600000 * 2,
        sessionId: 1,
        campaignId: 'cmp_us_b2b',
        details: { isBusiness: true, carrier: 'Verizon Wireless', hasProfilePic: true, timezone: 'America/Los_Angeles' },
      },
      {
        id: 'res-init-2',
        number: '14155558912',
        formattedNumber: '+1 415 555 8912',
        status: 'unregistered',
        countryCode: '1',
        checkedAt: Date.now() - 3600000 * 2,
        sessionId: 2,
        campaignId: 'cmp_all',
      },
      {
        id: 'res-init-3',
        number: '447911123456',
        formattedNumber: '+44 7911 123456',
        status: 'registered',
        countryCode: '44',
        checkedAt: Date.now() - 3600000 * 1.5,
        sessionId: 1,
        campaignId: 'cmp_all',
        details: { isBusiness: false, carrier: 'Vodafone UK', hasProfilePic: true, timezone: 'Europe/London' },
      },
      {
        id: 'res-init-4',
        number: '5511987654321',
        formattedNumber: '+55 11 98765-4321',
        status: 'registered',
        countryCode: '55',
        checkedAt: Date.now() - 3600000 * 1,
        sessionId: 2,
        campaignId: 'cmp_latam_ecom',
        details: { isBusiness: true, carrier: 'Vivo Brazil', hasProfilePic: true, timezone: 'America/Sao_Paulo' },
      },
    ];
  });

  const [lastRunResults, setLastRunResults] = useState<CheckResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>(INITIAL_REQUESTS);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);

  // Logs stream
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'WhatsApp Number Checker PRO initialized. Auth realm: multi-role owner/admin/member.',
    },
    {
      id: 'log-2',
      timestamp: new Date().toLocaleTimeString(),
      level: 'success',
      message: 'Active load balancer online. 2 WhatsApp socket instances linked and verified.',
    },
  ]);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs(prev => {
      const entry: LogEntry = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      };
      return [entry, ...prev.slice(0, 49)];
    });
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
      localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(results));
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(allUsers));
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      }
      localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(campaigns));
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
    } catch {}
  }, [queue, results, allUsers, currentUser, campaigns, templates]);

  // Auth Operations
  const signIn = (
    emailOrUsername: string,
    password?: string,
    roleHint?: UserRole
  ): { success: boolean; message: string } => {
    const trimmedInput = emailOrUsername.trim().toLowerCase();
    if (!trimmedInput) {
      return { success: false, message: 'Please enter your email or username.' };
    }

    // Specific Owner validation for exsuzume@gmail.com
    if (trimmedInput === 'exsuzume@gmail.com' || trimmedInput === 'exsuzume') {
      if (password !== undefined && password !== 'EGOSRT') {
        addLog('warn', `Failed login attempt for Owner ${emailOrUsername}: incorrect password.`);
        return { success: false, message: 'Invalid credentials. Please verify your email and password.' };
      }
      const ownerUser = allUsers.find(u => u.email.toLowerCase() === 'exsuzume@gmail.com') || INITIAL_USERS[0];
      setCurrentUser(ownerUser);
      addLog('success', `Master Owner authenticated successfully: ${ownerUser.email}`);
      return { success: true, message: 'Welcome Master Owner!' };
    }

    const existing = allUsers.find(
      u => u.email.toLowerCase() === trimmedInput || u.username.toLowerCase() === trimmedInput
    );

    if (existing) {
      if (existing.isBanned) {
        addLog('error', `Sign-in rejected: Account for ${emailOrUsername} is suspended.`);
        return { success: false, message: 'This account has been suspended. Please contact the administrator.' };
      }

      if (existing.isPendingApproval) {
        addLog('warn', `Sign-in pending: Account for ${emailOrUsername} is awaiting Master Owner approval.`);
        return {
          success: false,
          message: 'Your account is pending Owner approval. Please wait for activation by the Master Owner.',
        };
      }

      if (existing.password && password !== undefined) {
        if (existing.password !== password) {
          addLog('warn', `Failed login attempt for ${existing.email}: incorrect password.`);
          return { success: false, message: 'Invalid password. Please check your credentials.' };
        }
      }

      setCurrentUser(existing);
      addLog('success', `Signed in successfully as ${existing.name} (${existing.role.toUpperCase()}).`);
      return { success: true, message: `Welcome back, ${existing.name}!` };
    }

    return {
      success: false,
      message: 'Account not found. Please create an account or verify your login details.',
    };
  };

  const signUp = (
    name: string,
    email: string,
    username: string,
    password?: string,
    targetRole: UserRole = 'member'
  ): { success: boolean; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const exists = allUsers.some(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { success: false, message: 'An account with this email address already exists. Please sign in.' };
    }

    if (!password || password.length < 3) {
      return { success: false, message: 'Password must be at least 3 characters long.' };
    }

    // Owner protection: only 1 master owner unless explicitly requested
    const ownerExists = allUsers.some(u => u.role === 'owner');
    const finalRole: UserRole = (targetRole === 'owner' && ownerExists) ? 'member' : targetRole;

    const isPending = (config.requireApprovalForNewUsers ?? true) && finalRole === 'member';

    const newUser: AuthUser = {
      id: 'usr_' + Date.now().toString(36),
      name: name.trim() || cleanEmail.split('@')[0],
      username: (username.trim() || cleanEmail.split('@')[0]).toLowerCase(),
      email: cleanEmail,
      password: password,
      role: finalRole,
      dailyLimit: finalRole === 'owner' || finalRole === 'admin' ? 0 : config.memberDefaults.dailyLimit,
      usedToday: 0,
      totalChecked: 0,
      maxPerRun: finalRole === 'owner' ? 10000 : 250,
      expiresAt: finalRole === 'member' ? Date.now() + 30 * 86400 * 1000 : 0,
      isBanned: false,
      isPendingApproval: isPending,
      joinedAt: Date.now(),
      apiKey: 'wac_live_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12),
    };

    setAllUsers(prev => [newUser, ...prev]);

    if (isPending) {
      addLog('warn', `New user registration for ${newUser.email} awaiting Master Owner approval.`);
      return {
        success: true,
        message: 'Account registered! Your account is pending approval by the Master Owner. You will be able to sign in once activated.',
      };
    }

    setCurrentUser(newUser);
    addLog('success', `Welcome ${newUser.name}! Registered as ${finalRole.toUpperCase()}.`);
    return { success: true, message: `Account created successfully! Welcome, ${newUser.name}.` };
  };

  const signOut = () => {
    if (currentUser) {
      addLog('info', `User ${currentUser.name} logged out.`);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    } catch {}
  };

  const switchAccount = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    setCurrentUser(user);
    addLog('info', `Active user profile switched to: ${user.name} (${user.role.toUpperCase()}).`);
  };

  const regenerateApiKey = (userId: string): string => {
    const newKey = 'wac_live_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    setAllUsers(prev => prev.map(u => (u.id === userId ? { ...u, apiKey: newKey } : u)));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? ({ ...prev, apiKey: newKey }) : null);
    }
    addLog('info', `Generated fresh REST API Key for user #${userId}.`);
    return newKey;
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    if (!currentUser || currentUser.role !== 'owner') {
      addLog('warn', 'Only the Owner can change user privileges.');
      return;
    }
    setAllUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
    if (currentUser.id === userId) {
      setCurrentUser(prev => prev ? ({ ...prev, role: newRole }) : null);
    }
    addLog('info', `User #${userId} role changed to ${newRole.toUpperCase()}.`);
  };

  const updateUserQuota = (userId: string, delta: number) => {
    setAllUsers(prev =>
      prev.map(u =>
        u.id === userId ? { ...u, dailyLimit: Math.max(0, u.dailyLimit + delta) } : u
      )
    );
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? ({ ...prev, dailyLimit: Math.max(0, prev.dailyLimit + delta) }) : null);
    }
    addLog('info', `User #${userId} quota adjusted by ${delta > 0 ? '+' : ''}${delta}.`);
  };

  const setUserUnlimitedQuota = (userId: string) => {
    setAllUsers(prev => prev.map(u => (u.id === userId ? { ...u, dailyLimit: 0 } : u)));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? ({ ...prev, dailyLimit: 0 }) : null);
    }
    addLog('info', `User #${userId} quota upgraded to Unlimited.`);
  };

  const extendUserValidity = (userId: string, days: number) => {
    setAllUsers(prev =>
      prev.map(u => {
        if (u.id !== userId) return u;
        const cur = u.expiresAt > Date.now() ? u.expiresAt : Date.now();
        return { ...u, expiresAt: days === 0 ? 0 : cur + days * 86400 * 1000 };
      })
    );
    addLog('info', `User #${userId} validity extended by ${days === 0 ? 'No Expiry' : `+${days} days`}.`);
  };

  const toggleUserBan = (userId: string) => {
    setAllUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, isBanned: !u.isBanned } : u))
    );
    addLog('warn', `User #${userId} suspended/restored.`);
  };

  const deleteUser = (userId: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    addLog('warn', `User #${userId} purged from system.`);
  };

  const updateUserPassword = (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.trim().length < 3) return;
    setAllUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, password: newPassword.trim() } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser(prev => (prev ? { ...prev, password: newPassword.trim() } : null));
    }
    addLog('info', `Password changed for user #${userId}.`);
  };

  const updateUserDailyLimit = (userId: string, limit: number) => {
    const val = Math.max(0, limit);
    setAllUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, dailyLimit: val } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser(prev => (prev ? { ...prev, dailyLimit: val } : null));
    }
    addLog('info', `User #${userId} daily limit set to ${val === 0 ? 'Unlimited' : val}.`);
  };

  const approveUser = (userId: string) => {
    setAllUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, isPendingApproval: false, isBanned: false } : u))
    );
    const u = allUsers.find(user => user.id === userId);
    addLog('success', `User ${u?.email || userId} approved by Master Owner! Account activated.`);
  };

  const rejectUser = (userId: string) => {
    const u = allUsers.find(user => user.id === userId);
    setAllUsers(prev => prev.filter(user => user.id !== userId));
    addLog('warn', `Registration for ${u?.email || userId} rejected and removed.`);
  };

  // Range Number Generator
  const generateNumberRange = (
    countryCode: string,
    areaCode: string,
    startNumber: string,
    count: number
  ): number => {
    const cleanCc = countryCode.replace(/\D/g, '') || config.defaultCountryCode || '1';
    const cleanArea = areaCode.replace(/\D/g, '');
    const cleanStart = parseInt(startNumber.replace(/\D/g, ''), 10) || 1000;
    const clampedCount = Math.max(1, Math.min(2000, count));

    const generated: string[] = [];
    for (let i = 0; i < clampedCount; i++) {
      const suffix = (cleanStart + i).toString().padStart(startNumber.length || 4, '0');
      generated.push(`${cleanCc}${cleanArea}${suffix}`);
    }

    const res = addNumbersToQueue(generated.join('\n'), activeCampaignId);
    addLog('info', `Series Generator: synthesized ${res.added} contiguous numbers into queue (${cleanCc}-${cleanArea}-...).`);
    return res.added;
  };

  // Campaigns & Templates
  const createCampaign = (name: string, tag: string, color: string = 'emerald'): Campaign => {
    const newCamp: Campaign = {
      id: 'cmp_' + Date.now().toString(36),
      name,
      tag: tag.toUpperCase().replace(/\s+/g, '-'),
      createdAt: Date.now(),
      color,
    };
    setCampaigns(prev => [newCamp, ...prev]);
    setActiveCampaignId(newCamp.id);
    addLog('info', `Campaign [${newCamp.name}] established.`);
    return newCamp;
  };

  const addTemplate = (title: string, body: string, category: MessageTemplate['category']) => {
    const newTmpl: MessageTemplate = {
      id: 'tmpl_' + Date.now().toString(36),
      title,
      body,
      category,
    };
    setTemplates(prev => [newTmpl, ...prev]);
    addLog('info', `Message Template "${title}" saved.`);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Job Runner Engine
  const [job, setJob] = useState<JobState>({
    isRunning: false,
    isPaused: false,
    currentCount: 0,
    targetCount: 0,
    startedAt: 0,
    counts: { registered: 0, unregistered: 0, error: 0 },
    runId: 0,
  });

  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const jobRef = useRef(job);
  jobRef.current = job;

  const queueRef = useRef(queue);
  queueRef.current = queue;

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // Session controls - strictly scoped to currentUser's private sessions
  const addSessionSlot = () => {
    const activeUserId = currentUser?.id || 'usr_owner_root';
    const userSess = allSessions.filter(s => s.userId === activeUserId);
    if (userSess.length >= 5) {
      addLog('warn', 'Maximum limit of 5 WhatsApp sessions reached for your account.');
      return;
    }
    const nextSlot = userSess.length + 1;
    const newSession: WhatsAppSession = {
      slot: nextSlot,
      userId: activeUserId,
      userEmail: currentUser?.email,
      status: 'qr',
      qrGeneratedAt: Date.now(),
      checksCount: 0,
      isBusy: false,
      batteryLevel: Math.floor(Math.random() * 20 + 80),
      platform: 'WhatsApp Multi-Device Web',
    };
    setAllSessions(prev => [...prev, newSession]);
    addLog('info', `Personal WhatsApp Session #${nextSlot} initialized for ${currentUser?.name || 'User'}.`);
  };

  const removeSessionSlot = (slot: number) => {
    const activeUserId = currentUser?.id || 'usr_owner_root';
    const userSess = allSessions.filter(s => s.userId === activeUserId);
    if (userSess.length <= 1) {
      addLog('warn', 'At least 1 WhatsApp session must remain configured for your account.');
      return;
    }
    setAllSessions(prev => {
      const filtered = prev.filter(s => !(s.userId === activeUserId && s.slot === slot));
      let idx = 1;
      return filtered.map(s => {
        if (s.userId === activeUserId) {
          return { ...s, slot: idx++ };
        }
        return s;
      });
    });
    addLog('warn', `Your Session #${slot} terminated and local credentials purged.`);
  };

  const resetSession = (slot: number) => {
    const activeUserId = currentUser?.id || 'usr_owner_root';
    setAllSessions(prev =>
      prev.map(s =>
        s.userId === activeUserId && s.slot === slot
          ? {
              ...s,
              status: 'qr',
              phoneNumber: undefined,
              jid: undefined,
              pairingCode: undefined,
              qrGeneratedAt: Date.now(),
            }
          : s
      )
    );
    addLog('info', `Your Session #${slot} credentials cleared. Generating fresh QR code.`);
  };

  const generatePairingCode = async (slot: number, phone: string): Promise<string> => {
    const activeUserId = currentUser?.id || 'usr_owner_root';
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 8) {
      throw new Error('Please enter a valid phone number with country code (e.g. 919876543210 or 14155552671).');
    }

    addLog('info', `Connecting to WhatsApp Baileys Multi-Device socket for Session #${slot} (+${clean})...`);

    const res = await fetch('/api/sessions/request-pair-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, phoneNumber: clean, userId: activeUserId }),
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.pairingCode) {
      const errMsg = data.error || 'WhatsApp server rejected pairing request. Verify number format or scan QR code.';
      addLog('error', `Pairing error for Session #${slot}: ${errMsg}`);
      throw new Error(errMsg);
    }

    const code = data.pairingCode;

    setAllSessions(prev =>
      prev.map(s =>
        s.userId === activeUserId && s.slot === slot
          ? { ...s, pairingCode: code, phoneNumber: clean, status: 'qr' }
          : s
      )
    );

    addLog(
      'success',
      `Official WhatsApp Pairing Code [${code}] generated for Session #${slot} (+${clean}). Enter this code on your phone.`
    );
    return code;
  };

  const simulateConnect = (slot: number, customNumber?: string) => {
    const activeUserId = currentUser?.id || 'usr_owner_root';
    const num = customNumber || (slot === 1 ? '919876543210' : slot === 2 ? '14155552671' : '447911123456');
    setAllSessions(prev =>
      prev.map(s =>
        s.userId === activeUserId && s.slot === slot
          ? {
              ...s,
              status: 'ready',
              phoneNumber: num,
              jid: `${num}@s.whatsapp.net`,
              connectedSince: Date.now(),
              pairingCode: undefined,
              batteryLevel: Math.floor(Math.random() * 20) + 80,
              platform: 'WhatsApp Multi-Device Web',
            }
          : s
      )
    );

    addLog('success', `Session #${slot} (+${num}) verified and ready for WhatsApp Number Checking!`);
  };

  const simulateDisconnect = async (slot: number) => {
    const activeUserId = currentUser?.id || 'usr_owner_root';
    try {
      await fetch('/api/sessions/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, userId: activeUserId }),
      });
    } catch {}

    setAllSessions(prev =>
      prev.map(s =>
        s.userId === activeUserId && s.slot === slot
          ? { ...s, status: 'disconnected', isBusy: false, phoneNumber: undefined, jid: undefined, pairingCode: undefined }
          : s
      )
    );
    addLog('warn', `Your personal Session #${slot} disconnected and auth credentials purged.`);
  };

  // Queue actions
  const addNumbersToQueue = (rawText: string, campaignId?: string) => {
    const parsed = parseBatchNumbers(rawText, config.defaultCountryCode);
    const existing = new Set(queue);
    const tested = new Set(results.map(r => r.number));

    const toAdd: string[] = [];
    let skipped = parsed.skippedCount;

    for (const num of parsed.validNumbers) {
      if (existing.has(num) || tested.has(num)) {
        skipped++;
      } else {
        existing.add(num);
        toAdd.push(num);
      }
    }

    if (toAdd.length > 0) {
      setQueue(prev => [...prev, ...toAdd]);
      addLog('info', `Added ${toAdd.length} numbers to queue (${skipped} duplicate or invalid skipped).`);
    } else {
      addLog('warn', `No new numbers added (${skipped} duplicates or invalid entries skipped).`);
    }

    return { added: toAdd.length, skipped };
  };

  const clearQueue = () => {
    const count = queue.length;
    setQueue([]);
    addLog('info', `Queue cleared (${count} numbers removed).`);
  };

  const removeQueueItem = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const seedDemoQueue = (count: number = 30) => {
    const samples = generateSampleNumbers(count, config.defaultCountryCode);
    setQueue(prev => {
      const set = new Set(prev);
      const unique = samples.filter(s => !set.has(s));
      return [...prev, ...unique];
    });
    addLog('info', `Loaded ${count} test numbers into queue.`);
  };

  const clearResults = () => {
    const count = results.length;
    setResults([]);
    setLastRunResults([]);
    addLog('info', `Audit log and results wiped (${count} records).`);
  };

  const retryErrors = () => {
    const errors = results.filter(r => r.status === 'error');
    if (errors.length === 0) {
      addLog('info', 'No error entries found to retry.');
      return 0;
    }
    const errNumbers = errors.map(e => e.number);
    setResults(prev => prev.filter(r => r.status !== 'error'));
    setQueue(prev => {
      const existing = new Set(prev);
      const toAdd = errNumbers.filter(n => !existing.has(n));
      return [...prev, ...toAdd];
    });
    addLog('info', `Re-queued ${errNumbers.length} failed numbers for verification.`);
    return errNumbers.length;
  };

  // Single Quick Check - Real WhatsApp Multi-Device Protocol
  const singleCheck = async (phone: string): Promise<CheckResult> => {
    const parsed = normalizePhoneNumber(phone, config.defaultCountryCode);
    if (!parsed.isValid) {
      throw new Error('Please enter a valid phone number with country code (e.g. +14155552671).');
    }

    const activeUserId = currentUser?.id || 'usr_owner_root';
    addLog('info', `Querying official WhatsApp servers for ${parsed.formatted}...`);

    let data: any = null;
    try {
      const res = await fetch('/api/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: parsed.normalized, userId: activeUserId }),
      });
      data = await res.json();
      if (!res.ok || (data.status === 'error' && !data.phoneNumber)) {
        throw new Error(data.error || 'Verification query failed. Link WhatsApp in Sessions tab.');
      }
    } catch (err: any) {
      addLog('error', `WhatsApp probe error for ${parsed.formatted}: ${err?.message}`);
      throw err;
    }

    const isRegistered = Boolean(data.isRegistered);
    const status: NumberStatus = isRegistered ? 'registered' : 'unregistered';

    const result: CheckResult = {
      id: 'single-' + Date.now(),
      number: parsed.normalized,
      formattedNumber: parsed.formatted,
      status,
      countryCode: parsed.countryCode,
      checkedAt: data.checkedAt || Date.now(),
      sessionId: data.slot || 1,
      campaignId: activeCampaignId,
      details: isRegistered
        ? {
            isBusiness: Boolean(data.isBusiness),
            carrier: data.carrier || (parsed.countryCode === '1' ? 'T-Mobile US' : parsed.countryCode === '44' ? 'EE UK' : 'Mobile Cellular'),
            hasProfilePic: Boolean(data.jid),
            timezone: 'UTC',
          }
        : undefined,
    };

    setResults(prev => [result, ...prev]);
    addLog(
      status === 'registered' ? 'success' : 'warn',
      `Official WhatsApp Protocol: ${parsed.formatted} -> ${status === 'registered' ? '✅ ON WHATSAPP' : '❌ NOT ON WHATSAPP'}`
    );
    soundFx.playCheckHit(status);

    return result;
  };

  // Engine scheduling
  const jobIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startJob = (): string | null => {
    if (!currentUser) {
      return 'Please sign in or create an account to start verification.';
    }

    if (config.maintenance.on && currentUser.role === 'member') {
      return 'System is currently under maintenance. Checking is temporarily suspended.';
    }

    const ready = sessions.filter(s => s.status === 'ready');
    if (ready.length === 0) {
      return 'No WhatsApp sessions connected. Link a session in the Sessions tab first.';
    }

    if (queue.length === 0) {
      return 'Verification queue is empty. Please add numbers first.';
    }

    // Check user quota if member
    if (currentUser.role === 'member' && currentUser.dailyLimit > 0) {
      const remaining = Math.max(0, currentUser.dailyLimit - currentUser.usedToday);
      if (remaining <= 0) {
        return `Daily quota limit (${currentUser.dailyLimit}) reached. Contact Owner to upgrade.`;
      }
    }

    const userMaxCap = currentUser.role === 'owner' ? config.maxPerRun : Math.min(config.maxPerRun, currentUser.maxPerRun);
    const target = Math.min(queue.length, userMaxCap);
    const newRunId = Date.now();

    setJob({
      isRunning: true,
      isPaused: false,
      currentCount: 0,
      targetCount: target,
      startedAt: Date.now(),
      counts: { registered: 0, unregistered: 0, error: 0 },
      runId: newRunId,
    });

    setLastRunResults([]);
    setIsLiveModalOpen(true);
    addLog('info', `Verification engine started by ${currentUser.name}. Processing ${target} queued numbers.`);

    return null;
  };

  const pauseJob = () => {
    setJob(prev => ({ ...prev, isPaused: true }));
    addLog('info', 'Verification engine paused.');
  };

  const resumeJob = () => {
    setJob(prev => ({ ...prev, isPaused: false }));
    addLog('info', 'Verification engine resumed.');
  };

  const stopJob = () => {
    setJob(prev => ({ ...prev, isRunning: false }));
    if (jobIntervalRef.current) {
      clearTimeout(jobIntervalRef.current);
      jobIntervalRef.current = null;
    }
    addLog('warn', 'Verification engine manually halted.');
  };

  // Verification step loop
  useEffect(() => {
    if (!job.isRunning || job.isPaused) {
      if (jobIntervalRef.current) {
        clearTimeout(jobIntervalRef.current);
        jobIntervalRef.current = null;
      }
      return;
    }

    if (queue.length === 0 || job.currentCount >= job.targetCount) {
      setJob(prev => ({ ...prev, isRunning: false }));
      soundFx.playCompletionChime();
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#34d399', '#38bdf8', '#ffffff'],
        });
      } catch {}
      addLog(
        'success',
        `Batch finished! Verified ${job.currentCount} numbers (${job.counts.registered} Valid WhatsApp, ${job.counts.unregistered} Not on WA, ${job.counts.error} Errors).`
      );
      return;
    }

    const readySess = sessionsRef.current.filter(s => s.status === 'ready');
    if (readySess.length === 0) {
      stopJob();
      addLog('error', 'All WhatsApp sessions disconnected. Engine stopped.');
      return;
    }

    const baseDelaySec = Math.random() * (config.maxDelay - config.minDelay) + config.minDelay;
    const pacedDelayMs = Math.max(250, Math.floor((baseDelaySec * 1000) / readySess.length));

    jobIntervalRef.current = setTimeout(async () => {
      const currentQueue = queueRef.current;
      if (currentQueue.length === 0) return;

      const nextNumber = currentQueue[0];
      const assignedSession = readySess[jobRef.current.currentCount % readySess.length];
      const activeUserId = currentUserRef.current?.id || 'usr_owner_root';

      setAllSessions(prev =>
        prev.map(s => (s.userId === activeUserId && s.slot === assignedSession.slot ? { ...s, isBusy: true } : s))
      );

      let status: NumberStatus = 'unregistered';
      let checkData: any = null;

      try {
        const res = await fetch('/api/check-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: nextNumber, userId: activeUserId }),
        });
        checkData = await res.json();
        if (res.ok && checkData.success) {
          status = checkData.isRegistered ? 'registered' : 'unregistered';
        } else {
          status = 'error';
          addLog('error', `WhatsApp probe error for +${nextNumber}: ${checkData?.error || 'Connection timeout'}`);
        }
      } catch (err: any) {
        status = 'error';
        console.warn('Batch check network error:', err);
      }

      const isRegistered = status === 'registered';

      const result: CheckResult = {
        id: 'chk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        number: nextNumber,
        formattedNumber: `+${nextNumber}`,
        status,
        countryCode: detectCountryCode(nextNumber),
        checkedAt: Date.now(),
        sessionId: checkData?.slot || assignedSession.slot,
        campaignId: activeCampaignId,
        details: isRegistered
          ? {
              isBusiness: Boolean(checkData?.isBusiness),
              hasProfilePic: Boolean(checkData?.jid),
              carrier: checkData?.carrier || 'Mobile Cellular',
              timezone: 'UTC',
            }
          : undefined,
      };

      soundFx.playCheckHit(status);
      setQueue(prev => prev.slice(1));
      setResults(prev => [result, ...prev]);
      setLastRunResults(prev => [result, ...prev]);

      // Bump member quota counters only on successful checks
      if (currentUserRef.current && status !== 'error') {
        const curId = currentUserRef.current.id;
        setAllUsers(prev =>
          prev.map(u =>
            u.id === curId
              ? { ...u, usedToday: u.usedToday + 1, totalChecked: u.totalChecked + 1 }
              : u
          )
        );
        setCurrentUser(prev =>
          prev
            ? {
                ...prev,
                usedToday: prev.usedToday + 1,
                totalChecked: prev.totalChecked + 1,
              }
            : null
        );
      }

      setAllSessions(prev =>
        prev.map(s =>
          s.userId === activeUserId && s.slot === assignedSession.slot
            ? { ...s, checksCount: s.checksCount + 1, isBusy: false }
            : s
        )
      );

      setJob(prev => ({
        ...prev,
        currentCount: prev.currentCount + 1,
        lastChecked: { number: nextNumber, status },
        counts: {
          ...prev.counts,
          [status]: prev.counts[status] + 1,
        },
      }));
    }, pacedDelayMs);

    return () => {
      if (jobIntervalRef.current) {
        clearTimeout(jobIntervalRef.current);
      }
    };
  }, [job.isRunning, job.isPaused, job.currentCount, queue.length, config.minDelay, config.maxDelay]);

  // Request actions
  const approveRequest = (id: string) => {
    const req = pendingRequests.find(r => r.id === id);
    if (!req) return;
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    signUp(req.name, req.email, req.username, 'member');
    addLog('success', `Access request for ${req.name} approved.`);
  };

  const rejectRequest = (id: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    addLog('info', `Access request #${id} dismissed.`);
  };

  const blockRequest = (id: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    addLog('warn', `User request #${id} blocked.`);
  };

  const clearLogs = () => setLogs([]);

  return (
    <AppContext.Provider
      value={{
        config,
        updateConfig,
        currentUser,
        allUsers,
        signIn,
        signUp,
        signOut,
        switchAccount,
        regenerateApiKey,
        updateUserRole,
        updateUserQuota,
        updateUserDailyLimit,
        updateUserPassword,
        setUserUnlimitedQuota,
        extendUserValidity,
        toggleUserBan,
        deleteUser,
        approveUser,
        rejectUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        sessions,
        allSessions,
        readySessionsCount,
        addSessionSlot,
        removeSessionSlot,
        resetSession,
        generatePairingCode,
        simulateConnect,
        simulateDisconnect,
        queue,
        addNumbersToQueue,
        clearQueue,
        removeQueueItem,
        seedDemoQueue,
        generateNumberRange,
        results,
        lastRunResults,
        clearResults,
        retryErrors,
        job,
        startJob,
        pauseJob,
        resumeJob,
        stopJob,
        isLiveModalOpen,
        setIsLiveModalOpen,
        pendingRequests,
        approveRequest,
        rejectRequest,
        blockRequest,
        broadcastMessage,
        setBroadcastMessage,
        campaigns,
        activeCampaignId,
        setActiveCampaignId,
        createCampaign,
        templates,
        addTemplate,
        deleteTemplate,
        singleCheck,
        logs,
        addLog,
        clearLogs,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
