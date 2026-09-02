import type { OfferProofService } from '../services/offerProofService';
import { TOOL_DESCRIPTIONS, TOOL_READ_ONLY, TOOL_SCHEMAS } from '../services/schemas';
import { TOOL_NAMES, type ToolName } from '../domain/types';
import type { ModelContextLike, ModelContextToolDescriptor } from './types';

/**
 * Feature-detected WebMCP adapter.
 *
 * Registers exactly the five contract tools on the page's `ModelContext` and
 * routes every execution through the shared service layer, so an agent call
 * and a manual button press produce the same state change. When no
 * `ModelContext` exists the app keeps working in manual mode and shows a
 * visible fallback notice (see `WebMcpStatus`).
 */
export type ModelContextSource = 'document' | 'navigator';

export interface ModelContextDetection {
  available: boolean;
  source: ModelContextSource | null;
  secureContext: boolean;
  reason: string;
}

export interface DetectionEnvironment {
  document?: Pick<Document, 'modelContext'> | null;
  navigator?: Pick<Navigator, 'modelContext'> | null;
  isSecureContext?: boolean;
}

function looksLikeModelContext(value: unknown): value is ModelContextLike {
  return typeof value === 'object' && value !== null && typeof (value as ModelContextLike).registerTool === 'function';
}

export function detectModelContext(env?: DetectionEnvironment): ModelContextDetection {
  const doc = env?.document ?? (typeof document !== 'undefined' ? document : null);
  const nav = env?.navigator ?? (typeof navigator !== 'undefined' ? navigator : null);
  const secureContext = env?.isSecureContext ?? (typeof window !== 'undefined' ? window.isSecureContext !== false : true);

  if (doc && looksLikeModelContext(doc.modelContext)) {
    return { available: true, source: 'document', secureContext, reason: 'document.modelContext를 사용할 수 있습니다.' };
  }
  if (nav && looksLikeModelContext(nav.modelContext)) {
    return {
      available: true,
      source: 'navigator',
      secureContext,
      reason: 'navigator.modelContext(구 위치)를 사용할 수 있습니다. 최신 사양은 document.modelContext입니다.',
    };
  }
  return {
    available: false,
    source: null,
    secureContext,
    reason: secureContext
      ? '이 브라우저는 document.modelContext(WebMCP)를 제공하지 않습니다.'
      : '이 페이지는 보안 컨텍스트(HTTPS/localhost)가 아니어서 WebMCP를 사용할 수 없습니다.',
  };
}

export function resolveModelContext(env?: DetectionEnvironment): ModelContextLike | null {
  const detection = detectModelContext(env);
  if (!detection.available) return null;
  const doc = env?.document ?? (typeof document !== 'undefined' ? document : null);
  const nav = env?.navigator ?? (typeof navigator !== 'undefined' ? navigator : null);
  return detection.source === 'document' ? (doc?.modelContext ?? null) : (nav?.modelContext ?? null);
}

/** Builds the five tool descriptors. Execution goes through the shared service. */
export function buildToolDescriptors(service: OfferProofService): ModelContextToolDescriptor[] {
  const caseId = service.getState().caseId;
  return TOOL_NAMES.map((name: ToolName) => ({
    name,
    title: name,
    description: `${TOOL_DESCRIPTIONS[name]} 현재 caseId: ${caseId}`,
    inputSchema: TOOL_SCHEMAS[name],
    annotations: {
      readOnlyHint: TOOL_READ_ONLY[name],
      // Results may echo (masked) pasted content, which is untrusted data.
      untrustedContentHint: true,
    },
    execute: async (input, options) => {
      if (options?.signal?.aborted) {
        return {
          ok: false,
          tool: name,
          error: { code: 'CANCELLED', message: '요청이 취소되었습니다.', retryable: true, fieldErrors: [] },
        };
      }
      return service.callTool(name, input, { source: 'webmcp' });
    },
  }));
}

export type RegistrationStatus = 'registered' | 'unavailable' | 'failed';

export interface RegistrationResult {
  status: RegistrationStatus;
  source: ModelContextSource | null;
  toolNames: string[];
  reason: string | null;
  unregister(): void;
}

export interface RegisterOptions {
  env?: DetectionEnvironment;
  /** Explicit ModelContext (tests). Overrides detection. */
  modelContext?: ModelContextLike | null;
  /**
   * Controller whose signal is passed to every `registerTool` call. Aborting it
   * unregisters the tools per the WebMCP spec and cancels an in-flight
   * registration (React StrictMode runs effect cleanup before re-running).
   */
  abortController?: AbortController;
}

function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) return String((error as { name: unknown }).name);
  return 'Error';
}

export async function registerOfferProofTools(
  service: OfferProofService,
  options: RegisterOptions = {},
): Promise<RegistrationResult> {
  const detection = detectModelContext(options.env);
  const modelContext = options.modelContext !== undefined ? options.modelContext : resolveModelContext(options.env);
  const source: ModelContextSource | null = options.modelContext !== undefined ? 'document' : detection.source;

  if (!modelContext) {
    return { status: 'unavailable', source: null, toolNames: [], reason: detection.reason, unregister: () => {} };
  }

  const controller = options.abortController ?? new AbortController();
  const descriptors = buildToolDescriptors(service);
  const registered: string[] = [];
  const legacyUnregister = typeof modelContext.unregisterTool === 'function' ? modelContext.unregisterTool.bind(modelContext) : null;

  // Pre-standard previews exposed unregisterTool(name) instead of honouring the signal.
  const removeLegacy = () => {
    if (!legacyUnregister) return;
    for (const name of registered.splice(0)) {
      try {
        legacyUnregister(name);
      } catch {
        // Already removed through the signal, or unsupported.
      }
    }
  };
  controller.signal.addEventListener('abort', removeLegacy, { once: true });

  const unregister = () => {
    if (!controller.signal.aborted) controller.abort();
    else removeLegacy();
  };

  if (controller.signal.aborted) {
    return { status: 'failed', source, toolNames: [], reason: '등록이 취소되었습니다.', unregister: () => {} };
  }

  try {
    for (const descriptor of descriptors) {
      if (controller.signal.aborted) throw new DOMException('registration cancelled', 'AbortError');
      try {
        await modelContext.registerTool(descriptor, { signal: controller.signal });
      } catch (error) {
        // A stale duplicate from a legacy implementation without signal support: remove it and retry once.
        if (errorName(error) === 'InvalidStateError' && legacyUnregister && !controller.signal.aborted) {
          legacyUnregister(descriptor.name);
          await modelContext.registerTool(descriptor, { signal: controller.signal });
        } else {
          throw error;
        }
      }
      registered.push(descriptor.name);
    }
  } catch (error) {
    if (controller.signal.aborted) {
      return { status: 'failed', source, toolNames: [], reason: '등록이 취소되었습니다.', unregister: () => {} };
    }
    unregister();
    const name = errorName(error);
    const reason =
      name === 'NotAllowedError'
        ? '이 페이지에서 WebMCP 도구 등록이 허용되지 않았습니다(Permissions-Policy: tools). 수동 모드로 동작합니다.'
        : `WebMCP 도구 등록에 실패했습니다(${name}). 수동 모드로 동작합니다.`;
    return { status: 'failed', source, toolNames: [], reason, unregister: () => {} };
  }

  return { status: 'registered', source, toolNames: [...registered], reason: null, unregister };
}
