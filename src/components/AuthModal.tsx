import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  LogIn,
  UserPlus,
  Key,
  ShieldCheck,
  Copy,
  Check,
  RotateCw,
  Crown,
  Shield,
  User,
  Terminal,
  LogOut,
  Lock,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    currentUser,
    signIn,
    signUp,
    signOut,
    regenerateApiKey,
    updateUserPassword,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Self-service password change states
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState<string | null>(null);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);
    if (!email.trim()) return;

    const res = signIn(email.trim(), password.trim());
    if (res.success) {
      setIsAuthModalOpen(false);
    } else {
      setFeedbackError(res.message);
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);
    if (!name.trim() || !email.trim()) return;

    const res = signUp(name.trim(), email.trim(), username.trim(), password || 'UserPass123', 'member');
    if (res.success) {
      if (res.message.includes('pending approval')) {
        setFeedbackSuccess(res.message);
      } else {
        setIsAuthModalOpen(false);
      }
    } else {
      setFeedbackError(res.message);
    }
  };

  const handleChangeMyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError(null);
    setPassChangeSuccess(null);

    if (!currentUser) return;
    if (currentUser.password && currentPassInput !== currentUser.password) {
      setPassChangeError('Current password does not match.');
      return;
    }
    if (!newPassInput || newPassInput.trim().length < 3) {
      setPassChangeError('New password must be at least 3 characters.');
      return;
    }

    updateUserPassword(currentUser.id, newPassInput.trim());
    setPassChangeSuccess('Your password has been successfully updated!');
    setCurrentPassInput('');
    setNewPassInput('');
    setTimeout(() => {
      setIsChangingPass(false);
      setPassChangeSuccess(null);
    }, 2000);
  };

  const copyKey = () => {
    if (currentUser?.apiKey) {
      navigator.clipboard.writeText(currentUser.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const sampleCurl = `curl -X POST https://api.wachecker.pro/v1/check \\
  -H "Authorization: Bearer ${currentUser?.apiKey || 'wac_live_...'}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone": "+14155552671"}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // Quota metrics
  const limit = currentUser?.dailyLimit ?? 200;
  const used = currentUser?.usedToday ?? 0;
  const remaining = limit === 0 ? 'Unlimited (∞)' : Math.max(0, limit - used);
  const percentUsed = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              {authModalMode === 'profile' ? (
                <ShieldCheck className="h-5 w-5" />
              ) : authModalMode === 'signup' ? (
                <UserPlus className="h-5 w-5" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {authModalMode === 'profile'
                  ? 'User Profile & Account Insights'
                  : authModalMode === 'signup'
                  ? 'Create New Account'
                  : 'Account Sign In'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {authModalMode === 'profile'
                  ? 'Personal check usage, daily limits, security, and API credentials'
                  : 'Access enterprise WhatsApp number verification engine'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {feedbackError && (
            <div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{feedbackError}</span>
            </div>
          )}

          {feedbackSuccess && (
            <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{feedbackSuccess}</span>
            </div>
          )}

          {authModalMode === 'signin' && (
            <div className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address or Username
                  </label>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email or username"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs shadow-emerald-600/20 cursor-pointer"
                >
                  Sign In to Platform
                </motion.button>
              </form>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setFeedbackError(null);
                    setFeedbackSuccess(null);
                    setAuthModalMode('signup');
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            </div>
          )}

          {authModalMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jordan Vance"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jordan@company.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="jordan_v"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Choose Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Choose secure password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs shadow-emerald-600/20 mt-2 cursor-pointer"
              >
                Register Account
              </motion.button>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackError(null);
                    setFeedbackSuccess(null);
                    setAuthModalMode('signin');
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {authModalMode === 'profile' && currentUser && (
            <div className="space-y-5">
              {/* Profile Card Header */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-base shadow-sm ${
                      currentUser.role === 'owner'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                        : currentUser.role === 'admin'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                    }`}
                  >
                    {currentUser.role === 'owner' ? (
                      <Crown className="h-6 w-6" />
                    ) : currentUser.role === 'admin' ? (
                      <Shield className="h-6 w-6" />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{currentUser.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          currentUser.role === 'owner'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                            : currentUser.role === 'admin'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                        }`}
                      >
                        {currentUser.role === 'owner' ? '👑 Master Owner' : currentUser.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {currentUser.email} · @{currentUser.username}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    signOut();
                  }}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Usage Analytics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Used Today</span>
                  </div>
                  <div className="mt-1 text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {used.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Remaining: <strong className="text-emerald-600 dark:text-emerald-400">{remaining}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                    <Layers className="h-3.5 w-3.5 text-blue-500" />
                    <span>All-Time Checked</span>
                  </div>
                  <div className="mt-1 text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {currentUser.totalChecked.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Lifetime verifications
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                    <span>Daily Quota</span>
                  </div>
                  <div className="mt-1 text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {limit === 0 ? '∞ Unlimited' : `${limit}/day`}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Resets midnight
                  </div>
                </div>
              </div>

              {/* Quota Progress Bar */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Daily Quota Consumption
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {limit === 0 ? '100% Uncapped' : `${percentUsed}% (${used}/${limit})`}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: limit === 0 ? '100%' : `${percentUsed}%` }}
                    transition={{ duration: 0.6 }}
                    className={`h-full rounded-full ${
                      percentUsed > 90
                        ? 'bg-rose-500'
                        : percentUsed > 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Available: {remaining}</span>
                  <span>Batch Max: {currentUser.maxPerRun} numbers</span>
                </div>
              </div>

              {/* Self-service password changer */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Account Security & Password
                    </span>
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
                  <form onSubmit={handleChangeMyPassword} className="space-y-3 pt-2">
                    {passChangeError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
                        {passChangeError}
                      </div>
                    )}
                    {passChangeSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs">
                        {passChangeSuccess}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassInput}
                        onChange={e => setCurrentPassInput(e.target.value)}
                        placeholder="Current password"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassInput}
                        onChange={e => setNewPassInput(e.target.value)}
                        placeholder="New password (min 3 chars)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      Update My Password
                    </button>
                  </form>
                )}
              </div>

              {/* Developer API Key Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                    <Key className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>REST Webhook & API Key</span>
                  </div>
                  <button
                    onClick={() => regenerateApiKey(currentUser.id)}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw className="h-3 w-3" />
                    <span>Regenerate Key</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300">
                  <span className="truncate flex-1">{currentUser.apiKey}</span>
                  <button
                    onClick={copyKey}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                    title="Copy API key"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* cURL Code Snippet */}
                <div className="rounded-2xl border border-slate-800 bg-[#0a0e17] p-3 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Terminal className="h-3 w-3 text-emerald-400" />
                      <span>API Probe Example</span>
                    </span>
                    <button
                      onClick={copyCurl}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedCurl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>Copy cURL</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                    {sampleCurl}
                  </pre>
                </div>

                {/* Direct Source Code Zip Export */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <a
                    href="/download/src.zip"
                    download="whatsapp-validator-src.zip"
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                        <Download className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Download Application Source Code
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          Complete source package (src.zip · Baileys + React + Express)
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
                      .ZIP
                    </span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
