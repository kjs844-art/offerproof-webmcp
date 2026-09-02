import { fingerprintText, versionLabel, type IdGenerator } from '../domain/ids';
import { maskSensitiveText } from '../domain/masking/mask';
import { buildVerificationSteps } from '../domain/plan/planBuilder';
import { queryResources } from '../domain/resources/registry';
import { inspectOfferText } from '../domain/signals/engine';
import {
  ENGINE_VERSION,
  NON_VERDICT_DISCLAIMER,
  type BuildVerificationPlanData,
  type CaseAnalysis,
  type CaseState,
  type CaseSummaryData,
  type EvidenceSpan,
  type FieldError,
  type GetOfficialResourcesData,
  type InspectOfferSignalsData,
  type Jurisdiction,
  type MaskingStatus,
  type ResourceTopic,
  type SignalId,
  type SignalUserStatus,
  type StepStatus,
  type ToolErrorCode,
  type ToolFailure,
  type ToolName,
  type ToolResult,
  type ToolSuccess,
  type UpdateVerificationStepData,
  type VerificationPlan,
  type VerificationStep,
} from '../domain/types';
import { createCaseStore, createInitialCaseState, type CaseStore } from '../state/caseStore';
import { INPUT_MAX_LENGTH, TOOL_SCHEMAS } from './schemas';
import { validateInput } from './validation';

/**
 * The single service layer behind both the manual UI and the WebMCP tools.
 *
 * Every tool operation validates its input against the contract schema,
 * checks the case ID and (for mutations) the optimistic `caseVersion`, applies
 * the change atomically through the case store, and returns the common
 * success/error envelope. Manual buttons call exactly the same methods, which
 * is what guarantees manual/WebMCP parity.
 */
export type CallSource = 'manual' | 'webmcp';

export interface CallContext {
  source?: CallSource;
}

export interface ToolCallRecord {
  seq: number;
  at: string;
  tool: ToolName;
  source: CallSource;
  ok: boolean;
  errorCode: ToolErrorCode | null;
  changedIds: string[];
  caseVersion: string | null;
}

export interface OfferProofServiceOptions {
  idGen?: IdGenerator;
  now?: () => string;
  historyLimit?: number;
  jurisdiction?: Jurisdiction;
}

export interface OfferProofService {
  readonly store: CaseStore;
  getState(): CaseState;
  subscribe(listener: () => void): () => void;

  // Manual-only editing helpers (not WebMCP tools; the raw text never leaves the page).
  setInputText(text: string): void;
  setPrivacyConfirmed(confirmed: boolean): void;
  clearInput(): void;
  resetCase(): void;
  setJurisdiction(jurisdiction: Jurisdiction): void;
  setSignalUserStatus(signalId: SignalId, status: SignalUserStatus): void;
  restorePreviousPlan(): boolean;
  undo(): string | null;
  canUndo(): boolean;
  undoLabel(): string | null;

  // Shared tool operations.
  getCaseSummary(input: unknown, ctx?: CallContext): ToolResult<CaseSummaryData>;
  inspectOfferSignals(input: unknown, ctx?: CallContext): ToolResult<InspectOfferSignalsData>;
  buildVerificationPlan(input: unknown, ctx?: CallContext): ToolResult<BuildVerificationPlanData>;
  updateVerificationStep(input: unknown, ctx?: CallContext): ToolResult<UpdateVerificationStepData>;
  getOfficialResources(input: unknown, ctx?: CallContext): ToolResult<GetOfficialResourcesData>;
  callTool(tool: ToolName, input: unknown, ctx?: CallContext): ToolResult<unknown>;

  getCallLog(): ToolCallRecord[];
  subscribeCalls(listener: () => void): () => void;
}

