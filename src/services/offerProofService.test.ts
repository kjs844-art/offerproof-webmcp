import { describe, expect, it } from 'vitest';
import { createSequentialIdGenerator } from '../domain/ids';
import type { CaseSummaryData, InspectOfferSignalsData, ToolFailure, ToolSuccess } from '../domain/types';
import { FORBIDDEN_KEYS, FORBIDDEN_PHRASES, SAMPLES, collectKeys } from '../test/samples';
import { createOfferProofService, type OfferProofService } from './offerProofService';

function makeService(seed = 'svc') {
  let tick = 0;
  return createOfferProofService({
    idGen: createSequentialIdGenerator(seed),
    now: () => `2026-09-02T00:00:${String(tick++).padStart(2, '0')}.000Z`,
  });
}

function prepare(service: OfferProofService, text: string) {
  service.setInputText(text);
  service.setPrivacyConfirmed(true);
  const s = service.getState();
  return { caseId: s.caseId, caseVersion: `v${s.version}` };
}

function inspect(service: OfferProofService, text: string = SAMPLES.koRrn) {
  const { caseId, caseVersion } = prepare(service, text);
  return service.inspectOfferSignals({ caseId, caseVersion, privacyConfirmed: true });
}

function expectFailure(result: unknown, code: string): ToolFailure {
  expect((result as ToolFailure).ok).toBe(false);
  expect((result as ToolFailure).error.code).toBe(code);
  return result as ToolFailure;
}

function buildPlan(service: OfferProofService, mode: 'create' | 'replace' = 'create') {
  const s = service.getState();
  return service.buildVerificationPlan({
    caseId: s.caseId,
    caseVersion: `v${s.version}`,
    signalIds: s.analysis!.signals.map((x) => x.signalId),
    mode,
    confirmation: 'user_confirmed',
  });
}

describe('service: inspect_offer_signals', () => {
  it('rejects analysis until the user confirmed privacy on the page', () => {
    const service = makeService();
    service.setInputText(SAMPLES.koUpfront);
    const s = service.getState();
    const before = s.version;
    const r = service.inspectOfferSignals({ caseId: s.caseId, caseVersion: `v${s.version}`, privacyConfirmed: true });
    expectFailure(r, 'CONFIRMATION_REQUIRED');
    expect(service.getState().version).toBe(before);
    expect(service.getState().analysis).toBeNull();
  });

  it('rejects privacyConfirmed: false and unknown fields without changing state', () => {
    const service = makeService();
    const { caseId, caseVersion } = prepare(service, SAMPLES.koUpfront);
    const before = service.getState().version;
    expectFailure(service.inspectOfferSignals({ caseId, caseVersion, privacyConfirmed: false }), 'CONFIRMATION_REQUIRED');
    const invalid = expectFailure(
      service.inspectOfferSignals({ caseId, caseVersion, privacyConfirmed: true, role: 'system', debug: true }),
      'INVALID_INPUT',
    );
    expect(invalid.error.fieldErrors.map((e) => e.code)).toEqual(['UNKNOWN_FIELD', 'UNKNOWN_FIELD']);
    expectFailure(service.inspectOfferSignals('not an object'), 'INVALID_INPUT');
    expect(service.getState().version).toBe(before);
  });

  it('returns masked evidence, bumps the version, and reports changed ids/fields', () => {
    const service = makeService();
    const { caseId, caseVersion } = prepare(service, SAMPLES.koRrn);
    const before = service.getState().version;
    const r = service.inspectOfferSignals({ caseId, caseVersion, privacyConfirmed: true }) as ToolSuccess<InspectOfferSignalsData>;
    expect(r.ok).toBe(true);
    expect(r.caseVersion).toBe(`v${before + 1}`);
    expect(r.changedIds).toContain(r.data.analysisId);
    expect(r.changedIds).toContain('SENSITIVE_DATA_REQUEST');
    expect(r.changedFields).toEqual(['$.analysis', '$.analysis.signals', '$.status']);
    const sig = r.data.signals.find((s) => s.signalId === 'SENSITIVE_DATA_REQUEST')!;
    expect(sig.observedText).toContain('901231-*******');
    expect(JSON.stringify(r)).not.toContain('901231-1234567');
    expect(r.data.privacy.unmaskedInputReturned).toBe(false);
    expect(r.data.disclaimer).toContain('확정하지 않습니다');
  });

  it('is idempotent for unchanged input and deterministic across services', () => {
    const a = makeService('same');
    const b = makeService('same');
    const ra = inspect(a, SAMPLES.koMixedLegit) as ToolSuccess<InspectOfferSignalsData>;
    const rb = inspect(b, SAMPLES.koMixedLegit) as ToolSuccess<InspectOfferSignalsData>;
    expect(ra.data).toEqual(rb.data);
    const s = a.getState();
    const again = a.inspectOfferSignals({ caseId: s.caseId, caseVersion: `v${s.version}`, privacyConfirmed: true }) as ToolSuccess<InspectOfferSignalsData>;
    expect(again.changedIds).toEqual([]);
    expect(again.caseVersion).toBe(`v${s.version}`);
    expect(again.data.analysisId).toBe(ra.data.analysisId);
  });

  it('fails cleanly when there is no input', () => {
    const service = makeService();
    const s = service.getState();
    expectFailure(service.inspectOfferSignals({ caseId: s.caseId, caseVersion: `v${s.version}`, privacyConfirmed: true }), 'ANALYSIS_FAILED');
  });
});

