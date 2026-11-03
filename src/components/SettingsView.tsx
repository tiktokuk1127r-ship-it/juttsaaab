import React from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Globe,
  Sliders,
  Volume2,
  Check,
  Wrench,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundFx } from '../utils/audio';

export const SettingsView: React.FC = () => {
  const { config, updateConfig, addLog } = useApp();

  const handlePacingPreset = (min: number, max: number) => {
    updateConfig({ minDelay: min, maxDelay: max });
    addLog('info', `Pacing delay set to ${min}s - ${max}s.`);
  };

  const handleMaxPerRun = (val: number) => {
    updateConfig({ maxPerRun: val });
    addLog('info', `Max verification target per batch run updated to ${val}.`);
  };

  const handleToggleMaintenance = () => {
    const nextState = !config.maintenance.on;
    updateConfig({
      maintenance: {
        ...config.maintenance,
        on: nextState,
        since: nextState ? Date.now() : 0,
      },
    });
    addLog(
      nextState ? 'warn' : 'success',
      nextState
        ? 'Maintenance Mode activated. Member verification jobs suspended.'
        : 'Maintenance Mode deactivated. System operational.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">System Settings & Engine Rules</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Configure anti-ban rate limiting, session concurrency pacing, default international calling codes,
          and global maintenance protection.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Pacing & Delays */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Verification Pacing & Anti-Ban Delay</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pacing between consecutive checks on each active WhatsApp session
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {[
              { label: 'Safe', min: 6, max: 12, desc: '6–12s (Max Safety)' },
              { label: 'Balanced', min: 4, max: 8, desc: '4–8s (Recommended)' },
              { label: 'Turbo', min: 2, max: 5, desc: '2–5s (Fast Mode)' },
            ].map(preset => {
              const isSelected =
                config.minDelay === preset.min && config.maxDelay === preset.max;

              return (
                <button
                  key={preset.label}
                  onClick={() => handlePacingPreset(preset.min, preset.max)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-950 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{preset.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">{preset.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Custom delay slider */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Custom Delay Range</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">
                {config.minDelay}s – {config.maxDelay}s
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Min Delay (sec)</label>
                <input
                  type="number"
                  min={1}
                  max={config.maxDelay}
                  value={config.minDelay}
                  onChange={e =>
                    updateConfig({ minDelay: Math.max(1, Number(e.target.value)) })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Max Delay (sec)</label>
                <input
                  type="number"
                  min={config.minDelay}
                  max={30}
                  value={config.maxDelay}
                  onChange={e =>
                    updateConfig({ maxDelay: Math.max(config.minDelay, Number(e.target.value)) })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Max Per Run & Batch Caps */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Batch Run Target Cap</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maximum quantity of numbers to process in a single continuous verification run
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2">
            {[500, 1000, 5000, 10000].map(val => {
              const isSelected = config.maxPerRun === val;
              return (
                <button
                  key={val}
                  onClick={() => handleMaxPerRun(val)}
                  className={`py-2 px-3 rounded-xl border text-center font-mono text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {val.toLocaleString()}
                </button>
              );
            })}
          </div>

          {/* Sound & Feedback Preferences */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-900 dark:text-white">Audio Synthesizer Sound FX</span>
              </div>
              <button
                onClick={() => updateConfig({ soundEnabled: !config.soundEnabled })}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  config.soundEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    config.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {config.soundEnabled && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Audio Profile Theme:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['crisp', 'cyber', 'gentle', 'chime'] as const).map(theme => (
                    <button
                      key={theme}
                      onClick={() => {
                        updateConfig({ soundTheme: theme });
                        soundFx.theme = theme;
                        soundFx.playCheckHit('registered');
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-xs capitalize transition-colors ${
                        (config.soundTheme || 'crisp') === theme
                          ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-semibold shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Plays crisp subtle audio blips on valid WhatsApp hits and celebratory completion chimes
            </p>
          </div>
        </div>

        {/* Default Country Calling Code */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Default Country Calling Code</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically prepended when input numbers start with leading 0 or lack country prefix
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { code: '1', label: '🇺🇸 +1 US/CA' },
              { code: '44', label: '🇬🇧 +44 UK' },
              { code: '91', label: '🇮🇳 +91 India' },
              { code: '880', label: '🇧🇩 +880 BD' },
              { code: '92', label: '🇵🇰 +92 PK' },
              { code: '971', label: '🇦🇪 +971 UAE' },
              { code: '', label: 'Off / Direct E.164' },
            ].map(item => {
              const isSelected = config.defaultCountryCode === item.code;
              return (
                <button
                  key={item.label}
                  onClick={() => updateConfig({ defaultCountryCode: item.code })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <input
              type="text"
              value={config.defaultCountryCode}
              onChange={e => updateConfig({ defaultCountryCode: e.target.value.replace(/\D/g, '') })}
              placeholder="Or enter custom country digits (e.g. 49, 33, 55)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
            />
          </div>
        </div>

        {/* Global Maintenance Mode */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Wrench className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Global Maintenance Mode</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Suspends member runs while preserving queues and admin controls
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleMaintenance}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                config.maintenance.on
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:text-white shadow-xs'
              }`}
            >
              {config.maintenance.on ? 'Active (Turn OFF)' : 'Standby (Turn ON)'}
            </button>
          </div>

          <div className="pt-2 space-y-2">
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Notice banner displayed to members during maintenance:
            </label>
            <input
              type="text"
              value={config.maintenance.message}
              onChange={e =>
                updateConfig({
                  maintenance: { ...config.maintenance, message: e.target.value },
                })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Source Code Archive (.zip) */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 space-y-4 shadow-xs lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project Source Code Archive</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Export complete source code (React, TypeScript, Baileys socket engine, Express server) in a clean ZIP bundle.
                </p>
              </div>
            </div>

            <a
              href="/download/src.zip"
              download="whatsapp-validator-src.zip"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs shadow-emerald-600/20"
            >
              <Download className="h-4 w-4" />
              <span>Download Source (.zip)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
