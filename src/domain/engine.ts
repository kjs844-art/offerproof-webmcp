import type { OfferSignal, SignalId } from './types';

interface SignalDefinition {
  signalId: SignalId;
  title: string;
  patterns: RegExp[];
  observation: string;
  inference: string;
  limitations: string;
  verificationPrompt: string;
}

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    signalId: 'UPFRONT_PAYMENT',
    title: '업무 시작 전 비용 요구 문구',
    patterns: [
      /(?:교육비|보증금|등록비|장비비|수수료|가입비).{0,24}(?:먼저|선입금|입금|송금|납부)/i,
      /(?:먼저|선입금).{0,24}(?:교육비|보증금|등록비|장비비|수수료|가입비)/i,
    ],
    observation: '업무 시작 전에 금전 지급을 요구하는 표현이 원문에 있습니다.',
    inference: '금전을 보내기 전에 회사의 공식 채널과 서면 조건을 별도로 확인할 필요가 있습니다.',
    limitations: '교육·장비 비용이 적혀 있다는 사실만으로 제안의 사기 여부를 판단할 수 없습니다.',
    verificationPrompt: '비용의 수취 주체, 계약 근거, 환불 조건을 공식 채널에서 확인하기',
  },
  {
    signalId: 'PAYMENT_IN_CRYPTO_OR_GIFT_CARD',
    title: '가상자산·상품권 결제 요청',
    patterns: [/(?:비트코인|bitcoin|usdt|테더|암호화폐|가상자산|기프트\s*카드|상품권).{0,30}(?:결제|송금|구매|보내)/i],
    observation: '가상자산이나 상품권을 이용한 지급 요청이 원문에 있습니다.',
    inference: '지급 방식과 수취 주체를 공식 계약 및 회사 연락처로 다시 확인할 필요가 있습니다.',
    limitations: '일부 합법적인 계약도 가상자산을 사용할 수 있으므로 이 신호만으로 결론낼 수 없습니다.',
    verificationPrompt: '지급 방식이 계약서와 회사 공식 결제 안내에 명시되어 있는지 확인하기',
  },
  {
    signalId: 'URGENCY_PRESSURE',
    title: '빠른 결정을 압박하는 표현',
    patterns: [/(?:오늘\s*안에|지금\s*바로|즉시\s*(?:결정|응답|입금)|마감\s*임박|선착순|자리.{0,8}(?:하나|마지막))/i],
    observation: '충분히 확인하기 전에 빠른 결정을 요구하는 표현이 원문에 있습니다.',
    inference: '시간 압박과 별개로 계약 조건과 상대방의 공식 연락처를 확인할 필요가 있습니다.',
    limitations: '실제 채용 일정이 촉박할 수도 있으므로 압박 표현만으로 제안을 판단할 수 없습니다.',
    verificationPrompt: '응답 기한과 이유를 공식 담당자에게 별도로 확인하기',
  },
  {
    signalId: 'OFF_PLATFORM_CONTACT',
    title: '비공식 연락 채널로만 유도',
    patterns: [/(?:카카오톡|카톡|오픈채팅|텔레그램|telegram|왓츠앱|whatsapp|라인\s*메신저|개인\s*DM).{0,24}(?:만|으로|연락|문의)/i],
    observation: '메신저 또는 개인 채널로 연락하도록 유도하는 표현이 원문에 있습니다.',
    inference: '회사 공식 도메인이나 대표 연락처를 통한 교차 확인이 필요할 수 있습니다.',
    limitations: '일부 조직은 실제로 메신저를 사용하므로 채널만으로 신뢰 여부를 판단할 수 없습니다.',
    verificationPrompt: '회사 공식 웹사이트의 연락처로 담당자와 채용 공고를 재확인하기',
  },
  {
    signalId: 'SENSITIVE_DATA_REQUEST',
    title: '민감정보 제출 요청',
    patterns: [/(?:주민등록번호|여권번호|신분증\s*(?:사진|사본)|계좌번호|비밀번호|인증번호|OTP|보안카드).{0,30}(?:보내|제출|전달|입력|회신|필요)/i],
    observation: '신원·금융·인증 관련 민감정보를 요구하는 표현이 원문에 있습니다.',
    inference: '제출 전에 정보가 필요한 이유, 보관 주체, 공식 제출 경로를 확인해야 합니다.',
    limitations: '정식 채용 후 법적으로 필요한 정보가 있을 수 있으므로 요청 시점과 경로를 함께 확인해야 합니다.',
    verificationPrompt: '민감정보의 목적과 공식 제출 경로를 개인정보 처리방침에서 확인하기',
  },
  {
    signalId: 'UNVERIFIED_OR_SHORTENED_LINK',
    title: '목적지를 확인하기 어려운 링크',
    patterns: [/(?:https?:\/\/)?(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|rebrand\.ly)\/[^\s]+/i],
    observation: '최종 목적지를 바로 확인하기 어려운 단축 링크가 원문에 있습니다.',
    inference: '링크를 자동으로 열지 말고 회사의 공식 웹사이트에서 같은 안내를 찾는 편이 안전합니다.',
    limitations: '단축 링크는 정상적인 홍보나 분석 목적으로도 사용될 수 있습니다.',
    verificationPrompt: '링크를 열기 전에 공식 채용 페이지에서 동일한 공고를 확인하기',
  },
  {
    signalId: 'MISSING_EMPLOYER_DETAILS',
    title: '고용주 정보를 나중에 공개한다는 표현',
    patterns: [/(?:회사명|업체명|고용주|담당자\s*소속).{0,20}(?:비공개|추후\s*(?:공개|안내)|나중에\s*(?:공개|안내))/i],
    observation: '회사 또는 담당자 정보를 현재 제공하지 않는다는 표현이 원문에 있습니다.',
    inference: '지원이나 정보 제출 전에 고용주와 담당자의 소속을 공식 채널에서 확인할 필요가 있습니다.',
    limitations: '채용 대행사가 고객사를 비공개로 진행하는 정상적인 사례도 있습니다.',
    verificationPrompt: '고용주 법인명, 공식 도메인, 담당자 소속을 확인하기',
  },
  {
    signalId: 'VAGUE_ROLE_OR_TERMS',
    title: '업무나 조건이 구체적이지 않은 표현',
    patterns: [/(?:누구나\s*가능|간단한\s*업무|업무\s*내용은\s*추후|상세\s*조건은\s*추후|고수익\s*보장|확실한\s*수익)/i],
    observation: '직무나 조건을 구체적으로 설명하지 않는 표현이 원문에 있습니다.',
    inference: '지원 전에 직무, 근무시간, 급여 산정 방식과 계약 형태를 서면으로 확인할 필요가 있습니다.',
    limitations: '짧은 홍보 문구일 수 있으므로 전체 공고나 계약서에 세부 조건이 있는지 확인해야 합니다.',
    verificationPrompt: '직무·시간·급여·계약 형태를 서면으로 요청하기',
  },
];