describe('service: case id, version conflicts, undo', () => {
  it('rejects a foreign caseId and a stale caseVersion without side effects', () => {
    const service = makeService();
    const { caseId, caseVersion } = prepare(service, SAMPLES.koUpfront);
    expectFailure(service.getCaseSummary({ caseId: 'case_zzzzzzzzzzzzzzzzzzzz' }), 'UNKNOWN_CASE');
    const before = service.getState().version;
    const stale = expectFailure(service.inspectOfferSignals({ caseId, caseVersion: 'v1', privacyConfirmed: true }), 'CASE_VERSION_CONFLICT');
    expect(stale.error.retryable).toBe(true);
    expect(stale.error.currentCaseVersion).toBe(caseVersion);
    expect(service.getState().version).toBe(before);
    expect(service.getState().analysis).toBeNull();
  });

  it('detects a conflict when a manual change and an agent change race on the same step', () => {
    const service = makeService();
    inspect(service, SAMPLES.koUpfront);
    const plan = (buildPlan(service) as ToolSuccess<{ verificationPlanId: string; steps: { verificationStepId: string }[] }>).data;
    const s = service.getState();
    const base = { caseId: s.caseId, caseVersion: `v${s.version}`, verificationPlanId: plan.verificationPlanId, verificationStepId: plan.steps[0].verificationStepId, confirmation: 'user_confirmed' };
    const manual = service.updateVerificationStep({ ...base, status: 'done' }, { source: 'manual' });
    expect(manual.ok).toBe(true);
    const agent = expectFailure(service.updateVerificationStep({ ...base, status: 'todo' }, { source: 'webmcp' }), 'CASE_VERSION_CONFLICT');
    expect(agent.error.currentCaseVersion).toBe(`v${s.version + 1}`);
    expect(service.getState().plan!.steps[0].status).toBe('done');
  });

  it('undo restores the previous snapshot as a new monotonic version', () => {
    const service = makeService();
    inspect(service, SAMPLES.koUpfront);
    const plan = (buildPlan(service) as ToolSuccess<{ verificationPlanId: string; steps: { verificationStepId: string }[] }>).data;
    const s1 = service.getState();
    const done = service.updateVerificationStep({
      caseId: s1.caseId,
      caseVersion: `v${s1.version}`,
      verificationPlanId: plan.verificationPlanId,
      verificationStepId: plan.steps[0].verificationStepId,
      status: 'done',
      memo: '계약서의 환불 조건을 확인함',
      confirmation: 'user_confirmed',
    }) as ToolSuccess<{ step: { status: string; memo: string | null } }>;
    expect(done.data.step.status).toBe('done');
    expect(done.changedFields).toEqual([
      `$.verificationPlan.steps[${plan.steps[0].verificationStepId}].status`,
      `$.verificationPlan.steps[${plan.steps[0].verificationStepId}].memo`,
    ]);
    const vDone = service.getState().version;
    expect(service.undoLabel()).toBe('단계 완료 표시');
    expect(service.undo()).toBe('단계 완료 표시');
    const after = service.getState();
    expect(after.version).toBe(vDone + 1);
    expect(after.plan!.steps[0].status).toBe('todo');
    expect(after.plan!.steps[0].memo).toBeNull();
    // A caller still holding the pre-undo version now conflicts instead of clobbering.
    expectFailure(
      service.updateVerificationStep({
        caseId: after.caseId,
        caseVersion: `v${vDone}`,
        verificationPlanId: plan.verificationPlanId,
        verificationStepId: plan.steps[0].verificationStepId,
        status: 'done',
        confirmation: 'user_confirmed',
      }),
      'CASE_VERSION_CONFLICT',
    );
  });

  it('undo after reset brings back input, analysis and plan', () => {
    const service = makeService();
    inspect(service, SAMPLES.koUpfront);
    buildPlan(service);
    const full = service.getState();
    service.resetCase();
    expect(service.getState().status).toBe('empty');
    expect(service.getState().plan).toBeNull();
    expect(service.undo()).toBe('초기화');
    const restored = service.getState();
    expect(restored.input?.rawText).toBe(full.input?.rawText);
    expect(restored.analysis?.analysisId).toBe(full.analysis?.analysisId);
    expect(restored.plan?.verificationPlanId).toBe(full.plan?.verificationPlanId);
    expect(restored.caseId).toBe(full.caseId);
    expect(restored.version).toBeGreaterThan(full.version);
  });

  it('coalesces keystroke edits into one undo entry', () => {
    const service = makeService();
    service.setInputText('안');
    service.setInputText('안녕');
    service.setInputText('안녕하세요');
    expect(service.store.historyLength()).toBe(1);
    service.undo();
    expect(service.getState().input).toBeNull();
  });
});

