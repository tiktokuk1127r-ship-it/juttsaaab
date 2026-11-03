import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  Trash2,
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  FileSpreadsheet,
  Globe,
  Contact,
  Building2,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CheckResult, NumberStatus } from '../types';
import { generateVCardString, getCountryMeta } from '../utils/phone';
import { ContactProfileModal } from './ContactProfileModal';

export const ResultsView: React.FC = () => {
  const { results, lastRunResults, clearResults, retryErrors } = useApp();

  const [scope, setScope] = useState<'all' | 'last'>('last');
  const [statusFilter, setStatusFilter] = useState<'all' | NumberStatus>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [inspectResult, setInspectResult] = useState<CheckResult | null>(null);

  const activeDataset: CheckResult[] = scope === 'last' ? lastRunResults : results;

  // Available countries in dataset
  const availableCountries = Array.from(new Set(activeDataset.map(r => r.countryCode))).filter(Boolean);

  const filteredResults = activeDataset.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCountry = countryFilter === 'all' || item.countryCode === countryFilter;
    const matchesSearch =
      item.number.includes(searchTerm) ||
      (item.details?.carrier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.details?.businessName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCountry && matchesSearch;
  });

  const registeredItems = activeDataset.filter(r => r.status === 'registered');
  const unregisteredItems = activeDataset.filter(r => r.status === 'unregistered');
  const errorItems = activeDataset.filter(r => r.status === 'error');

  const downloadText = (type: 'registered' | 'unregistered') => {
    const numbers = activeDataset.filter(r => r.status === type).map(r => r.number);
    if (numbers.length === 0) {
      alert(`No ${type} numbers found in current ${scope === 'last' ? 'last run' : 'all-time'} dataset.`);
      return;
    }
    const blob = new Blob([numbers.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa_${type}_${scope}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadVcf = () => {
    const valid = registeredItems.map(r => ({
      number: r.number,
      name: r.details?.businessName || `WA ${r.formattedNumber}`,
      carrier: r.details?.carrier,
    }));
    if (valid.length === 0) {
      alert('No valid WhatsApp accounts found in dataset to generate vCards.');
      return;
    }
    const vcardContent = generateVCardString(valid);
    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa_verified_contacts_${scope}_${Date.now()}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    if (activeDataset.length === 0) {
      alert('No verification data to export.');
      return;
    }
    const rows = ['phone_number,status,country_code,carrier,is_business,timestamp'];
    for (const r of activeDataset) {
      rows.push(
        `"${r.number}","${r.status}","${r.countryCode}","${r.details?.carrier || ''}","${r.details?.isBusiness ? 'yes' : 'no'}","${new Date(r.checkedAt).toISOString()}"`
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa_verification_audit_${scope}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsvSplit = (type: 'registered' | 'unregistered') => {
    const items = activeDataset.filter(r => r.status === type);
    if (items.length === 0) {
      alert(`No ${type} numbers found in current ${scope === 'last' ? 'last run' : 'all-time'} dataset.`);
      return;
    }
    const headers = type === 'registered'
      ? ['phone_number,formatted_number,status,country_code,carrier,is_business,checked_at']
      : ['phone_number,formatted_number,status,country_code,checked_at'];

    const rows = items.map(r => {
      if (type === 'registered') {
        return `"${r.number}","${r.formattedNumber}","${r.status}","${r.countryCode}","${r.details?.carrier || ''}","${r.details?.isBusiness ? 'yes' : 'no'}","${new Date(r.checkedAt).toISOString()}"`;
      }
      return `"${r.number}","${r.formattedNumber}","${r.status}","${r.countryCode}","${new Date(r.checkedAt).toISOString()}"`;
    });

    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wa_${type}_output_${scope}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBothOutputs = () => {
    if (registeredItems.length === 0 && unregisteredItems.length === 0) {
      alert('No verification data to download.');
      return;
    }
    if (registeredItems.length > 0) {
      downloadText('registered');
    }
    setTimeout(() => {
      if (unregisteredItems.length > 0) {
        downloadText('unregistered');
      }
    }, 450);
  };

  const copyValidNumbers = () => {
    const valid = registeredItems.map(r => r.number).join('\n');
    if (!valid) return;
    navigator.clipboard.writeText(valid);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  const copySingle = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Action Hub */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Verification Audit & Export Hub
            </h2>
            {/* Scope Switcher: Last Run vs All Time */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 text-xs">
              <button
                onClick={() => setScope('last')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  scope === 'last'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Latest Run ({lastRunResults.length})
              </button>
              <button
                onClick={() => setScope('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  scope === 'all'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                All-Time Archive ({results.length})
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            Download verified contacts for SMS/WhatsApp marketing campaigns. Export clean lists
            filtered by registered status, vCards for direct mobile contacts import, or full audit CSV reports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* vCard Exporter */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={downloadVcf}
            disabled={registeredItems.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-teal-500 disabled:opacity-50 transition-colors shadow-xs shadow-teal-600/20"
            title="Export .vcf file to import into Google/Apple Contacts"
          >
            <Contact className="h-4 w-4" />
            <span>Export vCard (.vcf)</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => downloadText('registered')}
            disabled={registeredItems.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-xs shadow-emerald-600/20"
          >
            <Download className="h-4 w-4" />
            <span>Valid TXT ({registeredItems.length})</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => downloadText('unregistered')}
            disabled={unregisteredItems.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Unregistered TXT</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={downloadCsv}
            disabled={activeDataset.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Full CSV Audit</span>
          </motion.button>

          {errorItems.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => retryErrors()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold transition-colors shadow-xs"
              title="Re-queue failed checks"
            >
              <RotateCw className="h-4 w-4" />
              <span>Retry Errors ({errorItems.length})</span>
            </motion.button>
          )}

          {results.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (confirm('Are you sure you want to clear all verification results?')) {
                  clearResults();
                }
              }}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors shadow-xs"
              title="Clear all records"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Dedicated Bulk Check Output Files Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: 🟩 Registered WhatsApp Output Files */}
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white dark:from-emerald-950/30 dark:via-[#0d1829] dark:to-[#0d1322] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Registered WhatsApp Numbers File</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold">
                      {registeredItems.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Active WhatsApp contacts verified and ready for campaigns
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-500/20">
            <button
              onClick={() => downloadText('registered')}
              disabled={registeredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              <span>Download Registered .TXT</span>
            </button>

            <button
              onClick={() => downloadCsvSplit('registered')}
              disabled={registeredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 text-xs font-semibold transition-colors shadow-xs disabled:opacity-40"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Download Registered .CSV</span>
            </button>

            <button
              onClick={downloadVcf}
              disabled={registeredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-500/40 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 text-xs font-semibold transition-colors shadow-xs disabled:opacity-40"
              title="Import into phone contacts"
            >
              <Contact className="h-4 w-4 text-teal-600" />
              <span>Export .VCF</span>
            </button>
          </div>
        </div>

        {/* Card 2: 🟥 Unregistered (No WhatsApp) Output Files */}
        <div className="rounded-2xl border border-rose-300 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/90 via-rose-50/40 to-white dark:from-rose-950/20 dark:via-[#16121f] dark:to-[#0d1322] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Unregistered Numbers File (No WhatsApp)</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 font-bold">
                      {unregisteredItems.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Numbers without WhatsApp account (clean from list to avoid waste)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-200/60 dark:border-rose-500/20">
            <button
              onClick={() => downloadText('unregistered')}
              disabled={unregisteredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              <span>Download Unregistered .TXT</span>
            </button>

            <button
              onClick={() => downloadCsvSplit('unregistered')}
              disabled={unregisteredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-900/50 bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-300 hover:bg-rose-50 text-xs font-semibold transition-colors shadow-xs disabled:opacity-40"
            >
              <FileSpreadsheet className="h-4 w-4 text-rose-600" />
              <span>Download Unregistered .CSV</span>
            </button>

            <button
              onClick={downloadBothOutputs}
              disabled={registeredItems.length === 0 && unregisteredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs hover:opacity-90 transition-opacity shadow-xs disabled:opacity-40"
              title="Download both registered and unregistered files in 1 click"
            >
              <Download className="h-4 w-4" />
              <span>1-Click Download Both</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dataset Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status segmented filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-1 text-xs shadow-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                statusFilter === 'all'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All ({activeDataset.length})
            </button>
            <button
              onClick={() => setStatusFilter('registered')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
                statusFilter === 'registered'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Valid ({registeredItems.length})</span>
            </button>
            <button
              onClick={() => setStatusFilter('unregistered')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
                statusFilter === 'unregistered'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Unregistered ({unregisteredItems.length})</span>
            </button>
            {errorItems.length > 0 && (
              <button
                onClick={() => setStatusFilter('error')}
                className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
                  statusFilter === 'error'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Errors ({errorItems.length})</span>
              </button>
            )}
          </div>

          {/* Country Selector Dropdown */}
          {availableCountries.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Countries ({availableCountries.length})</option>
                {availableCountries.map(cc => {
                  const meta = getCountryMeta(cc);
                  return (
                    <option key={cc} value={cc}>
                      {meta.flag} {meta.name} (+{cc})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Right side: Quick Search + Copy All Valid */}
        <div className="flex items-center gap-3">
          {registeredItems.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={copyValidNumbers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-xs"
            >
              {copiedBatch ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedBatch ? 'Copied Valid List' : 'Copy Valid List'}</span>
            </motion.button>
          )}

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search phone or carrier..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 font-mono focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] overflow-hidden shadow-xs">
        {filteredResults.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
              <Layers className="h-6 w-6" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No results found matching current filter or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                <tr>
                  <th className="py-3 px-6 font-medium">Phone Number</th>
                  <th className="py-3 px-6 font-medium">Status</th>
                  <th className="py-3 px-6 font-medium">Country / Market</th>
                  <th className="py-3 px-6 font-medium">Account / Profile Details</th>
                  <th className="py-3 px-6 font-medium">Session ID</th>
                  <th className="py-3 px-6 font-medium">Timestamp</th>
                  <th className="py-3 px-6 font-medium text-right">Profile Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredResults.map(item => {
                  const meta = getCountryMeta(item.countryCode);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setInspectResult(item)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-6 font-mono font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{item.formattedNumber}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            copySingle(item.number);
                          }}
                          className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                          title="Copy number"
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
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
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
                              <span>Not on WhatsApp</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              <span>Retry Error</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-6 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>{meta.flag}</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">+{item.countryCode}</span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[100px]">
                          {meta.name.split('&')[0]}
                        </span>
                      </td>

                      <td className="py-3 px-6 text-slate-700 dark:text-slate-300">
                        {item.details?.isBusiness ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>WhatsApp Business</span>
                          </span>
                        ) : item.details?.carrier ? (
                          <span>{item.details.carrier}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-6 font-mono text-slate-500 dark:text-slate-400">
                        {item.sessionId ? `Slot #${item.sessionId}` : 'Direct'}
                      </td>

                      <td className="py-3 px-6 font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {new Date(item.checkedAt).toLocaleTimeString()}
                      </td>

                      <td className="py-3 px-6 text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline text-[11px]">
                          View Card →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Inspection Modal */}
      <ContactProfileModal
        result={inspectResult}
        onClose={() => setInspectResult(null)}
      />
    </div>
  );
};
