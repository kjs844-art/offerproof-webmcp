import type { IdGenerator } from '../ids';
import { SIGNAL_IDS, type SignalId, type StepPriority, type VerificationStep } from '../types';

export interface StepTemplate {
  signalId: SignalId | null;
  title: string;
  question: string;
  priority: StepPriority;
  resourceIds: string[];
}

/** One question per signal. Questions are for the user to answer; they are not verdicts. */
export const SIGNAL_STEP_TEMPLATES: Record<SignalId, StepTemplate> = {
  UPFRONT_PAYMENT: {
    signalId: 'UPFRONT_PAYMENT',
    title: '비용 요구 조건 확인',
    question:
      '교육비·보증금·장비비 등 요구된 비용의 금액, 목적, 환불 조건이 서면 계약서에 명시되어 있나요? 지급 전에 이미 알고 있는 공식 채널로 확인했나요?',
    priority: 'high',
    resourceIds: ['KR-FSS-001', 'KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  PAYMENT_IN_CRYPTO_OR_GIFT_CARD: {
    signalId: 'PAYMENT_IN_CRYPTO_OR_GIFT_CARD',
    title: '지급 수단 확인',
    question:
      '암호화폐·상품권으로 지급을 요구하는 이유와 수취인을 회사 공식 채널에서 확인했나요? 코드·PIN을 전달하지 않았나요?',
    priority: 'high',
    resourceIds: ['KR-FSS-001', 'FTC-JOB-SCAMS-2026'],
  },
  URGENCY_PRESSURE: {
    signalId: 'URGENCY_PRESSURE',
    title: '검토 시간 확보',
    question:
      '기한과 불이익 문구가 실제 채용 일정과 일치하는지 회사 공식 채널에서 확인했나요? 결정을 서두르지 않아도 되는지 확인했나요?',
    priority: 'medium',
    resourceIds: ['KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  OFF_PLATFORM_CONTACT: {
    signalId: 'OFF_PLATFORM_CONTACT',
    title: '연락 채널 확인',
    question:
      '메신저·개인 이메일 담당자가 회사 공식 채널(대표 연락처, 공식 도메인)에 실제로 소속되어 있는지 확인했나요?',
    priority: 'high',
    resourceIds: ['KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  SENSITIVE_DATA_REQUEST: {
    signalId: 'SENSITIVE_DATA_REQUEST',
    title: '개인정보 요구 확인',
    question:
      '요구된 정보의 종류, 제출 목적, 보관 주체, 수집 시점이 정당한 절차(채용 확정 후 보안 절차 등)에 해당하는지 확인했나요? 메시지로 값을 보내지 않았나요?',
    priority: 'high',
    resourceIds: ['KR-POLICE-001', 'KR-FSS-001', 'FTC-JOB-SCAMS-2026'],
  },
  UNVERIFIED_OR_SHORTENED_LINK: {
    signalId: 'UNVERIFIED_OR_SHORTENED_LINK',
    title: '링크 출처 확인',
    question: '원문 링크를 열지 않고, 검색으로 직접 찾은 회사 공식 사이트에서 같은 채용 정보를 확인했나요?',
    priority: 'medium',
    resourceIds: ['KR-POLICE-001', 'FTC-JOB-SCAMS-2026'],
  },
  MISSING_EMPLOYER_DETAILS: {
    signalId: 'MISSING_EMPLOYER_DETAILS',
    title: '고용주 정보 요청',
    question: '법인명(상호), 사업자등록번호, 사무실 주소, 대표 연락처를 요청하고 공식 채널에서 일치 여부를 확인했나요?',
    priority: 'high',
    resourceIds: ['KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  VAGUE_ROLE_OR_TERMS: {
    signalId: 'VAGUE_ROLE_OR_TERMS',
    title: '직무·근무 조건 서면 요청',
    question: '담당 업무, 급여, 근무시간, 근무지, 계약 형태를 서면으로 받았나요? 받은 내용이 계약서와 일치하나요?',
    priority: 'medium',
    resourceIds: ['KR-MOEL-002', 'FTC-JOB-SCAMS-2026'],
  },
};

export const GENERAL_STEP_TEMPLATES: StepTemplate[] = [
  {
    signalId: null,
    title: '회사와 담당자 확인',
    question: '회사 공식 도메인·대표 연락처·담당자 소속을 제안 메시지가 아닌 경로에서 직접 확인했나요?',
    priority: 'high',
    resourceIds: ['KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  {
    signalId: null,
    title: '공식 자료 재확인',
    question: '연결된 공식 기관 자료의 최신 내용과 이 제안에 적용되는 범위를 직접 읽었나요?',
    priority: 'low',
    resourceIds: ['FTC-JOB-SCAMS-2026'],
  },
];

const PRIORITY_ORDER: Record<StepPriority, number> = { high: 0, medium: 1, low: 2 };

/** Builds `todo` steps for the selected signals in a deterministic order. */
export function buildVerificationSteps(signalIds: SignalId[], idGen: IdGenerator): VerificationStep[] {
  const selected = SIGNAL_IDS.filter((id) => signalIds.includes(id));
  const templates: StepTemplate[] = [
    GENERAL_STEP_TEMPLATES[0],
    ...selected.map((id) => SIGNAL_STEP_TEMPLATES[id]),
    GENERAL_STEP_TEMPLATES[1],
  ];
  const ordered = templates
    .map((t, index) => ({ t, index }))
    .sort((x, y) => PRIORITY_ORDER[x.t.priority] - PRIORITY_ORDER[y.t.priority] || x.index - y.index)
    .map((x) => x.t);
  return ordered.map((t) => ({
    verificationStepId: idGen.next('step'),
    signalId: t.signalId,
    title: t.title,
    question: t.question,
    priority: t.priority,
    status: 'todo',
    memo: null,
    resourceIds: [...t.resourceIds],
  }));
}
