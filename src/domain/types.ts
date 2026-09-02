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

export interface OfferSignal {
  signalId: SignalId;
  title: string;
  observedText: string;
  observation: string;
  inference: string;
  limitations: string;
  verificationPrompt: string;
}
export type VerificationStatus = 'todo' | 'done';

export interface VerificationStep {
  stepId: string;
  signalId: SignalId;
  label: string;
  status: VerificationStatus;
  isCurrent: boolean;
}

export interface OfficialResource {
  resourceId: string;
  agency: string;
  title: string;
  jurisdiction: 'KR';
  url: string;
  lastVerified: string;
  supports: SignalId[];
}

export interface OfferCase {
  caseId: string;
  caseVersion: number;
  lastAnalyzedVersion: number | null;
  analysisStale: boolean;
  originalText: string;
  maskedText: string;
  privacyConfirmed: boolean;
  agentChangesAllowed: boolean;
  signals: OfferSignal[];
  verificationSteps: VerificationStep[];
  updatedAt: string;
}
