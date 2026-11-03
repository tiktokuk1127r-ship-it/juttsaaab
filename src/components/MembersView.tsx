import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Crown,
  User,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  Ban,
  LogOut,
  Key,
  Copy,
  Check,
  Lock,
  Edit3,
  X,
  Sliders,
  Sparkles,
  Activity,
  Layers,
  Calendar,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole, AuthUser } from '../types';

export const MembersView: React.FC = () => {
  const {
    currentUser,
    allUsers,
    updateUserRole,
    updateUserQuota,
    updateUserDailyLimit,
    updateUserPassword,
    setUserUnlimitedQuota,
    toggleUserBan,
    deleteUser,
    approveUser,
    rejectUser,
    signUp,
    signOut,
    regenerateApiKey,
    pendingRequests,
    approveRequest,
    rejectRequest,
    blockRequest,
    broadcastMessage,
    setBroadcastMessage,
    switchAccount,
    addLog,
  } = useApp();

  const [broadcastInput, setBroadcastInput] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New user form
  const [newForm, setNewForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'member' as UserRole,
  });

  // Password & Limit modal states
  const [passwordModalUser, setPasswordModalUser] = useState<AuthUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const [limitModalUser, setLimitModalUser] = useState<AuthUser | null>(null);
  const [newLimitValue, setNewLimitValue] = useState<number>(200);

  // Member self-service password
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [memberCurrentPass, setMemberCurrentPass] = useState('');
  const [memberNewPass, setMemberNewPass] = useState('');
  const [memberPassError, setMemberPassError] = useState<string | null>(null);
  const [memberPassSuccess, setMemberPassSuccess] = useState<string | null>(null);

  const triggerSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;
    setBroadcastMessage(broadcastInput.trim());
    addLog('info', `Broadcast announcement dispatched by ${currentUser?.name || 'Administrator'}: "${broadcastInput.trim()}"`);
    setBroadcastInput('');
    triggerSuccess('Broadcast banner updated live!');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.email.trim()) return;

    signUp(newForm.name.trim(), newForm.email.trim(), newForm.username.trim(), 'UserPass123', newForm.role);
    setIsAddModalOpen(false);
    setNewForm({ name: '', username: '', email: '', role: 'member' });
    triggerSuccess(`User ${newForm.name} enrolled into system.`);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordValue.trim()) return;
    updateUserPassword(passwordModalUser.id, newPasswordValue.trim());
    triggerSuccess(`Password for ${passwordModalUser.name} updated!`);
    setPasswordModalUser(null);
    setNewPasswordValue('');
  };

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitModalUser) return;
    updateUserDailyLimit(limitModalUser.id, newLimitValue);
    triggerSuccess(`Daily limit for ${limitModalUser.name} set to ${newLimitValue === 0 ? 'Unlimited' : newLimitValue}!`);
    setLimitModalUser(null);
  };

  const handleMemberPassChange = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberPassError(null);
    setMemberPassSuccess(null);

    if (!currentUser) return;
    if (currentUser.password && memberCurrentPass !== currentUser.password) {
      setMemberPassError('Current password does not match.');
      return;
    }
    if (!memberNewPass || memberNewPass.trim().length < 3) {
      setMemberPassError('New password must be at least 3 characters.');
      return;
    }

    updateUserPassword(currentUser.id, memberNewPass.trim());
    setMemberPassSuccess('Password updated successfully!');
    setMemberCurrentPass('');
    setMemberNewPass('');
    setTimeout(() => {
      setIsChangingPass(false);
      setMemberPassSuccess(null);
    }, 2000);
  };

  const formatExpiry = (timestamp: number) => {
    if (!timestamp) return 'No Expiry';
    const leftMs = timestamp - Date.now();
    if (leftMs <= 0) return 'Expired';
    const days = Math.floor(leftMs / (86400 * 1000));
    return `${new Date(timestamp).toLocaleDateString()} (${days}d left)`;
  };

  // If viewing as a member, show member self-service portal
  if (currentUser?.role === 'member') {
    const lim = currentUser.dailyLimit;
    const used = currentUser.usedToday;
    const remaining = lim === 0 ? 'Unlimited (∞)' : Math.max(0, lim - used);
    const percent = lim === 0 ? 0 : Math.min(100, Math.round((used / lim) * 100));

    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
                <User className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Welcome, {currentUser.name}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 uppercase">
                    Active Member
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  <span>@{currentUser.username}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentUser.email}</span>
                  <span aria-hidden="true">·</span>
                  <span>ID: {currentUser.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={signOut}
                className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 hover:bg-rose-100 text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </motion.button>
            </div>
          </div>

          {/* Member Quotas Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Today's Usage Quota</span>
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {used} / {lim === 0 ? '∞' : lim}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Remaining today: <strong className="text-slate-900 dark:text-white font-semibold">{remaining}</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Account Validity</span>
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                {formatExpiry(currentUser.expiresAt)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Automatic midnight quota reset</div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">All-Time Checks</span>
                <Layers className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                {currentUser.totalChecked.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Lifetime verified numbers</div>
            </div>
          </div>

          {/* Quota Progress Meter */}
          <div className="mt-5 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Daily Quota Usage Progress</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {lim === 0 ? 'Uncapped' : `${percent}% (${used} used, ${remaining} left)`}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: lim === 0 ? '100%' : `${percent}%` }}
              />
            </div>
          </div>

          {/* Member Password Change Box */}
          <div className="mt-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Security & Password</span>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingPass(!isChangingPass)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {isChangingPass ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {isChangingPass && (
              <form onSubmit={handleMemberPassChange} className="space-y-3 pt-2">
                {memberPassError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 text-xs">
                    {memberPassError}
                  </div>
                )}
                {memberPassSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs">
                    {memberPassSuccess}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={memberCurrentPass}
                      onChange={e => setMemberCurrentPass(e.target.value)}
                      placeholder="Current password"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={memberNewPass}
                      onChange={e => setMemberNewPass(e.target.value)}
                      placeholder="New password (min 3 chars)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Save New Password
                </button>
              </form>
            )}
          </div>

          {/* Member REST API Key */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Personal API Key:</span>
              <code className="text-xs font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                {currentUser.apiKey}
              </code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentUser.apiKey);
                triggerSuccess('API Key copied to clipboard!');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 self-start sm:self-auto cursor-pointer"
            >
              Copy API Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Owner & Admin View
  const pendingApprovals = allUsers.filter(u => u.isPendingApproval);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl text-xs font-semibold"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              User & Privilege Management
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-semibold">
              {currentUser?.role === 'owner' ? '👑 OWNER CONSOLE' : '🛡️ ADMIN CONSOLE'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Manage authenticated accounts, approve pending registrations, set daily limits, reset passwords, and toggle suspensions.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs shadow-emerald-600/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Enroll New Account</span>
        </motion.button>
      </div>

      {/* Pending Account Approvals Notice */}
      {pendingApprovals.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-400 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <Clock className="h-4 w-4 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Pending New User Registrations ({pendingApprovals.length})</span>
            </div>
            <button
              onClick={() => {
                pendingApprovals.forEach(u => approveUser(u.id));
                triggerSuccess(`Approved all ${pendingApprovals.length} pending accounts!`);
              }}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              Approve All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingApprovals.map(u => (
              <div key={u.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">{u.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                  <div className="text-[10px] text-slate-400">@{u.username}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      approveUser(u.id);
                      triggerSuccess(`Approved ${u.name}!`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      rejectUser(u.id);
                      triggerSuccess(`Rejected registration for ${u.name}.`);
                    }}
                    className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Reject"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast Announcement Bar */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
            <Send className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Broadcast Global Announcement</span>
          </div>
          {broadcastMessage && (
            <button
              onClick={() => setBroadcastMessage(null)}
              className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
            >
              Clear Current Broadcast
            </button>
          )}
        </div>

        <form onSubmit={handleBroadcast} className="flex gap-2">
          <input
            type="text"
            value={broadcastInput}
            onChange={e => setBroadcastInput(e.target.value)}
            placeholder="Type notice message (e.g. 'Server maintenance scheduled for 02:00 UTC')..."
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!broadcastInput.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 disabled:opacity-50 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
          >
            Broadcast
          </motion.button>
        </form>
      </div>

      {/* Directory Table */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Registered Accounts ({allUsers.length})</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full user registry with roles, quotas, password updates, and administrative controls
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-6 font-medium">User Profile</th>
                <th className="py-3 px-6 font-medium">System Role</th>
                <th className="py-3 px-6 font-medium">Daily Limit Control</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium">Total Checked</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {allUsers.map(u => {
                const isBanned = u.isBanned;
                const isOwnerAccount = u.role === 'owner';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {currentUser && u.id === currentUser.id && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">(You)</span>
                        )}
                        {u.isPendingApproval && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold uppercase">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {u.email} · @{u.username}
                      </div>
                    </td>

                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase ${
                          u.role === 'owner'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                            : u.role === 'admin'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                        }`}
                      >
                        {u.role === 'owner' && <Crown className="h-3 w-3" />}
                        {u.role === 'admin' && <Shield className="h-3 w-3" />}
                        {u.role === 'member' && <User className="h-3 w-3" />}
                        <span>{u.role}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-6 font-mono">
                      <div className="flex items-center gap-2">
                        {u.dailyLimit === 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">Unlimited (∞)</span>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white tabular-nums">{u.dailyLimit}</span>
                            <span className="text-slate-400 text-[10px] ml-1">({u.usedToday} used)</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setLimitModalUser(u);
                            setNewLimitValue(u.dailyLimit);
                          }}
                          className="p-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-500 text-[10px] cursor-pointer"
                          title="Change limit"
                        >
                          <Edit3 className="h-3 w-3 text-emerald-500" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-6">
                      {u.isPendingApproval ? (
                        <button
                          onClick={() => approveUser(u.id)}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                      ) : isBanned ? (
                        <span className="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
                          <Ban className="h-3 w-3" />
                          <span>Suspended</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                      {u.totalChecked.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPasswordModalUser(u);
                            setNewPasswordValue('');
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                          title="Change user password"
                        >
                          <Lock className="h-3 w-3 text-amber-500" />
                          <span>Pass</span>
                        </button>

                        <button
                          onClick={() => switchAccount(u.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Switch to this account"
                        >
                          Login As
                        </button>

                        {/* Owner only controls */}
                        {currentUser?.role === 'owner' && !isOwnerAccount && (
                          <>
                            <button
                              onClick={() => toggleUserBan(u.id)}
                              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                isBanned ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isBanned ? 'Unban' : 'Suspend'}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Remove user ${u.name}?`)) {
                                  deleteUser(u.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Enroll New Account</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newForm.name}
                  onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="e.g. Nathan Drake"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newForm.email}
                  onChange={e => setNewForm({ ...newForm, email: e.target.value })}
                  placeholder="nathan@company.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={newForm.username}
                  onChange={e => setNewForm({ ...newForm, username: e.target.value })}
                  placeholder="nathan_d"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select
                  value={newForm.role}
                  onChange={e => setNewForm({ ...newForm, role: e.target.value as UserRole })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Password Modal */}
      <AnimatePresence>
        {passwordModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reset Password: {passwordModalUser.name}
                </h3>
                <button onClick={() => setPasswordModalUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    value={newPasswordValue}
                    onChange={e => setNewPasswordValue(e.target.value)}
                    placeholder="Enter new password (min 3 chars)"
                    className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 cursor-pointer"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const gen = 'Pass-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '!';
                      setNewPasswordValue(gen);
                      setShowPasswordText(true);
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    Auto-Generate Password
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Limit Modal */}
      <AnimatePresence>
        {limitModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Set Daily Limit: {limitModalUser.name}
                </h3>
                <button onClick={() => setLimitModalUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLimit} className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[100, 250, 500, 1000, 5000, 0].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewLimitValue(val)}
                      className={`py-2 px-2 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                        newLimitValue === val
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {val === 0 ? 'Unlimited' : val}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Custom Daily Limit (0 = Unlimited)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newLimitValue}
                    onChange={e => setNewLimitValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setLimitModalUser(null)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Apply Limit
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
