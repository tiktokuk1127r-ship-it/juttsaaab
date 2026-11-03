import React from 'react';
import { Play, Activity, Radio, User, Crown, Shield, Sun, Moon, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const {
    job,
    startJob,
    setIsLiveModalOpen,
    readySessionsCount,
    currentUser,
    signOut,
    setIsAuthModalOpen,
    setAuthModalMode,
    queue,
    theme,
    toggleTheme,
  } = useApp();

  const isMember = currentUser?.role === 'member';
  const isOwner = currentUser?.role === 'owner';

  const navLinks = isMember
    ? [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'sessions', label: 'WhatsApp Sessions' },
        { id: 'queue', label: 'Number Queue' },
        { id: 'results', label: 'Audit Results' },
        { id: 'ai-hub', label: 'AI Intelligence 🧠' },
        { id: 'campaigns', label: 'Campaigns & Chat' },
        { id: 'logs', label: 'Live Logs' },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'sessions', label: 'WhatsApp Sessions' },
        { id: 'queue', label: 'Number Queue' },
        { id: 'results', label: 'Audit Results' },
        { id: 'ai-hub', label: 'AI Intelligence 🧠' },
        { id: 'php', label: 'PHP Backend' },
        { id: 'campaigns', label: 'Campaigns & Chat' },
        { id: 'members', label: 'Team & Members' },
        { id: 'logs', label: 'Live Logs' },
        { id: 'settings', label: 'Settings' },
        ...(isOwner ? [{ id: 'owner-panel', label: 'Owner Panel 👑' }] : []),
      ];

  const handlePrimaryAction = () => {
    if (job.isRunning) {
      setIsLiveModalOpen(true);
    } else {
      const err = startJob();
      if (!err) {
        setIsLiveModalOpen(true);
      }
    }
  };

  const handleOpenProfile = () => {
    setAuthModalMode('profile');
    setIsAuthModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-[#0d131f]/95 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single element brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-all shadow-xs"
            >
              <Radio className="h-5 w-5" />
            </motion.div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                WA Checker PRO
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Multi-Session Engine</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                  {readySessionsCount} Active
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden xl:flex items-center gap-5 text-sm font-medium">
          {navLinks.map(link => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {link.label}
                {link.id === 'queue' && queue.length > 0 && (
                  <span className="ml-1.5 font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                    {queue.length}
                  </span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="navbar-active-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme Toggle, User Auth Badge & Primary Action */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Theme Toggle Button (Light White / Dark) */}
          <motion.button
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={toggleTheme}
            aria-label="Toggle theme mode"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shadow-xs transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400" />
            )}
          </motion.button>

          {/* User Account Profile Pill & Role Badge */}
          {currentUser && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <motion.button
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenProfile}
                title="Click to view and edit your profile, API keys, and limits"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/90 hover:border-emerald-400 dark:hover:border-emerald-500/40 text-left transition-all shadow-xs cursor-pointer group"
              >
                <div className="relative">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs shadow-xs ${
                      currentUser.role === 'owner'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : currentUser.role === 'admin'
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {currentUser.role === 'owner' ? (
                      <Crown className="h-4 w-4" />
                    ) : currentUser.role === 'admin' ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>

                <div className="flex flex-col">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-none flex items-center gap-1.5">
                    <span className="truncate max-w-[120px] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {currentUser.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        currentUser.role === 'owner'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          : currentUser.role === 'admin'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    <span>Quota:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {currentUser.dailyLimit === 0 ? 'Unlimited' : `${currentUser.usedToday}/${currentUser.dailyLimit}`}
                    </strong>
                  </div>
                </div>
              </motion.button>

              {/* Sign Out Action Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={signOut}
                title="Sign out of account"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shadow-xs cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            </div>
          )}

          {/* Primary Verification Action */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrimaryAction}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
              job.isRunning
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 animate-pulse'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400'
            }`}
          >
            {job.isRunning ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                <span>Checking ({job.currentCount}/{job.targetCount})</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Start Engine</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Mobile nav links strip */}
      <div className="xl:hidden flex items-center gap-2 overflow-x-auto px-4 py-2.5 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/60 text-xs">
        {navLinks.map(link => (
          <button
            key={link.id}
            onClick={() => setCurrentTab(link.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition-colors ${
              currentTab === link.id
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </header>
  );
};
