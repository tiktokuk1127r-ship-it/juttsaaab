import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Terminal, Copy, Trash2, Check, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogEntry } from '../types';

export const LogsView: React.FC = () => {
  const { logs, clearLogs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | LogEntry['level']>('all');
  const [copied, setCopied] = useState(false);

  const filteredLogs = logs.filter(log => {
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Live Ring Buffer & System Event Logs
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
              {logs.length} Buffered Events
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time telemetry stream tracking WhatsApp session socket handshakes, routing ticks, rate
            limit throttling, and batch verification checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied Log Trace' : 'Copy All Logs'}</span>
          </motion.button>

          {logs.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={clearLogs}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors shadow-xs"
              title="Clear ring buffer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-1 text-xs shadow-xs">
          {(['all', 'info', 'success', 'warn', 'error'] as const).map(lvl => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`capitalize px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                levelFilter === lvl
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search log messages..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 font-mono focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Terminal Monospace Stream Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0a0e17] overflow-hidden shadow-md">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs font-semibold text-slate-300">
              wa-checker.log ~ buffer depth 50
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live Telemetry</span>
        </div>

        <div className="p-4 font-mono text-xs overflow-y-auto max-h-[500px] space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-600">
              No matching log records found in current ring buffer.
            </div>
          ) : (
            filteredLogs.map(l => (
              <div
                key={l.id}
                className="flex items-start gap-3 py-1 px-2 rounded hover:bg-slate-900/60 transition-colors leading-relaxed"
              >
                <span className="text-slate-500 shrink-0 tabular-nums">[{l.timestamp}]</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                    l.level === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : l.level === 'warn'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : l.level === 'error'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {l.level}
                </span>
                <span
                  className={
                    l.level === 'error'
                      ? 'text-rose-300'
                      : l.level === 'warn'
                      ? 'text-amber-200'
                      : l.level === 'success'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }
                >
                  {l.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
