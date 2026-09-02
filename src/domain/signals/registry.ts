import type { SignalCategory, SignalId } from '../types';

/**
 * Korean copy for each canonical signal. Mirrors
 * docs/research/RISK_SIGNAL_REGISTRY.md v1.0.0. No verdicts, no scores.
 */
export interface SignalDefinition {
  signalId: SignalId;
  category: SignalCategory;
  title: string;
  observation: string;
  /** Observation used when evidence is an absence (empty evidence). */
  absenceObservation?: string;
  inference: string;
  limitations: string;
  guidanceSourceIds: string[];
}

const COMMON_LIMIT = '이 신호 하나만으로 사기 여부를 판단할 수 없습니다.';

export const SIGNAL_DEFINITIONS: Record<SignalId, SignalDefinition> = {
  UPFRONT_PAYMENT: {
    signalId: 'UPFRONT_PAYMENT',
    category: 'compensation',
    title: '선입금·비용 요구 문구가 있습니다',
    observation: '업무 시작·채용·면접 등 특정 단계 전에 비용을 지급하라는 문구가 원문에 있습니다.',
    inference:
      '금전을 보내기 전에 지급 요구의 주체·목적·환불 조건을 이미 알고 있는 공식 채널을 통해 별도로 확인이 필요합니다.',
    limitations: `이 규칙은 누가 지급하는지, 환불 약속이 있는지, 요구가 적법한지, 실제 요구인지 판단할 수 없습니다. 고정 패턴에 없는 표현은 놓칠 수 있습니다. ${COMMON_LIMIT}`,
    guidanceSourceIds: ['KR-FSS-001', 'KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  PAYMENT_IN_CRYPTO_OR_GIFT_CARD: {
    signalId: 'PAYMENT_IN_CRYPTO_OR_GIFT_CARD',
    category: 'compensation',
    title: '암호화폐·상품권 결제 요구 문구가 있습니다',
    observation:
      '암호화폐 또는 상품권(기프트카드)을 지급 수단으로 요구하거나 코드·PIN을 알려 달라는 문구가 원문에 있습니다.',
    inference:
      '송금이나 코드 전달 전에 지급 수단과 수취인을 독립적인 공식 채널을 통해 별도로 확인이 필요합니다.',
    limitations: `자산 종류·금액·관할·소유자를 알 수 없고, 해당 단어가 업무 내용이나 경고문으로 언급된 것인지 구분하지 못합니다. 지갑·거래·외부 페이지를 조회하지 않습니다. ${COMMON_LIMIT}`,
    guidanceSourceIds: ['KR-FSS-001', 'FTC-JOB-SCAMS-2026'],
  },
  URGENCY_PRESSURE: {
    signalId: 'URGENCY_PRESSURE',
    category: 'communication',
    title: '긴급성·압박 표현이 함께 있습니다',
    observation: '짧은 기한이나 즉시 행동 요구가 불이익·희소성·의무 표현과 함께 원문에 있습니다.',
    inference:
      '제안을 검토할 시간을 확보하고, 메시지에만 적힌 연락처를 사용하지 않은 채 발신자를 별도로 확인이 필요합니다.',
    limitations: `실제 채용 마감이나 면접 일정도 긴급 표현을 사용할 수 있습니다. 고정 어휘는 보수적으로 설계되어 목록 밖의 어조를 평가하지 못합니다. ${COMMON_LIMIT}`,
    guidanceSourceIds: ['KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  OFF_PLATFORM_CONTACT: {
    signalId: 'OFF_PLATFORM_CONTACT',
    category: 'contact',
    title: '외부 메신저·개인 채널로 연락 유도 문구가 있습니다',
    observation:
      '채용 관련 대화를 메신저·SNS·개인 이메일 등 지정된 외부 채널로 이어가라는 문구가 원문에 있습니다.',
    inference:
      '계속 대화하기 전에 직접 찾은 고용주 공식 채널을 통해 직무와 담당자 신원을 별도로 확인이 필요합니다.',
    limitations: `소규모 고용주나 채용 담당자도 메신저를 사용할 수 있습니다. 채널의 공식 여부나 주소의 소유자는 판단하지 못합니다. ${COMMON_LIMIT}`,
    guidanceSourceIds: ['KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  SENSITIVE_DATA_REQUEST: {
    signalId: 'SENSITIVE_DATA_REQUEST',
    category: 'personalData',
    title: '민감정보 제공 요구 문구가 있습니다',
    observation:
      '주민등록번호·계좌·카드·비밀번호·인증번호 등 민감한 식별정보나 인증 비밀을 제공하라는 문구가 원문에 있습니다.',
    inference:
      '메시지에서 요구한 값을 보내지 말고, 신원·급여 정보의 수집 시점과 방식을 독립적으로 확인된 절차를 통해 별도로 확인이 필요합니다.',
    limitations: `정상적인 고용주도 채용 확정 후 검증된 절차로 일부 정보를 수집할 수 있습니다. 이 규칙은 시점·보안·적법성·수령자를 판단하지 않습니다. ${COMMON_LIMIT}`,
    guidanceSourceIds: ['KR-POLICE-001', 'KR-FSS-001', 'FTC-JOB-SCAMS-2026'],
  },
  UNVERIFIED_OR_SHORTENED_LINK: {
    signalId: 'UNVERIFIED_OR_SHORTENED_LINK',
    category: 'link',
    title: '목적지를 확인할 수 없는 링크가 있습니다',
    observation:
      '단축 링크이거나, 붙여넣은 텍스트만으로는 소유자를 확인할 수 없는 링크가 원문에 있습니다.',
    inference:
      '원문 링크를 누르지 말고, 고용주 공식 사이트를 직접 찾아 그곳에서 채용 정보를 별도로 확인이 필요합니다.',
    limitations: `리디렉션·인증서·도메인 소유자·평판·최신 여부를 확인하지 않습니다. 공식처럼 보이는 도메인도 텍스트만으로는 확인되지 않은 상태입니다. ${COMMON_LIMIT}`,
    guidanceSourceIds: ['KR-POLICE-001', 'FTC-JOB-SCAMS-2026'],
  },
  MISSING_EMPLOYER_DETAILS: {
    signalId: 'MISSING_EMPLOYER_DETAILS',
    category: 'employerMetadata',
    title: '고용주 정보를 원문에서 찾지 못했습니다',
    observation: '붙여넣은 텍스트에 식별 가능한 회사명·고용주·채용 주체 표기가 없습니다.',
    absenceObservation:
      '붙여넣은 텍스트에서 회사명·고용주·사업자 정보에 해당하는 표기를 찾지 못했습니다. (근거 없음 = 부재 규칙)',
    inference:
      '법인명 또는 상호를 요청하고, 정보를 제공하거나 업무를 수락하기 전에 별도로 확인이 필요합니다.',
    limitations: `비공개 고객사, 채용 대행, 첨부파일에 담긴 정보는 여기서 볼 수 없습니다. 이 규칙은 고용주를 검색하지 않으며, 정보가 없다는 사실 자체는 잘못의 근거가 아닙니다. ${COMMON_LIMIT}`,
    guidanceSourceIds: ['KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
  VAGUE_ROLE_OR_TERMS: {
    signalId: 'VAGUE_ROLE_OR_TERMS',
    category: 'roleDescription',
    title: '직무·근무 조건 설명이 부족합니다',
    observation:
      '붙여넣은 텍스트만으로는 담당 업무와 급여·근무시간·근무지 등 조건을 파악하기 어렵습니다.',
    absenceObservation:
      '붙여넣은 텍스트에서 담당 업무 설명과 급여·근무시간·근무지 등 조건 표기를 모두 찾지 못했습니다. (근거 없음 = 부재 규칙)',
    inference:
      '진행 여부를 결정하기 전에 업무·급여·근무시간·근무지·계약 형태를 서면으로 요청해 별도로 확인이 필요합니다.',
    limitations: `짧은 메시지도 정상적인 첫 연락일 수 있고 세부 정보가 나중에 제공될 수 있습니다. 고정 어휘로 글의 품질이나 현실성은 판단하지 못합니다. ${COMMON_LIMIT}`,
    guidanceSourceIds: ['KR-MOEL-001', 'FTC-JOB-SCAMS-2026'],
  },
};

export const MANIPULATION_NOTICE_OBSERVATION =
  '앱이나 에이전트를 향한 지시처럼 보이는 문구가 원문에 있습니다. 이 문구는 데이터로만 취급되며 실행되지 않습니다.';
