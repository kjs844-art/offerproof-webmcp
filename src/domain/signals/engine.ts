import {
  ENGINE_VERSION,
  SIGNAL_IDS,
  type AnalysisCoverage,
  type EngineResult,
  type EvidenceSpan,
  type ManipulationNotice,
  type Signal,
  type SignalId,
} from '../types';
import {
  findAll,
  foldCase,
  paragraphIndexAt,
  paragraphStarts,
  sentenceAt,
  splitSentences,
  type Sentence,
  type TextMatch,
} from '../text';
import { MANIPULATION_NOTICE_OBSERVATION, SIGNAL_DEFINITIONS } from './registry';
import {
  CONSEQUENCE_TERMS,
  CRYPTO_GIFT_RULES,
  DEFERRAL_TERMS,
  EMPLOYER_MARKERS,
  GENERIC_TITLES,
  MANIPULATION_PATTERNS,
  OFF_PLATFORM_RULES,
  ROLE_DUTY_TERMS,
  SENSITIVE_DATA_RULES,
  SHORTENER_HOSTS,
  TRAILING_URL_PUNCTUATION,
  UPFRONT_PAYMENT_RULES,
  URGENCY_TERMS,
  URL_TOKEN,
  WORK_TERM_TERMS,
  type PairRule,
} from './rules';

/**
 * Deterministic, text-only signal engine.
 *
 * Input: the exact pasted offer text. Output: canonical signals (in registry
 * order) whose evidence spans are exact substrings of the input, plus
 * instruction-like notices and a coverage summary. The engine never reads
 * the network, the clock, or any state outside its argument, so the same
 * text always yields the same result. Text inside the offer is data only.
 */
export function inspectOfferText(offerText: string): EngineResult {
  const folded = foldCase(offerText);
  const sentences = splitSentences(folded);
  const pStarts = paragraphStarts(offerText);
  const span = (start: number, end: number, label?: string): EvidenceSpan => {
    const base: EvidenceSpan = {
      start,
      end,
      text: offerText.slice(start, end),
      paragraph: paragraphIndexAt(pStarts, start),
    };
    return label ? { ...base, label } : base;
  };
  const sentenceSpan = (s: Sentence, label?: string) => span(s.start, s.end, label);

  const isBlank = folded.trim().length === 0;

  const coverage: AnalysisCoverage = {
    hasEmployerDetails: !isBlank && hasSubstantiveMatch(EMPLOYER_MARKERS, sentences),
    hasRoleDuty: !isBlank && hasSubstantiveMatch(ROLE_DUTY_TERMS, sentences),
    hasWorkTerms: !isBlank && hasSubstantiveMatch(WORK_TERM_TERMS, sentences),
  };

  const evidenceById: Partial<Record<SignalId, EvidenceSpan[] | null>> = {};

  if (!isBlank) {
    evidenceById.UPFRONT_PAYMENT = pairEvidence(UPFRONT_PAYMENT_RULES, sentences, span);
    evidenceById.PAYMENT_IN_CRYPTO_OR_GIFT_CARD = pairEvidence(CRYPTO_GIFT_RULES, sentences, span);
    evidenceById.URGENCY_PRESSURE = urgencyEvidence(folded, sentences, sentenceSpan);
    evidenceById.OFF_PLATFORM_CONTACT = pairEvidence(OFF_PLATFORM_RULES, sentences, span);
    evidenceById.SENSITIVE_DATA_REQUEST = pairEvidence(SENSITIVE_DATA_RULES, sentences, span);
    evidenceById.UNVERIFIED_OR_SHORTENED_LINK = linkEvidence(folded, span);
    evidenceById.MISSING_EMPLOYER_DETAILS = coverage.hasEmployerDetails ? null : [];
    evidenceById.VAGUE_ROLE_OR_TERMS = vagueRoleEvidence(folded, coverage, span);
  }

  const signals: Signal[] = [];
  for (const signalId of SIGNAL_IDS) {
    const evidence = evidenceById[signalId];
    if (evidence === null || evidence === undefined) continue;
    signals.push(buildSignal(signalId, evidence));
  }

  const notices = isBlank ? [] : manipulationNotices(folded, sentences, sentenceSpan);

  return { engineVersion: ENGINE_VERSION, signals, notices, coverage };
}

function buildSignal(signalId: SignalId, evidence: EvidenceSpan[]): Signal {
  const def = SIGNAL_DEFINITIONS[signalId];
  const first = evidence[0];
  return {
    signalId,
    category: def.category,
    title: def.title,
    observedText: evidence.map((e) => e.text).join(' … '),
    evidence,
    observation: evidence.length > 0 ? def.observation : def.absenceObservation ?? def.observation,
    guidanceSourceIds: [...def.guidanceSourceIds],
    inference: def.inference,
    limitations: def.limitations,
    sourceLocation: first ? { paragraph: first.paragraph, start: first.start, end: first.end } : null,
    userStatus: 'unreviewed',
  };
}

type SpanFactory = (start: number, end: number, label?: string) => EvidenceSpan;
type SentenceSpanFactory = (s: Sentence, label?: string) => EvidenceSpan;

/**
 * Finds the earliest sentence (or adjacent sentence pair) that satisfies any
 * pair rule. Returns the covering span or null.
 */
