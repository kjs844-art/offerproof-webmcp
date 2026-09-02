/**
 * Fixed vocabulary for the deterministic engine.
 *
 * All patterns are evaluated on a case-folded copy of the pasted text
 * (see `foldCase`), so Latin terms are written in lower case. Korean terms
 * match as plain substrings because particles attach directly to words.
 * No semantic interpretation, no external data.
 */

/** Latin alternation guarded so it does not match inside other words. */
const latin = (alternatives: string): string => `(?<![a-z0-9])(?:${alternatives})(?![a-z0-9])`;

const rx = (...parts: string[]): RegExp => new RegExp(parts.join('|'), 'g');

export interface PairRule {
  /** First term set. */
  a: RegExp;
  /** Second term set. */
  b: RegExp;
}

/* ------------------------------------------------------------------ */
/* UPFRONT_PAYMENT                                                     */
/* ------------------------------------------------------------------ */

const EN_PAYMENT_OR_FEE = latin(
  'pay|pays|paying|paid|send|sending|wire|wiring|transfer|deposit|purchase|buy|fee|fees|charge|charges|cost|costs|payment|training fee|processing fee|registration fee|activation fee',
);
const EN_TIMING = latin(
  'before you start|before starting|before you begin|before your first day|to apply|to get the job|to be hired|to receive your equipment|required upfront|upfront|up front|in advance|prior to starting|to secure (?:the|your) (?:position|job|spot|role)|to start working|first',
);
const KO_FEE_NOUN =
  '교육비|훈련비|보증금|가입비|등록비|검토비|심사비|장비비|장비 ?구입비|예치금|보증비|수수료|선입금|선납금|계약금|보험료|유니폼비|자재비|물품비|배송비|택배비|인증비|발급비|가입 ?비용|등록 ?비용|초기 ?비용';
const KO_PAY_ACTION = '입금|송금|납부|결제|지불|이체|충전|납입|보내 ?주|보내주|송금해|입금해';
const KO_TIMING = '먼저|미리|사전에|우선|(?:시작|면접|채용|합격|근무|계약|출근|교육|등록) ?전';

export const UPFRONT_PAYMENT_RULES: PairRule[] = [
  { a: rx(EN_PAYMENT_OR_FEE), b: rx(EN_TIMING) },
  { a: rx(KO_FEE_NOUN), b: rx(KO_PAY_ACTION) },
  { a: rx(KO_PAY_ACTION), b: rx(KO_TIMING) },
];

/* ------------------------------------------------------------------ */
/* PAYMENT_IN_CRYPTO_OR_GIFT_CARD                                      */
/* ------------------------------------------------------------------ */

const CRYPTO_OR_GIFT_TERM = rx(
  latin(
    'bitcoin|btc|ethereum|eth|crypto|cryptocurrency|usdt|tether|wallet address|gift ?cards?|giftcards?|itunes cards?|google play cards?|steam cards?|prepaid cards?|apple gift|amazon gift',
  ),
  '비트코인|이더리움|암호화폐|가상화폐|가상자산|테더|코인|지갑 ?주소|기프트 ?카드|상품권|문화상품권|구글 ?플레이 ?(?:카드|기프트)|선불 ?카드',
);
const PAYMENT_REQUEST_VERB = rx(
  latin('pay|send|buy|purchase|transfer|load|provide|submit|deposit|top up|redeem|scratch|code|pin|redemption'),
  '입금|송금|구매|구입|충전|보내|전송|제출|알려|전달|결제|지급|핀 ?번호|코드|일련번호',
);

export const CRYPTO_GIFT_RULES: PairRule[] = [{ a: CRYPTO_OR_GIFT_TERM, b: PAYMENT_REQUEST_VERB }];

/* ------------------------------------------------------------------ */
/* URGENCY_PRESSURE                                                    */
/* ------------------------------------------------------------------ */

