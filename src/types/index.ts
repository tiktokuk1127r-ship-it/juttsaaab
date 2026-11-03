export type NumberStatus = 'registered' | 'unregistered' | 'error';

export interface CheckResult {
  id: string;
  number: string;
  formattedNumber: string;
  status: NumberStatus;
  countryCode: string;
  checkedAt: number;
  sessionId?: number;
  campaignId?: string;
  details?: {
    carrier?: string;
    isBusiness?: boolean;
    hasProfilePic?: boolean;
    timezone?: string;
    businessName?: string;
    about?: string;
    flag?: string;
  };
}

export type SessionStatus = 'ready' | 'qr' | 'starting' | 'disconnected';

export interface WhatsAppSession {
  slot: number;
  status: SessionStatus;
  phoneNumber?: string;
  jid?: string;
  qrCode?: string;
  qrGeneratedAt: number;
  checksCount: number;
  isBusy: boolean;
  connectedSince?: number;
  pairingCode?: string;
  batteryLevel?: number;
  platform?: string;
  latencyMs?: number;
  successRate?: number;
  isActive?: boolean;
  userId?: string;
  userEmail?: string;
}

export type UserRole = 'owner' | 'admin' | 'member';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  avatarUrl?: string;
  dailyLimit: number; // 0 = unlimited
  usedToday: number;
  totalChecked: number;
  maxPerRun: number;
  expiresAt: number; // 0 = no expiry
  isBanned: boolean;
  isPendingApproval?: boolean;
  joinedAt: number;
  apiKey: string;
}

export interface AccessRequest {
  id: string;
  name: string;
  username: string;
  email: string;
  requestedAt: number;
  note?: string;
}

export interface Campaign {
  id: string;
  name: string;
  tag: string;
  createdAt: number;
  color: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  body: string;
  category: 'onboarding' | 'promo' | 'reminder' | 'custom';
}

export type SoundTheme = 'cyber' | 'crisp' | 'gentle' | 'chime';

export interface AppConfig {
  minDelay: number;
  maxDelay: number;
  maxPerRun: number;
  defaultCountryCode: string;
  acceptRequests: boolean;
  soundEnabled: boolean;
  soundTheme: SoundTheme;
  waSlots: number;
  maintenance: {
    on: boolean;
    message: string;
    since: number;
  };
  memberDefaults: {
    dailyLimit: number;
    maxPerRun: number;
    maxQueue: number;
  };
  requireApprovalForNewUsers: boolean;
  webhookUrl?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface JobState {
  isRunning: boolean;
  isPaused: boolean;
  currentCount: number;
  targetCount: number;
  startedAt: number;
  lastChecked?: {
    number: string;
    status: NumberStatus;
  };
  counts: {
    registered: number;
    unregistered: number;
    error: number;
  };
  runId: number;
}
