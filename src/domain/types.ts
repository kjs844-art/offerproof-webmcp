/**
 * Shared OfferProof domain types.
 *
 * Product contract (AGENTS.md §2): OfferProof surfaces "signals that need
 * checking" with verbatim evidence. It never declares an offer fraudulent or
 * safe and never produces a probability or confidence score. None of the
 * types below carry a verdict, score, or confidence field by design.
 */

export const ENGINE_VERSION = '1.0.0';
export const CASE_SCHEMA_VERSION = 1 as const;

/** Canonical signal IDs in canonical emission order (docs/research/RISK_SIGNAL_REGISTRY.md). */
export const SIGNAL_IDS = [
  'UPFRONT_PAYMENT',
  'PAYMENT_IN_CRYPTO_OR_GIFT_CARD',
  'URGENCY_PRESSURE',
  'OFF_PLATFORM_CONTACT',
  'SENSITIVE_DATA_REQUEST',
  'UNVERIFIED_OR_SHORTENED_LINK',
  'MISSING_EMPLOYER_DETAILS',
  'VAGUE_ROLE_OR_TERMS',
] as const;

export type SignalId = (typeof SIGNAL_IDS)[number];

export type SignalCategory =
  | 'compensation'
  | 'communication'
  | 'contact'
  | 'personalData'
  | 'link'
  | 'employerMetadata'
  | 'roleDescription';

/** User-controlled review status of a signal card. */
export type SignalUserStatus = 'unreviewed' | 'reviewing' | 'reviewed' | 'not_applicable';

/** An exact substring of the pasted text, addressed by UTF-16 offsets. */
export interface EvidenceSpan {
  /** Inclusive start offset into the offer text. */
  start: number;
  /** Exclusive end offset into the offer text. */
  end: number;
  /** `offerText.slice(start, end)` (masked for display once stored in a case). */
  text: string;
  /** 1-based paragraph number that contains `start`. */
  paragraph: number;
  /** Optional Korean label shown next to the span (e.g. "단축 링크"). */
  label?: string;
}

export interface SourceLocation {
  paragraph: number;
  start: number;
  end: number;
}

/** A signal card. Fields mirror docs/PROJECT.md "위험 신호 데이터 계약". */
export interface Signal {
  signalId: SignalId;
  category: SignalCategory;
  /** Korean card title. */
  title: string;
  /** Display quote: evidence texts joined with " … ". Empty string for absence rules. */
  observedText: string;
  /** Exact spans. Empty for absence rules. */
  evidence: EvidenceSpan[];
  /** Neutral observation. Never a verdict. */
  observation: string;
  /** Official guidance source IDs (explanatory only; never evidence). */
  guidanceSourceIds: string[];
  /** Limited next-check suggestion. Never a verdict. */
  inference: string;
  /** Signal-specific caveat. */
  limitations: string;
  sourceLocation: SourceLocation | null;
  userStatus: SignalUserStatus;
}

/** Instruction-like text found inside the pasted offer. Recorded as data only. */
export interface ManipulationNotice {
  noticeId: string;
  evidence: EvidenceSpan;
  observation: string;
}

/** Which kinds of information the pasted text does or does not contain. Not a verdict. */
export interface AnalysisCoverage {
  hasEmployerDetails: boolean;
  hasRoleDuty: boolean;
  hasWorkTerms: boolean;
}

/** Raw engine output (unmasked). Only the service layer may hold this. */
export interface EngineResult {
  engineVersion: string;
  signals: Signal[];
  notices: ManipulationNotice[];
  coverage: AnalysisCoverage;
}

export type MaskKind =
  | 'resident_registration'
  | 'bank_account'
  | 'card_number'
  | 'phone'
  | 'email'
  | 'secret'
  | 'passport';

export interface MaskFinding {
  kind: MaskKind;
  start: number;
  end: number;
  /** Korean label for the UI. */
  label: string;
}

export interface CaseInput {
  /** Exact pasted text. Kept in memory only; never sent anywhere. */
  rawText: string;
  /** Length-preserving masked copy for display and tool output. */
  maskedText: string;
  maskFindings: MaskFinding[];
  /** Set only through the UI checkbox. Required before analysis. */
  privacyConfirmed: boolean;
  updatedAt: string;
}

export interface CaseAnalysis {
  analysisId: string;
  engineVersion: string;
  /** Deterministic fingerprint of the analysed input (not reversible). */
  inputFingerprint: string;
  analyzedAt: string;
  /** Signals with masked evidence. */
  signals: Signal[];
  notices: ManipulationNotice[];
  coverage: AnalysisCoverage;
}

export type StepStatus = 'todo' | 'done';
export type StepPriority = 'high' | 'medium' | 'low';

