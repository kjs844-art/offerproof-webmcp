import { describe, expect, it } from 'vitest';
import { createSequentialIdGenerator } from '../domain/ids';
import { TOOL_NAMES, type InspectOfferSignalsData, type ToolSuccess } from '../domain/types';
import { createOfferProofService } from '../services/offerProofService';
import { createFakeModelContext } from '../test/fakeModelContext';
import { SAMPLES } from '../test/samples';
import { buildToolDescriptors, detectModelContext, registerOfferProofTools } from './adapter';

function makeService(seed = 'mcp') {
  let tick = 0;
  return createOfferProofService({
    idGen: createSequentialIdGenerator(seed),
    now: () => `2026-09-02T00:00:${String(tick++).padStart(2, '0')}.000Z`,
  });
}

describe('WebMCP feature detection', () => {
  it('prefers document.modelContext, falls back to navigator, otherwise reports unavailable', () => {
    const mc = createFakeModelContext();
    expect(detectModelContext({ document: { modelContext: mc }, navigator: { modelContext: undefined }, isSecureContext: true }).source).toBe('document');
    expect(detectModelContext({ document: { modelContext: undefined }, navigator: { modelContext: mc }, isSecureContext: true }).source).toBe('navigator');
    const none = detectModelContext({ document: { modelContext: undefined }, navigator: { modelContext: undefined }, isSecureContext: true });
    expect(none.available).toBe(false);
    expect(none.reason).toContain('document.modelContext');
    const insecure = detectModelContext({ document: { modelContext: undefined }, navigator: { modelContext: undefined }, isSecureContext: false });
    expect(insecure.reason).toContain('보안 컨텍스트');
    expect(detectModelContext({ document: { modelContext: {} as never }, navigator: null }).available).toBe(false);
  });

  it('returns unavailable (manual mode) when no ModelContext exists', async () => {
    const result = await registerOfferProofTools(makeService(), { modelContext: null });
    expect(result.status).toBe('unavailable');
    expect(result.toolNames).toEqual([]);
  });
});

describe('WebMCP registration', () => {
  it('registers exactly the five contract tools with schemas and annotations', async () => {
    const mc = createFakeModelContext();
    const service = makeService();
    const result = await registerOfferProofTools(service, { modelContext: mc });
    expect(result.status).toBe('registered');
    expect(result.toolNames).toEqual([...TOOL_NAMES]);
    expect([...mc.tools.keys()]).toEqual([...TOOL_NAMES]);
    const tools = await mc.getTools!();
    for (const t of tools) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.description).toContain(service.getState().caseId);
      expect((t.inputSchema as { additionalProperties: boolean }).additionalProperties).toBe(false);
      expect(t.annotations?.untrustedContentHint).toBe(true);
    }
    expect(tools.find((t) => t.name === 'get_case_summary')?.annotations?.readOnlyHint).toBe(true);
    expect(tools.find((t) => t.name === 'update_verification_step')?.annotations?.readOnlyHint).toBe(false);
    result.unregister();
    expect(mc.tools.size).toBe(0);
  });

  it('can re-register after unregistering (StrictMode double effect) without duplicate errors', async () => {
    const mc = createFakeModelContext();
    const service = makeService();
    const first = await registerOfferProofTools(service, { modelContext: mc });
    first.unregister();
    const second = await registerOfferProofTools(service, { modelContext: mc });
    expect(second.status).toBe('registered');
    expect(mc.tools.size).toBe(5);
    const third = await registerOfferProofTools(service, { modelContext: mc });
    expect(third.status).toBe('failed');
    expect(third.reason).toContain('InvalidStateError');
    expect(mc.tools.size).toBe(5);
  });

  it('reports a Permissions-Policy rejection as a failed registration and stays in manual mode', async () => {
    const mc = createFakeModelContext({ rejectWith: 'NotAllowedError' });
    const result = await registerOfferProofTools(makeService(), { modelContext: mc });
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('Permissions-Policy');
    expect(mc.tools.size).toBe(0);
  });

  it('descriptors never expose more than the five names', () => {
    const names = buildToolDescriptors(makeService()).map((d) => d.name);
    expect(names).toEqual([...TOOL_NAMES]);
  });
});

