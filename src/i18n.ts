import type { ReceiptToolName } from './domain/actionReceipts';
import type { OfferSignal, SignalId } from './domain/types';
import type { SourceFileErrorCode } from './sourceIntake';

export type Locale = 'ko' | 'en';

export const LOCALE_TAG: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
};

export const SAMPLE_OFFERS: Record<Locale, string> = {
  ko: `회사명은 추후 안내합니다.
누구나 가능한 간단한 재택 업무이며 오늘 안에 바로 결정해 주세요.
업무 시작 전 교육비 5만원을 먼저 입금해야 합니다.
연락은 카카오톡 오픈채팅으로만 받습니다: https://bit.ly/example-offer`,
  en: `The company name will be shared later.
This is simple remote work that anyone can do. Decide today.
Pay a KRW 50,000 training fee upfront before starting.
Contact us only through KakaoTalk Open Chat: https://bit.ly/example-offer`,
};

export const UI_COPY = {
  ko: {
    documentTitle: 'Offroof - 채용 제안 근거 대장',
    languageLabel: '화면 언어',
    localMode: '브라우저 로컬',
    connected: (count: number) => `WebMCP ${count}개 연결`,
    checking: 'WebMCP 확인 중',
    manualMode: '수동 모드',
    connectionError: 'WebMCP 연결 오류',
    newReview: '새 검토',
    pageNavLabel: '주요 화면',
    navOverview: '소개',
    navReview: '제안 검토',
    navCase: '사례 기록',
    caseFile: 'CASE FILE · LOCAL REVIEW',
    titleLead: '제안은 말로, ',
    titleAccent: '확인은 근거로',
    titleTail: '.',
    intro: '사기 여부를 단정하지 않습니다. 원문에서 관찰 가능한 신호를 분리하고, 직접 확인할 순서를 남깁니다.',
    overviewPrimary: '제안 검토 시작',
    overviewDemo: '예시로 바로 체험',
    overviewCards: [
      { number: '01', title: '원문을 가져옵니다', body: '텍스트를 붙여넣거나 TXT, MD, EML 파일을 브라우저에서만 읽습니다.' },
      { number: '02', title: '근거를 분리합니다', body: '관찰된 문구와 제한된 해석을 구분하고 사기 여부는 단정하지 않습니다.' },
      { number: '03', title: '함께 확인합니다', body: '사람과 WebMCP 에이전트가 같은 체크리스트와 작업 기록을 사용합니다.' },
    ],
    reviewPageKicker: 'SOURCE INTAKE',
    reviewPageTitle: '검토할 제안을 가져오세요',
    reviewPageBody: '복사한 문구나 내보낸 이메일 파일을 넣으면 외부 전송 없이 현재 탭에서만 읽습니다.',
    casePageKicker: 'CASE WORKSPACE',
    casePageTitle: '관찰된 근거와 확인 기록',
    casePageBody: '분석 결과, 확인 체크리스트, WebMCP 작업 기록과 공식 자료를 한 사례로 이어 봅니다.',
    backToReview: '제안 입력으로 돌아가기',
    handlingNote: '취급 원칙',
    localProcessing: '현재 탭에서만 처리',
    noExternalAction: '외부 실행 0건',
    noVerdict: '자동 판정 없음',
    stages: ['원문', '신호', '확인 계획', '공식 자료'],
    workflowLabel: '검토 진행 순서',
    fallbackTitle: '수동 검토를 계속할 수 있습니다',
    fallbackBody: 'WebMCP가 연결되지 않아도 화면 버튼으로 같은 검토 흐름을 사용할 수 있습니다.',
    reconnect: 'WebMCP 다시 연결',
    sourceKicker: 'SOURCE TRANSCRIPT',
    sourceTitle: '받은 제안 원문',
    loadSample: '예시 불러오기',
    offerLabel: '이메일이나 메시지의 텍스트',
    offerPlaceholder: '개인정보를 지운 뒤 제안 내용을 붙여넣으세요.',
    fileDropTitle: '이메일·텍스트 파일 놓기',
    fileDropBody: '여기에 파일을 끌어놓거나 직접 선택하세요.',
    chooseFile: '파일 선택',
    supportedFiles: '지원: .txt · .md · .eml / 최대 1MB',
    fileSafetyBoundary: '파일은 실행하지 않으며 HTML과 첨부파일을 열지 않습니다. PDF·Word·압축·실행 파일은 받지 않습니다.',
    manualInputDivider: '또는 텍스트를 직접 붙여넣기',
    fileReading: '파일을 브라우저에서 읽고 있습니다…',
    fileLoaded: (name: string) => `${name}의 읽을 수 있는 텍스트를 가져왔습니다. 개인정보를 확인해 주세요.`,
    clearImportedFile: '가져온 파일 표시 지우기',
    characters: (count: number) => `${count.toLocaleString('ko-KR')}자`,
    noServerTransfer: '서버 전송 없음',
    privacyTitle: '개인정보 확인이 먼저예요',
    privacyBody: '이름, 전화번호, 이메일, 주소, 계좌·식별·인증번호는 지우거나 가려 주세요.',
    privacyConsent: '입력 내용을 확인했고 표시용 마스킹에 동의합니다.',
    inspect: '확인 신호 살펴보기',
    maskedPreview: '마스킹된 표시용 원문',
    evidenceKicker: 'EVIDENCE LEDGER',
    evidenceTitle: '근거 대장',
    caseVersion: (version: number) => `사례 v${version}`,
    emptyKicker: '아직 분석 전',
    emptyTitle: '문구를 넣으면 확인 근거가 여기에 모입니다',
    emptySteps: ['개인정보를 지우고 원문 입력', '관찰된 문구와 해석의 한계 확인', '직접 검증할 체크리스트 실행'],
    startSample: '안전한 예시로 체험 시작',
    noSignalCaveat: '신호가 없더라도 안전하다는 뜻은 아닙니다.',
    caseEmptyTitle: '아직 검토된 사례가 없습니다',
    caseEmptyBody: '제안 검토 화면에서 텍스트나 이메일 파일을 가져오고 확인 신호를 살펴보세요.',
    caseEmptyCta: '제안 검토하러 가기',
    currentReview: '현재 검토',
    signalCount: (count: number) => `확인 신호 ${count}개`,
    notVerdict: '고정 규칙으로 관찰한 결과이며 사기 판정이 아닙니다.',
    planProgress: '확인 계획',
    progressLabel: (done: number, total: number) => `확인 계획 ${done}/${total} 완료`,
    zeroExternal: '외부 실행 0',
    signalsLabel: '확인이 필요한 신호',
    observedFact: '관찰 사실',
    observation: '관찰',
    boundedInference: '제한된 추론',
    limitation: '한계',
    allowAgent: '에이전트 변경 허용',
    allowAgentBody: '체크리스트 생성과 상태 변경만 허용합니다.',
    buildPlan: '확인 계획 만들기',
    verifyKicker: 'VERIFY RECORD',
    verifyTitle: '확인 기록',
    undo: '직전 변경 되돌리기',
    staleAnalysis: '원문이 바뀌어 이전 체크리스트를 보존했습니다. 신호를 다시 살펴본 뒤 계속하세요.',
    archivedAnalysis: '현재 원문에서 근거가 다시 확인되지 않은 이전 항목은 보관 상태로 잠겼습니다.',
    archivedItem: '이전 분석 항목',
    activityKicker: 'AGENT LEDGER',
    activityTitle: 'WebMCP 작업 로그',
    recentReceipts: (count: number, max: number) => `최근 ${count}/${max}`,
    activityBody: '에이전트는 사례 읽기, 신호 분석, 확인 계획 작성, 항목 상태 변경, 공식 자료 조회만 할 수 있습니다. 원문과 도구 인수는 기록하지 않습니다.',
    toolMap: (count: number) => `연결된 ${count}개 도구 보기`,
    noReceipts: '아직 에이전트가 실행한 작업이 없습니다.',
    applied: '적용됨',
    blocked: '차단됨',
    read: '읽기',
    analysis: '분석',
    mutation: '변경',
    resourcesKicker: 'SOURCE NOTES',
    resourcesTitle: '공식 자료',
    noAutoReport: '자동 신고 없음',
    resourcesBody: 'Offroof는 링크를 대신 열거나 신고하지 않습니다. 적용 범위와 최신 내용을 직접 확인하세요.',
    linkChecked: (date: string) => `링크 확인일 ${date}`,
  },
  en: {
    documentTitle: 'Offroof - Job Offer Evidence Desk',
    languageLabel: 'Interface language',
    localMode: 'Browser local',
    connected: (count: number) => `${count} WebMCP tools connected`,
    checking: 'Checking WebMCP',
    manualMode: 'Manual mode',
    connectionError: 'WebMCP connection error',
    newReview: 'New review',
    pageNavLabel: 'Primary pages',
    navOverview: 'Overview',
    navReview: 'Review offer',
    navCase: 'Case record',
    caseFile: 'CASE FILE · LOCAL REVIEW',
    titleLead: 'Offers arrive as words. ',
    titleAccent: 'Verification starts with evidence',
    titleTail: '.',
    intro: 'No fraud verdicts. Offroof separates observable signals from interpretation and records what you should verify next.',
    overviewPrimary: 'Start an offer review',
    overviewDemo: 'Try the sample',
    overviewCards: [
      { number: '01', title: 'Bring in the source', body: 'Paste text or read a TXT, MD, or EML file entirely inside the browser.' },
      { number: '02', title: 'Separate the evidence', body: 'Keep observed language distinct from bounded interpretation without issuing a fraud verdict.' },
      { number: '03', title: 'Verify together', body: 'A person and a WebMCP agent share the same checklist and visible activity trail.' },
    ],
    reviewPageKicker: 'SOURCE INTAKE',
    reviewPageTitle: 'Bring in the offer you want to review',
    reviewPageBody: 'Paste copied text or use an exported email file. It stays in this browser tab and is never uploaded.',
    casePageKicker: 'CASE WORKSPACE',
    casePageTitle: 'Observed evidence and verification record',
    casePageBody: 'Follow the signals, checklist, WebMCP activity, and official sources as one continuous case record.',
    backToReview: 'Back to source intake',
    handlingNote: 'Handling note',
    localProcessing: 'Processed in this tab',
    noExternalAction: 'No external actions',
    noVerdict: 'No automated verdict',
    stages: ['Source', 'Signals', 'Verification', 'Sources'],
    workflowLabel: 'Review progress',
    fallbackTitle: 'Manual review is still available',
    fallbackBody: 'If WebMCP is unavailable, the controls below provide the same review workflow.',
    reconnect: 'Reconnect WebMCP',
    sourceKicker: 'SOURCE TRANSCRIPT',
    sourceTitle: 'Received offer text',
    loadSample: 'Load sample',
    offerLabel: 'Text from an email or message',
    offerPlaceholder: 'Remove personal information, then paste the offer text.',
    fileDropTitle: 'Drop an email or text file',
    fileDropBody: 'Drag a file here or choose one from this device.',
    chooseFile: 'Choose file',
    supportedFiles: 'Supported: .txt · .md · .eml / up to 1 MB',
    fileSafetyBoundary: 'Files are never executed. Email HTML and attachments are not opened. PDF, Word, archives, and executables are rejected.',
    manualInputDivider: 'or paste the text directly',
    fileReading: 'Reading the file in this browser…',
    fileLoaded: (name: string) => `Imported readable text from ${name}. Review personal information before continuing.`,
    clearImportedFile: 'Clear imported file label',
    characters: (count: number) => `${count.toLocaleString('en-US')} characters`,
    noServerTransfer: 'No server transfer',
    privacyTitle: 'Check personal information first',
    privacyBody: 'Remove or mask names, phone numbers, emails, addresses, account numbers, identifiers, and verification codes.',
    privacyConsent: 'I reviewed the text and agree to display-only masking.',
    inspect: 'Review offer signals',
    maskedPreview: 'Masked display copy',
    evidenceKicker: 'EVIDENCE LEDGER',
    evidenceTitle: 'Evidence record',
    caseVersion: (version: number) => `Case v${version}`,
    emptyKicker: 'NOT YET REVIEWED',
    emptyTitle: 'Observable evidence will be filed here',
    emptySteps: ['Remove personal data and enter the source text', 'Review observations and their limits', 'Create a checklist for direct verification'],
    startSample: 'Start with a safe sample',
    noSignalCaveat: 'No detected signal does not mean an offer is safe.',
    caseEmptyTitle: 'There is no reviewed case yet',
    caseEmptyBody: 'Open Review offer, paste text or import an email file, then inspect the verification signals.',
    caseEmptyCta: 'Go to offer review',
    currentReview: 'Current review',
    signalCount: (count: number) => `${count} signal${count === 1 ? '' : 's'} to verify`,
    notVerdict: 'These are deterministic observations, not a fraud verdict.',
    planProgress: 'Verification plan',
    progressLabel: (done: number, total: number) => `${done} of ${total} verification items complete`,
    zeroExternal: '0 external actions',
    signalsLabel: 'Signals that need verification',
    observedFact: 'Observed fact',
    observation: 'Observation',
    boundedInference: 'Bounded inference',
    limitation: 'Limit',
    allowAgent: 'Allow agent changes',
    allowAgentBody: 'Only checklist creation and status updates are allowed.',
    buildPlan: 'Create verification plan',
    verifyKicker: 'VERIFY RECORD',
    verifyTitle: 'Verification record',
    undo: 'Undo last change',
    staleAnalysis: 'The source text changed. The previous checklist is preserved; review the signals again before continuing.',
    archivedAnalysis: 'Items no longer supported by the current source are locked as archived records.',
    archivedItem: 'Previous analysis item',
    activityKicker: 'AGENT LEDGER',
    activityTitle: 'WebMCP activity log',
    recentReceipts: (count: number, max: number) => `Latest ${count}/${max}`,
    activityBody: 'The agent can read the case, inspect signals, create a verification plan, update item status, and retrieve official sources. Raw offer text and tool arguments are not logged.',
    toolMap: (count: number) => `View ${count} connected tools`,
    noReceipts: 'No agent action has been recorded yet.',
    applied: 'Applied',
    blocked: 'Blocked',
    read: 'Read',
    analysis: 'Analysis',
    mutation: 'Change',
    resourcesKicker: 'SOURCE NOTES',
    resourcesTitle: 'Official sources',
    noAutoReport: 'No automatic reports',
    resourcesBody: 'Offroof does not open links or submit reports for you. Check scope and current guidance directly.',
    linkChecked: (date: string) => `Link checked ${date}`,
  },
} as const;

