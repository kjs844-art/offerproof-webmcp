import {
  SIGNAL_IDS,
  type Jurisdiction,
  type OfficialResource,
  type ResourceTopic,
  type SignalId,
} from '../types';

/**
 * Allowlisted official resources.
 *
 * Rules (AGENTS.md §3, task constraints): links are provided only from this
 * registry, users open them manually, and no URL is marked verified without a
 * recorded check. Entries whose URL could not be verified carry `url: null`
 * and `linkStatus: 'unavailable'` so the UI clearly shows them as unverified.
 */
export const OFFICIAL_RESOURCES: OfficialResource[] = [
  {
    resourceId: 'FTC-JOB-SCAMS-2026',
    agency: 'U.S. Federal Trade Commission (미국 연방거래위원회)',
    title: 'Job Scams (구직 사기 안내)',
    url: 'https://consumer.ftc.gov/articles/job-scams',
    topic: 'general_offer_review',
    jurisdiction: 'US',
    lastVerifiedAt: '2026-09-02',
    verificationNote:
      'docs/research/RISK_SIGNAL_REGISTRY.md(Codex agent-3)에 2026-09-02 현재 페이지 확인 기록이 있습니다. 이 구현 세션에서는 네트워크 제한으로 재확인하지 못했습니다.',
    isLegalAdvice: false,
    supportsSignalIds: [...SIGNAL_IDS],
    linkStatus: 'verified',
  },
  {
    resourceId: 'KR-MOEL-001',
    agency: '고용노동부 (Ministry of Employment and Labor)',
    title: '채용 절차·구인 광고 관련 공식 안내 (링크 미검증)',
    url: null,
    topic: 'general_offer_review',
    jurisdiction: 'KR',
    lastVerifiedAt: null,
    verificationNote:
      '이 세션에서 공식 URL을 검증하지 못해 링크를 제공하지 않습니다. 검색엔진에서 기관명을 직접 검색하고 주소가 .go.kr 도메인인지 확인한 뒤 열어 주세요.',
    isLegalAdvice: false,
    supportsSignalIds: ['UPFRONT_PAYMENT', 'URGENCY_PRESSURE', 'OFF_PLATFORM_CONTACT', 'MISSING_EMPLOYER_DETAILS', 'VAGUE_ROLE_OR_TERMS'],
    linkStatus: 'unavailable',
  },
  {
    resourceId: 'KR-MOEL-002',
    agency: '고용노동부 (Ministry of Employment and Labor)',
    title: '근로계약서·근로조건 확인 안내 (링크 미검증)',
    url: null,
    topic: 'contract_terms',
    jurisdiction: 'KR',
    lastVerifiedAt: null,
    verificationNote:
      '이 세션에서 공식 URL을 검증하지 못해 링크를 제공하지 않습니다. 검색엔진에서 기관명을 직접 검색하고 주소가 .go.kr 도메인인지 확인한 뒤 열어 주세요.',
    isLegalAdvice: false,
    supportsSignalIds: ['VAGUE_ROLE_OR_TERMS', 'MISSING_EMPLOYER_DETAILS'],
    linkStatus: 'unavailable',
  },
  {
    resourceId: 'KR-FSS-001',
    agency: '금융감독원 (Financial Supervisory Service)',
    title: '금융사기·선입금 요구 관련 소비자 안내 (링크 미검증)',
    url: null,
    topic: 'upfront_payment',
    jurisdiction: 'KR',
    lastVerifiedAt: null,
    verificationNote:
      '이 세션에서 공식 URL을 검증하지 못해 링크를 제공하지 않습니다. 검색엔진에서 기관명을 직접 검색하고 주소가 .or.kr 도메인인지 확인한 뒤 열어 주세요.',
    isLegalAdvice: false,
    supportsSignalIds: ['UPFRONT_PAYMENT', 'PAYMENT_IN_CRYPTO_OR_GIFT_CARD', 'SENSITIVE_DATA_REQUEST'],
    linkStatus: 'unavailable',
  },
  {
    resourceId: 'KR-POLICE-001',
    agency: '경찰청 사이버수사국 (Korean National Police Agency)',
    title: '사이버범죄 상담·신고 절차 안내 (링크 미검증)',
    url: null,
    topic: 'personal_information',
    jurisdiction: 'KR',
    lastVerifiedAt: null,
    verificationNote:
      '이 세션에서 공식 URL을 검증하지 못해 링크를 제공하지 않습니다. 신고 여부와 시점은 사용자가 직접 결정하며, 앱은 신고를 대행하지 않습니다.',
    isLegalAdvice: false,
    supportsSignalIds: ['SENSITIVE_DATA_REQUEST', 'UNVERIFIED_OR_SHORTENED_LINK'],
    linkStatus: 'unavailable',
  },
];

export function findResource(resourceId: string): OfficialResource | undefined {
  return OFFICIAL_RESOURCES.find((r) => r.resourceId === resourceId);
}

export interface ResourceQuery {
  jurisdiction: Jurisdiction;
  topic?: ResourceTopic;
  signalIds?: SignalId[];
}

/** Read-only lookup. Returns deep copies so callers cannot mutate the registry. */
export function queryResources(query: ResourceQuery): OfficialResource[] {
  const topic = query.topic ?? 'general_offer_review';
  return OFFICIAL_RESOURCES.filter((r) => {
    if (r.jurisdiction !== query.jurisdiction) return false;
    if (r.topic !== topic) return false;
    if (query.signalIds && query.signalIds.length > 0) {
      return query.signalIds.some((id) => r.supportsSignalIds.includes(id));
    }
    return true;
  }).map((r) => ({ ...r, supportsSignalIds: [...r.supportsSignalIds] }));
}

export const TOPIC_LABELS: Record<ResourceTopic, string> = {
  general_offer_review: '구인 제안 일반 확인',
  upfront_payment: '선입금·비용 요구',
  personal_information: '개인정보 요구',
  contract_terms: '계약·근로 조건',
};

export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  KR: '대한민국 (KR)',
  US: '미국 (US)',
  GB: '영국 (GB)',
  AU: '호주 (AU)',
  CA: '캐나다 (CA)',
  OTHER: '기타 (OTHER)',
};
