import type { MaskFinding, MaskKind } from '../types';

/**
 * Length-preserving masking of sensitive values for display.
 *
 * The masked copy has exactly the same UTF-16 length as the input so that
 * evidence offsets computed on the raw text remain valid on the masked text.
 * Nothing here talks to a network or persists data.
 */

export interface MaskResult {
  masked: string;
  findings: MaskFinding[];
}

interface MaskRule {
  kind: MaskKind;
  label: string;
  regex: RegExp;
  /** Returns a replacement with exactly the same length as `match`. */
  mask(match: string, groups: string[]): string;
}

const MASK_CHAR = '*';

function maskDigitsExceptLast(value: string, keepLast: number): string {
  let digitsSeen = 0;
  const totalDigits = (value.match(/\d/g) ?? []).length;
  let out = '';
  for (const ch of value) {
    if (/\d/.test(ch)) {
      digitsSeen += 1;
      out += totalDigits - digitsSeen < keepLast ? ch : MASK_CHAR;
    } else {
      out += ch;
    }
  }
  return out;
}

function maskPhone(value: string): string {
  // Keep the first digit group (up to 3 digits) and the last 4 digits.
  const totalDigits = (value.match(/\d/g) ?? []).length;
  let digitsSeen = 0;
  let firstGroupOpen = true;
  let out = '';
  for (const ch of value) {
    if (/\d/.test(ch)) {
      digitsSeen += 1;
      const keep = (firstGroupOpen && digitsSeen <= 3) || totalDigits - digitsSeen < 4;
      out += keep ? ch : MASK_CHAR;
    } else {
      if (digitsSeen > 0) firstGroupOpen = false;
      out += ch;
    }
  }
  return out;
}

const BUSINESS_REGISTRATION = /^\d{3}-\d{2}-\d{5}$/;

const RULES: MaskRule[] = [
  {
    kind: 'resident_registration',
    label: '주민등록번호로 보이는 값',
    regex: /(?<!\d)(\d{6})(-?)([1-8]\d{6})(?!\d)/g,
    mask: (_m, groups) => `${groups[0]}${groups[1]}${MASK_CHAR.repeat(groups[2].length)}`,
  },
  {
    kind: 'card_number',
    label: '카드번호로 보이는 값',
    regex: /(?<!\d)\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}(?!\d)/g,
    mask: (m) => maskDigitsExceptLast(m, 4),
  },
  {
    kind: 'phone',
    label: '전화번호로 보이는 값',
    regex: /(?<![\d+])(?:\+82[- ]?|0)1[016789][- ]?\d{3,4}[- ]?\d{4}(?!\d)|(?<![\d+])0\d{1,2}[- ]\d{3,4}[- ]\d{4}(?!\d)|(?<![\d+])\+\d{1,3}[- ]?\d{2,4}[- ]?\d{3,4}[- ]?\d{3,4}(?!\d)/g,
    mask: (m) => maskPhone(m),
  },
  {
    kind: 'bank_account',
    label: '계좌번호로 보이는 값',
    regex: /(?<![\d-])\d{2,6}-\d{2,6}-\d{2,8}(?:-\d{2,6})?(?![\d-])/g,
    mask: (m) => (BUSINESS_REGISTRATION.test(m) ? m : maskDigitsExceptLast(m, 4)),
  },
  {
    kind: 'bank_account',
    label: '계좌번호로 보이는 값',
    regex: /(?<![\d-])\d{10,14}(?![\d-])/g,
    mask: (m) => maskDigitsExceptLast(m, 4),
  },
  {
    kind: 'email',
    label: '이메일 주소',
    regex: /([A-Za-z0-9._%+-]+)(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    mask: (_m, groups) => {
      const local = groups[0];
      const kept = local.slice(0, 1);
      return `${kept}${MASK_CHAR.repeat(local.length - kept.length)}${groups[1]}`;
    },
  },
  {
    kind: 'secret',
    label: '비밀번호·인증번호로 보이는 값',
    regex: /((?:비밀번호|패스워드|password|passcode|인증번호|인증 ?코드|verification code|one-time code|otp|pin ?code|pin|핀 ?번호)(?:\s*(?:는|은|이|가|is|:|：|=)?\s*))([A-Za-z0-9!@#$%^&*._-]{4,})(?![가-힣A-Za-z0-9])/gi,
    mask: (_m, groups) => `${groups[0]}${MASK_CHAR.repeat(groups[1].length)}`,
  },
  {
    kind: 'passport',
    label: '여권번호로 보이는 값',
    regex: /((?:여권\s*(?:번호)?|passport\s*(?:no\.?|number)?)\s*[:：]?\s*)([A-Z]{1,2}\d{7,8})(?![A-Za-z0-9])/gi,
    mask: (_m, groups) => `${groups[0]}${MASK_CHAR.repeat(groups[1].length)}`,
  },
];

interface Replacement {
  start: number;
  end: number;
  replacement: string;
  kind: MaskKind;
  label: string;
}

/** Masks sensitive values. The result keeps the exact length of the input. */
export function maskSensitiveText(text: string): MaskResult {
  const accepted: Replacement[] = [];
  const overlaps = (start: number, end: number) =>
    accepted.some((r) => start < r.end && end > r.start);

  for (const rule of RULES) {
    const re = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : `${rule.regex.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(start, end)) continue;
      const replacement = rule.mask(m[0], m.slice(1));
      if (replacement.length !== m[0].length) {
        throw new Error(`mask rule ${rule.kind} changed the text length`);
      }
      if (replacement === m[0]) continue;
      accepted.push({ start, end, replacement, kind: rule.kind, label: rule.label });
    }
  }

  accepted.sort((a, b) => a.start - b.start);
  let masked = '';
  let cursor = 0;
  for (const r of accepted) {
    masked += text.slice(cursor, r.start) + r.replacement;
    cursor = r.end;
  }
  masked += text.slice(cursor);

  const findings: MaskFinding[] = accepted.map((r) => ({
    kind: r.kind,
    start: r.start,
    end: r.end,
    label: r.label,
  }));
  return { masked, findings };
}

/** Korean labels for finding kinds. */
export const MASK_KIND_LABELS: Record<MaskKind, string> = {
  resident_registration: '주민등록번호',
  bank_account: '계좌번호',
  card_number: '카드번호',
  phone: '전화번호',
  email: '이메일',
  secret: '비밀번호·인증번호',
  passport: '여권번호',
};
