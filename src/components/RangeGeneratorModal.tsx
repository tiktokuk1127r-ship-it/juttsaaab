import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Check, Hash } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface RangeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RangeGeneratorModal: React.FC<RangeGeneratorModalProps> = ({ isOpen, onClose }) => {
  const { generateNumberRange, config, campaigns, activeCampaignId, setActiveCampaignId } = useApp();

  const [countryCode, setCountryCode] = useState(config.defaultCountryCode || '1');
  const [areaCode, setAreaCode] = useState('415');
  const [startNumber, setStartNumber] = useState('5551000');
  const [count, setCount] = useState(100);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const added = generateNumberRange(countryCode, areaCode, startNumber, count);
    setGeneratedCount(added);
    setTimeout(() => {
      setGeneratedCount(null);
      onClose();
    }, 1200);
  };

  const previewSample = `+${countryCode || '1'} (${areaCode}) ${startNumber} ... to ... +${countryCode || '1'} (${areaCode}) ${
    parseInt(startNumber, 10) + count - 1
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Contiguous Number Range Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synthesize sequential phone series to discover active WhatsApp accounts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Country Code</label>
              <input
                type="text"
                required
                value={countryCode}
                onChange={e => setCountryCode(e.target.value.replace(/\D/g, ''))}
                placeholder="1"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Area / Prefix</label>
              <input
                type="text"
                required
                value={areaCode}
                onChange={e => setAreaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="415"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Start Suffix</label>
              <input
                type="text"
                required
                value={startNumber}
                onChange={e => setStartNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="5551000"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Batch Count ({count} numbers)
              </label>
              <input
                type="range"
                min={20}
                max={1000}
                step={20}
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full accent-teal-600 dark:accent-teal-400 mt-2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Campaign</label>
              <select
                value={activeCampaignId}
                onChange={e => setActiveCampaignId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.tag})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Range Preview Box */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Series Preview:</span>
            <div className="font-mono text-xs text-teal-700 dark:text-teal-300 truncate font-semibold">{previewSample}</div>
          </div>

          {generatedCount !== null && (
            <div className="p-3 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 text-xs text-teal-900 dark:text-teal-200 flex items-center gap-2">
              <Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>Successfully generated and injected {generatedCount} numbers into queue!</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 dark:bg-teal-400 text-white dark:text-slate-950 font-semibold text-xs hover:bg-teal-500 transition-colors shadow-xs shadow-teal-600/20"
            >
              <Sparkles className="h-4 w-4 fill-current" />
              <span>Generate & Inject Queue</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