const MESSAGES = {
  unknownCase: '요청한 caseId가 현재 화면의 사례와 일치하지 않습니다.',
  versionConflict: '사례가 다른 변경으로 갱신되었습니다. 최신 내용을 다시 확인하세요.',
  invalidInput: '입력 형식이 계약과 맞지 않습니다. fieldErrors를 확인하세요.',
  noInput: '분석할 원문이 없습니다. 먼저 구인 제안 원문을 붙여넣으세요.',
  privacyNotConfirmed: '화면의 개인정보 확인 체크박스를 먼저 선택해야 분석할 수 있습니다.',
  confirmationRequired: '이 변경에는 사용자 확인(confirmation: "user_confirmed")이 필요합니다.',
  planExists: '이미 확인 계획이 있습니다. 교체하려면 mode를 "replace"로 지정하세요.',
  noAnalysis: '아직 신호 검사 결과가 없습니다. 먼저 inspect_offer_signals를 실행하세요.',
  unknownSignal: '요청한 signalId 중 현재 결과에 없는 항목이 있습니다.',
  unknownPlan: '요청한 verificationPlanId가 현재 계획과 일치하지 않습니다.',
  unknownStep: '요청한 verificationStepId를 현재 계획에서 찾을 수 없습니다.',
  memoPrivacy: '메모에 주민등록번호·계좌번호·비밀번호 등으로 보이는 값이 있습니다. 값을 제거한 뒤 다시 시도하세요.',
  failed: '요청을 처리하지 못했습니다. 입력을 확인하고 다시 시도하세요.',
  resourcesEmpty: '이 관할·주제에 등록된 공식 자료가 아직 없습니다. 기관 공식 사이트를 직접 검색해 확인하세요.',
  resourcesNotice: '링크는 사용자가 직접 열고 판단합니다. 미검증 자료는 링크 없이 기관명만 표시됩니다.',
} as const;

export function isAnalysisStale(state: CaseState): boolean {
  if (!state.analysis || !state.input) return false;
  return state.analysis.inputFingerprint !== fingerprintText(state.input.rawText);
}

