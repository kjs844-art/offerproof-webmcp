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
  hasMatch,
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
  EMPLOYER_MARKERS,
  GENERIC_TITLES,
  MANIPULATION_PATTERNS,
  OFFICIAL_DOMAIN_LABEL,
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
    hasEmployerDetails: !isBlank && hasMatch(EMPLOYER_MARKERS, folded),
    hasRoleDuty: !isBlank && hasMatch(ROLE_DUTY_TERMS, folded),
    hasWorkTerms: !isBlank && hasMatch(WORK_TERM_TERMS, folded),
  };

  const evidenceById: Partial<Record<SignalId, EvidenceSpan[] | null>> = {};

  if (!isBlank) {
    evidenceById.UPFRONT_PAYMENT = pairEvidence(UPFRONT_PAYMENT_RULES, sentences, span);
    evidenceById.PAYMENT_IN_CRYPTO_OR_GIFT_CARD = pairEvidence(CRYPTO_GIFT_RULES, sentences, span);
    evidenceById.URGENCY_PRESSURE = urgencyEvidence(folded, sentences, sentenceSpan, span);
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

function urgencyEvidence(
  folded: string,
  sentences: Sentence[],
  sentenceSpan: SentenceSpanFactory,
  span: SpanFactory,
): EvidenceSpan[] | null {
  const urgency = findAll(URGENCY_TERMS, folded);
  const consequence = findAll(CONSEQUENCE_TERMS, folded);
  if (urgency.length === 0 || consequence.length === 0) return null;

  let best: { a: TextMatch; b: TextMatch; distance: number; first: number } | null = null;
  for (const a of urgency) {
    for (const b of consequence) {
      const distance = Math.max(a.end, b.end) - Math.min(a.start, b.start);
      const first = Math.min(a.start, b.start);
      if (!best || distance < best.distance || (distance === best.distance && first < best.first)) {
        best = { a, b, distance, first };
      }
    }
  }
  if (!best) return null;
  const sa = sentenceAt(sentences, best.a.start);
  const sb = sentenceAt(sentences, best.b.start);
  if (!sa || !sb) {
    const start = Math.min(best.a.start, best.b.start);
    const end = Math.max(best.a.end, best.b.end);
    return [span(start, end)];
  }
  if (sa.index === sb.index) return [sentenceSpan(sa)];
  const ordered = sa.start <= sb.start ? [sa, sb] : [sb, sa];
  return ordered.map((s) => sentenceSpan(s));
}

function hostOf(token: string): string {
  let rest = token.replace(/^https?:\/\//, '');
  rest = rest.split('/')[0];
  rest = rest.split('@').pop() ?? rest;
  rest = rest.split(':')[0];
  return rest.replace(/^www\./, '');
}

function linkEvidence(folded: string, span: SpanFactory): EvidenceSpan[] | null {
  const declaredHosts = new Set(findAll(OFFICIAL_DOMAIN_LABEL, folded).map((m) => {
    const re = new RegExp(OFFICIAL_DOMAIN_LABEL.source);
    const g = re.exec(m.text);
    return (g?.[1] ?? '').replace(/^www\./, '');
  }));
  const spans: EvidenceSpan[] = [];
  const seen = new Set<string>();
  for (const m of findAll(URL_TOKEN, folded)) {
    const trimmed = m.text.replace(TRAILING_URL_PUNCTUATION, '');
    if (trimmed.length === 0) continue;
    const end = m.start + trimmed.length;
    const host = hostOf(trimmed);
    if (host.length === 0) continue;
    if ([...declaredHosts].some((d) => d.length > 0 && (host === d || host.endsWith(`.${d}`)))) continue;
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
