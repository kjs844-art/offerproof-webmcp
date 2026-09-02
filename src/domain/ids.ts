import { fnv1a } from './text';

/** Identifier formats from docs/webmcp/TOOL_CONTRACTS.md §2.2. */
export const ID_PATTERNS = {
  caseId: /^case_[a-z0-9]{16,64}$/,
  caseVersion: /^v[1-9][0-9]{0,8}$/,
  signalId: /^[A-Z][A-Z0-9_]{2,63}$/,
  verificationPlanId: /^plan_[a-z0-9]{16,64}$/,
  verificationStepId: /^step_[a-z0-9]{16,64}$/,
  resourceId: /^[A-Z][A-Z0-9_-]{2,63}$/,
} as const;

export type IdPrefix = 'case' | 'plan' | 'step' | 'analysis' | 'notice';

export interface IdGenerator {
  next(prefix: IdPrefix): string;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomBody(length: number): string {
  const cryptoObj = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  let out = '';
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
  }
  for (let i = 0; i < length; i += 1) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/** Production generator: opaque random IDs matching the contract patterns. */
export function createRandomIdGenerator(): IdGenerator {
  return {
    next(prefix) {
      return `${prefix}_${randomBody(24)}`;
    },
  };
}

/** Deterministic generator for tests and parity checks. */
export function createSequentialIdGenerator(seed = 'seed'): IdGenerator {
  const safeSeed = seed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'seed';
  let counter = 0;
  return {
    next(prefix) {
      counter += 1;
      const body = `${safeSeed}${String(counter).padStart(16, '0')}`;
      return `${prefix}_${body}`;
    },
  };
}

/** Deterministic, non-reversible fingerprint of the analysed input. */
export function fingerprintText(text: string): string {
  return `${fnv1a(text)}${fnv1a(text, 0x9747b28c)}`;
}

export function versionLabel(version: number): string {
  return `v${version}`;
}

export function parseVersionLabel(label: string): number | null {
  if (!ID_PATTERNS.caseVersion.test(label)) return null;
  return Number.parseInt(label.slice(1), 10);
}