function pairEvidence(rules: PairRule[], sentences: Sentence[], span: SpanFactory): EvidenceSpan[] | null {
  const tests = rules.map((rule) => ({
    a: new RegExp(rule.a.source, rule.a.flags.replace('g', '')),
    b: new RegExp(rule.b.source, rule.b.flags.replace('g', '')),
  }));
  for (let i = 0; i < sentences.length; i += 1) {
    const text = sentences[i].text;
    for (const t of tests) {
      if (t.a.test(text) && t.b.test(text)) {
        return [span(sentences[i].start, sentences[i].end)];
      }
    }
  }
  for (let i = 0; i < sentences.length - 1; i += 1) {
    const cur = sentences[i].text;
    const next = sentences[i + 1].text;
    for (const t of tests) {
      if ((t.a.test(cur) && t.b.test(next)) || (t.b.test(cur) && t.a.test(next))) {
        return [span(sentences[i].start, sentences[i + 1].end)];
      }
    }
  }
  return null;
}

/**
 * Matches only within a single sentence or between two adjacent sentences —
 * the same locality the other pair rules use — so an urgency term in one
 * part of a long offer is never combined with an unrelated consequence term
 * many paragraphs away just because it is the only pair present.
 */
function urgencyEvidence(
  folded: string,
  sentences: Sentence[],
  sentenceSpan: SentenceSpanFactory,
): EvidenceSpan[] | null {
  const urgency = findAll(URGENCY_TERMS, folded);
  const consequence = findAll(CONSEQUENCE_TERMS, folded);
  if (urgency.length === 0 || consequence.length === 0) return null;

  const withSentence = (matches: TextMatch[]): { m: TextMatch; s: Sentence }[] =>
    matches
      .map((m) => ({ m, s: sentenceAt(sentences, m.start) }))
      .filter((x): x is { m: TextMatch; s: Sentence } => x.s !== null);
  const urgencyBySentence = withSentence(urgency);
  const consequenceBySentence = withSentence(consequence);

  let sameSentence: Sentence | null = null;
  let adjacent: [Sentence, Sentence] | null = null;
  for (const a of urgencyBySentence) {
    for (const b of consequenceBySentence) {
      const diff = Math.abs(a.s.index - b.s.index);
      if (diff === 0) {
        if (!sameSentence || a.s.start < sameSentence.start) sameSentence = a.s;
      } else if (diff === 1) {
        const first = a.s.start <= b.s.start ? [a.s, b.s] : [b.s, a.s];
        if (!adjacent || first[0].start < adjacent[0].start) adjacent = first as [Sentence, Sentence];
      }
    }
  }
  if (sameSentence) return [sentenceSpan(sameSentence)];
  if (adjacent) return adjacent.map((s) => sentenceSpan(s));
  return null;
}

function hostOf(token: string): string {
  let rest = token.replace(/^https?:\/\//, '');
  rest = rest.split('/')[0];
  rest = rest.split('@').pop() ?? rest;
  rest = rest.split(':')[0];
  return rest.replace(/^www\./, '');
}

/**
 * Flags every URL whose ownership cannot be established from the pasted
 * text. A pasted "official domain: X" declaration is untrusted data, not
 * verification (AGENTS.md §3), so it is never allowed to suppress this
 * warning — official links come only from the allowlist in
 * `src/domain/resources/registry.ts`.
 */
function linkEvidence(folded: string, span: SpanFactory): EvidenceSpan[] | null {
  const spans: EvidenceSpan[] = [];
  const seen = new Set<string>();
  for (const m of findAll(URL_TOKEN, folded)) {
    const trimmed = m.text.replace(TRAILING_URL_PUNCTUATION, '');
    if (trimmed.length === 0) continue;
    const end = m.start + trimmed.length;
    const host = hostOf(trimmed);
    if (host.length === 0) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    const shortened = SHORTENER_HOSTS.some((s) => host === s || host.endsWith(`.${s}`));
    spans.push(span(m.start, end, shortened ? '단축 링크 · 목적지 미확인' : '출처 미확인 링크 · 공식 링크 아님'));
    if (spans.length >= 10) break;
  }
  return spans.length > 0 ? spans : null;
}

function vagueRoleEvidence(folded: string, coverage: AnalysisCoverage, span: SpanFactory): EvidenceSpan[] | null {
  if (!coverage.hasRoleDuty && !coverage.hasWorkTerms) return [];
  if (!coverage.hasRoleDuty) {
    const title = findAll(GENERIC_TITLES, folded, 1)[0];
    if (title) return [span(title.start, title.end, '일반적인 직함만 있음')];
  }
  return null;
}

/**
 * True when a marker occurs in a sentence that is not itself a deferral
 * ("합격 후 안내", "to be announced", …). A label paired only with a promise
 * to provide the real value later is not the value, so it must not satisfy
 * coverage (and must not suppress an absence signal).
 */
function hasSubstantiveMatch(markerPattern: RegExp, sentences: Sentence[]): boolean {
  const marker = new RegExp(markerPattern.source, markerPattern.flags.replace('g', ''));
  const deferral = new RegExp(DEFERRAL_TERMS.source, DEFERRAL_TERMS.flags.replace('g', ''));
  return sentences.some((s) => marker.test(s.text) && !deferral.test(s.text));
}

function manipulationNotices(
  folded: string,
  sentences: Sentence[],
  sentenceSpan: SentenceSpanFactory,
): ManipulationNotice[] {
  const notices: ManipulationNotice[] = [];
  const seen = new Set<number>();
  for (const m of findAll(MANIPULATION_PATTERNS, folded)) {
    const s = sentenceAt(sentences, m.start);
    if (!s || seen.has(s.index)) continue;
    seen.add(s.index);
    notices.push({
      noticeId: `notice_s${s.index}`,
      evidence: sentenceSpan(s, '지시문처럼 보이는 문구'),
      observation: MANIPULATION_NOTICE_OBSERVATION,
    });
    if (notices.length >= 10) break;
  }
  return notices;
}