describe('manual vs WebMCP parity', () => {
  it('produces identical signals, plans and summaries through both paths', async () => {
    const manual = makeService('parity');
    const agentSvc = makeService('parity');
    const mc = createFakeModelContext();
    await registerOfferProofTools(agentSvc, { modelContext: mc });

    const text = `${SAMPLES.koRrn}\n\n${SAMPLES.koKakao}\n${SAMPLES.koUrgency}`;
    manual.setInputText(text);
    manual.setPrivacyConfirmed(true);
    agentSvc.setInputText(text);
    agentSvc.setPrivacyConfirmed(true);

    const m = manual.getState();
    const a = agentSvc.getState();
    const manualInspect = manual.inspectOfferSignals({ caseId: m.caseId, caseVersion: `v${m.version}`, privacyConfirmed: true }, { source: 'manual' }) as ToolSuccess<InspectOfferSignalsData>;
    const agentInspect = (await mc.execute('inspect_offer_signals', { caseId: a.caseId, caseVersion: `v${a.version}`, privacyConfirmed: true })) as ToolSuccess<InspectOfferSignalsData>;
    expect(agentInspect.ok).toBe(true);
    expect(agentInspect.data).toEqual(manualInspect.data);
    expect(agentInspect.changedIds).toEqual(manualInspect.changedIds);
    expect(agentInspect.changedFields).toEqual(manualInspect.changedFields);
    expect(agentInspect.caseVersion).toBe(manualInspect.caseVersion);

    const signalIds = manualInspect.data.signalIds;
    const m2 = manual.getState();
    const a2 = agentSvc.getState();
    const manualPlan = manual.buildVerificationPlan({ caseId: m2.caseId, caseVersion: `v${m2.version}`, signalIds, confirmation: 'user_confirmed' }) as ToolSuccess<{ steps: { verificationStepId: string }[] }>;
    const agentPlan = (await mc.execute('build_verification_plan', { caseId: a2.caseId, caseVersion: `v${a2.version}`, signalIds, confirmation: 'user_confirmed' })) as ToolSuccess<{ steps: { verificationStepId: string }[] }>;
    expect(agentPlan.data).toEqual(manualPlan.data);

    const stepId = manualPlan.data.steps[0].verificationStepId;
    const m3 = manual.getState();
    const a3 = agentSvc.getState();
    const manualStep = manual.updateVerificationStep({ caseId: m3.caseId, caseVersion: `v${m3.version}`, verificationPlanId: m3.plan!.verificationPlanId, verificationStepId: stepId, status: 'done', confirmation: 'user_confirmed' });
    const agentStep = await mc.execute('update_verification_step', { caseId: a3.caseId, caseVersion: `v${a3.version}`, verificationPlanId: a3.plan!.verificationPlanId, verificationStepId: stepId, status: 'done', confirmation: 'user_confirmed' });
    expect(agentStep).toEqual(manualStep);

    const manualSummary = manual.getCaseSummary({ caseId: m3.caseId });
    const agentSummary = await mc.execute('get_case_summary', { caseId: a3.caseId });
    expect(agentSummary).toEqual(manualSummary);

    const manualRes = manual.getOfficialResources({ caseId: m3.caseId, jurisdiction: 'KR', topic: 'upfront_payment' });
    const agentRes = await mc.execute('get_official_resources', { caseId: a3.caseId, jurisdiction: 'KR', topic: 'upfront_payment' });
    expect(agentRes).toEqual(manualRes);

    // The agent path is visible in the call log so the UI can attribute changes.
    expect(agentSvc.getCallLog().every((c) => c.source === 'webmcp')).toBe(true);
    expect(manual.getCallLog().every((c) => c.source === 'manual')).toBe(true);
  });

  it('agent calls go through the same validation: unknown fields and stale versions are rejected', async () => {
    const service = makeService();
    const mc = createFakeModelContext();
    await registerOfferProofTools(service, { modelContext: mc });
    const s = service.getState();
    const bad = (await mc.execute('get_case_summary', { caseId: s.caseId, admin: true })) as { ok: boolean; error: { code: string } };
    expect(bad.ok).toBe(false);
    expect(bad.error.code).toBe('INVALID_INPUT');
    service.setInputText(SAMPLES.koUpfront);
    service.setPrivacyConfirmed(true);
    const stale = (await mc.execute('inspect_offer_signals', { caseId: s.caseId, caseVersion: 'v1', privacyConfirmed: true })) as { ok: boolean; error: { code: string; currentCaseVersion: string } };
    expect(stale.error.code).toBe('CASE_VERSION_CONFLICT');
    expect(stale.error.currentCaseVersion).toBe(`v${service.getState().version}`);
    expect(service.getState().analysis).toBeNull();
  });

  it('serialises results as JSON like a user agent would', async () => {
    const service = makeService();
    const mc = createFakeModelContext();
    await registerOfferProofTools(service, { modelContext: mc });
    const raw = await mc.executeTool!({ name: 'get_case_summary', description: 'x' }, { caseId: service.getState().caseId });
    expect(typeof raw).toBe('string');
    const parsed = JSON.parse(raw) as { ok: boolean; tool: string; data: { status: string } };
    expect(parsed.ok).toBe(true);
    expect(parsed.tool).toBe('get_case_summary');
    expect(parsed.data.status).toBe('empty');
  });
});
