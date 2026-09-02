import { useEffect, useState } from 'react';
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
}

export type WebMcpStatus = 'checking' | 'registered' | 'unsupported' | 'error';

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
  const message = error instanceof Error ? error.message : '도구 실행에 실패했습니다.';
  return {
    content: [{ type: 'text', text: message }],
    structuredContent: { ok: false, error: message },
    isError: true,
  };
}

function asSignalIds(value: unknown): SignalId[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error('signalIds는 문자열 배열이어야 합니다.');
  }
  const allowed = new Set<string>(SIGNAL_IDS);
  if (!value.every((item) => allowed.has(item))) {
    throw new Error('INVALID_INPUT: 알 수 없는 signalId가 포함되어 있습니다.');
  }
  return value as SignalId[];
}

function requirePrivacy(state: OfferCase): void {
  if (!state.privacyConfirmed) {
    throw new Error('화면에서 개인정보 확인 체크박스를 먼저 선택해 주세요.');
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
    {
      name: 'get_case_summary',
      description: '현재 사례의 개인정보 보호 요약, 신호, 확인 단계 상태를 읽습니다. 전체 입력문은 반환하지 않습니다.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        try {
          const state = api.getState();
          requirePrivacy(state);
          recordOutcome(api, 'get_case_summary', 'success', state);
          return ok(`현재 사례는 v${state.caseVersion}이며 확인 신호 ${state.signals.length}개가 있습니다.`, {
            ok: true,
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            analysisStale: state.analysisStale,
            lastAnalyzedVersion: state.lastAnalyzedVersion,
            inputCharacterCount: state.originalText.length,
            signals: state.signals,
            verificationSteps: state.verificationSteps,
          });
        } catch (error) {
          recordOutcome(api, 'get_case_summary', 'blocked');
          return failure(error);
        }
      },
    },
    {
      name: 'inspect_offer_signals',
      description: '현재 입력을 브라우저 로컬 고정 규칙으로 검사합니다. UI에서 개인정보 확인이 먼저 필요합니다.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: () => {
        try {
          const state = api.inspect();
          recordOutcome(api, 'inspect_offer_signals', 'success', state);
          return ok(`확인이 필요한 신호 ${state.signals.length}개를 찾았습니다. 이는 사기 또는 안전 판정이 아닙니다.`, {
            ok: true,
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            changedIds: state.signals.map((signal) => signal.signalId),
            signals: state.signals,
          });
        } catch (error) {
          recordOutcome(api, 'inspect_offer_signals', 'blocked');
          return failure(error);
        }
      },
    },
    {
      name: 'build_verification_plan',
      description: '현재 신호를 기존 체크리스트에 합칩니다. 완료 상태를 보존하며 UI의 에이전트 변경 허용이 필요합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', minLength: 1 },
          expectedVersion: { type: 'integer', minimum: 1 },
          signalIds: { type: 'array', items: { type: 'string', enum: SIGNAL_IDS }, uniqueItems: true, maxItems: 8 },
        },
        required: ['caseId', 'expectedVersion'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        try {
          const current = api.getState();
          requirePrivacy(current);
          if (!current.agentChangesAllowed) {
            throw new Error('화면에서 에이전트의 체크리스트 변경을 먼저 허용해 주세요.');
          }
          if (typeof input.caseId !== 'string') throw new Error('INVALID_INPUT: caseId가 필요합니다.');
          if (!Number.isInteger(input.expectedVersion)) throw new Error('INVALID_INPUT: expectedVersion 정수가 필요합니다.');
          const state = api.buildPlan(input.caseId, input.expectedVersion as number, asSignalIds(input.signalIds));
          recordOutcome(api, 'build_verification_plan', 'success', state);
          return ok(`확인 체크리스트 ${state.verificationSteps.length}개를 만들었습니다.`, {
            ok: true,
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            changedIds: state.verificationSteps.map((step) => step.stepId),
            verificationSteps: state.verificationSteps,
          });
        } catch (error) {
          recordOutcome(api, 'build_verification_plan', 'blocked');
          return failure(error);
        }
      },
    },
    {
      name: 'update_verification_step',
      description: '확인 체크리스트 한 항목만 todo 또는 done으로 변경합니다. UI의 에이전트 변경 허용이 필요합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          stepId: { type: 'string', minLength: 1, maxLength: 96 },
          status: { type: 'string', enum: ['todo', 'done'] },
          caseId: { type: 'string', minLength: 1 },
          expectedVersion: { type: 'integer', minimum: 1 },
        },
        required: ['caseId', 'stepId', 'status', 'expectedVersion'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        try {
          const current = api.getState();
          requirePrivacy(current);
          if (!current.agentChangesAllowed) {
            throw new Error('화면에서 에이전트의 체크리스트 변경을 먼저 허용해 주세요.');
          }
          if (typeof input.caseId !== 'string') throw new Error('INVALID_INPUT: caseId가 필요합니다.');
          if (typeof input.stepId !== 'string') throw new Error('stepId가 필요합니다.');
          if (input.status !== 'todo' && input.status !== 'done') throw new Error('status는 todo 또는 done이어야 합니다.');
          if (!Number.isInteger(input.expectedVersion)) throw new Error('INVALID_INPUT: expectedVersion 정수가 필요합니다.');
          const state = api.updateStep(input.caseId, input.stepId, input.status, input.expectedVersion as number);
          recordOutcome(api, 'update_verification_step', 'success', state);
          return ok('확인 항목 상태를 변경했습니다.', {
            ok: true,
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            changedIds: [input.stepId],
            changedFields: ['status'],
          });
        } catch (error) {
          recordOutcome(api, 'update_verification_step', 'blocked');
          return failure(error);
        }
      },
    },
    {
      name: 'get_official_resources',
      description: '사전에 확인한 공식 안내 링크를 읽습니다. 링크를 자동으로 열거나 신고하지 않습니다.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        try {
          const resources = api.getResources();
          recordOutcome(api, 'get_official_resources', 'success');
          return ok(`공식 확인 자료 ${resources.length}개를 반환합니다. 사용자가 직접 열고 적용 범위를 판단해야 합니다.`, {
            ok: true,
            resources,
          });
        } catch (error) {
          recordOutcome(api, 'get_official_resources', 'blocked');
          return failure(error);
        }
      },
    },
    {
      name: 'get_action_receipts',
      description: '최근 WebMCP 분석·변경 작업의 개인정보 보호 영수증을 최신순으로 읽습니다. 원문, 도구 인수, 근거는 반환하지 않습니다.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        const receipts = api.getReceipts().map((receipt) => ({ ...receipt }));
        return ok(`최근 WebMCP 작업 영수증 ${receipts.length}개를 반환합니다.`, {
          ok: true,
          receipts,
        });
      },
    },
  ];
}

export function useOfferProofTools(api: OfferProofToolApi): WebMcpStatus {
  const [status, setStatus] = useState<WebMcpStatus>('checking');

  useEffect(() => {
    let disposed = false;
    let attempts = 0;
    let controller: AbortController | null = null;

    const connect = async () => {
      if (disposed || controller) return;
      const context = document.modelContext;
      if (!context) {
        attempts += 1;
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
        if (!disposed) setStatus('error');
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
  }, [api]);

  return status;
}
