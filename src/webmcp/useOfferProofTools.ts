import { useCallback, useEffect, useState } from 'react';
import {
  createActionReceipt,
  type ActionReceipt,
  type ReceiptOutcome,
  type ReceiptToolName,
} from '../domain/actionReceipts.ts';
import { SIGNAL_IDS, type OfferCase, type OfficialResource, type SignalId, type VerificationStatus } from '../domain/types.ts';

type JsonSchema = Record<string, unknown>;

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

interface WebMcpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>) => ToolResult | Promise<ToolResult>;
}

interface ModelContext {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

export interface OfferProofToolApi {
  getState: () => OfferCase;
  inspect: () => OfferCase;
  buildPlan: (caseId: string, expectedVersion: number, signalIds?: SignalId[]) => OfferCase;
  updateStep: (caseId: string, stepId: string, status: VerificationStatus, expectedVersion: number) => OfferCase;
  getResources: () => OfficialResource[];
  getReceipts: () => ActionReceipt[];
  recordReceipt: (receipt: ActionReceipt) => void;
  showCase?: () => void;
}

export type WebMcpStatus = 'checking' | 'registered' | 'unsupported' | 'error';

export const OFFERPROOF_TOOL_NAMES = [
  'get_case_summary',
  'inspect_offer_signals',
  'build_verification_plan',
  'update_verification_step',
  'get_official_resources',
  'get_action_receipts',
] as const;

export const OFFERPROOF_TOOL_COUNT = OFFERPROOF_TOOL_NAMES.length;

// Stable codes let an agent recover without parsing or exposing user input.
export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  CASE_ID_CONFLICT: 'CASE_ID_CONFLICT',
  CASE_VERSION_CONFLICT: 'CASE_VERSION_CONFLICT',
  CONFIRMATION_REQUIRED: 'CONFIRMATION_REQUIRED',
  SIGNAL_NOT_FOUND: 'SIGNAL_NOT_FOUND',
  UNKNOWN_STEP: 'UNKNOWN_STEP',
  STALE_STEP: 'STALE_STEP',
  ANALYSIS_STALE: 'ANALYSIS_STALE',
  PRIVACY_RESTRICTION: 'PRIVACY_RESTRICTION',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;

const KNOWN_ERROR_CODES = new Set<string>(Object.values(ERROR_CODES));

const EMPTY_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

function ok(message: string, data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    structuredContent: data,
  };
}

function failure(error: unknown): ToolResult {
  const rawMessage = error instanceof Error ? error.message : '';
  const prefix = rawMessage.split(':', 1)[0] ?? '';
  const isKnown = KNOWN_ERROR_CODES.has(prefix);
  const code = isKnown ? prefix : ERROR_CODES.TOOL_EXECUTION_FAILED;
  const message = isKnown
    ? rawMessage
    : 'TOOL_EXECUTION_FAILED: Tool execution failed without changing page state.';
  return {
    content: [{ type: 'text', text: message }],
    structuredContent: { ok: false, error: { code, message } },
    isError: true,
  };
}

function uiEffect(
  kind: 'activity-only' | 'signals-replaced' | 'plan-replaced' | 'step-updated',
  message: string,
) {
  return {
    kind,
    message,
    visibleAt: kind === 'activity-only' ? '#agent-activity' : '#result-heading',
  };
}

function asSignalIds(value: unknown): SignalId[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error('INVALID_INPUT: signalIds must be an array of strings.');
  }
  const allowed = new Set<string>(SIGNAL_IDS);
  if (!value.every((item) => allowed.has(item))) {
    throw new Error(`INVALID_INPUT: One or more signalIds are not recognized. Allowed: ${Array.from(allowed).join(', ')}`);
  }
  return value as SignalId[];
}

function requirePrivacy(state: OfferCase): void {
  if (!state.privacyConfirmed) {
    throw new Error('CONFIRMATION_REQUIRED: Privacy confirmation is required before accessing case data.');
  }
}

function requireAgentChanges(state: OfferCase): void {
  if (!state.agentChangesAllowed) {
    throw new Error('CONFIRMATION_REQUIRED: Agent changes must be explicitly allowed by the user.');
  }
}

function recordOutcome(
  api: OfferProofToolApi,
  toolName: ReceiptToolName,
  outcome: ReceiptOutcome,
  state: Pick<OfferCase, 'caseId' | 'caseVersion'> = api.getState(),
): void {
  api.recordReceipt(createActionReceipt(toolName, outcome, state));
}