const SIGNAL_COPY_EN: Record<SignalId, Omit<OfferSignal, 'signalId' | 'observedText'>> = {
  UPFRONT_PAYMENT: {
    title: 'Payment requested before work begins',
    observation: 'The source asks for money before the work begins.',
    inference: 'Verify the company, written terms, and payment recipient through an official channel before sending money.',
    limitations: 'A training or equipment charge alone does not establish whether the offer is fraudulent.',
    verificationPrompt: 'Verify the recipient, contractual basis, and refund terms through an official channel',
  },
  PAYMENT_IN_CRYPTO_OR_GIFT_CARD: {
    title: 'Crypto or gift-card payment request',
    observation: 'The source requests payment using cryptocurrency or gift cards.',
    inference: 'Cross-check the payment method and recipient against the written contract and official company contact.',
    limitations: 'Some legitimate agreements use cryptocurrency, so this signal cannot determine the outcome by itself.',
    verificationPrompt: 'Check whether the payment method appears in the contract and official payment guidance',
  },
  URGENCY_PRESSURE: {
    title: 'Pressure to decide quickly',
    observation: 'The source asks for a quick decision before there is time to verify details.',
    inference: 'Verify the terms and the sender through an official channel regardless of the stated deadline.',
    limitations: 'A legitimate hiring process can have a short deadline, so urgency alone is not conclusive.',
    verificationPrompt: 'Confirm the deadline and its reason with an official company contact',
  },
  OFF_PLATFORM_CONTACT: {
    title: 'Contact restricted to an unofficial channel',
    observation: 'The source directs communication to a messenger or personal channel.',
    inference: 'Cross-check the role and sender through the company domain or a published contact number.',
    limitations: 'Some organizations legitimately use messaging apps, so the channel alone does not establish trust.',
    verificationPrompt: 'Confirm the recruiter and posting through a contact listed on the official company website',
  },
  SENSITIVE_DATA_REQUEST: {
    title: 'Request for sensitive information',
    observation: 'The source requests identity, financial, or authentication information.',
    inference: 'Verify why the information is needed, who stores it, and the official submission route before sharing it.',
    limitations: 'Some information may be required after a formal hire; timing and submission channel still matter.',
    verificationPrompt: 'Verify the purpose and official submission route in the organization’s privacy policy',
  },
  UNVERIFIED_OR_SHORTENED_LINK: {
    title: 'Link with an unclear destination',
    observation: 'The source contains a shortened link whose final destination is not immediately visible.',
    inference: 'Do not open it automatically; locate the same notice through the company’s official website.',
    limitations: 'Shortened links are also used for legitimate campaigns and analytics.',
    verificationPrompt: 'Find the same posting on the official careers page before opening the link',
  },
  MISSING_EMPLOYER_DETAILS: {
    title: 'Employer details deferred or withheld',
    observation: 'The source says the company or sender details are not currently available.',
    inference: 'Verify the legal employer and recruiter affiliation before applying or sharing information.',
    limitations: 'A legitimate recruiting agency may keep a client confidential during early screening.',
    verificationPrompt: 'Verify the legal company name, official domain, and recruiter affiliation',
  },
  VAGUE_ROLE_OR_TERMS: {
    title: 'Role or terms are not specific',
    observation: 'The source does not clearly describe the role or working terms.',
    inference: 'Request written details about duties, hours, compensation, and contract type before applying.',
    limitations: 'This may be a short promotional message with details available in a full posting or contract.',
    verificationPrompt: 'Request written details for duties, hours, compensation, and contract type',
  },
};

