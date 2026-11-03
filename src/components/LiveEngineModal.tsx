import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Clock,
  Zap,
  Contact,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDuration, formatProgressBar, generateVCardString } from '../utils/phone';

export const LiveEngineModal: React.FC = () => {
  const {
    job,
    pauseJob,
    resumeJob,
    stopJob,
    queue,
    isLiveModalOpen,
    setIsLiveModalOpen,
    config,
    updateConfig,
    sessions,
    lastRunResults,
  } = useApp();

  if (!isLiveModalOpen) return null;

  const target = Math.max(1, job.targetCount);
  const progressRatio = job.currentCount / target;
  const percent = Math.min(100, Math.round(progressRatio * 100));

  const elapsedSeconds = job.startedAt ? Math.floor((Date.now() - job.startedAt) / 1000) : 0;
  const etaSeconds =
    job.currentCount > 0 && job.isRunning && !job.isPaused
      ? Math.floor((elapsedSeconds / job.currentCount) * (target - job.currentCount))
      : 0;

  const activeSession = sessions.find(s => s.isBusy) || sessions.find(s => s.status === 'ready');
  const isFinished = !job.isRunning && job.currentCount > 0;

  // Export functions for latest run
  const downloadTextList = (type: 'registered' | 'unregistered') => {
    const numbers = lastRunResults
      .filter(r => r.status === type)
      .map(r => r.number);
    const blob = new Blob([numbers.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa_${type}_run_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRunCsv = () => {
    const rows = ['phone_number,status,country_code,carrier,is_business,checked_at'];
    for (const r of lastRunResults) {
      rows.push(
        `"${r.number}","${r.status}","${r.countryCode}","${r.details?.carrier || ''}","${r.details?.isBusiness ? 'yes' : 'no'}","${new Date(r.checkedAt).toISOString()}"`
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa_verification_run_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRunVcf = () => {
    const valid = lastRunResults
      .filter(r => r.status === 'registered')
      .map(r => ({
        number: r.number,
        name: r.details?.businessName || `WA ${r.formattedNumber}`,
        carrier: r.details?.carrier,
      }));
    if (valid.length === 0) return;
    const vcard = generateVCardString(valid);
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa_run_${Date.now()}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-3 w-3 rounded-full ${
                job.isRunning
                  ? job.isPaused
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-500 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isFinished
                  ? 'Batch Verification Completed'
                  : job.isPaused
                  ? 'Verification Engine Paused'
                  : job.isRunning
                  ? 'Live Verification Engine'
                  : 'Engine Standby'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-session load balancer active across {sessions.filter(s => s.status === 'ready').length} accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateConfig({ soundEnabled: !config.soundEnabled })}
              className={`p-2 rounded-xl border transition-colors ${
                config.soundEnabled
                  ? 'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700'
              }`}
              title={config.soundEnabled ? 'Mute sound effects' : 'Enable audio feedback'}
            >
              {config.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsLiveModalOpen(false)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Main Progress Bar & Visualizer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{percent}%</span>
                <span>({job.currentCount} of {job.targetCount} Verified)</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Remaining Queue: <span className="text-slate-900 dark:text-white font-semibold">{queue.length}</span>
              </span>
            </div>

            {/* Visual Fluid Progress Bar with Shimmer & Glow */}
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-400 relative transition-all duration-300"
                style={{ width: `${percent}%` }}
              >
                {/* Animated shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </motion.div>
            </div>

            {/* Monospace ASCII block representation & Throughput Velocity */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-900 font-mono text-xs text-emerald-700 dark:text-emerald-400/90 flex items-center justify-between select-none">
              <span className="tracking-widest">{formatProgressBar(progressRatio, 24)}</span>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-sans">
                {elapsedSeconds > 2 && job.currentCount > 0 && (
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                    ~{Math.round((job.currentCount / elapsedSeconds) * 60)}/min
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span>Pacing: {config.minDelay}s - {config.maxDelay}s</span>
              </div>
            </div>
          </div>

          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700 dark:text-emerald-400/80 font-semibold">Valid WhatsApp</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {job.counts.registered}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {job.currentCount > 0
                  ? `${Math.round((job.counts.registered / job.currentCount) * 100)}% hit rate`
                  : '0% hit rate'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Not on WhatsApp</span>
                <XCircle className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {job.counts.unregistered}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {job.currentCount > 0
                  ? `${Math.round((job.counts.unregistered / job.currentCount) * 100)}% of checked`
                  : '0% of checked'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700 dark:text-amber-400/80 font-semibold">Network Retries</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {job.counts.error}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Auto-retry handled</div>
            </div>
          </div>

          {/* Active Checker Ticker & Current Account */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Elapsed: <strong className="text-slate-900 dark:text-white font-mono">{formatDuration(elapsedSeconds)}</strong></span>
                {job.isRunning && !job.isPaused && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>ETA: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatDuration(etaSeconds)}</strong></span>
                  </>
                )}
              </span>

              {activeSession && (
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Router: Session #{activeSession.slot}</span>
                  {activeSession.phoneNumber && (
                    <span className="font-mono text-slate-500 dark:text-slate-400">+{activeSession.phoneNumber}</span>
                  )}
                </span>
              )}
            </div>

            {/* Last Checked Number Animation Card */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Last Verified: </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white ml-1">
                    {job.lastChecked ? `+${job.lastChecked.number}` : 'Awaiting next number in queue...'}
                  </span>
                </div>
              </div>

              {job.lastChecked && (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg ${
                    job.lastChecked.status === 'registered'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                      : job.lastChecked.status === 'unregistered'
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                  }`}
                >
                  {job.lastChecked.status === 'registered'
                    ? 'VALID WHATSAPP'
                    : job.lastChecked.status === 'unregistered'
                    ? 'UNREGISTERED'
                    : 'ERROR'}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80">
            {job.isRunning ? (
              <div className="flex items-center gap-2">
                {job.isPaused ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={resumeJob}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Resume Engine</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={pauseJob}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition-colors shadow-xs"
                  >
                    <Pause className="h-3.5 w-3.5 fill-current" />
                    <span>Pause</span>
                  </motion.button>
                )}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={stopJob}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-xs font-semibold transition-colors shadow-xs"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop Engine</span>
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
                >
                  Close Window
                </button>
              </div>
            )}

            {/* Instant Download of Last Run Data */}
            {lastRunResults.length > 0 && (
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadRunVcf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-100 text-xs font-semibold transition-colors shadow-xs"
                  title="Download .vcf contact card for Google / Apple Contacts"
                >
                  <Contact className="h-3.5 w-3.5" />
                  <span>vCard (.vcf)</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => downloadTextList('registered')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-semibold transition-colors shadow-xs"
                  title="Download clean text list of valid WhatsApp numbers"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Valid TXT ({job.counts.registered})</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadRunCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition-colors shadow-xs"
                  title="Download full CSV report of this run"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Full Run CSV</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