export interface VerificationStep {
  verificationStepId: string;
  signalId: SignalId | null;
  title: string;
  question: string;
  priority: StepPriority;
  status: StepStatus;
  memo: string | null;
  resourceIds: string[];
}

export interface VerificationPlan {
  verificationPlanId: string;
  status: 'active';
  createdAt: string;
  basedOnAnalysisId: string | null;
  signalIds: SignalId[];
  steps: VerificationStep[];
}

export const JURISDICTIONS = ['KR', 'US', 'GB', 'AU', 'CA', 'OTHER'] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

export const RESOURCE_TOPICS = [
  'general_offer_review',
  'upfront_payment',
  'personal_information',
  'contract_terms',
] as const;
export type ResourceTopic = (typeof RESOURCE_TOPICS)[number];

export type LinkStatus = 'verified' | 'unavailable';

export interface OfficialResource {
  resourceId: string;
  agency: string;
  title: string;
  /** HTTPS URL when verified; null when no verified link is available. */
  url: string | null;
  topic: ResourceTopic;
  jurisdiction: Jurisdiction;
  /** ISO date of the last recorded link check, or null when never verified. */
  lastVerifiedAt: string | null;
  /** Who/what recorded the verification, or why it is unavailable. */
  verificationNote: string;
  isLegalAdvice: boolean;
  supportsSignalIds: SignalId[];
  linkStatus: LinkStatus;
}

export type CaseStatus = 'empty' | 'input' | 'result';

export interface CaseState {
  schemaVersion: typeof CASE_SCHEMA_VERSION;
  caseId: string;
  /** Monotonic version. Exposed as `v${version}`. */
  version: number;
  status: CaseStatus;
  input: CaseInput | null;
  analysis: CaseAnalysis | null;
  plan: VerificationPlan | null;
  /** Kept when a plan is replaced so the user can restore it. */
  previousPlan: VerificationPlan | null;
  jurisdiction: Jurisdiction;
  updatedAt: string;
}

export const TOOL_NAMES = [
  'get_case_summary',
  'inspect_offer_signals',
  'build_verification_plan',
  'update_verification_step',
  'get_official_resources',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export type ToolErrorCode =
  | 'INVALID_INPUT'
  | 'UNKNOWN_CASE'
  | 'CASE_VERSION_CONFLICT'
  | 'UNKNOWN_ID'
  | 'CONFIRMATION_REQUIRED'
  | 'PRIVACY_RESTRICTION'
  | 'TOOL_UNAVAILABLE'
  | 'ANALYSIS_FAILED'
  | 'RESOURCE_UNAVAILABLE'
  | 'CANCELLED';

export interface FieldError {
  path: string;
  code: string;
  message: string;
}

export interface ToolSuccess<T> {
  ok: true;
  tool: ToolName;
  caseId: string;
  caseVersion: string;
  changedIds: string[];
  changedFields: string[];
  data: T;
}

export interface ToolFailure {
  ok: false;
  tool: ToolName;
  error: {
    code: ToolErrorCode;
    message: string;
    retryable: boolean;
    fieldErrors: FieldError[];
    currentCaseVersion?: string;
  };
}

export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

export type MaskingStatus = 'not_checked' | 'needs_review' | 'reviewed';

export interface CaseSummaryData {
  status: CaseStatus;
  maskedInput: string | null;
  signalIds: SignalId[];
  verificationPlanIds: string[];
  counts: { signals: number; steps: number; doneSteps: number };
  privacy: { maskingStatus: MaskingStatus; containsUnmaskedSensitiveData: boolean };
  coverage: AnalysisCoverage | null;
  /** Fixed product statement; present so agents relay it. */
  disclaimer: string;
}

export interface InspectOfferSignalsData {
  analysisId: string;
  signalIds: SignalId[];
  signals: Signal[];
  notices: ManipulationNotice[];
  coverage: AnalysisCoverage;
  privacy: { maskingStatus: MaskingStatus; unmaskedInputReturned: false };
  disclaimer: string;
}

export interface BuildVerificationPlanData {
  verificationPlanId: string;
  status: 'active';
  steps: VerificationStep[];
}

export interface UpdateVerificationStepData {
  verificationPlanId: string;
  step: VerificationStep;
}

export interface GetOfficialResourcesData {
  jurisdiction: Jurisdiction;
  resources: OfficialResource[];
  notice: string;
}

/** Fixed statement shown in the UI and relayed in tool results. */
export const NON_VERDICT_DISCLAIMER =
  '이 앱은 사기 여부나 안전 여부를 확정하지 않습니다. 표시된 항목은 사용자가 공식 채널을 통해 별도로 확인해야 할 신호입니다.';
