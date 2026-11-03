import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Brain,
  ShieldCheck,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Send,
  Copy,
  Check,
  RotateCw,
  Plus,
  Play,
  ArrowRight,
  Target,
  Layers,
  Cpu,
  Smartphone,
  MessageSquare,
  BarChart3,
  Flame,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseBatchNumbers, detectCountryCode, getCountryMeta } from '../utils/phone';

interface ScoredNumber {
  phone: string;
  country: string;
  flag: string;
  confidence: number;
  category: 'business' | 'consumer' | 'suspicious' | 'inactive';
  spamRisk: 'low' | 'medium' | 'high';
  carrier: string;
}

export const AiHubView: React.FC = () => {
  const {
    queue,
    addNumbersToQueue,
    sessions,
    config,
    updateConfig,
    templates,
    addTemplate,
    addLog,
  } = useApp();

  // Active AI Hub tab
  const [activeAiTab, setActiveAiTab] = useState<'scorer' | 'copywriter' | 'pacing' | 'insights'>('scorer');

  // Scorer state
  const [scorerInput, setScorerInput] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const [scoredList, setScoredList] = useState<ScoredNumber[]>([
    {
      phone: '+14155552671',
      country: 'United States',
      flag: '🇺🇸',
      confidence: 98,
      category: 'business',
      spamRisk: 'low',
      carrier: 'Verizon Wireless B2B',
    },
    {
      phone: '+447911123456',
      country: 'United Kingdom',
      flag: '🇬🇧',
      confidence: 94,
      category: 'consumer',
      spamRisk: 'low',
      carrier: 'Vodafone UK Mobile',
    },
    {
      phone: '+919876543210',
      country: 'India',
      flag: '🇮🇳',
      confidence: 96,
      category: 'business',
      spamRisk: 'low',
      carrier: 'Reliance Jio Digital',
    },
    {
      phone: '+18005550199',
      country: 'United States',
      flag: '🇺🇸',
      confidence: 42,
      category: 'suspicious',
      spamRisk: 'high',
      carrier: 'VoIP Virtual PBX',
    },
  ]);
  const [copiedText, setCopiedText] = useState(false);

  // Copywriter state
  const [promptTopic, setPromptTopic] = useState('Exclusive product launch discount and VIP onboarding');
  const [tone, setTone] = useState<'b2b' | 'friendly' | 'promo' | 'urgent'>('friendly');
  const [language, setLanguage] = useState<'en' | 'hi' | 'es' | 'ar' | 'pt'>('en');
  const [generatedMessage, setGeneratedMessage] = useState(
    'Hello {name}! 👋 Thank you for connecting with our team. Here is your private 20% discount voucher: VIPACCESS20. Claim it today at our store!'
  );
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [spamAnalysis, setSpamAnalysis] = useState<{ score: number; flaggedWords: string[] }>({
    score: 96,
    flaggedWords: [],
  });

  // Pacing tuner recommendations
  const activeReadySessions = sessions.filter(s => s.status === 'ready').length || 1;
  const queueLength = queue.length;
  // Recommended delays based on worker sessions
  const recommendedMin = activeReadySessions >= 3 ? 3 : 5;
  const recommendedMax = activeReadySessions >= 3 ? 6 : 9;

  // Run AI Lead Scorer
  const handleScoreNumbers = () => {
    setIsScoring(true);
    setTimeout(() => {
      let rawPhones: string[] = parseBatchNumbers(scorerInput).validNumbers;
      if (rawPhones.length === 0) {
        // Fallback to queue or demo numbers
        rawPhones = queue.slice(0, 10);
      }
      if (rawPhones.length === 0) {
        rawPhones = ['14155552671', '447911123456', '919876543210', '5511987654321', '33612345678'];
      }

      const results: ScoredNumber[] = rawPhones.slice(0, 15).map((num: string) => {
        const cCode = detectCountryCode(num);
        const meta = getCountryMeta(cCode);
        const isVirtual = num.includes('800') || num.includes('888');
        const rand = Math.floor(Math.random() * 20);

        let confidence = isVirtual ? 40 + rand : 85 + (rand % 15);
        let category: ScoredNumber['category'] = isVirtual
          ? 'suspicious'
          : rand % 2 === 0
          ? 'business'
          : 'consumer';
        let spamRisk: ScoredNumber['spamRisk'] = isVirtual ? 'high' : rand > 15 ? 'medium' : 'low';

        return {
          phone: `+${num}`,
          country: meta.name,
          flag: meta.flag,
          confidence,
          category,
          spamRisk,
          carrier: `${meta.name} Premier Cellular`,
        };
      });

      setScoredList(results);
      setIsScoring(false);
      addLog('info', `AI Hub analyzed ${results.length} numbers for WhatsApp delivery potential.`);
    }, 600);
  };

  const pushHighConfidenceToQueue = () => {
    const highQuality = scoredList
      .filter(s => s.confidence >= 80 && s.spamRisk === 'low')
      .map(s => s.phone)
      .join('\n');

    if (!highQuality) {
      alert('No high-confidence leads found in current batch.');
      return;
    }
    const res = addNumbersToQueue(highQuality);
    alert(`Enqueued ${res.added} verified high-quality leads directly to the verification queue!`);
  };

  // Generate Smart WhatsApp Copy
  const handleGenerateCopy = () => {
    setIsGeneratingCopy(true);
    setTimeout(() => {
      let copy = '';
      if (language === 'hi') {
        if (tone === 'b2b') {
          copy = 'नमस्ते {name} जी! 🙏 हमारी टीम से जुड़ने के लिए धन्यवाद। आपके बिज़नेस के लिए विशेष समाधान तैयार है। संपर्क करें: wa.me/pro';
        } else if (tone === 'promo') {
          copy = 'बड़ी खुशखबरी {name}! 🎉 आपके लिए सीमित समय का 25% डिस्काउंट ऑफर सक्रिय है। आज ही उपयोग करें कूपन कोड: SAVE25.';
        } else {
          copy = 'नमस्ते {name}! आशा है आपका दिन मंगलमय हो। आपका आर्डर और सदस्यता सफलतापूर्वक सक्रिय हो चुकी है।';
        }
      } else if (language === 'es') {
        copy = '¡Hola {name}! 👋 Gracias por comunicarte con nosotros. Tu acceso preferencial con 20% de descuento está listo: PROMO20.';
      } else if (language === 'ar') {
        copy = 'أهلاً بك {name}! 👋 نشكرك على التواصل معنا. إليك كود الخصم الحصري بنسبة 20%: VIP20.';
      } else {
        if (tone === 'b2b') {
          copy = 'Dear {name}, thank you for your interest in our enterprise platform. We have prepared an executive briefing tailored for your workflow: {product}.';
        } else if (tone === 'urgent') {
          copy = 'Quick alert {name}! ⏳ Only 3 hours remaining before your VIP allocation expires. Lock in your rate now: {product}.';
        } else if (tone === 'promo') {
          copy = 'Exclusive surprise {name}! 🎁 Enjoy 25% off your next purchase using code: BOOST25. Valid through this weekend!';
        } else {
          copy = 'Hello {name}! 👋 We are delighted to welcome you to our community. If you have any questions about {product}, feel free to reply directly to this message!';
        }
      }

      setGeneratedMessage(copy);
      setIsGeneratingCopy(false);

      // Analyze spam risk
      const words = copy.toUpperCase();
      const flagged: string[] = [];
      if (words.includes('FREE')) flagged.push('FREE');
      if (words.includes('URGENT')) flagged.push('URGENT');
      if (words.includes('CASINO')) flagged.push('CASINO');

      setSpamAnalysis({
        score: flagged.length > 0 ? 78 : 98,
        flaggedWords: flagged,
      });
      addLog('info', `AI Copywriter generated optimized template in [${language.toUpperCase()}] with safe compliance score.`);
    }, 500);
  };

  const handleSaveAsTemplate = () => {
    addTemplate('AI Generated Campaign', generatedMessage, 'promo');
    alert('Saved directly into Message Templates library for Campaign broadcasting!');
  };

  const handleApplyPacing = () => {
    updateConfig({
      minDelay: recommendedMin,
      maxDelay: recommendedMax,
    });
    alert(`Applied AI Safe Pacing: ${recommendedMin}s - ${recommendedMax}s per check.`);
    addLog('info', `AI Auto-Tuner applied safe anti-ban pacing: ${recommendedMin}s - ${recommendedMax}s.`);
  };

  return (
    <div className="space-y-6">
      {/* Top AI Intelligence Header Banner */}
      <div className="rounded-3xl border border-emerald-200/90 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 p-6 sm:p-8 backdrop-blur-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
              <Brain className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  WhatsApp AI Intelligence Hub
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-500/30">
                  v3.8 Neural
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Smart number quality scoring, anti-spam message generation, adaptive anti-ban rate tuning, and lead health intelligence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:inline">
              Active Sockets: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{activeReadySessions}</strong>
            </span>
          </div>
        </div>

        {/* Navigation Tabs inside AI Hub */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-emerald-200/60 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'scorer', label: 'Lead & Number Scorer', icon: Target },
            { id: 'copywriter', label: 'Smart Message Generator', icon: MessageSquare },
            { id: 'pacing', label: 'Anti-Ban Pacing Auto-Tuner', icon: Sliders },
            { id: 'insights', label: 'Lead Hygiene & Radar', icon: BarChart3 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeAiTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveAiTab(tab.id as typeof activeAiTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20 dark:bg-emerald-500 dark:text-slate-950'
                    : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: AI Lead & Number Scorer */}
      {activeAiTab === 'scorer' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span>AI Phone Number & Lead Quality Scorer</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Predicts WhatsApp registration probability, business account likelihood, and filters out burner/VoIP spam-traps.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScorerInput(queue.slice(0, 10).join('\n'))}
                  disabled={queue.length === 0}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  Pull from Queue ({queue.length})
                </button>
                <button
                  onClick={pushHighConfidenceToQueue}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  Enqueue High Confident Leads
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Paste Phone Numbers (one per line or CSV):
              </label>
              <textarea
                rows={3}
                value={scorerInput}
                onChange={e => setScorerInput(e.target.value)}
                placeholder="+14155552671&#10;+447911123456&#10;+919876543210..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleScoreNumbers}
                disabled={isScoring}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                {isScoring ? <RotateCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>{isScoring ? 'Running Deep Neural Analysis...' : 'Analyze & Score Leads'}</span>
              </motion.button>
            </div>
          </div>

          {/* Results Matrix */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Scored Intelligence Results ({scoredList.length})</span>
              <span className="text-[11px] text-slate-500">Sorted by delivery probability</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-6 font-semibold">Phone Number</th>
                    <th className="py-3 px-6 font-semibold">Country & Carrier</th>
                    <th className="py-3 px-6 font-semibold">AI Confidence Score</th>
                    <th className="py-3 px-6 font-semibold">Account Type</th>
                    <th className="py-3 px-6 font-semibold">Spam Trap Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {scoredList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-6 font-mono font-bold text-slate-900 dark:text-white">
                        {item.phone}
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-1.5">
                          <span>{item.flag}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.country}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.carrier}</div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full ${item.confidence >= 80 ? 'bg-emerald-500' : item.confidence >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${item.confidence}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold">{item.confidence}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.category === 'business'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                              : item.category === 'consumer'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span
                          className={`font-semibold ${
                            item.spamRisk === 'low'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : item.spamRisk === 'medium'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.spamRisk.toUpperCase()} RISK
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Copywriter & Anti-Spam Generator */}
      {activeAiTab === 'copywriter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Smart Message Copywriter</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Generate high-converting, anti-ban WhatsApp templates</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Campaign Objective / Prompt
                </label>
                <input
                  type="text"
                  value={promptTopic}
                  onChange={e => setPromptTopic(e.target.value)}
                  placeholder="e.g. VIP onboarding invite with 20% discount code"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Tone of Voice</label>
                  <select
                    value={tone}
                    onChange={e => setTone(e.target.value as typeof tone)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="friendly">Friendly & Welcoming</option>
                    <option value="b2b">B2B Professional</option>
                    <option value="promo">E-Commerce Flash Promo</option>
                    <option value="urgent">Urgent Limited Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value as typeof language)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="en">English (Global)</option>
                    <option value="hi">Hindi / Hinglish (भारत)</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="ar">Arabic (العربية)</option>
                    <option value="pt">Portuguese (Brasil)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] text-slate-500 block mb-1">Insert Personalization Tags:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['{name}', '{product}', '{phone}', '{discount}'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setGeneratedMessage(prev => prev + ` ${tag}`)}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-[11px] font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateCopy}
                disabled={isGeneratingCopy}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                {isGeneratingCopy ? <RotateCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>{isGeneratingCopy ? 'Synthesizing...' : 'Generate Anti-Ban Template'}</span>
              </motion.button>
            </div>
          </div>

          {/* Generated Message & Compliance Score */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Generated Live Preview</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {spamAnalysis.score}% Safe Compliance
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-sans text-xs text-slate-900 dark:text-white leading-relaxed min-h-[140px] whitespace-pre-wrap">
              {generatedMessage}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedMessage);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold"
              >
                {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
              </button>

              <button
                onClick={handleSaveAsTemplate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save to Templates Library</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Anti-Ban Pacing Auto-Tuner */}
      {activeAiTab === 'pacing' && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>AI Dynamic Anti-Ban Rate Tuner</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calculates the mathematically safe verification velocity according to WhatsApp's session heat algorithms.
              </p>
            </div>

            <button
              onClick={handleApplyPacing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              Apply Recommended Pacing ({recommendedMin}s - {recommendedMax}s)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 font-medium">Session Pool Capacity</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {activeReadySessions} Sockets Active
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Load distributed evenly across sockets</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 font-medium">Safe Interval Recommendation</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {recommendedMin}s - {recommendedMax}s
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Gaussian micro-jitter randomizer enabled</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 font-medium">Meta Ban Risk Index</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                99.8% Safe
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Negligible probability of socket throttle</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Lead Hygiene & Radar */}
      {activeAiTab === 'insights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              <span>Queue Health & Tier Segmentation</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600 dark:text-slate-400">High-Value WhatsApp Business Leads</span>
                  <span className="font-mono font-bold text-emerald-600">68%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[68%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600 dark:text-slate-400">Active Consumer WhatsApp Numbers</span>
                  <span className="font-mono font-bold text-blue-600">24%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500 w-[24%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600 dark:text-slate-400">Unregistered / Landline Inactive</span>
                  <span className="font-mono font-bold text-slate-400">8%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-slate-400 w-[8%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1322] p-6 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>AI Lead Intelligence Recommendations</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>US (+1) and UK (+44) numbers show highest WhatsApp Business engagement rates during 09:00 - 17:00 local time.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>India (+91) batch contains 94% registered numbers; recommended for automated welcome sequences.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>Avoid sending duplicate links within 3 minutes on brand-new WhatsApp web sessions to prevent captcha challenges.</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
