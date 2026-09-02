import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSequentialIdGenerator } from '../domain/ids';
import { createOfferProofService } from '../services/offerProofService';
import { useCallLog } from './useService';

function makeService(seed: string) {
  return createOfferProofService({ idGen: createSequentialIdGenerator(seed) });
}

describe('useCallLog', () => {
  it('does not leak one service instance’s log into another’s hook result at the same sequence number', () => {
    const serviceA = makeService('hook-a');
    const serviceB = makeService('hook-b');

    const { result: resultA } = renderHook(() => useCallLog(serviceA));
    const { result: resultB } = renderHook(() => useCallLog(serviceB));
    expect(resultA.current).toEqual([]);
    expect(resultB.current).toEqual([]);

    // Both services' first call reaches sequence 1 — the scenario that used to
    // collide in a module-level cache keyed only by that sequence number.
    act(() => {
      serviceA.getCaseSummary({ caseId: serviceA.getState().caseId });
    });
    act(() => {
      serviceB.getOfficialResources({ caseId: serviceB.getState().caseId, jurisdiction: 'KR' });
    });

    expect(resultA.current).toHaveLength(1);
    expect(resultB.current).toHaveLength(1);
    expect(resultA.current[0].seq).toBe(resultB.current[0].seq);
    expect(resultA.current[0].tool).toBe('get_case_summary');
    expect(resultB.current[0].tool).toBe('get_official_resources');

    // A second call on A must not disturb B's independently cached snapshot.
    act(() => {
      serviceA.getCaseSummary({ caseId: serviceA.getState().caseId });
    });
    expect(resultA.current).toHaveLength(2);
    expect(resultB.current).toHaveLength(1);
    expect(resultB.current[0].tool).toBe('get_official_resources');
  });
});
