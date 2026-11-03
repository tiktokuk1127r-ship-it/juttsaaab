import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Shield,
  FileText,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ExternalLink,
  Scale,
  Database,
  Radio,
} from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'privacy' | 'terms' | 'disclaimer' | 'antispam';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'disclaimer' | 'antispam'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Legal & Compliance Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official terms, privacy framework, and Meta platform disclaimer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#0d1322] overflow-x-auto text-xs shrink-0">
          {[
            { id: 'privacy', label: 'Privacy Policy', icon: Shield },
            { id: 'terms', label: 'Terms of Service', icon: FileText },
            { id: 'antispam', label: 'Anti-Spam Policy', icon: Lock },
            { id: 'disclaimer', label: 'WhatsApp Disclaimer', icon: AlertTriangle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  1. Zero-Trace Phone Verification & Privacy Guarantee
                </h3>
                <p>
                  WA Checker PRO operates under a strict privacy-first principle. Phone numbers submitted
                  for verification are evaluated in ephemeral runtime memory solely to query WhatsApp network
                  presence (E.164 lookup). We do not store, sell, lease, or distribute your phone number lists.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <Database className="h-4 w-4" />
                  <span>Isolated User Session Architecture</span>
                </div>
                <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
                  Each user account maintains an entirely private WhatsApp socket connection. Session credentials,
                  QR pairing keys, and verification history are bound exclusively to your user ID. No other platform
                  member can see or access your linked phone number or WhatsApp sessions.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  2. Data Collection & Hashing
                </h3>
                <p>
                  We collect minimal account registration details (name, username, email, encrypted password)
                  required for account authentication and quota tracking. Audit results can be purged permanently
                  at any time using the "Clear Results" control.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  3. GDPR & CCPA Compliance
                </h3>
                <p>
                  Under European General Data Protection Regulation (GDPR) and California Consumer Privacy Act
                  (CCPA), you retain the right to export your account data snapshot or request immediate deletion
                  of your user profile.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  1. Acceptance of Terms
                </h3>
                <p>
                  By accessing or registering an account on WA Checker PRO, you agree to be bound by these
                  Terms of Service. If you do not agree with any part of these terms, you must discontinue
                  use of the platform immediately.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  2. Authorized & Permitted Use
                </h3>
                <p>
                  This service is designed exclusively for contact database cleanup, CRM hygiene, and
                  legitimate enterprise customer communications. You warrant that you have obtained consent
                  from data subjects to verify their contact reachability in compliance with applicable laws.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  3. Rate Limiting & Account Responsibilities
                </h3>
                <p>
                  Users must respect the automated anti-ban pacing intervals configured within the system.
                  You are solely responsible for all activity conducted through your authenticated sessions
                  and any WhatsApp account instances you connect.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  4. Termination of Service
                </h3>
                <p>
                  The Master Owner reserves the right to suspend or terminate accounts that breach fair usage
                  policies, attempt automated denial-of-service, or engage in abusive activity.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'antispam' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <Lock className="h-4 w-4" />
                  <span>Strict Anti-Spam Compliance Policy</span>
                </div>
                <p className="text-[11px] text-rose-900/80 dark:text-rose-200/80">
                  We enforce zero tolerance for unsolicited bulk telemarketing, phishing, or abusive broadcast
                  campaigns. Any violation results in immediate account suspension and IP revocation.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  1. Opt-In Requirement
                </h3>
                <p>
                  You agree to only verify phone numbers for contacts who have explicitly opted in to receive
                  communications from your business or organization (TCPA, CAN-SPAM, and GDPR compliance).
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  2. Prohibited Content
                </h3>
                <p>
                  The system may not be utilized to facilitate the distribution of malicious payloads, illegal
                  goods, unauthorized financial schemes, or misleading impersonations.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'disclaimer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Official Meta Platforms, Inc. Disclaimer</span>
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80">
                  WA Checker PRO is an independent tool and is NOT affiliated, associated, authorized, endorsed
                  by, or in any way officially connected with WhatsApp Inc. or Meta Platforms, Inc.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Trademark Notice
                </h3>
                <p>
                  "WhatsApp" as well as related names, marks, emblems, and images are registered trademarks
                  of Meta Platforms, Inc. Use of these terms is strictly for descriptive identification of
                  technical compatibility.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Limitation of Liability
                </h3>
                <p>
                  In no event shall the authors or platform operators be liable for any direct, indirect,
                  incidental, or consequential damages resulting from platform connection loss or changes in
                  third-party WhatsApp socket APIs.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <span className="text-[11px] text-slate-500">
            Last Updated: March 2026 · Compliant with E.164 & GDPR
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            I Understand & Agree
          </button>
        </div>
      </motion.div>
    </div>
  );
};