const SENTENCE_BOUNDARY = /(?<=[.!?。！？])\s+|\n+/;

function findEvidence(text: string, patterns: RegExp[]): string | null {
  const segments = text
    .split(SENTENCE_BOUNDARY)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (patterns.some((pattern) => pattern.test(segment))) {
      return segment.length > 180 ? `${segment.slice(0, 177)}…` : segment;
    }
  }

  return null;
}

export function inspectOfferText(text: string): OfferSignal[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  return SIGNAL_DEFINITIONS.flatMap((definition) => {
    const observedText = findEvidence(normalized, definition.patterns);
    if (!observedText) return [];

    return [{
      signalId: definition.signalId,
      title: definition.title,
      observedText,
      observation: definition.observation,
      inference: definition.inference,
      limitations: definition.limitations,
      verificationPrompt: definition.verificationPrompt,
    }];
  });
}

export function maskSensitiveText(text: string): string {
  return text
    .replace(
      /((?:비밀번호|패스워드|password|OTP|인증번호|보안카드(?:\s*번호)?|계좌번호|여권번호|주민등록번호)\s*(?:[:=]|은|는|이|가)?\s*)(\S{3,})/gi,
      '$1[비밀값 가림]',
    )
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[이메일 가림]')
    .replace(/\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, '[전화번호 가림]')
    .replace(/\b\d{6}[-\s]?\d{7}\b/g, '[식별번호 가림]')
    .replace(/\b(?:\d[-\s]?){11,16}\d\b/g, '[금융번호 가림]');
}
