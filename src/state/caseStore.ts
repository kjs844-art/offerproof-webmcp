import { createRandomIdGenerator, type IdGenerator } from '../domain/ids';
import { CASE_SCHEMA_VERSION, type CaseState } from '../domain/types';

/**
 * Versioned, in-memory case store with an undo history.
 *
 * - Every committed change increments `version` (monotonic).
 * - Undo restores the previous snapshot as a *new* version, so optimistic
 *   concurrency checks keep working after an undo.
 * - Nothing is persisted; the state lives only in this browser tab.
 */
export interface CaseStoreOptions {
  idGen?: IdGenerator;
  now?: () => string;
  historyLimit?: number;
  jurisdiction?: CaseState['jurisdiction'];
}

export interface CommitOptions {
  /** When true and the previous history entry has the same label, keep that entry instead of adding one. */
  coalesce?: boolean;
}

export interface UndoEntry {
  label: string;
  snapshot: CaseState;
}

export interface CaseStore {
  readonly idGen: IdGenerator;
  readonly now: () => string;
  getState(): CaseState;
  subscribe(listener: () => void): () => void;
  /** Commits a new state derived from the current one. Returns the committed state. */
  commit(label: string, update: (state: CaseState) => CaseState, options?: CommitOptions): CaseState;
  undo(): UndoEntry | null;
  canUndo(): boolean;
  undoLabel(): string | null;
  historyLength(): number;
}

export function createInitialCaseState(caseId: string, now: string, jurisdiction: CaseState['jurisdiction'] = 'KR'): CaseState {
  return {
    schemaVersion: CASE_SCHEMA_VERSION,
    caseId,
    version: 1,
    status: 'empty',
    input: null,
    analysis: null,
    plan: null,
    previousPlan: null,
    jurisdiction,
    updatedAt: now,
  };
}

export function createCaseStore(options: CaseStoreOptions = {}): CaseStore {
  const idGen = options.idGen ?? createRandomIdGenerator();
  const now = options.now ?? (() => new Date().toISOString());
  const historyLimit = options.historyLimit ?? 30;
  let state = createInitialCaseState(idGen.next('case'), now(), options.jurisdiction ?? 'KR');
  const history: UndoEntry[] = [];
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    idGen,
    now,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    commit(label, update, options) {
      const previous = state;
      const next = update(previous);
      if (next === previous) return state;
      const last = history[history.length - 1];
      if (!(options?.coalesce && last && last.label === label)) {
        history.push({ label, snapshot: previous });
      }
      while (history.length > historyLimit) history.shift();
      state = { ...next, caseId: previous.caseId, version: previous.version + 1, updatedAt: now() };
      notify();
      return state;
    },
    undo() {
      const entry = history.pop();
      if (!entry) return null;
      state = { ...entry.snapshot, version: state.version + 1, updatedAt: now() };
      notify();
      return entry;
    },
    canUndo: () => history.length > 0,
    undoLabel: () => (history.length > 0 ? history[history.length - 1].label : null),
    historyLength: () => history.length,
  };
}
