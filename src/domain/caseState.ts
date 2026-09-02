import { inspectOfferText, maskSensitiveText } from './engine.ts';
import type { OfferCase, SignalId, VerificationStatus } from './types';

const now = () => new Date().toISOString();

function newCaseId(): string {
  if (globalThis.crypto?.randomUUID) return `case-${globalThis.crypto.randomUUID()}`;
  return `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function assertCurrentMutation(current: OfferCase, expectedVersion: number, caseId: string): void {
  if (caseId !== current.caseId) {
    throw new Error('CASE_ID_CONFLICT: 새 검토가 시작되었습니다. 현재 사례를 다시 읽어 주세요.');
  }
  if (expectedVersion !== current.caseVersion) {
    throw new Error(`CASE_VERSION_CONFLICT: 현재 버전은 v${current.caseVersion}입니다.`);
  }
  if (current.analysisStale) {
    throw new Error('ANALYSIS_STALE: 원문이 변경되었습니다. 신호를 다시 살펴봐 주세요.');
  }
}

export function createOfferCase(): OfferCase {
  return {
    caseId: newCaseId(),
    caseVersion: 1,
    lastAnalyzedVersion: null,
    analysisStale: false,
    originalText: '',
    maskedText: '',
    privacyConfirmed: false,
    agentChangesAllowed: false,
    signals: [],
    verificationSteps: [],
    updatedAt: now(),
  };
}

export function updateOfferText(current: OfferCase, text: string): OfferCase {
  if (text === current.originalText) return current;

  return {
    ...current,
    caseVersion: current.caseVersion + 1,
    lastAnalyzedVersion: null,
    analysisStale: Boolean(text.trim()),
    originalText: text,
    maskedText: maskSensitiveText(text),
    privacyConfirmed: false,
    agentChangesAllowed: false,
    signals: [],
    verificationSteps: current.verificationSteps.map((step) => ({ ...step, isCurrent: false })),
    updatedAt: now(),
  };
}

export function inspectCase(current: OfferCase): OfferCase {
  if (!current.privacyConfirmed) {
    throw new Error('개인정보 확인 체크박스를 먼저 선택해 주세요.');
  }

  const maskedText = maskSensitiveText(current.originalText);
  const nextVersion = current.caseVersion + 1;
  const signals = inspectOfferText(current.originalText).map((signal) => (
    signal.signalId === 'SENSITIVE_DATA_REQUEST'
      ? { ...signal, observedText: '[민감정보 요청이 포함된 문장 가림]' }
      : { ...signal, observedText: maskSensitiveText(signal.observedText) }
  ));
  const currentSignalIds = new Set(signals.map((signal) => signal.signalId));

  return {
    ...current,
    caseVersion: nextVersion,
    lastAnalyzedVersion: nextVersion,
    analysisStale: false,
    maskedText,
    signals,
    verificationSteps: current.verificationSteps.map((step) => ({
      ...step,
      isCurrent: currentSignalIds.has(step.signalId),
    })),
    updatedAt: now(),
  };
}

export function buildVerificationPlan(
  current: OfferCase,
  expectedVersion: number,
  caseId: string,
  requestedIds?: SignalId[],
): OfferCase {
  assertCurrentMutation(current, expectedVersion, caseId);

  const allowed = requestedIds?.length
    ? new Set(requestedIds)
    : new Set(current.signals.map((signal) => signal.signalId));
  const selected = current.signals.filter((signal) => allowed.has(signal.signalId));
  const selectedIds = new Set(selected.map((signal) => signal.signalId));
  const missingIds = requestedIds?.filter((signalId) => !selectedIds.has(signalId)) ?? [];
  if (missingIds.length > 0) {
    throw new Error(`SIGNAL_NOT_FOUND: 현재 분석에 없는 신호입니다: ${missingIds.join(', ')}`);
  }

  const existingIds = new Set(current.verificationSteps.map((step) => step.signalId));
  const additions = selected
    .filter((signal) => !existingIds.has(signal.signalId))
    .map((signal) => ({
      stepId: `step-${signal.signalId.toLowerCase()}`,
      signalId: signal.signalId,
      label: signal.verificationPrompt,
      status: 'todo' as const,
      isCurrent: true,
    }));

  return {
    ...current,
    caseVersion: current.caseVersion + 1,
    verificationSteps: [
      ...current.verificationSteps.map((step) => (
        selectedIds.has(step.signalId) ? { ...step, isCurrent: true } : step
      )),
      ...additions,
    ],
    updatedAt: now(),
  };
}

export function updateVerificationStep(
  current: OfferCase,
  stepId: string,
  status: VerificationStatus,
  expectedVersion: number,
  caseId: string,
): OfferCase {
  assertCurrentMutation(current, expectedVersion, caseId);
  const target = current.verificationSteps.find((step) => step.stepId === stepId);
  if (!target) {
    throw new Error('UNKNOWN_STEP: 확인 항목을 찾지 못했습니다.');
  }
  if (!target.isCurrent) {
    throw new Error('STALE_STEP: 현재 원문에서 근거가 확인되지 않은 이전 항목입니다.');
  }

  return {
    ...current,
    caseVersion: current.caseVersion + 1,
    verificationSteps: current.verificationSteps.map((step) => (
      step.stepId === stepId ? { ...step, status } : step
    )),
    updatedAt: now(),
  };
}

export function restorePreviousCase(current: OfferCase, previous: OfferCase): OfferCase {
  if (previous.caseId !== current.caseId) {
    throw new Error('CASE_ID_CONFLICT: 다른 검토의 상태는 되돌릴 수 없습니다.');
  }

  return {
    ...previous,
    caseId: current.caseId,
    caseVersion: current.caseVersion + 1,
    privacyConfirmed: current.privacyConfirmed,
    agentChangesAllowed: current.agentChangesAllowed,
    updatedAt: now(),
  };
}
