import { useSyncExternalStore } from 'react';
import type { OfferProofService, ToolCallRecord } from '../services/offerProofService';
import type { CaseState } from '../domain/types';

export function useCaseState(service: OfferProofService): CaseState {
  return useSyncExternalStore(service.subscribe, service.getState, service.getState);
}

const EMPTY_LOG: ToolCallRecord[] = [];

// Keyed per service instance (not a single module-level cache) so two
// OfferProofService instances whose logs happen to reach the same sequence
// number never return each other's cached snapshot.
const logCacheByService = new WeakMap<OfferProofService, { seq: number; log: ToolCallRecord[] }>();

export function useCallLog(service: OfferProofService): ToolCallRecord[] {
  return useSyncExternalStore(
    service.subscribeCalls,
    () => {
      const log = service.getCallLog();
      if (log.length === 0) return EMPTY_LOG;
      const lastSeq = log[log.length - 1].seq;
      const cached = logCacheByService.get(service);
      if (cached && cached.seq === lastSeq) return cached.log;
      logCacheByService.set(service, { seq: lastSeq, log });
      return log;
    },
    () => EMPTY_LOG,
  );
}
