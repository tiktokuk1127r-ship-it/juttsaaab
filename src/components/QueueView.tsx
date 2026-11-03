import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  Plus,
  Trash2,
  FileText,
  Layers,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Play,
  Hash,
  Tag,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RangeGeneratorModal } from './RangeGeneratorModal';
import { extractPhoneNumbersFromDirtyText } from '../utils/phone';

export const QueueView: React.FC = () => {
  const {
    queue,
    addNumbersToQueue,
    clearQueue,
    removeQueueItem,
    seedDemoQueue,
    config,
    startJob,
    setIsLiveModalOpen,
    job,
    campaigns,
    activeCampaignId,
    setActiveCampaignId,
  } = useApp();

  const [rawTextInput, setRawTextInput] = useState('');
  const [feedback, setFeedback] = useState<{ added: number; skipped: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleAddText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawTextInput.trim()) return;

    const res = addNumbersToQueue(rawTextInput, activeCampaignId);
    setFeedback(res);
    setRawTextInput('');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleFileUpload = (file: File) => {
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      if (content) {
        let res = addNumbersToQueue(content, activeCampaignId);
        // Fallback for complex CSV or dirty text
        if (res.added === 0) {
          const extracted = extractPhoneNumbersFromDirtyText(content, config.defaultCountryCode);
          if (extracted.foundNumbers.length > 0) {
            res = addNumbersToQueue(extracted.foundNumbers.join('\n'), activeCampaignId);
          }
        }
        setFeedback(res);
        setTimeout(() => setFeedback(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleStartEngine = () => {
    const err = startJob();
    if (!err) {
      setIsLiveModalOpen(true);
    }
  };

  const filteredQueue = queue.filter(num => num.includes(searchTerm));

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Verification Number Queue
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
              {queue.length} Numbers Loaded
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Import numbers via raw text paste, CSV files, or generate sequential area-code series. Invalid formats,
            duplicates, and previously verified numbers are automatically filtered out.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Series Range Generator Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsRangeModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-100/70 dark:hover:bg-teal-500/20 text-xs font-semibold transition-colors shadow-xs"
          >
            <Hash className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>Range Generator</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => seedDemoQueue(35)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white text-xs font-medium transition-colors shadow-xs"
          >
            <Layers className="h-4 w-4 text-slate-500" />
            <span>Load 35 Samples</span>
          </motion.button>

          {queue.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleStartEngine}
              disabled={job.isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs shadow-emerald-600/20 disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Verify Queue Now</span>
            </motion.button>
          )}

          {queue.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={clearQueue}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 text-xs transition-colors shadow-xs"
              title="Clear entire queue"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Input Methods: Text Paste + Drag & Drop File Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Textarea Import */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Paste Phone Numbers</h3>
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={activeCampaignId}
                onChange={e => setActiveCampaignId(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    Assign to {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleAddText} className="space-y-3">
            <textarea
              rows={6}
              value={rawTextInput}
              onChange={e => setRawTextInput(e.target.value)}
              placeholder="Paste numbers here... Example:&#10;+1 415 555 2671&#10;+44 7911 123456&#10;919876543210"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 font-mono focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none leading-relaxed transition-colors"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Default country code: <strong className="text-emerald-700 dark:text-emerald-400">+{config.defaultCountryCode || 'None'}</strong>
              </span>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!rawTextInput.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-xs shadow-emerald-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Queue</span>
              </motion.button>
            </div>
          </form>
        </div>

        {/* Drag & Drop File Area */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10'
              : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0d1322] hover:border-emerald-400 shadow-xs'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 mb-3">
            <Upload className="h-6 w-6" />
          </div>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Upload .TXT or .CSV File</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Drag and drop your contact file here, or click browse to import up to 10,000+ numbers.
          </p>

          <label className="mt-4 cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Browse Computer</span>
            <input
              type="file"
              accept=".txt,.csv,.tsv,.vcf"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Bulk File Verification Workflow & Output Indicator */}
      <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bulk File Checking & Output Engine
              </h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold">
                Auto-Split Output Files
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              File upload karne ke baad Engine check karega aur alag-alag <strong className="text-emerald-700 dark:text-emerald-400">Registered.txt / .csv</strong> aur <strong className="text-rose-700 dark:text-rose-400">Unregistered.txt / .csv</strong> output files dega.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {uploadedFileName && (
            <span className="text-xs font-mono px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs">
              📄 {uploadedFileName}
            </span>
          )}
          <button
            onClick={handleStartEngine}
            disabled={queue.length === 0 || job.isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-xs shadow-emerald-600/20 disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>{job.isRunning ? 'Engine Running Live...' : `Check File Numbers (${queue.length})`}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-200 shadow-xs"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            Added <strong className="font-mono text-emerald-950 dark:text-white">{feedback.added}</strong> new numbers to
            the verification queue (<strong className="font-mono text-slate-600 dark:text-slate-300">{feedback.skipped}</strong> duplicates or invalid numbers skipped).
          </div>
        </motion.div>
      )}

      {/* Queue Table */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800/80">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Queued Numbers ({queue.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sequential order in which numbers will be dispatched across WhatsApp session slots
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search queue..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
              <Layers className="h-6 w-6" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Queue is currently empty.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => seedDemoQueue(35)}
                className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 text-xs font-semibold hover:bg-emerald-100 transition-colors shadow-xs"
              >
                Load 35 Sample Numbers
              </button>
              <button
                onClick={() => setIsRangeModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/30 text-xs font-semibold hover:bg-teal-100 transition-colors shadow-xs"
              >
                Open Range Generator
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-6 font-medium w-16">#</th>
                  <th className="py-2.5 px-6 font-medium">Normalized Number</th>
                  <th className="py-2.5 px-6 font-medium">Estimated Carrier Routing</th>
                  <th className="py-2.5 px-6 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredQueue.map((item, idx) => (
                  <tr key={`${item}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 px-6 font-mono text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-6 font-mono font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <span>+{item}</span>
                      <button
                        onClick={() => copyToClipboard(item, idx)}
                        className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                        title="Copy number"
                      >
                        {copiedIndex === idx ? (
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-6 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      International E.164 Route
                    </td>
                    <td className="py-2.5 px-6 text-right">
                      <button
                        onClick={() => removeQueueItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Range Generator Modal */}
      <RangeGeneratorModal
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
      />
    </div>
  );
};
