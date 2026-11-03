import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { SessionsView } from './components/SessionsView';
import { QueueView } from './components/QueueView';
import { ResultsView } from './components/ResultsView';
import { CampaignsView } from './components/CampaignsView';
import { MembersView } from './components/MembersView';
import { LogsView } from './components/LogsView';
import { SettingsView } from './components/SettingsView';
import { PhpBackendView } from './components/PhpBackendView';
import { AiHubView } from './components/AiHubView';
import { OwnerPanelView } from './components/OwnerPanelView';
import { LiveEngineModal } from './components/LiveEngineModal';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { LegalModal } from './components/LegalModal';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms' | 'disclaimer' | 'antispam'>('privacy');
  const { currentUser, job } = useApp();

  const openLegal = (tab: 'privacy' | 'terms' | 'disclaimer' | 'antispam') => {
    setLegalTab(tab);
    setIsLegalOpen(true);
  };

  // Strict Gatekeeper: No access without signing in or creating an account
  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 relative overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:bg-emerald-500/30 dark:selection:text-emerald-200 transition-colors duration-300">
      {/* Subtle Dot Grid Background */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-60 z-0" />

      {/* Ambient Animated Gradient Orbs in Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[980px] h-[480px] bg-gradient-to-b from-emerald-500/15 via-teal-400/10 to-transparent blur-3xl opacity-75 animate-pulse-glow dark:from-emerald-500/10 dark:via-teal-500/5" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-600/5 blur-3xl rounded-full animate-float-slow" />
        <div className="absolute top-2/3 -right-40 w-96 h-96 bg-teal-400/10 dark:bg-teal-600/5 blur-3xl rounded-full animate-float-slow" style={{ animationDelay: '2.5s' }} />
      </div>

      {/* 3-Zone Top Navigation Bar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container Viewport with Smooth Page Transition Physics */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.995 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentTab === 'dashboard' && <DashboardView setCurrentTab={setCurrentTab} />}
            {currentTab === 'queue' && <QueueView />}
            {currentTab === 'results' && <ResultsView />}
            {currentTab === 'ai-hub' && <AiHubView />}
            {currentTab === 'campaigns' && <CampaignsView />}
            
            {/* Admin & Owner Only Tabs */}
            {currentTab === 'sessions' && <SessionsView />}

            {currentTab === 'php' && (
              currentUser.role === 'member' ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-8 text-center space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">PHP Backend Restricted</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    PHP proxy and server configuration is restricted to System Administrators.
                  </p>
                  <button onClick={() => setCurrentTab('dashboard')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                    Return to Dashboard
                  </button>
                </div>
              ) : <PhpBackendView />
            )}

            {currentTab === 'members' && (
              currentUser.role === 'member' ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-8 text-center space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Team Management Restricted</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    User directory and quota allocations are managed exclusively by Administrators.
                  </p>
                  <button onClick={() => setCurrentTab('dashboard')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                    Return to Dashboard
                  </button>
                </div>
              ) : <MembersView />
            )}

            {currentTab === 'logs' && <LogsView />}

            {currentTab === 'settings' && (
              currentUser.role === 'member' ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-8 text-center space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">System Settings Restricted</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Engine rules, anti-ban pacing, and maintenance mode controls are restricted to Administrators and Master Owner.
                  </p>
                  <button onClick={() => setCurrentTab('dashboard')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                    Return to Dashboard
                  </button>
                </div>
              ) : <SettingsView />
            )}

            {currentTab === 'owner-panel' && <OwnerPanelView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Interactive Modals */}
      <LiveEngineModal />
      <AuthModal />

      {/* Quiet Professional Footer */}
      <footer className="border-t border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-[#080c14]/90 backdrop-blur-md py-6 px-4 text-xs text-slate-500 dark:text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">WhatsApp Number Checker PRO</span>
            <span aria-hidden="true">·</span>
            <span>Enterprise Multi-Session Engine</span>
            {job.isRunning && (
              <span className="flex items-center gap-1.5 ml-2 font-mono text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Engine Active</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Account:{' '}
              <strong className="text-slate-800 dark:text-slate-200 capitalize">{currentUser.name}</strong>{' '}
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]">
                ({currentUser.role})
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => openLegal('privacy')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => openLegal('terms')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => openLegal('disclaimer')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Meta Disclaimer
            </button>
          </div>
        </div>
      </footer>

      {/* Legal & Compliance Modal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalTab}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
