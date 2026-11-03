import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Building2,
  Download,
  Send,
  Phone,
} from 'lucide-react';
import { CheckResult } from '../types';
import { getCountryMeta, generateVCardString } from '../utils/phone';

interface ContactProfileModalProps {
  result: CheckResult | null;
  onClose: () => void;
}

export const ContactProfileModal: React.FC<ContactProfileModalProps> = ({ result, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const countryMeta = getCountryMeta(result.countryCode);
  const isRegistered = result.status === 'registered';
  const isBusiness = result.details?.isBusiness ?? false;

  const copyNumber = () => {
    navigator.clipboard.writeText(result.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadVCard = () => {
    const vcard = generateVCardString([
      {
        number: result.number,
        name: result.details?.businessName || `WA ${result.formattedNumber}`,
        carrier: result.details?.carrier,
      },
    ]);
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact_${result.number}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl overflow-hidden"
      >
        {/* Banner with country flag & status */}
        <div className="relative h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-black/20 px-2.5 py-1 rounded-xl backdrop-blur-xs font-semibold">
            <span>{countryMeta.flag}</span>
            <span>{countryMeta.name}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-black/20 text-white hover:bg-black/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile Avatar & Header */}
        <div className="px-6 pb-6 pt-0 relative space-y-4">
          <div className="-mt-12 flex items-end justify-between">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white dark:border-[#0d1424] bg-emerald-50 text-emerald-600 dark:bg-gradient-to-br dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-400 text-2xl font-bold shadow-md">
                {isBusiness ? <Building2 className="h-9 w-9" /> : <Phone className="h-9 w-9" />}
              </div>
              {isRegistered && (
                <div
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs"
                  title="Verified WhatsApp Account"
                >
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isRegistered && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadVCard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition-colors shadow-xs"
                  title="Export vCard to Phone / Google Contacts"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>vCard</span>
                </motion.button>
              )}

              <button
                onClick={copyNumber}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs"
                title="Copy phone number"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Contact Name & Number */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">{result.formattedNumber}</h3>
              {isBusiness && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 uppercase tracking-wide">
                  Business
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {result.details?.businessName || (isRegistered ? 'Active WhatsApp Subscriber' : 'Unregistered Mobile Number')}
            </p>
          </div>

          {/* Detail Attributes */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            {/* Status Line */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-mono">WhatsApp Status / About:</span>
              <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed italic">
                "{result.details?.about || (isRegistered ? 'Hey there! I am using WhatsApp.' : 'No WhatsApp profile active.')}"
              </p>
            </div>

            {/* Grid properties */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Mobile Carrier</span>
                <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block truncate">
                  {result.details?.carrier || 'International Cellular'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Estimated Timezone</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block truncate">
                  {result.details?.timezone || 'UTC / Local'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Verified via Session #{result.sessionId || 1}</span>
              <span>{new Date(result.checkedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            {isRegistered ? (
              <a
                href={`https://wa.me/${result.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs shadow-emerald-600/20"
              >
                <Send className="h-4 w-4" />
                <span>Launch Direct Chat</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <div className="w-full text-center py-2 text-xs text-slate-500">
                Account is not registered on the WhatsApp network.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