const RECEIPT_COPY_EN: Record<ReceiptToolName, { success: string; blocked: string }> = {
  get_case_summary: {
    success: 'Read the privacy-preserving case summary.',
    blocked: 'The case summary was not returned. Check the privacy confirmation shown on screen.',
  },
  inspect_offer_signals: {
    success: 'Completed a browser-local signal inspection.',
    blocked: 'The signal inspection was not applied. Check the privacy confirmation shown on screen.',
  },
  build_verification_plan: {
    success: 'Applied the verification checklist change.',
    blocked: 'The checklist change was not applied. Check consent and the latest case state.',
  },
  update_verification_step: {
    success: 'Applied the verification item status change.',
    blocked: 'The item change was not applied. Check consent and the latest case state.',
  },
  get_official_resources: {
    success: 'Read the pre-verified official source list.',
    blocked: 'The official source list was not returned.',
  },
};

export const RESOURCE_COPY_EN: Record<string, { agency: string; title: string }> = {
  'KR-MOEL-JOB-SCAM-NOTICE': {
    agency: 'Republic of Korea · Ministry of Employment and Labor',
    title: 'Job-seeker employment scam advisory',
  },
  'KR-POLICE-ECRM': {
    agency: 'Korean National Police Agency',
    title: 'ECRM cybercrime reporting guidance',
  },
};

