import type { ModelContextLike, ModelContextRegisteredTool, ModelContextToolDescriptor } from '../webmcp/types';

/**
 * Spec-shaped fake of `document.modelContext` for tests (WebMCP CG draft,
 * 2026-09-02): registerTool rejects duplicates/empty names with
 * InvalidStateError, aborting the registration signal removes the tool, and
 * executeTool JSON-round-trips the input and result like a user agent.
 */
export interface FakeModelContext extends ModelContextLike {
  tools: Map<string, ModelContextToolDescriptor>;
  execute(name: string, input: unknown): Promise<unknown>;
  registerCalls: string[];
}

export function createFakeModelContext(options: { rejectWith?: string } = {}): FakeModelContext {
  const tools = new Map<string, ModelContextToolDescriptor>();
  const registerCalls: string[] = [];

  const fake: FakeModelContext = {
    tools,
    registerCalls,
    async registerTool(tool, opts) {
      registerCalls.push(tool.name);
      if (options.rejectWith) throw new DOMException('registration rejected', options.rejectWith);
      if (opts?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
      if (!tool.name || !tool.description) throw new DOMException('empty name or description', 'InvalidStateError');
      if (tools.has(tool.name)) throw new DOMException('duplicate tool name', 'InvalidStateError');
      JSON.stringify(tool.inputSchema);
      tools.set(tool.name, tool);
      opts?.signal?.addEventListener('abort', () => {
        tools.delete(tool.name);
      });
    },
    async getTools(): Promise<ModelContextRegisteredTool[]> {
      return [...tools.values()].map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: t.annotations,
      }));
    },
    async executeTool(tool, inputObject = {}) {
      const target = tools.get(tool.name);
      if (!target) throw new DOMException('unknown tool', 'NotFoundError');
      const controller = new AbortController();
      const parsed = JSON.parse(JSON.stringify(inputObject)) as unknown;
      const result = await target.execute(parsed, { signal: controller.signal });
      return JSON.stringify(result);
    },
    async execute(name, input) {
      const raw = await fake.executeTool!({ name, description: name }, input as object);
      return JSON.parse(raw) as unknown;
    },
  };
  return fake;
}