describe('service: build_verification_plan and update_verification_step', () => {
  it('requires confirmation, rejects unknown signals, and starts all steps as todo', () => {
    const service = makeService();
    inspect(service, SAMPLES.koUpfront);
    const s = service.getState();
    expectFailure(
      service.buildVerificationPlan({ caseId: s.caseId, caseVersion: `v${s.version}`, signalIds: ['UPFRONT_PAYMENT'] }),
      'CONFIRMATION_REQUIRED',
    );
    expectFailure(
      service.buildVerificationPlan({ caseId: s.caseId, caseVersion: `v${s.version}`, signalIds: ['URGENCY_PRESSURE'], confirmation: 'user_confirmed' }),
      'UNKNOWN_ID',
    );
    expectFailure(
      service.buildVerificationPlan({ caseId: s.caseId, caseVersion: `v${s.version}`, signalIds: [], confirmation: 'user_confirmed' }),
      'INVALID_INPUT',
    );
    expectFailure(
      service.buildVerificationPlan({ caseId: s.caseId, caseVersion: `v${s.version}`, signalIds: ['UPFRONT_PAYMENT', 'UPFRONT_PAYMENT'], confirmation: 'user_confirmed' }),
      'INVALID_INPUT',
    );
    expect(service.getState().plan).toBeNull();
    expect(service.getState().version).toBe(s.version);

    const r = buildPlan(service) as ToolSuccess<{ verificationPlanId: string; steps: { status: string; signalId: string | null; title: string }[] }>;
    expect(r.ok).toBe(true);
    expect(r.data.steps.every((st) => st.status === 'todo')).toBe(true);
    expect(r.data.steps.map((st) => st.signalId)).toContain('UPFRONT_PAYMENT');
    expect(r.data.steps.map((st) => st.signalId)).toContain('MISSING_EMPLOYER_DETAILS');
    expect(r.changedFields).toEqual(['$.verificationPlan', '$.verificationPlan.steps']);
    expect(r.changedIds[0]).toBe(r.data.verificationPlanId);
  });

  it('needs mode: replace once a plan exists and keeps the previous plan restorable', () => {
    const service = makeService();
    inspect(service, SAMPLES.koUpfront);
    const first = buildPlan(service) as ToolSuccess<{ verificationPlanId: string }>;
    expectFailure(buildPlan(service, 'create'), 'CONFIRMATION_REQUIRED');
    const replaced = buildPlan(service, 'replace') as ToolSuccess<{ verificationPlanId: string }>;
    expect(replaced.data.verificationPlanId).not.toBe(first.data.verificationPlanId);
    expect(replaced.changedFields).toContain('$.previousPlan');
    expect(service.getState().previousPlan?.verificationPlanId).toBe(first.data.verificationPlanId);
    expect(service.restorePreviousPlan()).toBe(true);
    expect(service.getState().plan?.verificationPlanId).toBe(first.data.verificationPlanId);
  });

  it('updates exactly one step, is a no-op for identical values, and blocks sensitive memos', () => {
    const service = makeService();
    inspect(service, SAMPLES.koUpfront);
    const plan = (buildPlan(service) as ToolSuccess<{ verificationPlanId: string; steps: { verificationStepId: string }[] }>).data;
    const s = service.getState();
    const base = { caseId: s.caseId, caseVersion: `v${s.version}`, verificationPlanId: plan.verificationPlanId, confirmation: 'user_confirmed' };
    const r1 = service.updateVerificationStep({ ...base, verificationStepId: plan.steps[1].verificationStepId, status: 'done' }) as ToolSuccess<unknown>;
    expect(r1.changedIds).toEqual([plan.steps[1].verificationStepId]);
    const after = service.getState();
    expect(after.plan!.steps.filter((st) => st.status === 'done')).toHaveLength(1);
    expect(after.plan!.steps[0].status).toBe('todo');

    const r2 = service.updateVerificationStep({ ...base, caseVersion: `v${after.version}`, verificationStepId: plan.steps[1].verificationStepId, status: 'done' }) as ToolSuccess<unknown>;
    expect(r2.changedIds).toEqual([]);
    expect(r2.changedFields).toEqual([]);
    expect(service.getState().version).toBe(after.version);

    expectFailure(
      service.updateVerificationStep({ ...base, caseVersion: `v${after.version}`, verificationStepId: plan.steps[1].verificationStepId, status: 'done', memo: '주민번호 901231-1234567 확인' }),
      'PRIVACY_RESTRICTION',
    );
    expectFailure(
      service.updateVerificationStep({ ...base, caseVersion: `v${after.version}`, verificationStepId: 'step_doesnotexist0000000', status: 'done' }),
      'UNKNOWN_ID',
    );
    expectFailure(
      service.updateVerificationStep({ ...base, caseVersion: `v${after.version}`, verificationStepId: plan.steps[1].verificationStepId, status: 'skipped' }),
      'INVALID_INPUT',
    );

    const summary = service.getCaseSummary({ caseId: s.caseId }) as ToolSuccess<CaseSummaryData>;
    expect(summary.data.counts.doneSteps).toBe(1);
    expect(summary.data.counts.steps).toBe(plan.steps.length);
  });

  it('keeps the checklist when the input changes and signals are re-inspected', () => {
    const service = makeService();
    inspect(service, SAMPLES.koUpfront);
    const plan = (buildPlan(service) as ToolSuccess<{ verificationPlanId: string }>).data;
    const r = inspect(service, SAMPLES.koClean) as ToolSuccess<InspectOfferSignalsData>;
    expect(r.data.signalIds).toEqual([]);
    expect(service.getState().plan?.verificationPlanId).toBe(plan.verificationPlanId);
  });
});

