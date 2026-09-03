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
  const message = error instanceof Error ? error.message : 'Tool execution failed.';
  return {
    content: [{ type: 'text', text: message }],
    structuredContent: { ok: false, error: message },
    isError: true,
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

// Error code constants for consistent error handling
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
} as const;

export function createOfferProofTools(api: OfferProofToolApi): WebMcpTool[] {
  return [
    // Tool 1: get_case_summary
    // Read-only: Returns current case state without modification
    {
      name: 'get_case_summary',
      description: 'Retrieves the current state of a case, including signals, verification plans, and privacy status. This is a read-only operation that requires privacy confirmation.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        try {
          const state = api.getState();
          requirePrivacy(state);
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
            signals: state.signals.map((s) => ({
              signalId: s.signalId,
              title: s.title,
              observation: s.observation,
              inference: s.inference,
              limitations: s.limitations,
            })),
            verificationSteps: state.verificationSteps.map((s) => ({
              stepId: s.stepId,
              signalId: s.signalId,
              label: s.label,
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
      description: 'Analyzes the offer text for risk signals using the canonical signal registry. Returns detected signals with metadata. Requires privacy confirmation.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        try {
          const state = api.inspect();
          recordOutcome(api, 'inspect_offer_signals', 'success', state);
          return ok(`Analysis found ${state.signals.length} signals. User must review and confirm privacy-sensitive data.`, {
            ok: true,
            tool: 'inspect_offer_signals',
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            changedIds: state.signals.map((signal) => signal.signalId),
            signalCount: state.signals.length,
            signals: state.signals.map((s) => ({
              signalId: s.signalId,
              title: s.title,
              category: 'observation',
              observedText: s.observedText,
              observation: s.observation,
              inference: s.inference,
              limitations: s.limitations,
              verificationPrompt: s.verificationPrompt,
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
      description: 'Creates a verification plan from selected signal IDs. Returns the plan structure for UI confirmation. Requires privacy confirmation and agent changes to be allowed.',
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
      annotations: { readOnlyHint: true, untrustedContentHint: false },
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
          recordOutcome(api, 'build_verification_plan', 'success', state);
          return ok(`Verification plan created with ${state.verificationSteps.length} steps.`, {
            ok: true,
            tool: 'build_verification_plan',
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            changedIds: state.verificationSteps.map((step) => step.stepId),
            verificationPlan: {
              planId: `plan-${state.caseId}`,
              status: 'active',
              steps: state.verificationSteps.map((s) => ({
                stepId: s.stepId,
                signalId: s.signalId,
                label: s.label,
                status: s.status,
                isCurrent: s.isCurrent,
              })),
            },
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
      description: 'Updates the status of a verification step (todo <-> done). Returns the updated step for UI confirmation. Requires privacy confirmation and agent changes to be allowed.',
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
      annotations: { readOnlyHint: true, untrustedContentHint: false },
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
          recordOutcome(api, 'update_verification_step', 'success', state);
          return ok('Verification step status updated.', {
            ok: true,
            tool: 'update_verification_step',
            caseId: state.caseId,
            caseVersion: state.caseVersion,
            changedIds: [input.stepId],
            changedFields: ['status'],
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
      description: 'Retrieves official guidance resources (government documents, regulations) relevant to job offer verification. Returns verified official content from an allowlist.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        try {
          const resources = api.getResources();
          recordOutcome(api, 'get_official_resources', 'success');
          return ok(`Retrieved ${resources.length} official resources. All resources are from verified official sources.`, {
            ok: true,
            tool: 'get_official_resources',
            resourceCount: resources.length,
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
      description: 'Returns the audit trail of all WebMCP tool invocations. Receipts contain only allow-listed metadata (tool name, outcome, case ID/version, timestamp) with no sensitive data, original text, or raw arguments.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        const receipts = api.getReceipts().map((receipt) => ({ ...receipt }));
        return ok(`Retrieved ${receipts.length} action receipts from the current session.`, {
          ok: true,
          tool: 'get_action_receipts',
          receiptCount: receipts.length,
          receipts: receipts.map((r) => ({
            receiptId: r.receiptId,
            createdAt: r.createdAt,
            toolName: r.toolName,
            toolClass: r.toolClass,
            outcome: r.outcome,
            caseId: r.caseId,
            caseVersion: r.caseVersion,
            message: r.message,
          })),
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
