/**
 * Phone number normalization, extraction, vCard exporter and utility functions
 */

export interface NormalizedPhone {
  raw: string;
  normalized: string;
  formatted: string;
  countryCode: string;
  isValid: boolean;
}

export const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
  '1': { name: 'United States & Canada', flag: '🇺🇸' },
  '44': { name: 'United Kingdom', flag: '🇬🇧' },
  '91': { name: 'India', flag: '🇮🇳' },
  '880': { name: 'Bangladesh', flag: '🇧🇩' },
  '92': { name: 'Pakistan', flag: '🇵🇰' },
  '971': { name: 'United Arab Emirates', flag: '🇦🇪' },
  '62': { name: 'Indonesia', flag: '🇮🇩' },
  '55': { name: 'Brazil', flag: '🇧🇷' },
  '49': { name: 'Germany', flag: '🇩🇪' },
  '33': { name: 'France', flag: '🇫🇷' },
  '966': { name: 'Saudi Arabia', flag: '🇸🇦' },
  '234': { name: 'Nigeria', flag: '🇳🇬' },
  '34': { name: 'Spain', flag: '🇪🇸' },
  '39': { name: 'Italy', flag: '🇮🇹' },
  '61': { name: 'Australia', flag: '🇦🇺' },
  '7': { name: 'Russia & Kazakhstan', flag: '🇷🇺' },
  '81': { name: 'Japan', flag: '🇯🇵' },
  '82': { name: 'South Korea', flag: '🇰🇷' },
  '20': { name: 'Egypt', flag: '🇪🇬' },
  '27': { name: 'South Africa', flag: '🇿🇦' },
  '90': { name: 'Turkey', flag: '🇹🇷' },
  '52': { name: 'Mexico', flag: '🇲🇽' },
};

export function normalizePhoneNumber(raw: string, defaultCc: string = ''): NormalizedPhone {
  const cleanDefaultCc = defaultCc.replace(/\D/g, '');
  let digits = raw.replace(/\D/g, '');

  // If phone starts with '0' or local prefix and a default CC is set, replace leading 0 with default CC
  if (cleanDefaultCc && digits.startsWith('0')) {
    digits = cleanDefaultCc + digits.slice(1);
  } else if (cleanDefaultCc && digits.length >= 7 && digits.length <= 10 && !digits.startsWith(cleanDefaultCc)) {
    digits = cleanDefaultCc + digits;
  }

  const isValid = digits.length >= 7 && digits.length <= 15;
  const countryCode = detectCountryCode(digits);

  return {
    raw,
    normalized: digits,
    formatted: digits ? `+${digits}` : '',
    countryCode,
    isValid,
  };
}

export function detectCountryCode(digits: string): string {
  // 3-digit prefixes
  const three = digits.slice(0, 3);
  if (['880', '971', '966', '234'].includes(three)) return three;

  // 2-digit prefixes
  const two = digits.slice(0, 2);
  if (['44', '91', '92', '62', '55', '49', '33', '34', '39', '61', '81', '82', '20', '27', '90', '52'].includes(two)) {
    return two;
  }

  // 1-digit prefixes
  const one = digits.slice(0, 1);
  if (['1', '7'].includes(one)) return one;

  return three || two || one || '1';
}

export function getCountryMeta(code: string): { name: string; flag: string } {
  return COUNTRY_NAMES[code] || { name: `Country (+${code})`, flag: '🌐' };
}

export function parseBatchNumbers(text: string, defaultCc: string = ''): {
  validNumbers: string[];
  skippedCount: number;
  totalParsed: number;
} {
  const tokens = text.split(/[\r\n,;\t]+/);
  const seen = new Set<string>();
  const validNumbers: string[] = [];
  let skippedCount = 0;

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const parsed = normalizePhoneNumber(trimmed, defaultCc);
    if (!parsed.isValid || seen.has(parsed.normalized)) {
      skippedCount++;
      continue;
    }

    seen.add(parsed.normalized);
    validNumbers.push(parsed.normalized);
  }

  return {
    validNumbers,
    skippedCount,
    totalParsed: validNumbers.length + skippedCount,
  };
}

/**
 * Extracts phone numbers from messy dirty text, emails, chat dumps
 */
export function extractPhoneNumbersFromDirtyText(text: string, defaultCc: string = ''): {
  foundNumbers: string[];
  count: number;
} {
  // Regex finding phone like patterns with optional +, spaces, dashes, parentheses
  const phonePattern = /(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}/g;
  const matches = text.match(phonePattern) || [];
  const seen = new Set<string>();
  const foundNumbers: string[] = [];

  for (const m of matches) {
    const normalized = normalizePhoneNumber(m, defaultCc);
    if (normalized.isValid && !seen.has(normalized.normalized)) {
      seen.add(normalized.normalized);
      foundNumbers.push(normalized.normalized);
    }
  }

  return {
    foundNumbers,
    count: foundNumbers.length,
  };
}

export function generateVCardString(numbers: Array<{ number: string; name?: string; carrier?: string }>): string {
  const cards: string[] = [];
  for (const item of numbers) {
    const formatted = `+${item.number.replace(/\D/g, '')}`;
    const contactName = item.name || `WA ${formatted}`;
    cards.push([
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contactName}`,
      `TEL;TYPE=CELL,VOICE:${formatted}`,
      `NOTE:Verified WhatsApp Contact · ${item.carrier || 'WhatsApp Account'}`,
      'END:VCARD',
    ].join('\n'));
  }
  return cards.join('\n\n');
}

export function generateSampleNumbers(count: number = 25, defaultCc: string = '1'): string[] {
  const ccList = defaultCc ? [defaultCc] : ['1', '44', '91', '971', '49'];
  const samples: string[] = [];

  for (let i = 0; i < count; i++) {
    const cc = ccList[Math.floor(Math.random() * ccList.length)];
    let localDigits = '';
    const len = cc === '1' ? 10 : 9;
    for (let d = 0; d < len; d++) {
      if (d === 0) {
        localDigits += Math.floor(Math.random() * 8 + 2).toString();
      } else {
        localDigits += Math.floor(Math.random() * 10).toString();
      }
    }
    samples.push(`${cc}${localDigits}`);
  }

  return samples;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  if (m < 60) return `${m}m ${remSec.toString().padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  const remMin = m % 60;
  return `${h}h ${remMin.toString().padStart(2, '0')}m`;
}

export function formatProgressBar(ratio: number, length: number = 16): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * length);
  return '▰'.repeat(filled) + '▱'.repeat(length - filled);
}
