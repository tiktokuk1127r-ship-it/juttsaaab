import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Play,
  RotateCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Layers,
  ArrowRight,
  AlertCircle,
  Filter,
  Hash,
  Globe2,
  Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CheckResult } from '../types';
import { getCountryMeta } from '../utils/phone';
import { ContactProfileModal } from './ContactProfileModal';
import { RangeGeneratorModal } from './RangeGeneratorModal';
import { NumberExtractorModal } from './NumberExtractorModal';

interface DashboardViewProps {
  setCurrentTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setCurrentTab }) => {
  const {
    job,
    startJob,
    queue,
    results,
    readySessionsCount,
    sessions,
    singleCheck,
    retryErrors,
    seedDemoQueue,
    setIsLiveModalOpen,
    broadcastMessage,
    config,
  } = useApp();

  const [lookupInput, setLookupInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<CheckResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Modals state
  const [inspectResult, setInspectResult] = useState<CheckResult | null>(null);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [isExtractorModalOpen, setIsExtractorModalOpen] = useState(false);

  // Compute metrics
  const totalVerified = results.length;
  const registeredCount = results.filter(r => r.status === 'registered').length;
  const unregisteredCount = results.filter(r => r.status === 'unregistered').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const hitRate = totalVerified > 0 ? Math.round((registeredCount / (registeredCount + unregisteredCount || 1)) * 100) : 0;

  // Compute country distribution breakdown
  const countryDistribution = React.useMemo(() => {
    const map = new Map<string, { total: number; registered: number }>();
    for (const r of results) {
      const code = r.countryCode || '1';
      const cur = map.get(code) || { total: 0, registered: 0 };
      cur.total += 1;
      if (r.status === 'registered') cur.registered += 1;
      map.set(code, cur);
    }
    return Array.from(map.entries())
      .map(([code, stats]) => ({
        code,
        ...getCountryMeta(code),
        total: stats.total,
        registered: stats.registered,
        rate: Math.round((stats.registered / stats.total) * 100),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [results]);

  const handleSingleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupInput.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await singleCheck(lookupInput.trim());
      setLookupResult(res);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const handleStartEngine = () => {
    const err = startJob();
    if (err) {
      alert(err);
    } else {
      setIsLiveModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Broadcast Message from Owner if present */}
      {broadcastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-amber-950 dark:text-white">Notice: </span>
              <span>{broadcastMessage}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Maintenance Notice if active */}
      {config.maintenance.on && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-rose-900 dark:text-rose-200 text-sm shadow-xs">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <div>
            <span className="font-semibold text-rose-950 dark:text-white">Maintenance Mode Active: </span>
            <span>{config.maintenance.message}</span>
          </div>
        </div>
      )}

      {/* KPI Overview Grid with Motion Hover & SVG Gauge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Sessions Card */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>WhatsApp Sessions</span>
            <div className="flex items-center gap-1.5">
              {readySessionsCount > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {readySessionsCount}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">/ {sessions.length} Slots</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {readySessionsCount > 0 ? 'Multi-socket routing operational' : 'All accounts offline'}
            </span>
          </div>
        </motion.div>

        {/* Queue Count Card */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] shadow-xs hover:shadow-md hover:border-teal-500/40 transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Pending In Queue</span>
            <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-teal-600 dark:text-teal-300">
              {queue.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">numbers</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Max batch cap: </span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{config.maxPerRun}</span>
          </div>
        </motion.div>

        {/* Valid WhatsApp Accounts with SVG Circular Gauge */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Valid Accounts</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {registeredCount}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Not on WA: </span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{unregisteredCount}</span>
            </div>
          </div>

          {/* Circular SVG Hit-Rate Meter */}
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-700 ease-out"
                strokeWidth="3.5"
                strokeDasharray="88"
                strokeDashoffset={88 - (88 * hitRate) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-mono text-[11px] font-bold text-slate-800 dark:text-white tabular-nums">
              {hitRate}%
            </span>
          </div>
        </motion.div>

        {/* Engine Status Card */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] shadow-xs hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Engine Status</span>
            <Zap className={`h-4 w-4 ${job.isRunning ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tracking-tight ${
                job.isRunning
                  ? job.isPaused
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {job.isRunning
                ? job.isPaused
                  ? 'PAUSED'
                  : 'VERIFYING'
                : 'STANDBY'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {job.isRunning ? (
              <span>
                Processed <strong className="text-slate-900 dark:text-white font-mono">{job.currentCount}</strong> /{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{job.targetCount}</strong>
              </span>
            ) : (
              <span>Ready for next batch execution</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Live Multi-Socket Traffic Radar Strip */}
      <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-[#0c121e]/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">Live Socket Dispatcher:</span>{' '}
            <span className="text-slate-600 dark:text-slate-400">
              {readySessionsCount > 0
                ? `Balancing queue pacing across ${readySessionsCount} connected WhatsApp instance(s)`
                : 'Connect sessions in Sessions tab to activate high-throughput engine'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {sessions.map(s => (
            <div
              key={s.slot}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                s.status === 'ready'
                  ? s.isBusy
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 animate-pulse'
                    : 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'ready' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
              <span className="font-semibold">#{s.slot}</span>
              <span className="text-[10px] opacity-80">{s.status === 'ready' ? (s.isBusy ? 'ACTIVE' : 'IDLE') : 'OFF'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Split: Single Number Instant Lookup & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Instant Lookup + Verification Console */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Instant Single Number Lookup</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Check whether any international phone number is registered on WhatsApp right now.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-lg">
              Live Probe
            </span>
          </div>

          <form onSubmit={handleSingleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={lookupInput}
                onChange={e => setLookupInput(e.target.value)}
                placeholder="Enter phone with country code (e.g. +14155552671 or 919876543210)"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono transition-colors"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={lookupLoading || !lookupInput.trim()}
              className="rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-950 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none transition-colors whitespace-nowrap flex items-center gap-2 shadow-xs shadow-emerald-600/20"
            >
              {lookupLoading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-current" />
                  <span>Verify Number</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Lookup Error Message */}
          {lookupError && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {/* Lookup Result Card */}
          {lookupResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border transition-all ${
                lookupResult.status === 'registered'
                  ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setInspectResult(lookupResult)}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl cursor-pointer hover:scale-105 transition-transform ${
                      lookupResult.status === 'registered'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                    title="Click to view WhatsApp Profile Card"
                  >
                    {lookupResult.status === 'registered' ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <XCircle className="h-6 w-6" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInspectResult(lookupResult)}
                        className="text-base font-bold font-mono text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left"
                      >
                        {lookupResult.formattedNumber}
                      </button>
                      <button
                        onClick={() => copyToClipboard(lookupResult.number)}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                        title="Copy raw number"
                      >
                        {copiedNumber === lookupResult.number ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>Country +{lookupResult.countryCode}</span>
                      {lookupResult.details?.carrier && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{lookupResult.details.carrier}</span>
                        </>
                      )}
                      {lookupResult.details?.isBusiness && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">WhatsApp Business</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInspectResult(lookupResult)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:text-white text-xs font-medium shadow-xs transition-colors"
                  >
                    View Profile
                  </button>

                  {lookupResult.status === 'registered' && (
                    <a
                      href={`https://wa.me/${lookupResult.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 shadow-xs transition-colors"
                    >
                      <span>Open Chat</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Col: Quick Control Center */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 space-y-4 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Batch Operations</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Launch multi-session bulk verification, extract numbers from raw text, or generate series.
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={handleStartEngine}
              disabled={queue.length === 0 || job.isRunning}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 text-xs font-semibold shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Play className="h-4 w-4 fill-current text-emerald-600 dark:text-emerald-400" />
                <span>Start Batch Verification</span>
              </div>
              <span className="font-mono text-emerald-700 dark:text-slate-400">{queue.length} in Queue</span>
            </button>

            <button
              onClick={() => setIsExtractorModalOpen(true)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Extract from Messy Text / Emails</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              onClick={() => setIsRangeModalOpen(true)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Hash className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Generate Number Range Series</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              onClick={() => seedDemoQueue(35)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-slate-500" />
                <span>Load 35 Sample Numbers</span>
              </div>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-mono font-semibold">+35</span>
            </button>

            <button
              onClick={() => retryErrors()}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <RotateCw className="h-4 w-4 text-amber-500" />
                <span>Re-queue Failed Retries</span>
              </div>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{errorCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Country Reach & Hit-Rate Analytics */}
      {countryDistribution.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top Geographic Verification Markets</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Aggregated from verified results</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {countryDistribution.map(c => (
              <div
                key={c.code}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white truncate">
                    <span>{c.flag}</span>
                    <span className="truncate">{c.name.split('&')[0]}</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{c.rate}%</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden">
                  <div className="h-full bg-emerald-500 dark:bg-emerald-400" style={{ width: `${c.rate}%` }} />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>+{c.code}</span>
                  <span>{c.registered} valid / {c.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Table */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Recent Verifications</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any verified record to inspect full WhatsApp Profile & vCard export
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('results')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All ({results.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {results.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No verification records yet. Add numbers to the queue and start the engine.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-6 font-medium">Phone Number</th>
                  <th className="py-3 px-6 font-medium">Verification Status</th>
                  <th className="py-3 px-6 font-medium">Country / Routing</th>
                  <th className="py-3 px-6 font-medium">Account Details</th>
                  <th className="py-3 px-6 font-medium text-right">Inspect Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {results.slice(0, 7).map(item => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectResult(item)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-6 font-mono font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{item.formattedNumber}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          copyToClipboard(item.number);
                        }}
                        className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                        title="Copy phone"
                      >
                        {copiedNumber === item.number ? (
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
                          item.status === 'registered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : item.status === 'unregistered'
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                        }`}
                      >
                        {item.status === 'registered' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Valid WhatsApp</span>
                          </>
                        ) : item.status === 'unregistered' ? (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>Unregistered</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3" />
                            <span>Network Error</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-600 dark:text-slate-400 font-mono">
                      <span>+{item.countryCode}</span>
                      {item.sessionId && (
                        <span className="ml-2 text-slate-400 text-[11px]">
                          (Session #{item.sessionId})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-slate-700 dark:text-slate-300">
                      {item.details?.isBusiness ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Business Account</span>
                      ) : item.details?.carrier ? (
                        <span>{item.details.carrier}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline text-[11px]">
                        View Card →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Modals Mounted from Dashboard */}
      <ContactProfileModal
        result={inspectResult}
        onClose={() => setInspectResult(null)}
      />

      <RangeGeneratorModal
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
      />

      <NumberExtractorModal
        isOpen={isExtractorModalOpen}
        onClose={() => setIsExtractorModalOpen(false)}
      />
    </div>
  );
};