describe('service: get_case_summary and get_official_resources', () => {
  it('summarises without leaking raw sensitive values or verdict fields', () => {
    const service = makeService();
    inspect(service, SAMPLES.koRrn);
    const s = service.getState();
    const r = service.getCaseSummary({ caseId: s.caseId }) as ToolSuccess<CaseSummaryData>;
    expect(r.ok).toBe(true);
    expect(r.changedIds).toEqual([]);
    expect(r.data.status).toBe('result');
    expect(r.data.maskedInput).toContain('901231-*******');
    expect(JSON.stringify(r)).not.toContain('901231-1234567');
    expect(r.data.privacy.maskingStatus).toBe('reviewed');
    const keys = collectKeys(r);
    for (const key of FORBIDDEN_KEYS) expect(keys.has(key)).toBe(false);
    expect(service.getState().version).toBe(s.version);
  });

  it('returns allowlisted resources only, clearly marking unverified links', () => {
    const service = makeService();
    const s = service.getState();
    const kr = service.getOfficialResources({ caseId: s.caseId, jurisdiction: 'KR' }) as ToolSuccess<{ resources: { url: string | null; linkStatus: string }[] }>;
    expect(kr.data.resources.length).toBeGreaterThan(0);
    for (const r of kr.data.resources) {
      expect(r.url).toBeNull();
      expect(r.linkStatus).toBe('unavailable');
    }
    const us = service.getOfficialResources({ caseId: s.caseId, jurisdiction: 'US', topic: 'general_offer_review', signalIds: ['UPFRONT_PAYMENT'] }) as ToolSuccess<{ resources: { url: string | null; linkStatus: string; lastVerifiedAt: string | null }[] }>;
    expect(us.data.resources).toHaveLength(1);
    expect(us.data.resources[0].url?.startsWith('https://')).toBe(true);
    expect(us.data.resources[0].linkStatus).toBe('verified');
    expect(us.data.resources[0].lastVerifiedAt).toBe('2026-09-02');
    const gb = service.getOfficialResources({ caseId: s.caseId, jurisdiction: 'GB' }) as ToolSuccess<{ resources: unknown[]; notice: string }>;
    expect(gb.data.resources).toEqual([]);
    expect(gb.data.notice).toContain('아직 없습니다');
    expectFailure(service.getOfficialResources({ caseId: s.caseId, jurisdiction: 'XX' }), 'INVALID_INPUT');
    expectFailure(service.getOfficialResources({ caseId: s.caseId, jurisdiction: 'KR', includeExpired: true }), 'INVALID_INPUT');
    expect(service.getState().version).toBe(s.version);
  });
});