export const URGENCY_TERMS = rx(
  latin(
    'immediately|right now|within 24 hours|within the hour|today only|last chance|act now|urgent|urgently|asap|as soon as possible|before it expires|hurry',
  ),
  '즉시|지금 바로|지금 당장|당장|24시간 (?:이내|안)|오늘까지|오늘 안에|오늘만|마지막 기회|긴급|급하게|급히|서둘러|서두르|빨리|시간이 없',
);
export const CONSEQUENCE_TERMS = rx(
  latin(
    "you will lose|you'll lose|offer expires|offer will expire|limited slots|limited spots|do not miss|don't miss|must respond|must reply|final notice|otherwise|no time to think|only \\d+ (?:slots|spots|positions)",
  ),
  '놓치|마감|선착순|자리가 (?:없|얼마|한정)|취소됩니다|취소될|무효|만료|기회가 사라|응답하지 않으면|답하지 않으면|하지 않으면|않을 경우|마지막 통보|최종 통보|한정|제한된 인원|명만|명 남|남지 않았|없어집니다|사라집니다',
);

/* ------------------------------------------------------------------ */
/* OFF_PLATFORM_CONTACT                                                */
/* ------------------------------------------------------------------ */

const CHANNEL_TERM = rx(
  latin(
    'whatsapp|telegram|signal|skype|discord|facebook messenger|messenger|instagram|dm|dms|direct message|wechat|viber|kakaotalk|kakao|gmail\\.com|yahoo\\.com|outlook\\.com|hotmail\\.com|proton\\.me|protonmail\\.com|naver\\.com|daum\\.net|hanmail\\.net',
  ),
  '카카오톡|카톡|오픈 ?채팅|오픈톡|텔레그램|왓츠앱|시그널|디스코드|인스타(?:그램)?|페이스북 메신저|페메|위챗|(?<![가-힣])라인(?=으로|에서|이나|이든|이|은|을|도|만|에|,|\\s|$|\\.|:)|개인 (?:이메일|메일|연락처|번호)|개인메일|개인이메일',
);
const CONTACT_DIRECTIVE = rx(
  latin(
    'contact me|contact us|message me|message us|text me|reply to|reply at|move to|continue on|add me|chat on|chat with|reach me|reach out|dm me|via|through',
  ),
  '연락|문의|추가|메시지|메세지|대화|채팅|친구 ?추가|아이디|으로만|로만|주세요|주십시오|바랍니다|하세요|해 ?주세요|보내|답장|회신|지원',
);

export const OFF_PLATFORM_RULES: PairRule[] = [{ a: CHANNEL_TERM, b: CONTACT_DIRECTIVE }];

/* ------------------------------------------------------------------ */
/* SENSITIVE_DATA_REQUEST                                              */
/* ------------------------------------------------------------------ */

const SENSITIVE_TERM = rx(
  latin(
    "social security|ssn|national insurance|resident registration|passport number|passport|driver'?s licen[cs]e|driving licen[cs]e|tax id|bank account|account number|routing number|iban|swift|credit card|debit card|card number|cvv|online banking|password|passcode|one-time code|verification code|otp|security code|pin",
  ),
  '주민등록번호|주민번호|주민등록증|여권 ?번호|여권 ?사본|운전면허|면허번호|계좌 ?번호|계좌 ?정보|통장 ?사본|통장 ?사진|신분증|카드 ?번호|신용카드|체크카드|카드 ?사진|비밀번호|패스워드|인증번호|인증 ?코드|보안카드|보안 ?코드|공인인증서|공동인증서|공동 ?인증|본인인증|간편 ?비밀번호|cvc',
);
const DATA_REQUEST_VERB = rx(
  latin('send|provide|share|upload|confirm|verify|enter|submit|reply with|give|attach|fill in|type'),
  '알려|보내|제출|입력|공유|전송|첨부|등록|기재|적어|말해|주세요|주십시오|바랍니다|필요합니다|요구|함께|촬영|찍어|올려|업로드',
);

export const SENSITIVE_DATA_RULES: PairRule[] = [{ a: SENSITIVE_TERM, b: DATA_REQUEST_VERB }];

/* ------------------------------------------------------------------ */
/* UNVERIFIED_OR_SHORTENED_LINK                                        */
/* ------------------------------------------------------------------ */

export const URL_TOKEN =
  /https?:\/\/[^\s<>"'()\[\]{}]+|(?<![a-z0-9@.\/-])www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<>"'()\[\]{}]*)?|(?<![a-z0-9@.\/-])(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>"'()\[\]{}]*/g;
