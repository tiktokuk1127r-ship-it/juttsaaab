import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Filter, Check, Copy, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { extractPhoneNumbersFromDirtyText } from '../utils/phone';

interface NumberExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NumberExtractorModal: React.FC<NumberExtractorModalProps> = ({ isOpen, onClose }) => {
  const { config, addNumbersToQueue } = useApp();

  const [dirtyText, setDirtyText] = useState('');
  const [extractedNumbers, setExtractedNumbers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleExtract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirtyText.trim()) return;

    const res = extractPhoneNumbersFromDirtyText(dirtyText, config.defaultCountryCode);
    setExtractedNumbers(res.foundNumbers);
  };

  const handleInjectQueue = () => {
    if (extractedNumbers.length === 0) return;
    addNumbersToQueue(extractedNumbers.join('\n'));
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedNumbers.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl overflow-hidden p-6 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Raw Text & Email Phone Extractor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scrapes and normalizes phone numbers from messy emails, raw chat exports, or HTML tables
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

        <form onSubmit={handleExtract} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Paste Messy Text, Raw Emails, or Unstructured Data:
            </label>
            <textarea
              rows={5}
              value={dirtyText}
              onChange={e => setDirtyText(e.target.value)}
              placeholder="Paste any messy text containing numbers...&#10;e.g. 'Contact John at +1 (415) 555-2671 or email him. Office: 44-7911-123456...'"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 font-mono focus:border-emerald-500 focus:outline-none resize-none leading-relaxed transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Default country code: <strong className="text-emerald-700 dark:text-emerald-400">+{config.defaultCountryCode || 'None'}</strong>
            </span>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!dirtyText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-xs shadow-emerald-600/20"
            >
              <Sparkles className="h-4 w-4 fill-current" />
              <span>Extract Phone Numbers</span>
            </motion.button>
          </div>
        </form>

        {/* Extracted Preview Area */}
        {extractedNumbers.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Found {extractedNumbers.length} Valid Normalized Numbers:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy Clean List'}</span>
                </button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 space-y-1">
              {extractedNumbers.map((num, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="font-semibold">+{num}</span>
                  <span className="text-[10px] text-slate-400">Item #{i + 1}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs transition-colors"
              >
                Close
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleInjectQueue}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs shadow-emerald-600/20"
              >
                <Layers className="h-4 w-4" />
                <span>Inject Clean Numbers into Queue</span>
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