export function localizeSignal(signal: OfferSignal, locale: Locale): OfferSignal {
  if (locale === 'ko') return signal;
  return { ...signal, ...SIGNAL_COPY_EN[signal.signalId] };
}

export function localizeVerificationLabel(signalId: SignalId, fallback: string, locale: Locale): string {
  return locale === 'en' ? SIGNAL_COPY_EN[signalId].verificationPrompt : fallback;
}

export function localizeReceiptMessage(
  toolName: ReceiptToolName,
  outcome: 'success' | 'blocked',
  fallback: string,
  locale: Locale,
): string {
  return locale === 'en' ? RECEIPT_COPY_EN[toolName][outcome] : fallback;
}

export type NoticeKey =
  | 'initial'
  | 'signalsFound'
  | 'planBuilt'
  | 'stepUpdated'
  | 'sampleLoaded'
  | 'inspectFailed'
  | 'planFailed'
  | 'updateFailed'
  | 'undoDone'
  | 'undoFailed'
  | 'resetDone';

export function noticeText(locale: Locale, key: NoticeKey, count = 0): string {
  const notices: Record<Locale, Record<NoticeKey, string>> = {
    ko: {
      initial: '제안 원문을 붙여넣고 개인정보를 확인해 주세요.',
      signalsFound: `확인이 필요한 신호 ${count}개를 찾았습니다.`,
      planBuilt: `확인 체크리스트 ${count}개를 만들었습니다.`,
      stepUpdated: '확인 항목 상태를 변경했습니다.',
      sampleLoaded: '안전한 예시를 불러왔습니다. 개인정보 확인 후 신호를 살펴보세요.',
      inspectFailed: '검사를 완료하지 못했습니다.',
      planFailed: '체크리스트를 만들지 못했습니다.',
      updateFailed: '상태를 변경하지 못했습니다.',
      undoDone: '직전 변경을 새 버전으로 되돌렸습니다.',
      undoFailed: '되돌리지 못했습니다.',
      resetDone: '새 검토를 시작했습니다.',
    },
    en: {
      initial: 'Paste the offer text and confirm that personal information has been removed.',
      signalsFound: `Found ${count} signal${count === 1 ? '' : 's'} that need verification.`,
      planBuilt: `Created ${count} verification item${count === 1 ? '' : 's'}.`,
      stepUpdated: 'Updated the verification item.',
      sampleLoaded: 'Loaded a safe sample. Confirm privacy, then review the signals.',
      inspectFailed: 'The inspection could not be completed.',
      planFailed: 'The verification plan could not be created.',
      updateFailed: 'The status could not be updated.',
      undoDone: 'Restored the previous change as a new case version.',
      undoFailed: 'The previous change could not be restored.',
      resetDone: 'Started a new review.',
    },
  };
  return notices[locale][key];
}

