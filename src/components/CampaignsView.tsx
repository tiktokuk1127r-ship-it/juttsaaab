import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Send,
  CheckCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MessageTemplate } from '../types';

export const CampaignsView: React.FC = () => {
  const {
    campaigns,
    activeCampaignId,
    setActiveCampaignId,
    createCampaign,
    templates,
    addTemplate,
    results,
  } = useApp();

  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignTag, setNewCampaignTag] = useState('');
  const [newTmplTitle, setNewTmplTitle] = useState('');
  const [newTmplBody, setNewTmplBody] = useState('');
  const [newTmplCategory, setNewTmplCategory] = useState<MessageTemplate['category']>('promo');

  const [testPhoneNumber, setTestPhoneNumber] = useState('14155552671');
  const [testRecipientName, setTestRecipientName] = useState('Alex');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [copiedLink, setCopiedLink] = useState(false);

  // Bulk dispatch simulator state
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastProgress, setBlastProgress] = useState(0);
  const [blastLogs, setBlastLogs] = useState<Array<{ number: string; status: 'sent' | 'pending' }>>([]);

  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const campaignContacts = results.filter(
    r => (r.campaignId === activeCampaignId || activeCampaignId === 'cmp_all') && r.status === 'registered'
  );

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim() || !newCampaignTag.trim()) return;
    createCampaign(newCampaignName.trim(), newCampaignTag.trim());
    setNewCampaignName('');
    setNewCampaignTag('');
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplTitle.trim() || !newTmplBody.trim()) return;
    addTemplate(newTmplTitle.trim(), newTmplBody.trim(), newTmplCategory);
    setNewTmplTitle('');
    setNewTmplBody('');
  };

  const renderInterpolatedBody = (phone?: string, name?: string) => {
    if (!activeTemplate) return '';
    return activeTemplate.body
      .replace(/{name}/g, name || testRecipientName || 'Customer')
      .replace(/{phone}/g, phone ? `+${phone.replace(/\D/g, '')}` : '+14155552671');
  };

  const generateWaLink = (phone?: string) => {
    const clean = (phone || testPhoneNumber).replace(/\D/g, '');
    const encoded = encodeURIComponent(renderInterpolatedBody(phone));
    return `https://wa.me/${clean}?text=${encoded}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generateWaLink());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStartBlastSimulator = () => {
    if (campaignContacts.length === 0) {
      alert('No verified registered WhatsApp contacts found in this campaign segment.');
      return;
    }

    setIsBlasting(true);
    setBlastProgress(0);
    const initial = campaignContacts.slice(0, 10).map(c => ({ number: c.number, status: 'pending' as const }));
    setBlastLogs(initial);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setBlastProgress(progress);
      setBlastLogs(prev =>
        prev.map((item, idx) => {
          if (idx <= Math.floor(progress / 10)) {
            return { ...item, status: 'sent' };
          }
          return item;
        })
      );

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => setIsBlasting(false), 600);
      }
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Campaigns & Message Templates
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Segment your verified WhatsApp contacts into dedicated campaigns, draft high-converting message
          templates, test 1-click WhatsApp Web links, and simulate bulk message dispatches.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Campaigns Directory */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Active Campaigns</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{campaigns.length} Segments</span>
            </div>

            <div className="space-y-2">
              {campaigns.map(camp => {
                const count = results.filter(r => r.campaignId === camp.id).length;
                const isSelected = activeCampaignId === camp.id;

                return (
                  <button
                    key={camp.id}
                    onClick={() => setActiveCampaignId(camp.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-950 dark:text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">{camp.name}</div>
                      <div className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        TAG: {camp.tag}
                      </div>
                    </div>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold shadow-xs">
                      {count} Verified
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Create Campaign */}
            <form onSubmit={handleCreateCampaign} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Add New Campaign:</span>
              <input
                type="text"
                required
                value={newCampaignName}
                onChange={e => setNewCampaignName(e.target.value)}
                placeholder="Campaign Name (e.g. VIP Buyers)"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCampaignTag}
                  onChange={e => setNewCampaignTag(e.target.value)}
                  placeholder="Tag (e.g. VIP-2026)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 whitespace-nowrap shadow-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 2 Cols: Message Templates & Live WhatsApp Click-to-Chat Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Templates list & Creator */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Message Templates</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Variables: <code className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">{'{name}'}</code>, <code className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">{'{phone}'}</code>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedTemplateId === t.id
                      ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-950 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.body}</p>
                </button>
              ))}
            </div>

            {/* Add Template */}
            <form onSubmit={handleCreateTemplate} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={newTmplTitle}
                  onChange={e => setNewTmplTitle(e.target.value)}
                  placeholder="Template Title"
                  className="col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                <select
                  value={newTmplCategory}
                  onChange={e => setNewTmplCategory(e.target.value as MessageTemplate['category'])}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none capitalize"
                >
                  <option value="promo">Promo</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>

              <textarea
                rows={2}
                required
                value={newTmplBody}
                onChange={e => setNewTmplBody(e.target.value)}
                placeholder="Template text with variables (e.g. 'Hi {name}! Check out this offer for {phone}...')"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
              />

              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-semibold shadow-xs"
              >
                Save Template
              </button>
            </form>
          </div>

          {/* Click-to-Chat Simulator */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              WhatsApp Click-to-Chat Link Dispatcher
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Recipient Phone</label>
                <input
                  type="text"
                  value={testPhoneNumber}
                  onChange={e => setTestPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={testRecipientName}
                  onChange={e => setTestRecipientName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Interpolated Live Chat Bubble Preview */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b101c] p-4 space-y-2">
              <span className="text-[11px] text-slate-500 font-mono">Chat Message Preview:</span>
              <div className="p-3.5 rounded-2xl rounded-tl-sm bg-[#005c4b] text-white text-xs max-w-md shadow-md leading-relaxed whitespace-pre-wrap">
                {renderInterpolatedBody()}
                <span className="block text-right text-[10px] text-emerald-200/70 mt-1 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </span>
              </div>
            </div>

            {/* Generated Links & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-xs"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'Copied wa.me Link' : 'Copy wa.me Link'}</span>
                </motion.button>

                <a
                  href={generateWaLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-emerald-500 transition-colors shadow-xs shadow-emerald-600/20"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Launch WhatsApp Web</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Bulk Campaign Dispatch Simulator Card */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Bulk Campaign Message Dispatch Simulator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Simulate blast delivery to verified contacts in the selected campaign segment
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleStartBlastSimulator}
                disabled={isBlasting || campaignContacts.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 font-semibold text-xs hover:bg-teal-500 disabled:opacity-50 transition-colors shadow-xs shadow-teal-600/20"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>{isBlasting ? 'Dispatching...' : `Blast to ${campaignContacts.length} Verified`}</span>
              </motion.button>
            </div>

            {/* Progress bar during blast */}
            {isBlasting && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>Dispatching messages...</span>
                  <span className="text-teal-600 dark:text-teal-400 font-bold">{blastProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div
                    className="h-full bg-teal-500 dark:bg-teal-400 transition-all duration-300"
                    style={{ width: `${blastProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Blast Log Preview */}
            {blastLogs.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                {blastLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5">
                    <span className="text-slate-700 dark:text-slate-300">+{log.number}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        log.status === 'sent' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {log.status === 'sent' ? (
                        <>
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span>Sent ✓✓</span>
                        </>
                      ) : (
                        <span>Queued...</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
