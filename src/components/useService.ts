import { useSyncExternalStore } from 'react';
import type { OfferProofService, ToolCallRecord } from '../services/offerProofService';
import type { CaseState } from '../domain/types';

export function useCaseState(service: OfferProofService): CaseState {
  return useSyncExternalStore(service.subscribe, service.getState, service.getState);
}

const EMPTY_LOG: ToolCallRecord[] = [];

export function useCallLog(service: OfferProofService): ToolCallRecord[] {
  return useSyncExternalStore(
    service.subscribeCalls,
    () => {
      const log = service.getCallLog();
      return log.length === 0 ? EMPTY_LOG : log[log.length - 1].seq === cachedSeq && cachedLog ? cachedLog : cache(log);
    },
    () => EMPTY_LOG,
  );
}

let cachedSeq = -1;
let cachedLog: ToolCallRecord[] | null = null;
function cache(log: ToolCallRecord[]): ToolCallRecord[] {
  cachedSeq = log[log.length - 1].seq;
  cachedLog = log;
  return log;
}
