import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crown,
  ShieldAlert,
  Power,
  RotateCw,
  Trash2,
  Sliders,
  AlertTriangle,
  UserCheck,
  Ban,
  Plus,
  Key,
  Globe,
  Download,
  CheckCircle2,
  LogOut,
  Radio,
  Server,
  Shield,
  User,
  Search,
  Lock,
  Edit3,
  Check,
  X,
  Eye,
  EyeOff,
  UserX,
  Clock,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole, AuthUser } from '../types';

export const OwnerPanelView: React.FC = () => {
  const {
    currentUser,
    allUsers,
    config,
    updateConfig,
    sessions,
    allSessions,
    readySessionsCount,
    addSessionSlot,
    resetSession,
    simulateConnect,
    simulateDisconnect,
    logs,
    queue,
    results,
    job,
    stopJob,
    clearQueue,
    clearResults,
    clearLogs,
    updateUserRole,
    updateUserDailyLimit,
    updateUserPassword,
    setUserUnlimitedQuota,
    toggleUserBan,
    deleteUser,
    approveUser,
    rejectUser,
    broadcastMessage,
    setBroadcastMessage,
    signOut,
    addLog,
    switchAccount,
  } = useApp();

  const [broadcastInput, setBroadcastInput] = useState('');
  const [maintenanceInput, setMaintenanceInput] = useState(config.maintenance.message);
  const [minDelay, setMinDelay] = useState(config.minDelay);
  const [maxDelay, setMaxDelay] = useState(config.maxDelay);
  const [webhookInput, setWebhookInput] = useState(config.webhookUrl || 'https://api.wachecker.pro/v1/webhook');
  const [selectedUserFilter, setSelectedUserFilter] = useState<'all' | 'pending' | 'owner' | 'admin' | 'member' | 'banned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [showAllPlatformSockets, setShowAllPlatformSockets] = useState(false);

  // Modal states for user management
  const [passwordModalUser, setPasswordModalUser] = useState<AuthUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const [limitModalUser, setLimitModalUser] = useState<AuthUser | null>(null);
  const [newLimitValue, setNewLimitValue] = useState<number>(200);

  // Guard: Strictly accessible by Master Owner
  if (currentUser?.role !== 'owner') {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Master Owner Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            This Supreme Control Center is strictly reserved for the Master Owner account. You are currently logged in as a <span className="font-semibold uppercase">{currentUser?.role || 'guest'}</span>.
          </p>
        </div>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs shadow-xs hover:opacity-90"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out & Switch Account</span>
        </button>
      </div>
    );
  }

  const triggerSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleToggleApprovalRequirement = () => {
    const nextVal = !config.requireApprovalForNewUsers;
    updateConfig({ requireApprovalForNewUsers: nextVal });
    addLog('warn', `User Approval Gate switched to ${nextVal ? 'STRICT APPROVAL ON' : 'INSTANT ACCESS OFF'} by Master Owner.`);
    triggerSuccess(nextVal ? 'Strict Approval Gate ACTIVATED: New users must be approved by Owner' : 'Direct Access ACTIVATED: New users can sign in immediately without approval');
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;
    setBroadcastMessage(broadcastInput.trim());
    addLog('info', `Owner Broadcast: "${broadcastInput.trim()}"`);
    setBroadcastInput('');
    triggerSuccess('Broadcast announcement published to all active screens!');
  };

  const handleToggleMaintenance = () => {
    const nextOn = !config.maintenance.on;
    updateConfig({
      maintenance: {
        on: nextOn,
        message: maintenanceInput || 'System maintenance underway by Master Owner.',
        since: nextOn ? Date.now() : 0,
      },
    });
    addLog('warn', `Maintenance Mode turned ${nextOn ? 'ON' : 'OFF'} by Master Owner.`);
    triggerSuccess(`Maintenance mode switched ${nextOn ? 'ACTIVATED' : 'DEACTIVATED'}`);
  };

  const handleSavePacing = () => {
    if (minDelay <= 0 || maxDelay < minDelay) {
      alert('Max delay must be greater than or equal to min delay.');
      return;
    }
    updateConfig({ minDelay, maxDelay });
    addLog('info', `Engine pacing updated: ${minDelay}s - ${maxDelay}s per verification.`);
    triggerSuccess(`Anti-ban pacing updated to ${minDelay}s - ${maxDelay}s!`);
  };

  const handleSaveWebhook = () => {
    updateConfig({ webhookUrl: webhookInput.trim() });
    addLog('info', `Global webhook URL configured: ${webhookInput.trim()}`);
    triggerSuccess('Webhook URL updated successfully!');
  };

  const handleEmergencyStop = () => {
    stopJob();
    addLog('error', 'EMERGENCY SHUTDOWN executed by Master Owner! All engine queues halted.');
    triggerSuccess('Emergency Stop executed! All queue workers paused.');
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordValue.trim()) return;
    updateUserPassword(passwordModalUser.id, newPasswordValue.trim());
    triggerSuccess(`Password for ${passwordModalUser.name} (${passwordModalUser.email}) updated successfully!`);
    setPasswordModalUser(null);
    setNewPasswordValue('');
  };

  const handleSaveDailyLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitModalUser) return;
    updateUserDailyLimit(limitModalUser.id, newLimitValue);
    triggerSuccess(`Daily limit for ${limitModalUser.name} set to ${newLimitValue === 0 ? 'Unlimited' : newLimitValue} checks!`);
    setLimitModalUser(null);
  };

  const exportSystemAuditBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      owner: currentUser.email,
      usersCount: allUsers.length,
      queueCount: queue.length,
      resultsCount: results.length,
      sessionsCount: sessions.length,
      config,
      users: allUsers.map(u => ({ ...u, password: '***' })),
      sampleResults: results.slice(0, 50),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa-checker-pro-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerSuccess('Full System Audit Snapshot exported to JSON file!');
  };

  // Pending approval list
  const pendingUsers = allUsers.filter(u => u.isPendingApproval);

  // Filtered users for main table
  const filteredUsers = allUsers.filter(u => {
    if (selectedUserFilter === 'pending') return u.isPendingApproval;
    if (selectedUserFilter === 'banned') return u.isBanned;
    if (selectedUserFilter !== 'all' && u.role !== selectedUserFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      return matchName || matchEmail || matchUsername;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 text-xs font-semibold"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👑 Master King Banner & Supreme Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-300/80 dark:border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-emerald-500/10 p-6 sm:p-8 backdrop-blur-xl shadow-lg shadow-amber-500/5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-white/80 dark:border-amber-200/50"
            >
              <Crown className="h-9 w-9 fill-current" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Supreme Owner Control Center
                </span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold uppercase shadow-xs">
                  👑 Master King
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Full authority over user approvals, password resets, daily limits, account bans, anti-ban pacing, and emergency controls.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportSystemAuditBackup}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Audit Snapshot</span>
            </button>

            {/* Prominent Owner Sign Out */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm shadow-rose-600/30 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out (Owner)</span>
            </motion.button>
          </div>
        </div>

        {/* Quick telemetry ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-amber-200/60 dark:border-amber-500/20 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Logged in as:</span>
            <strong className="font-semibold text-slate-900 dark:text-white truncate block">{currentUser.email}</strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Engine Status:</span>
            <strong className={`font-semibold flex items-center gap-1.5 ${job.isRunning ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <span className={`h-2 w-2 rounded-full ${job.isRunning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {job.isRunning ? 'Running Live Job' : 'Standby / Ready'}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Approval Gate:</span>
            <strong className={`font-semibold flex items-center gap-1 ${config.requireApprovalForNewUsers ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <span className={`h-2 w-2 rounded-full ${config.requireApprovalForNewUsers ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {config.requireApprovalForNewUsers ? 'Approval Required' : 'Direct Instant Access'}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Pending Approvals:</span>
            <strong className={`font-bold ${pendingUsers.length > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
              {pendingUsers.length} Users Waiting
            </strong>
          </div>
        </div>
      </div>

      {/* 🔐 Master Account Approval Gate Switch Card */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 transition-colors ${
              config.requireApprovalForNewUsers
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
            }`}>
              {config.requireApprovalForNewUsers ? <ShieldAlert className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Account Registration Approval Gate
                </h3>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  config.requireApprovalForNewUsers
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                }`}>
                  {config.requireApprovalForNewUsers ? 'Gate Active (Review ON)' : 'Instant Access (Review OFF)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {config.requireApprovalForNewUsers
                  ? '🔒 Strict Security Mode: Whenever a new user signs up, their account remains in Pending status. The Master Owner must manually approve and activate the account before they can log in.'
                  : '⚡ Open Access Mode: Anyone registering automatically receives instant active membership and can log in immediately without owner intervention.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleToggleApprovalRequirement}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                config.requireApprovalForNewUsers
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200'
              }`}
            >
              {config.requireApprovalForNewUsers ? (
                <>
                  <ToggleRight className="h-5 w-5" />
                  <span>Turn Approval OFF (Direct Access)</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-5 w-5" />
                  <span>Turn Approval ON (Gatekeep)</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ⏳ Pending User Approvals Queue (Highlighted when users are waiting) */}
      {pendingUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-2 border-amber-400 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-6 shadow-md shadow-amber-500/5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 dark:border-amber-800/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-sm">
                <Clock className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Pending User Registrations Awaiting Owner Approval
                  </h3>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                    {pendingUsers.length} Pending
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Review new sign-ups. Click Approve to grant access or Reject to decline and wipe.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  pendingUsers.forEach(u => approveUser(u.id));
                  triggerSuccess(`Approved and activated all ${pendingUsers.length} pending users!`);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve All ({pendingUsers.length})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {pendingUsers.map(u => (
              <div
                key={u.id}
                className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900/90 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <span>{u.name}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-mono font-semibold">
                        Pending
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {u.email}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      @{u.username} · Joined {new Date(u.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-slate-500">
                    Default: {u.dailyLimit} checks/day
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        approveUser(u.id);
                        triggerSuccess(`Account for ${u.name} approved! They can now log in.`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Reject and delete registration for ${u.name}?`)) {
                          rejectUser(u.id);
                          triggerSuccess(`Registration for ${u.name} rejected.`);
                        }
                      }}
                      className="p-1.5 rounded-xl border border-rose-200 text-rose-600 dark:border-rose-900/50 hover:bg-rose-50 text-xs transition-colors cursor-pointer"
                      title="Reject Registration"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 👥 Master User Role, Quota, Password & Ban Control Directory */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Master Account & Role Directory</h3>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                {allUsers.length} Total Users
              </span>
              {pendingUsers.length > 0 && (
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold animate-pulse">
                  {pendingUsers.length} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Full control: set exact daily limits, change user passwords, ban/unban accounts, and approve/elevate roles.
            </p>
          </div>

          {/* Search bar & Filter Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user, email, username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 w-52 sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              {(['all', 'pending', 'owner', 'admin', 'member', 'banned'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedUserFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] transition-colors cursor-pointer ${
                    selectedUserFilter === tab
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'pending' ? `Pending (${pendingUsers.length})` : tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-6 font-semibold">User & Credentials</th>
                <th className="py-3 px-6 font-semibold">Role</th>
                <th className="py-3 px-6 font-semibold">Daily Limit Control</th>
                <th className="py-3 px-6 font-semibold">Account Status</th>
                <th className="py-3 px-6 font-semibold">Password Management</th>
                <th className="py-3 px-6 font-semibold text-right">Owner Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.map(user => {
                const isOwnerAccount = user.role === 'owner';
                const isCurrentSelf = user.id === currentUser.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
                        {isOwnerAccount && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">👑 {isCurrentSelf ? '(You)' : ''}</span>
                        )}
                        {user.isPendingApproval && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold uppercase">
                            Pending Approval
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {user.email} · @{user.username}
                      </div>
                    </td>

                    {/* Role selector */}
                    <td className="py-3.5 px-6">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                            user.role === 'owner'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300'
                              : user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                          }`}
                        >
                          {user.role === 'owner' && <Crown className="h-3 w-3" />}
                          {user.role === 'admin' && <Shield className="h-3 w-3" />}
                          {user.role === 'member' && <User className="h-3 w-3" />}
                          <span>{user.role}</span>
                        </span>

                        {!isOwnerAccount && (
                          <select
                            value={user.role}
                            onChange={e => {
                              updateUserRole(user.id, e.target.value as UserRole);
                              triggerSuccess(`Updated ${user.name} role to ${e.target.value}!`);
                            }}
                            className="text-[10px] rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1 py-0.5 text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            <option value="member">Set Member</option>
                            <option value="admin">Set Admin</option>
                            <option value="owner">Set Owner</option>
                          </select>
                        )}
                      </div>
                    </td>

                    {/* Daily Limit Controls */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        {user.dailyLimit === 0 ? (
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">Unlimited (∞)</span>
                        ) : (
                          <div className="font-mono">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {user.dailyLimit} checks/day
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              (Used: {user.usedToday})
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setLimitModalUser(user);
                            setNewLimitValue(user.dailyLimit);
                          }}
                          className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          title="Change Daily Limit"
                        >
                          <Edit3 className="h-3 w-3 text-emerald-500" />
                          <span>Set Limit</span>
                        </button>
                      </div>
                    </td>

                    {/* Ban / Active / Pending Status */}
                    <td className="py-3.5 px-6">
                      {user.isPendingApproval ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              approveUser(user.id);
                              triggerSuccess(`Approved and activated ${user.name}!`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>Approve Now</span>
                          </button>
                        </div>
                      ) : user.isBanned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <Ban className="h-3.5 w-3.5" />
                          <span>Banned (Suspended)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Password Management */}
                    <td className="py-3.5 px-6">
                      <button
                        onClick={() => {
                          setPasswordModalUser(user);
                          setNewPasswordValue('');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                        <span>Change Pass</span>
                      </button>
                    </td>

                    {/* Master Actions */}
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isCurrentSelf && (
                          <>
                            <button
                              onClick={() => {
                                switchAccount(user.id);
                                triggerSuccess(`Switched active view to ${user.name}!`);
                              }}
                              title="Test as this user"
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-xs cursor-pointer"
                            >
                              Impersonate
                            </button>

                            <button
                              onClick={() => {
                                toggleUserBan(user.id);
                                triggerSuccess(`${user.isBanned ? 'Unbanned & restored' : 'Suspended and banned'} ${user.name}`);
                              }}
                              className={`p-1.5 rounded-lg border text-xs transition-colors shadow-xs cursor-pointer ${
                                user.isBanned
                                  ? 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                                  : 'border-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100'
                              }`}
                              title={user.isBanned ? 'Lift Account Ban (Unban)' : 'Ban Account'}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>

                            {!isOwnerAccount && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${user.name}? This action is irreversible.`)) {
                                    deleteUser(user.id);
                                    triggerSuccess(`Account ${user.name} removed from system.`);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 transition-colors shadow-xs cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 1: Emergency Killswitch & Maintenance Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Emergency Killswitch & System Overrides */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                <Power className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Emergency Controls & Purge</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Immediate system halts and data resets</p>
              </div>
            </div>
            {job.isRunning && (
              <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-bold animate-pulse">
                Active Verification Run
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleEmergencyStop}
              disabled={!job.isRunning}
              className="flex items-center justify-center gap-2 p-3 rounded-xl border border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 disabled:opacity-40 transition-colors text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Power className="h-4 w-4" />
              <span>Emergency Engine Stop</span>
            </button>

            <button
              onClick={() => {
                clearQueue();
                triggerSuccess('Queue purged completely!');
              }}
              className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Trash2 className="h-4 w-4 text-amber-500" />
              <span>Purge Number Queue ({queue.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              onClick={() => {
                clearResults();
                triggerSuccess('Audit results wiped!');
              }}
              className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
            >
              Clear Audit Log History ({results.length} records)
            </button>
            <button
              onClick={() => {
                clearLogs();
                triggerSuccess('System event logs cleared!');
              }}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              Clear Live System Logs
            </button>
          </div>
        </div>

        {/* Card B: Maintenance Mode & Broadcast Notice */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Maintenance Mode & Broadcast</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Lock engine access or broadcast warnings</p>
              </div>
            </div>
            <button
              onClick={handleToggleMaintenance}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                config.maintenance.on
                  ? 'bg-rose-600 text-white shadow-rose-600/20'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {config.maintenance.on ? 'MAINTENANCE ON' : 'MAINTENANCE OFF'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Global Announcement Banner (Pushed live to all members)
              </label>
              <form onSubmit={handleBroadcast} className="flex gap-2">
                <input
                  type="text"
                  value={broadcastInput}
                  onChange={e => setBroadcastInput(e.target.value)}
                  placeholder="e.g. Meta WhatsApp API update in progress. Please pause queues."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!broadcastInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Broadcast
                </button>
              </form>
            </div>

            {broadcastMessage && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-300">
                <span className="truncate flex-1 font-medium">Active Banner: "{broadcastMessage}"</span>
                <button
                  onClick={() => {
                    setBroadcastMessage(null);
                    triggerSuccess('Broadcast banner removed.');
                  }}
                  className="ml-2 text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Anti-Ban Pacing & Webhook Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anti-Ban Algorithm Pacing */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Anti-Ban Pacing Tuner</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Randomized interval ranges between WhatsApp probes</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Minimum Interval (seconds)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={minDelay}
                onChange={e => setMinDelay(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Maximum Interval (seconds)
              </label>
              <input
                type="number"
                min={minDelay}
                max={120}
                value={maxDelay}
                onChange={e => setMaxDelay(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              Anti-Ban Status: <strong className="text-emerald-600 font-semibold">High Protection (Gaussian Jitter Active)</strong>
            </span>
            <button
              onClick={handleSavePacing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              Save Delay Settings
            </button>
          </div>
        </div>

        {/* Global Webhook & PHP Integration */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Global Webhook & PHP Proxy</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Post verified phone numbers to external CRM / PHP endpoints</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Destination Webhook Endpoint URL
            </label>
            <input
              type="url"
              value={webhookInput}
              onChange={e => setWebhookInput(e.target.value)}
              placeholder="https://yourdomain.com/api/wa-webhook.php"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              Payload format: <span className="font-mono text-slate-700 dark:text-slate-300">JSON (E.164 + Carrier)</span>
            </span>
            <button
              onClick={handleSaveWebhook}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              Update Webhook
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: WhatsApp Infrastructure Multi-Socket Manager */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  WhatsApp Multi-Socket Session Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold">
                  {readySessionsCount} / {sessions.length} Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized infrastructure sockets used to verify queued phone numbers with distributed rate limiting
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAllPlatformSockets(!showAllPlatformSockets)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                showAllPlatformSockets
                  ? 'bg-amber-500/10 border-amber-300 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {showAllPlatformSockets ? `All Network Sockets (${allSessions.length})` : 'My Private Sockets'}
            </button>
            <button
              onClick={() => {
                addSessionSlot();
                triggerSuccess('New WhatsApp session slot provisioned!');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Instance Slot</span>
            </button>
          </div>
        </div>

        {/* Sessions Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {(showAllPlatformSockets ? allSessions : sessions).map((s, idx) => {
            const isConnected = s.status === 'ready';

            return (
              <div
                key={`${s.userId}-${s.slot}-${idx}`}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      Slot #{s.slot}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        isConnected
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {isConnected ? 'ONLINE / READY' : 'OFFLINE'}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {s.checksCount} checked
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                  <span className="truncate max-w-[170px]">User: {s.userEmail || s.userId || 'Owner'}</span>
                  {s.userId === currentUser.id && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">(Your Socket)</span>
                  )}
                </div>

                <div className="text-xs font-mono">
                  {s.phoneNumber ? (
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                      +{s.phoneNumber}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No phone attached</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                  {isConnected ? (
                    <button
                      onClick={() => {
                        simulateDisconnect(s.slot);
                        triggerSuccess(`Disconnected Slot #${s.slot}`);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-50 text-[11px] font-medium cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        simulateConnect(s.slot, '1415555' + Math.floor(1000 + Math.random() * 9000));
                        triggerSuccess(`Socket Slot #${s.slot} connected successfully!`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium cursor-pointer"
                    >
                      Connect Socket
                    </button>
                  )}

                  <button
                    onClick={() => {
                      resetSession(s.slot);
                      triggerSuccess(`Session #${s.slot} cache reset.`);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title="Reset Session Memory"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4: Live Telemetry Stream */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Live System & Engine Telemetry Stream
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold">
                  {logs.length} Buffered Events
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time operational audit log capturing rate limits, socket ticks, and verification outcomes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
                navigator.clipboard.writeText(text);
                setCopiedLogs(true);
                setTimeout(() => setCopiedLogs(false), 2000);
                triggerSuccess('Logs copied to clipboard!');
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              {copiedLogs ? 'Copied Trace' : 'Copy All Logs'}
            </button>
            <button
              onClick={() => {
                clearLogs();
                triggerSuccess('Telemetry event buffer cleared.');
              }}
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
            >
              Clear Buffer
            </button>
          </div>
        </div>

        {/* Log Level Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs w-fit">
          {(['all', 'info', 'success', 'warn', 'error'] as const).map(lvl => (
            <button
              key={lvl}
              onClick={() => setLogLevelFilter(lvl)}
              className={`px-3 py-1 rounded-lg font-semibold uppercase text-[10px] transition-colors cursor-pointer ${
                logLevelFilter === lvl
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Log Viewer Terminal Table */}
        <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 font-mono text-[11px] max-h-72 overflow-y-auto space-y-1.5 shadow-inner">
          {logs
            .filter(l => logLevelFilter === 'all' || l.level === logLevelFilter)
            .slice(0, 40)
            .map(log => (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                    log.level === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : log.level === 'warn'
                      ? 'bg-amber-500/20 text-amber-300'
                      : log.level === 'error'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            ))}
        </div>
      </div>

      {/* 🔑 MODAL: Change User Password */}
      <AnimatePresence>
        {passwordModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl p-6 space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Change User Password
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Master Owner override for {passwordModalUser.name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPasswordModalUser(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Account:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{passwordModalUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Username:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">@{passwordModalUser.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="uppercase font-bold text-amber-600 dark:text-amber-400">{passwordModalUser.role}</span>
                </div>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      required
                      value={newPasswordValue}
                      onChange={e => setNewPasswordValue(e.target.value)}
                      placeholder="Enter new password (min 3 chars)"
                      className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick password generator */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const gen = 'Pass-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '!';
                      setNewPasswordValue(gen);
                      setShowPasswordText(true);
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newPasswordValue.trim() || newPasswordValue.trim().length < 3}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📊 MODAL: Set User Daily Limit */}
      <AnimatePresence>
        {limitModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl p-6 space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Adjust Daily Verification Limit
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure check allocation for {limitModalUser.name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setLimitModalUser(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[11px]">Current Limit:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {limitModalUser.dailyLimit === 0 ? 'Unlimited (∞)' : `${limitModalUser.dailyLimit} checks/day`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">Used Today:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {limitModalUser.usedToday} checks
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveDailyLimit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Preset Allocation
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[100, 250, 500, 1000, 5000, 0].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNewLimitValue(val)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                          newLimitValue === val
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {val === 0 ? 'Unlimited (∞)' : val.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Or Enter Exact Custom Limit (0 = Unlimited)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={newLimitValue}
                    onChange={e => setNewLimitValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setLimitModalUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Save Daily Limit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