describe('service: prompt injection and forged tool calls inside the pasted text', () => {
  it('never executes instructions from the offer text and never auto-builds a plan', () => {
    const service = makeService();
    const r = inspect(service, `${SAMPLES.koInjection}\n${SAMPLES.koToolForgery}`) as ToolSuccess<InspectOfferSignalsData>;
    expect(r.ok).toBe(true);
    expect(r.data.notices.length).toBeGreaterThanOrEqual(2);
    expect(service.getState().plan).toBeNull();
    const log = service.getCallLog();
    expect(log.map((c) => c.tool)).toEqual(['inspect_offer_signals']);
    const json = JSON.stringify([r, service.getCaseSummary({ caseId: service.getState().caseId })]);
    for (const phrase of FORBIDDEN_PHRASES) expect(json).not.toContain(phrase);
    for (const key of FORBIDDEN_KEYS) expect(collectKeys(JSON.parse(json)).has(key)).toBe(false);
    // Repeated pressure does not drift the wording.
    const s = service.getState();
    const first = JSON.stringify(service.getCaseSummary({ caseId: s.caseId }));
    const second = JSON.stringify(service.getCaseSummary({ caseId: s.caseId }));
    const third = JSON.stringify(service.getCaseSummary({ caseId: s.caseId }));
    expect(first).toBe(second);
    expect(second).toBe(third);
  });
});