export function privacySummary(state: CaseState): {
  maskingStatus: MaskingStatus;
  containsUnmaskedSensitiveData: false;
  maskedValueCount: number;
} {
  const input = state.input;
  if (!input) return { maskingStatus: 'not_checked', containsUnmaskedSensitiveData: false, maskedValueCount: 0 };
  const maskedValueCount = input.maskFindings.length;
  if (input.privacyConfirmed) return { maskingStatus: 'reviewed', containsUnmaskedSensitiveData: false, maskedValueCount };
  return {
    maskingStatus: maskedValueCount > 0 ? 'needs_review' : 'not_checked',
    containsUnmaskedSensitiveData: false,
    maskedValueCount,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function createOfferProofService(options: OfferProofServiceOptions = {}): OfferProofService {
  const store = createCaseStore(options);
  const now = store.now;
  const idGen = store.idGen;
  const callLog: ToolCallRecord[] = [];
  const callListeners = new Set<() => void>();
  let seq = 0;

  const notifyCalls = () => {
    for (const l of callListeners) l();
  };

  const fail = (
    tool: ToolName,
    code: ToolErrorCode,
    message: string,
    extra: { retryable?: boolean; fieldErrors?: FieldError[]; currentCaseVersion?: string } = {},
  ): ToolFailure => ({
    ok: false,
    tool,
    error: {
      code,
      message,
      retryable: extra.retryable ?? false,
      fieldErrors: extra.fieldErrors ?? [],
      ...(extra.currentCaseVersion ? { currentCaseVersion: extra.currentCaseVersion } : {}),
    },
  });

  const ok = <T>(tool: ToolName, changedIds: string[], changedFields: string[], data: T): ToolSuccess<T> => {
    const state = store.getState();
    return {
      ok: true,
      tool,
      caseId: state.caseId,
      caseVersion: versionLabel(state.version),
      changedIds: unique(changedIds),
      changedFields: unique(changedFields),
      data,
    };
  };

  function validate(
    tool: ToolName,
    input: unknown,
    confirmationPaths: string[] = [],
  ): { value: Record<string, unknown> } | ToolFailure {
    const errors = validateInput(TOOL_SCHEMAS[tool], input);
    if (errors.length > 0) {
      if (confirmationPaths.length > 0 && errors.every((e) => confirmationPaths.includes(e.path))) {
        return fail(tool, 'CONFIRMATION_REQUIRED', MESSAGES.confirmationRequired, { retryable: true, fieldErrors: errors });
      }
      return fail(tool, 'INVALID_INPUT', MESSAGES.invalidInput, { fieldErrors: errors });
    }
    return { value: input as Record<string, unknown> };
  }

  function checkCase(tool: ToolName, caseId: unknown): ToolFailure | null {
    if (caseId !== store.getState().caseId) return fail(tool, 'UNKNOWN_CASE', MESSAGES.unknownCase);
    return null;
  }

  function checkVersion(tool: ToolName, caseVersion: unknown): ToolFailure | null {
    const current = versionLabel(store.getState().version);
    if (caseVersion !== current) {
      return fail(tool, 'CASE_VERSION_CONFLICT', MESSAGES.versionConflict, { retryable: true, currentCaseVersion: current });
    }
    return null;
  }

  function run<T>(tool: ToolName, ctx: CallContext | undefined, fn: () => ToolResult<T>): ToolResult<T> {
    let result: ToolResult<T>;
    try {
      result = fn();
    } catch {
      result = fail(tool, 'ANALYSIS_FAILED', MESSAGES.failed, { retryable: true });
    }
    seq += 1;
    callLog.push({
      seq,
      at: now(),
      tool,
      source: ctx?.source ?? 'manual',
      ok: result.ok,
      errorCode: result.ok ? null : result.error.code,
      changedIds: result.ok ? [...result.changedIds] : [],
      caseVersion: result.ok ? result.caseVersion : result.error.currentCaseVersion ?? null,
    });
    while (callLog.length > 100) callLog.shift();
    notifyCalls();
    return result;
  }

  function summaryData(state: CaseState): CaseSummaryData {
    const steps = state.plan?.steps ?? [];
    return {
      status: state.status,
      maskedInput: state.input ? state.input.maskedText : null,
      signalIds: state.analysis ? state.analysis.signals.map((s) => s.signalId) : [],
      verificationPlanIds: state.plan ? [state.plan.verificationPlanId] : [],
      counts: {
        signals: state.analysis ? state.analysis.signals.length : 0,
        steps: steps.length,
        doneSteps: steps.filter((s) => s.status === 'done').length,
      },
      privacy: (() => {
        const p = privacySummary(state);
        return { maskingStatus: p.maskingStatus, containsUnmaskedSensitiveData: p.containsUnmaskedSensitiveData };
      })(),
      coverage: state.analysis ? { ...state.analysis.coverage } : null,
      disclaimer: NON_VERDICT_DISCLAIMER,
    };
  }

  function inspectData(analysis: CaseAnalysis, state: CaseState): InspectOfferSignalsData {
    return {
      analysisId: analysis.analysisId,
      signalIds: analysis.signals.map((s) => s.signalId),
      signals: analysis.signals.map((s) => ({ ...s, evidence: s.evidence.map((e) => ({ ...e })), guidanceSourceIds: [...s.guidanceSourceIds] })),
      notices: analysis.notices.map((n) => ({ ...n, evidence: { ...n.evidence } })),
      coverage: { ...analysis.coverage },
      privacy: { maskingStatus: privacySummary(state).maskingStatus, unmaskedInputReturned: false },
      disclaimer: NON_VERDICT_DISCLAIMER,
    };
  }

  const service: OfferProofService = {
    store,
    getState: () => store.getState(),
    subscribe: (listener) => store.subscribe(listener),

    setInputText(text) {
      const clipped = text.slice(0, INPUT_MAX_LENGTH);
      if (clipped.trim().length === 0) {
        service.clearInput();
        return;
      }
      store.commit('입력 수정', (s) => {
        if (s.input && s.input.rawText === clipped) return s;
        const { masked, findings } = maskSensitiveText(clipped);
        return {
          ...s,
          status: s.analysis ? 'result' : 'input',
          input: {
            rawText: clipped,
            maskedText: masked,
            maskFindings: findings,
            privacyConfirmed: false,
            updatedAt: now(),
          },
        };
      }, { coalesce: true });
    },

    setPrivacyConfirmed(confirmed) {
      store.commit(confirmed ? '개인정보 확인' : '개인정보 확인 해제', (s) => {
        if (!s.input || s.input.privacyConfirmed === confirmed) return s;
        return { ...s, input: { ...s.input, privacyConfirmed: confirmed } };
      });
    },

    clearInput() {
      store.commit('입력 지우기', (s) => {
        if (!s.input) return s;
        return { ...s, input: null, status: s.analysis ? 'result' : 'empty' };
      });
    },

    resetCase() {
      store.commit('초기화', (s) => {
        if (s.status === 'empty' && !s.input && !s.analysis && !s.plan) return s;
        return createInitialCaseState(s.caseId, now(), s.jurisdiction);
      });
    },

    setJurisdiction(jurisdiction) {
      store.commit('관할 변경', (s) => (s.jurisdiction === jurisdiction ? s : { ...s, jurisdiction }));
    },

    setSignalUserStatus(signalId, status) {
      store.commit('신호 확인 상태 변경', (s) => {
        if (!s.analysis) return s;
        const signals = s.analysis.signals.map((sig) => (sig.signalId === signalId && sig.userStatus !== status ? { ...sig, userStatus: status } : sig));
        if (signals.every((sig, i) => sig === s.analysis!.signals[i])) return s;
        return { ...s, analysis: { ...s.analysis, signals } };
      });
    },

    restorePreviousPlan() {
      const before = store.getState();
      if (!before.previousPlan) return false;
      store.commit('이전 계획 복원', (s) => ({ ...s, plan: s.previousPlan, previousPlan: s.plan }));
      return true;
    },

    undo() {
      const entry = store.undo();
      return entry ? entry.label : null;
    },
    canUndo: () => store.canUndo(),
    undoLabel: () => store.undoLabel(),

    getCaseSummary(input, ctx) {
      const tool: ToolName = 'get_case_summary';
      return run(tool, ctx, () => {
        const v = validate(tool, input);
        if ('ok' in v) return v;
        const caseErr = checkCase(tool, v.value.caseId);
        if (caseErr) return caseErr;
        return ok(tool, [], [], summaryData(store.getState()));
      });
    },

    inspectOfferSignals(input, ctx) {
      const tool: ToolName = 'inspect_offer_signals';
      return run(tool, ctx, () => {
        const v = validate(tool, input, ['$.privacyConfirmed']);
        if ('ok' in v) return v;
        const caseErr = checkCase(tool, v.value.caseId);
        if (caseErr) return caseErr;
        const versionErr = checkVersion(tool, v.value.caseVersion);
        if (versionErr) return versionErr;

        const state = store.getState();
        if (!state.input || state.input.rawText.trim().length === 0) {
          return fail(tool, 'ANALYSIS_FAILED', MESSAGES.noInput, { retryable: true });
        }
        if (!state.input.privacyConfirmed) {
          return fail(tool, 'CONFIRMATION_REQUIRED', MESSAGES.privacyNotConfirmed, { retryable: true });
        }
        const replaceExisting = v.value.replaceExisting === true;
        const fingerprint = fingerprintText(state.input.rawText);
        if (
          state.analysis &&
          !replaceExisting &&
          state.analysis.inputFingerprint === fingerprint &&
          state.analysis.engineVersion === ENGINE_VERSION
        ) {
          return ok(tool, [], [], inspectData(state.analysis, state));
        }

        const engine = inspectOfferText(state.input.rawText);
        const masked = state.input.maskedText;
        const maskSpan = (e: EvidenceSpan): EvidenceSpan => ({ ...e, text: masked.slice(e.start, e.end) });
        const previousStatus = new Map<SignalId, SignalUserStatus>();
        for (const sig of state.analysis?.signals ?? []) previousStatus.set(sig.signalId, sig.userStatus);
        const signals = engine.signals.map((sig) => {
          const evidence = sig.evidence.map(maskSpan);
          return {
            ...sig,
            evidence,
            observedText: evidence.map((e) => e.text).join(' … '),
            userStatus: previousStatus.get(sig.signalId) ?? 'unreviewed',
          };
        });
        const notices = engine.notices.map((n) => ({ ...n, evidence: maskSpan(n.evidence) }));
        const analysis: CaseAnalysis = {
          analysisId: idGen.next('analysis'),
          engineVersion: engine.engineVersion,
          inputFingerprint: fingerprint,
          analyzedAt: now(),
          signals,
          notices,
          coverage: engine.coverage,
        };
        const statusChanged = state.status !== 'result';
        store.commit('신호 검사', (s) => ({ ...s, analysis, status: 'result' }));
        const changedFields = ['$.analysis', '$.analysis.signals'];
        if (statusChanged) changedFields.push('$.status');
        return ok(tool, [analysis.analysisId, ...signals.map((s) => s.signalId)], changedFields, inspectData(analysis, store.getState()));
      });
    },

    buildVerificationPlan(input, ctx) {
      const tool: ToolName = 'build_verification_plan';
      return run(tool, ctx, () => {
        const v = validate(tool, input, ['$.confirmation']);
        if ('ok' in v) return v;
        const caseErr = checkCase(tool, v.value.caseId);
        if (caseErr) return caseErr;
        const versionErr = checkVersion(tool, v.value.caseVersion);
        if (versionErr) return versionErr;

        const state = store.getState();
        if (!state.analysis) return fail(tool, 'UNKNOWN_ID', MESSAGES.noAnalysis, { retryable: true });
        const requested = v.value.signalIds as string[];
        const available = new Set(state.analysis.signals.map((s) => s.signalId));
        const unknown = requested.filter((id) => !available.has(id as SignalId));
        if (unknown.length > 0) {
          return fail(tool, 'UNKNOWN_ID', MESSAGES.unknownSignal, {
            fieldErrors: unknown.map((id) => ({
              path: `$.signalIds[${requested.indexOf(id)}]`,
              code: 'UNKNOWN_SIGNAL',
              message: `${id} 신호는 현재 결과에 없습니다.`,
            })),
          });
        }
        const mode = (v.value.mode as 'create' | 'replace' | undefined) ?? 'create';
        if (state.plan && mode !== 'replace') {
          return fail(tool, 'CONFIRMATION_REQUIRED', MESSAGES.planExists, { retryable: true });
        }
        const plan: VerificationPlan = {
          verificationPlanId: idGen.next('plan'),
          status: 'active',
          createdAt: now(),
          basedOnAnalysisId: state.analysis.analysisId,
          signalIds: requested as SignalId[],
          steps: buildVerificationSteps(requested as SignalId[], idGen),
        };
        const replaced = state.plan;
        store.commit(replaced ? '확인 계획 교체' : '확인 계획 생성', (s) => ({
          ...s,
          plan,
          previousPlan: replaced ?? s.previousPlan,
        }));
        const changedFields = ['$.verificationPlan', '$.verificationPlan.steps'];
        if (replaced) changedFields.push('$.previousPlan');
        return ok(tool, [plan.verificationPlanId, ...plan.steps.map((s) => s.verificationStepId)], changedFields, {
          verificationPlanId: plan.verificationPlanId,
          status: plan.status,
          steps: plan.steps.map((s) => ({ ...s, resourceIds: [...s.resourceIds] })),
        });
      });
    },

    updateVerificationStep(input, ctx) {
      const tool: ToolName = 'update_verification_step';
      return run(tool, ctx, () => {
        const v = validate(tool, input, ['$.confirmation']);
        if ('ok' in v) return v;
        const caseErr = checkCase(tool, v.value.caseId);
        if (caseErr) return caseErr;
        const versionErr = checkVersion(tool, v.value.caseVersion);
        if (versionErr) return versionErr;

        const state = store.getState();
        const plan = state.plan;
        if (!plan || plan.verificationPlanId !== v.value.verificationPlanId) {
          return fail(tool, 'UNKNOWN_ID', MESSAGES.unknownPlan);
        }
        const stepIndex = plan.steps.findIndex((s) => s.verificationStepId === v.value.verificationStepId);
        if (stepIndex < 0) return fail(tool, 'UNKNOWN_ID', MESSAGES.unknownStep);
        const step = plan.steps[stepIndex];
        const status = v.value.status as StepStatus;
        const memo = typeof v.value.memo === 'string' ? v.value.memo : undefined;
        if (memo !== undefined && maskSensitiveText(memo).findings.length > 0) {
          return fail(tool, 'PRIVACY_RESTRICTION', MESSAGES.memoPrivacy, { retryable: true });
        }
        const changedFields: string[] = [];
        if (step.status !== status) changedFields.push(`$.verificationPlan.steps[${step.verificationStepId}].status`);
        if (memo !== undefined && (step.memo ?? '') !== memo) {
          changedFields.push(`$.verificationPlan.steps[${step.verificationStepId}].memo`);
        }
        if (changedFields.length === 0) {
          return ok(tool, [], [], { verificationPlanId: plan.verificationPlanId, step: { ...step, resourceIds: [...step.resourceIds] } });
        }
        const updated: VerificationStep = {
          ...step,
          status,
          memo: memo !== undefined ? (memo.length > 0 ? memo : null) : step.memo,
          resourceIds: [...step.resourceIds],
        };
        store.commit(status === 'done' ? '단계 완료 표시' : '단계 상태 변경', (s) => {
          if (!s.plan) return s;
          const steps = s.plan.steps.map((st) => (st.verificationStepId === updated.verificationStepId ? updated : st));
          return { ...s, plan: { ...s.plan, steps } };
        });
        return ok(tool, [updated.verificationStepId], changedFields, { verificationPlanId: plan.verificationPlanId, step: { ...updated } });
      });
    },

    getOfficialResources(input, ctx) {
      const tool: ToolName = 'get_official_resources';
      return run(tool, ctx, () => {
        const v = validate(tool, input);
        if ('ok' in v) return v;
        const caseErr = checkCase(tool, v.value.caseId);
        if (caseErr) return caseErr;
        const jurisdiction = v.value.jurisdiction as Jurisdiction;
        const topic = v.value.topic as ResourceTopic | undefined;
        const signalIds = v.value.signalIds as SignalId[] | undefined;
        const resources = queryResources({ jurisdiction, topic, signalIds });
        return ok(tool, [], [], {
          jurisdiction,
          resources,
          notice: resources.length === 0 ? MESSAGES.resourcesEmpty : MESSAGES.resourcesNotice,
        });
      });
    },

    callTool(tool, input, ctx) {
      switch (tool) {
        case 'get_case_summary':
          return service.getCaseSummary(input, ctx);
        case 'inspect_offer_signals':
          return service.inspectOfferSignals(input, ctx);
        case 'build_verification_plan':
          return service.buildVerificationPlan(input, ctx);
        case 'update_verification_step':
          return service.updateVerificationStep(input, ctx);
        case 'get_official_resources':
          return service.getOfficialResources(input, ctx);
        default: {
          const unknown: ToolFailure = {
            ok: false,
            tool: tool as ToolName,
            error: { code: 'TOOL_UNAVAILABLE', message: '등록되지 않은 도구입니다.', retryable: false, fieldErrors: [] },
          };
          return unknown;
        }
      }
    },

    getCallLog: () => [...callLog],
    subscribeCalls(listener) {
      callListeners.add(listener);
      return () => {
        callListeners.delete(listener);
      };
    },
  };

  return service;
}