export function createOfferProofTools(api: OfferProofToolApi): WebMcpTool[] {
  return [
    // Tool 1: get_case_summary
    // Read-only: Returns current case state without modification
    {
      name: 'get_case_summary',
      title: 'Read the current Offroof case',
      description: 'Read the current privacy-safe case summary before choosing another tool. It requires the user privacy confirmation, never returns the original offer text, and adds a visible activity receipt without changing the case.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: () => {
        try {
          const state = api.getState();
          requirePrivacy(state);
          api.showCase?.();
          const currentSteps = state.verificationSteps.filter((step) => step.isCurrent);
          recordOutcome(api, 'get_case_summary', 'success', state);
          return ok(`Case v${state.caseVersion} has ${state.signals.length} signals.`, {
            ok: true,
            tool: 'get_case_summary',
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            analysisStale: state.analysisStale,
            lastAnalyzedVersion: state.lastAnalyzedVersion,
            inputCharacterCount: state.originalText.length,
            signalCount: state.signals.length,
            verificationStepCount: state.verificationSteps.length,
            completedVerificationStepCount: state.verificationSteps.filter((step) => step.isCurrent && step.status === 'done').length,
            permissions: {
              privacyConfirmed: state.privacyConfirmed,
              agentChangesAllowed: state.agentChangesAllowed,
            },
            uiEffect: uiEffect('activity-only', '사례는 바꾸지 않고 에이전트 활동에 읽기 기록을 추가했습니다.'),
            detailLocation: '#result-heading',
            nextActions: state.analysisStale || state.signals.length === 0
              ? ['inspect_offer_signals']
              : !state.agentChangesAllowed
                ? ['get_official_resources']
                : currentSteps.length === 0
                ? ['build_verification_plan', 'get_official_resources']
                : ['update_verification_step', 'get_official_resources'],
            requiredHumanAction: state.signals.length > 0 && !state.agentChangesAllowed
              ? 'enable_agent_changes_in_ui'
              : null,
            signalIds: state.signals.map((signal) => signal.signalId),
            verificationSteps: state.verificationSteps.map((s) => ({
              stepId: s.stepId,
              signalId: s.signalId,
              status: s.status,
              isCurrent: s.isCurrent,
            })),
          });
        } catch (error) {
          recordOutcome(api, 'get_case_summary', 'blocked');
          return failure(error);
        }
      },
    },

    // Tool 2: inspect_offer_signals
    // Read-only: Analyzes offer text for risk signals
    {
      name: 'inspect_offer_signals',
      title: 'Inspect the offer for verification signals',
      description: 'Analyze the current offer with the browser-local deterministic signal registry. This replaces the visible signal analysis, requires privacy confirmation, and returns masked evidence only. It does not decide whether an offer is fraudulent or safe.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: () => {
        try {
          requirePrivacy(api.getState());
          const state = api.inspect();
          api.showCase?.();
          recordOutcome(api, 'inspect_offer_signals', 'success', state);
          return ok(`Analysis found ${state.signals.length} signals. User must review and confirm privacy-sensitive data.`, {
            ok: true,
            tool: 'inspect_offer_signals',
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            changedIds: state.signals.map((signal) => signal.signalId),
            signalCount: state.signals.length,
            uiEffect: uiEffect('signals-replaced', `확인 보드에 신호 ${state.signals.length}개를 표시했습니다.`),
            detailLocation: '#result-heading',
            nextActions: state.signals.length > 0 && state.agentChangesAllowed
              ? ['build_verification_plan', 'get_official_resources']
              : ['get_official_resources'],
            requiredHumanAction: state.signals.length > 0 && !state.agentChangesAllowed
              ? 'enable_agent_changes_in_ui'
              : null,
            signals: state.signals.map((signal) => ({
              signalId: signal.signalId,
              maskedEvidence: signal.observedText,
            })),
          });
        } catch (error) {
          recordOutcome(api, 'inspect_offer_signals', 'blocked');
          return failure(error);
        }
      },
    },

    // Tool 3: build_verification_plan
    // Mutation: Creates verification plan from selected signals
    {
      name: 'build_verification_plan',
      title: 'Build a verification plan',
      description: 'Create or refresh the visible verification checklist from current signal IDs. This changes page state and requires both privacy confirmation and explicit permission for agent changes. Read the latest case summary first and pass its case ID and version.',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', minLength: 1, description: 'The case ID to build the plan for' },
          expectedVersion: { type: 'integer', minimum: 1, description: 'Expected case version for optimistic concurrency control' },
          signalIds: { 
            type: 'array', 
            items: { type: 'string', enum: SIGNAL_IDS }, 
            uniqueItems: true, 
            maxItems: 8,
            description: 'Canonical signal IDs to include in the verification plan'
          },
        },
        required: ['caseId', 'expectedVersion'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        try {
          const current = api.getState();
          requirePrivacy(current);
          requireAgentChanges(current);

          if (typeof input.caseId !== 'string') {
            throw new Error('INVALID_INPUT: caseId must be a non-empty string.');
          }
          const expectedVersion = input.expectedVersion as number;
          if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
            throw new Error('INVALID_INPUT: expectedVersion must be a positive integer.');
          }

          const state = api.buildPlan(input.caseId, expectedVersion, asSignalIds(input.signalIds));
          api.showCase?.();
          recordOutcome(api, 'build_verification_plan', 'success', state);
          return ok(`Verification plan created with ${state.verificationSteps.length} steps.`, {
            ok: true,
            tool: 'build_verification_plan',
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            uiEffect: uiEffect('plan-replaced', `확인 보드에 체크리스트 ${state.verificationSteps.length}개를 표시했습니다.`),
            nextActions: ['update_verification_step', 'get_official_resources'],
            verificationSteps: state.verificationSteps.map((step) => ({
              stepId: step.stepId,
              signalId: step.signalId,
              status: step.status,
              isCurrent: step.isCurrent,
            })),
          });
        } catch (error) {
          recordOutcome(api, 'build_verification_plan', 'blocked');
          return failure(error);
        }
      },
    },

    // Tool 4: update_verification_step
    // Mutation: Updates the status of a verification step
    {
      name: 'update_verification_step',
      title: 'Update one verification step',
      description: 'Update one visible checklist item to todo or done. This changes page state and requires explicit permission for agent changes plus the latest case ID and version. It never contacts an employer or reports an offer.',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', minLength: 1, description: 'The case ID containing the step' },
          stepId: { type: 'string', minLength: 1, maxLength: 96, description: 'The verification step ID to update' },
          status: { type: 'string', enum: ['todo', 'done'], description: 'New status for the step' },
          expectedVersion: { type: 'integer', minimum: 1, description: 'Expected case version for optimistic concurrency control' },
        },
        required: ['caseId', 'stepId', 'status', 'expectedVersion'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        try {
          const current = api.getState();
          requirePrivacy(current);
          requireAgentChanges(current);

          if (typeof input.caseId !== 'string') {
            throw new Error('INVALID_INPUT: caseId must be a non-empty string.');
          }
          if (typeof input.stepId !== 'string') {
            throw new Error('INVALID_INPUT: stepId must be a non-empty string.');
          }
          const status = input.status as VerificationStatus;
          if (!['todo', 'done'].includes(status)) {
            throw new Error('INVALID_INPUT: status must be either "todo" or "done".');
          }
          const expectedVersion = input.expectedVersion as number;
          if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
            throw new Error('INVALID_INPUT: expectedVersion must be a positive integer.');
          }

          const state = api.updateStep(input.caseId, input.stepId, status, expectedVersion);
          api.showCase?.();
          recordOutcome(api, 'update_verification_step', 'success', state);
          return ok('Verification step status updated.', {
            ok: true,
            tool: 'update_verification_step',
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            changedIds: [input.stepId],
            changedFields: ['status'],
            uiEffect: uiEffect('step-updated', '확인 보드의 체크리스트 항목 1개를 변경했습니다.'),
            nextActions: ['get_case_summary', 'get_official_resources'],
            step: {
              stepId: input.stepId,
              status: input.status,
            },
          });
        } catch (error) {
          recordOutcome(api, 'update_verification_step', 'blocked');
          return failure(error);
        }
      },
    },

    // Tool 5: get_official_resources
    // Read-only: Fetches official guidance resources
    {
      name: 'get_official_resources',
      title: 'Read official verification resources',
      description: 'Read the pre-reviewed allowlist of official Korean guidance links shown on the page. This does not open links, browse externally, file a report, or change the case.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        try {
          const resources = api.getResources();
          api.showCase?.();
          recordOutcome(api, 'get_official_resources', 'success');
          return ok(`Retrieved ${resources.length} official resources. All resources are from verified official sources.`, {
            ok: true,
            tool: 'get_official_resources',
            resourceCount: resources.length,
            uiEffect: uiEffect('activity-only', '사례는 바꾸지 않고 에이전트 활동에 공식 자료 조회 기록을 추가했습니다.'),
            nextActions: ['get_case_summary'],
            resources: resources.map((r) => ({
              resourceId: r.resourceId,
              agency: r.agency,
              title: r.title,
              jurisdiction: r.jurisdiction,
              url: r.url,
              lastVerified: r.lastVerified,
              supports: r.supports,
            })),
          });
        } catch (error) {
          recordOutcome(api, 'get_official_resources', 'blocked');
          return failure(error);
        }
      },
    },

    // Tool 6: get_action_receipts
    // Read-only: Returns audit trail of tool invocations
    {
      name: 'get_action_receipts',
      title: 'Read the WebMCP activity trail',
      description: 'Read a filtered page of the current session activity trail. Receipts contain only allow-listed metadata and never include original offer text, raw tool arguments, evidence, or personal data. Reading receipts does not create another receipt.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 10, default: 5, description: 'Maximum newest receipts to return, from 1 to 10' },
          outcome: { type: 'string', enum: ['success', 'blocked'], description: 'Optional receipt outcome filter' },
          toolClass: { type: 'string', enum: ['read', 'analysis', 'mutation'], description: 'Optional read, analysis, or mutation filter' },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => {
        try {
          const limit = input.limit === undefined ? 5 : input.limit;
          if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 10) {
            throw new Error('INVALID_INPUT: limit must be an integer from 1 to 10.');
          }
          const outcome = input.outcome;
          if (outcome !== undefined && outcome !== 'success' && outcome !== 'blocked') {
            throw new Error('INVALID_INPUT: outcome must be success or blocked.');
          }
          const toolClass = input.toolClass;
          if (toolClass !== undefined && !['read', 'analysis', 'mutation'].includes(toolClass as string)) {
            throw new Error('INVALID_INPUT: toolClass must be read, analysis, or mutation.');
          }

          const allReceipts = api.getReceipts();
          const receipts = allReceipts
            .filter((receipt) => outcome === undefined || receipt.outcome === outcome)
            .filter((receipt) => toolClass === undefined || receipt.toolClass === toolClass)
            .slice(0, limit as number);
          return ok(`Retrieved ${receipts.length} action receipts from the current session.`, {
            ok: true,
            tool: 'get_action_receipts',
            totalReceiptCount: allReceipts.length,
            returnedReceiptCount: receipts.length,
            newestFirst: true,
            filters: { limit, outcome: outcome ?? null, toolClass: toolClass ?? null },
            uiEffect: uiEffect('activity-only', '페이지 상태를 바꾸지 않고 기존 에이전트 활동 기록을 읽었습니다.'),
            nextActions: ['get_case_summary'],
            receipts: receipts.map((receipt) => ({
              toolName: receipt.toolName,
              toolClass: receipt.toolClass,
              outcome: receipt.outcome,
              caseVersion: receipt.caseVersion,
            })),
          });
        } catch (error) {
          return failure(error);
        }
      },
    },
  ];
}

export function useOfferProofTools(api: OfferProofToolApi): {
  status: WebMcpStatus;
  reconnect: () => void;
} {
  const [status, setStatus] = useState<WebMcpStatus>('checking');
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const reconnect = useCallback(() => {
    setStatus('checking');
    setConnectionAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let disposed = false;
    let attempts = 0;
    let controller: AbortController | null = null;

    const connect = async () => {
      if (disposed || controller) return;
      const context = document.modelContext;
      attempts += 1;
      if (!context) {
        if (attempts >= 10) setStatus('unsupported');
        return;
      }

      controller = new AbortController();
      try {
        await Promise.all(createOfferProofTools(api).map((tool) => (
          context.registerTool(tool, { signal: controller?.signal })
        )));
        if (!disposed) setStatus('registered');
      } catch {
        controller.abort();
        controller = null;
        if (!disposed) setStatus(attempts >= 10 ? 'error' : 'checking');
      }
    };

    void connect();
    const intervalId = window.setInterval(() => {
      if (attempts >= 10 || controller) {
        window.clearInterval(intervalId);
        return;
      }
      void connect();
    }, 500);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      controller?.abort();
    };
  }, [api, connectionAttempt]);

  return { status, reconnect };
}