export function sourceFileErrorText(locale: Locale, code: SourceFileErrorCode): string {
  const messages: Record<Locale, Record<SourceFileErrorCode, string>> = {
    ko: {
      'unsupported-type': '이 파일 형식은 읽지 않습니다. TXT, MD 또는 EML 파일을 선택해 주세요.',
      'file-too-large': '파일이 1MB보다 큽니다. 필요한 본문만 텍스트로 저장해 다시 넣어 주세요.',
      'empty-file': '읽을 수 있는 텍스트가 없는 파일입니다.',
      'text-too-long': '읽을 텍스트가 너무 깁니다. 필요한 제안 부분만 5만 자 이내로 줄여 주세요.',
      'binary-file': '텍스트가 아닌 데이터가 감지되어 파일을 열지 않았습니다.',
      'email-format-unsupported': '이 이메일은 HTML·첨부·인코딩된 형식입니다. 화면에 보이는 본문만 복사해 붙여넣어 주세요.',
      'read-failed': '파일을 읽지 못했습니다. 텍스트를 직접 붙여넣어 주세요.',
    },
    en: {
      'unsupported-type': 'This file type is not accepted. Choose a TXT, MD, or EML file.',
      'file-too-large': 'This file is larger than 1 MB. Save only the relevant body as text and try again.',
      'empty-file': 'The file does not contain readable text.',
      'text-too-long': 'The readable text is too long. Keep the relevant offer under 50,000 characters.',
      'binary-file': 'Non-text data was detected, so the file was not opened.',
      'email-format-unsupported': 'This email uses HTML, attachments, or encoded MIME. Copy only the visible message body and paste it instead.',
      'read-failed': 'The file could not be read. Paste the text directly instead.',
    },
  };
  return messages[locale][code];
}
