/**
 * Offset-preserving text utilities for the deterministic engine.
 *
 * Every helper keeps UTF-16 offsets aligned with the original pasted text so
 * that evidence can always be reproduced with `offerText.slice(start, end)`.
 */

export interface TextMatch {
  start: number;
  end: number;
  text: string;
}

export interface Sentence {
  index: number;
  start: number;
  end: number;
  text: string;
}

/**
 * Lower-cases the text character by character, keeping the UTF-16 length of
 * every character unchanged (characters whose lower-case form has a different
 * length are left as they are).
 */
export function foldCase(text: string): string {
  let out = '';
  for (const ch of text) {
    const lower = ch.toLowerCase();
    out += lower.length === ch.length ? lower : ch;
  }
  return out;
}

/** Sentence terminators: ./!/? (only when followed by whitespace or end) and full-width forms, plus line breaks. */
const BOUNDARY = /[.!?]+(?=\s|$)|[。！？]+|\n/g;
const TRAILING_TERMINATORS = /[\s.!?。！？]+$/;
const LEADING_SPACE = /^\s+/;

/** Splits text into sentence spans. Spans exclude surrounding whitespace and trailing terminators. */
export function splitSentences(text: string): Sentence[] {
  const sentences: Sentence[] = [];
  let cursor = 0;
  const pushSegment = (segStart: number, segEnd: number) => {
    const raw = text.slice(segStart, segEnd);
    const leading = LEADING_SPACE.exec(raw)?.[0].length ?? 0;
    const trimmed = raw.replace(TRAILING_TERMINATORS, '');
    const start = segStart + leading;
    const end = segStart + trimmed.length;
    if (end > start) {
      sentences.push({ index: sentences.length, start, end, text: text.slice(start, end) });
    }
  };
  BOUNDARY.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BOUNDARY.exec(text)) !== null) {
    const boundaryEnd = m.index + m[0].length;
    pushSegment(cursor, boundaryEnd);
    cursor = boundaryEnd;
    if (m[0].length === 0) BOUNDARY.lastIndex += 1;
  }
  if (cursor < text.length) pushSegment(cursor, text.length);
  return sentences;
}

const PARAGRAPH_BREAK = /\n[ \t\r]*\n/g;

/** Returns the start offsets of paragraphs (blank-line separated). Always contains 0. */
export function paragraphStarts(text: string): number[] {
  const starts = [0];
  PARAGRAPH_BREAK.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PARAGRAPH_BREAK.exec(text)) !== null) {
    starts.push(m.index + m[0].length);
  }
  return starts;
}

/** 1-based paragraph number containing `offset`. */
export function paragraphIndexAt(starts: number[], offset: number): number {
  let idx = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (starts[i] <= offset) idx = i;
    else break;
  }
  return idx + 1;
}

/** Runs a global regex and returns all non-empty matches with offsets. */
export function findAll(regex: RegExp, text: string, limit = 200): TextMatch[] {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const re = new RegExp(regex.source, flags);
  const matches: TextMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    if (matches.length >= limit) break;
  }
  return matches;
}

/** True when the regex matches anywhere in the text. */
export function hasMatch(regex: RegExp, text: string): boolean {
  const re = new RegExp(regex.source, regex.flags.replace('g', ''));
  return re.test(text);
}

/** Returns the sentence that contains `offset`, if any. */
export function sentenceAt(sentences: Sentence[], offset: number): Sentence | null {
  for (const s of sentences) {
    if (offset >= s.start && offset < s.end) return s;
  }
  // Offsets that fall into trimmed punctuation/whitespace map to the nearest preceding sentence.
  let best: Sentence | null = null;
  for (const s of sentences) {
    if (s.start <= offset) best = s;
  }
  return best;
}

/** Deterministic 32-bit FNV-1a hash rendered as 8 hex characters. */
export function fnv1a(text: string, seed = 0x811c9dc5): string {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
