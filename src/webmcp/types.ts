/**
 * Minimal typings for the WebMCP `ModelContext` API as specified in the
 * WebMCP Community Group draft (webmachinelearning/webmcp, index.bs,
 * checked 2026-09-02):
 *
 *   partial interface Document { readonly attribute ModelContext modelContext; }
 *   interface ModelContext : EventTarget {
 *     Promise<undefined> registerTool(ModelContextTool tool, optional ModelContextRegisterToolOptions options = {});
 *     Promise<sequence<RegisteredTool>> getTools(optional ModelContextGetToolOptions options = {});
 *     Promise<DOMString> executeTool(RegisteredTool tool, optional object inputObject = {}, optional ModelContextExecuteToolOptions options = {});
 *     attribute EventHandler ontoolchange;
 *   };
 *   dictionary ModelContextTool { required DOMString name; USVString title; required DOMString description;
 *     object inputSchema; required ToolExecuteCallback execute; ToolAnnotations annotations; };
 *   callback ToolExecuteCallback = Promise<any> (object inputObject, ToolExecuteCallbackOptions options);
 *
 * Unregistration happens by aborting the `signal` passed at registration.
 * `navigator.modelContext` is the deprecated pre-standard location and is
 * only used as a fallback. Older previews exposed `unregisterTool(name)`;
 * it is feature-detected and never required.
 */
export interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface ModelContextExecuteOptions {
  signal?: AbortSignal;
}

export interface ModelContextToolDescriptor {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  annotations?: ModelContextToolAnnotations;
  execute: (input: unknown, options?: ModelContextExecuteOptions) => unknown | Promise<unknown>;
}

export interface ModelContextRegisterToolOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

export interface ModelContextRegisteredTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: unknown;
  origin?: string;
  annotations?: ModelContextToolAnnotations;
}

export interface ModelContextLike {
  registerTool(tool: ModelContextToolDescriptor, options?: ModelContextRegisterToolOptions): Promise<void> | void;
  getTools?(options?: unknown): Promise<ModelContextRegisteredTool[]>;
  executeTool?(tool: ModelContextRegisteredTool, inputObject?: object, options?: ModelContextExecuteOptions): Promise<string>;
  /** Pre-standard preview API; optional. */
  unregisterTool?(name: string): unknown;
  addEventListener?(type: string, listener: EventListenerOrEventListenerObject | null): void;
  removeEventListener?(type: string, listener: EventListenerOrEventListenerObject | null): void;
}

declare global {
  interface Document {
    modelContext?: ModelContextLike;
  }
  interface Navigator {
    /** Deprecated location (Chrome ≤149 previews). */
    modelContext?: ModelContextLike;
  }
}
