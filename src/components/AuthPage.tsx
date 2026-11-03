import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Radio,
  AlertCircle,
  Sun,
  Moon,
  Server,
  Zap,
  ArrowRight,
  Smartphone,
  Layers,
  UserCheck,
  User,
  KeyRound,
  Shield,
  CheckCircle2,
  FileText,
  Scale,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { LegalModal } from './LegalModal';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, theme, toggleTheme } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Input states - initialized empty
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [name, setName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Legal Modal State
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms' | 'disclaimer' | 'antispam'>('privacy');

  const openLegal = (tab: 'privacy' | 'terms' | 'disclaimer' | 'antispam') => {
    setLegalTab(tab);
    setIsLegalOpen(true);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!emailOrUsername.trim() || !password) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = signIn(emailOrUsername.trim(), password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        setSuccessMessage(res.message);
      }
    }, 350);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupEmail.trim() || !signupPassword.trim()) {
      setErrorMessage('Please provide an email and password to create an account.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = signUp(
        name.trim() || signupEmail.split('@')[0],
        signupEmail.trim(),
        signupUsername.trim() || signupEmail.split('@')[0],
        signupPassword,
        'member'
      );
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        setSuccessMessage(res.message);
        if (res.message.includes('pending approval')) {
          setEmailOrUsername(signupEmail.trim());
          setName('');
          setSignupUsername('');
          setSignupEmail('');
          setSignupPassword('');
        }
      }
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#060a12] dark:via-[#0b101c] dark:to-[#060a12] text-slate-900 dark:text-slate-100 relative overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:bg-emerald-500/30 dark:selection:text-emerald-200 transition-colors duration-300">
      {/* Ambient background decoration with subtle lighting */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40 dark:opacity-25 z-0" />

      {/* Atmospheric lighting orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-b from-emerald-500/15 via-teal-400/10 to-transparent blur-3xl opacity-75 dark:from-emerald-500/10 dark:via-teal-500/5" />
        <div className="absolute top-1/3 -left-48 w-[400px] h-[400px] bg-emerald-400/15 dark:bg-emerald-600/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-10 -right-48 w-[420px] h-[420px] bg-teal-400/15 dark:bg-teal-600/10 blur-[100px] rounded-full" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c121e]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.05 }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-xs"
            >
              <Radio className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  WA Checker PRO
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Private Session Gate
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enterprise Multi-Session WhatsApp Verification Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Sockets Online</span>
            </div>

            {/* Theme Toggle Button (White Mode / Dark Mode) */}
            <motion.button
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={toggleTheme}
              aria-label="Toggle theme mode"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shadow-xs transition-colors cursor-pointer"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Brand Wordmark & Introduction */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-500/25 mb-3"
            >
              <Radio className="h-7 w-7" />
            </motion.div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              WA Checker PRO
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              High-throughput WhatsApp number verification with private user sessions, anti-ban pacing, and lead segmentation.
            </p>
          </div>

          {/* Luxury Authentication Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden"
          >
            {/* Segmented Mode Selector */}
            <div className="grid grid-cols-2 p-1.5 m-3 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error & Success Feedback Banners */}
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pt-3"
                >
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-200 text-xs flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{errorMessage}</div>
                  </div>
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pt-3"
                >
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{successMessage}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Container */}
            <div className="p-6 pt-4">
              {mode === 'signin' ? (
                /* Sign In Form */
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email or Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={emailOrUsername}
                        onChange={e => setEmailOrUsername(e.target.value)}
                        placeholder="Enter your email or username"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span>Keep signed in</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium text-xs cursor-pointer"
                    >
                      New user? Register
                    </button>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying credentials...</span>
                      </span>
                    ) : (
                      <>
                        <span>Sign In to Dashboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              ) : (
                /* Sign Up Form */
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        value={signupUsername}
                        onChange={e => setSignupUsername(e.target.value)}
                        placeholder="alex_growth"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Choose Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        placeholder="Enter secure password"
                        className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Legal Terms Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span>
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => openLegal('terms')}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                        >
                          Terms of Service
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          onClick={() => openLegal('privacy')}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                        >
                          Privacy Policy
                        </button>
                        .
                      </span>
                    </label>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating account...</span>
                      </span>
                    ) : (
                      <>
                        <span>Create Account & Unlock Access</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>

          {/* Feature Highlights Grid */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-xs">
              <Smartphone className="h-4 w-4 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Private Sockets</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">100% User Isolated</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-xs">
              <Zap className="h-4 w-4 mx-auto text-amber-500 mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Anti-Ban Pacing</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Gaussian Jitter</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-xs">
              <Shield className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Zero-Trace Data</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">E.164 Memory Only</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-xs">
              <Layers className="h-4 w-4 mx-auto text-purple-500 mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Split Exports</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">.txt, .csv & .vcf</div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Legal & Compliance Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#080c14]/90 backdrop-blur-md py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">WA Checker PRO</span>
            <span aria-hidden="true">·</span>
            <span>Enterprise Multi-Session WhatsApp Verification</span>
          </div>

          {/* Interactive Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button
              onClick={() => openLegal('privacy')}
              className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={() => openLegal('terms')}
              className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer"
            >
              Terms of Service (TOS)
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={() => openLegal('antispam')}
              className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer"
            >
              Anti-Spam Policy
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={() => openLegal('disclaimer')}
              className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer"
            >
              Meta Platforms Disclaimer
            </button>
          </div>
        </div>
      </footer>

      {/* Global Interactive Legal Modal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalTab}
      />
    </div>
  );
};