export const TRAILING_URL_PUNCTUATION = /[.,;:!?)\]}'"]+$/;
export const SHORTENER_HOSTS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'buff.ly',
  'is.gd',
  'cutt.ly',
  'rb.gy',
  'han.gl',
  'me2.do',
  'vo.la',
  'url.kr',
];

/* ------------------------------------------------------------------ */
/* MISSING_EMPLOYER_DETAILS                                            */
/* ------------------------------------------------------------------ */

/**
 * Only markers that structurally carry (or require) an actual name, not bare
 * self-reference. "our company", "we are", "당사", "본사" etc. were removed:
 * they match without identifying who the employer is (AGENTS.md §3 — pasted
 * text is untrusted; a claim of identity is not identification).
 */
export const EMPLOYER_MARKERS = rx(
  latin('inc\\.?|ltd\\.?|llc|corp\\.?|corporation|co\\.,? ?ltd\\.?|gmbh|pty|plc|employer:|company:'),
  '주식회사|\\(주\\)|㈜|유한회사|법인|회사명|기업명|사업자 ?등록 ?번호|사업자번호|고용주|채용 ?기업|소속 ?[:：]|회사 ?[:：]|기업 ?[:：]|株式会社',
);

/** Phrases that defer the actual detail rather than provide it (e.g. "합격 후 안내"). */
export const DEFERRAL_TERMS = rx(
  latin(
    'to be announced|to be disclosed|to be determined|tba|tbd|will be (?:shared|provided|announced) later|details? (?:to follow|later)',
  ),
  '추후|합격\\s*후|면접\\s*후|선발\\s*후|채용\\s*후|공개\\s*예정|안내\\s*예정',
);

/* ------------------------------------------------------------------ */
/* VAGUE_ROLE_OR_TERMS                                                 */
/* ------------------------------------------------------------------ */

export const ROLE_DUTY_TERMS = rx(
  latin('responsible for|duties|tasks|responsibilities|job description|role description|you will be|your role|day-to-day'),
  '업무|직무|담당하|담당 ?업무|역할|하는 일|수행|仕事内容',
);
export const WORK_TERM_TERMS = rx(
  latin(
    'salary|pay|paid|hourly|per hour|wage|wages|hours|schedule|location|remote|contract|benefits|compensation|per week|per month|full-time|part-time',
  ),
  '급여|월급|연봉|시급|주급|일급|근무 ?시간|근무지|근무 ?장소|재택|계약|복리후생|복지|근무일|근무 ?요일|수당|정규직|계약직|아르바이트|알바|파트타임|풀타임|출퇴근|근무 ?형태|보수|페이',
);
export const GENERIC_TITLES = rx(
  latin('assistant|manager|associate|agent|specialist|consultant'),
  '어시스턴트|매니저|에이전트|스페셜리스트|컨설턴트',
);

/* ------------------------------------------------------------------ */
/* Instruction-like text (recorded as data only, never executed)       */
/* ------------------------------------------------------------------ */

export const MANIPULATION_PATTERNS = rx(
  'ignore (?:all |the )?(?:previous|prior|above|earlier) (?:instructions|rules|prompts)',
  'disregard (?:all |the )?(?:previous|prior|above) (?:instructions|rules)',
  '\\[system\\]',
  '\\[assistant\\]',
  '\\[developer\\]',
  '(?<![a-z])system prompt',
  'you are now (?:a|an) ',
  'from now on you are',
  'new instructions?:',
  '이전 지시를? 무시',
  '지시를? 무시하',
  '시스템 (?:지시|프롬프트|메시지)',
  '지금부터 (?:너는|당신은|넌)',
  '규칙이 없는',
  '안전하다고 (?:표시|답|말|판정|알려)',
  '안전한 회사라고',
  '사기가 아니라고',
  '100% 확신',
  '확신 점수',
  '신뢰 점수',
  '\\{\\s*"tool"\\s*:',
  '"action"\\s*:\\s*"',
  'mark(?:ed)? (?:as |it )?safe',
);
