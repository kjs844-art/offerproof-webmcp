import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVerificationPlan,
  createOfferCase,
  inspectCase,
  updateOfferText,
  updateVerificationStep,
} from '../src/domain/caseState.ts';
import type { OfferCase, SignalId, VerificationStatus } from '../src/domain/types.ts';
import { createOfferProofTools, type OfferProofToolApi } from '../src/webmcp/useOfferProofTools.ts';

function createHarness() {
  let state = createOfferCase();
  const api: OfferProofToolApi = {
    getState: () => state,
    inspect: () => {
      state = inspectCase(state);
      return state;
    },
    buildPlan: (caseId: string, expectedVersion: number, signalIds?: SignalId[]) => {
      state = buildVerificationPlan(state, expectedVersion, caseId, signalIds);
      return state;
    },
    updateStep: (
      caseId: string,
      stepId: string,
      status: VerificationStatus,
      expectedVersion: number,
    ) => {
      state = updateVerificationStep(state, stepId, status, expectedVersion, caseId);
      return state;
    },
    getResources: () => [],
  };

  const tools = createOfferProofTools(api);
  return {
    getState: () => state,
    setState: (next: OfferCase) => { state = next; },
    tool: (name: string) => {
      const found = tools.find((item) => item.name === name);
      assert.ok(found, `${name} 도구가 등록되어야 합니다.`);
      return found;
    },
    tools,
  };
}

test('사례 요약 도구는 화면 개인정보 동의 전 입력 파생 정보를 반환하지 않는다', async () => {
  const harness = createHarness();
  harness.setState(updateOfferText(harness.getState(), '교육비를 먼저 입금하세요. test@example.com'));

  const result = await harness.tool('get_case_summary').execute({});
  assert.equal(result.isError, true);
  assert.equal(JSON.stringify(result).includes('test@example.com'), false);
});

test('WebMCP 검사와 요약 결과에는 민감한 원문 값이 없고 버전은 숫자다', async () => {
  const harness = createHarness();
  let state = updateOfferText(
    harness.getState(),
    '계좌번호 1234-5678-9012-3456을 제출하고 교육비를 먼저 입금하세요.',
  );
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);

  const inspected = await harness.tool('inspect_offer_signals').execute({});
  const summary = await harness.tool('get_case_summary').execute({});
  const serialized = JSON.stringify({ inspected, summary });

  assert.equal(inspected.isError, undefined);
  assert.equal(serialized.includes('1234-5678-9012-3456'), false);
  assert.equal(serialized.includes('[비밀값 가림]'), true);
  assert.equal(typeof (summary.structuredContent as { caseVersion: unknown }).caseVersion, 'number');
});

test('WebMCP 결과는 비밀번호와 OTP 문맥 값 및 전체 입력문을 반환하지 않는다', async () => {
  const harness = createHarness();
  let state = updateOfferText(
    harness.getState(),
    '비밀번호 hunter2를 보내고 OTP 654321을 입력하세요.',
  );
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);

  const inspected = await harness.tool('inspect_offer_signals').execute({});
  const summary = await harness.tool('get_case_summary').execute({});
  const serialized = JSON.stringify({ inspected, summary });

  assert.equal(serialized.includes('hunter2'), false);
  assert.equal(serialized.includes('654321'), false);
  assert.equal(serialized.includes('maskedText'), false);
  assert.equal(serialized.includes('[민감정보 요청이 포함된 문장 가림]'), true);
});

test('계획 도구는 UI 변경 동의, 정식 신호 ID, 사례 ID와 버전을 검증한다', async () => {
  const harness = createHarness();
  let state = updateOfferText(harness.getState(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  harness.setState(state);

  const blocked = await harness.tool('build_verification_plan').execute({
    caseId: state.caseId,
    expectedVersion: state.caseVersion,
  });
  assert.equal(blocked.isError, true);

  state = { ...state, agentChangesAllowed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);
  const invalid = await harness.tool('build_verification_plan').execute({
    caseId: state.caseId,
    expectedVersion: state.caseVersion,
    signalIds: ['NOT_A_SIGNAL'],
  });
  assert.equal(invalid.isError, true);
  assert.match(invalid.content[0]?.text ?? '', /INVALID_INPUT/);

  const built = await harness.tool('build_verification_plan').execute({
    caseId: state.caseId,
    expectedVersion: state.caseVersion,
    signalIds: ['UPFRONT_PAYMENT'],
  });
  assert.equal(built.isError, undefined);
  assert.equal(typeof (built.structuredContent as { caseVersion: unknown }).caseVersion, 'number');
});

test('변경 도구는 새 검토에 대한 오래된 사례 ID 요청을 거부한다', async () => {
  const harness = createHarness();
  let state = updateOfferText(harness.getState(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  state = { ...state, agentChangesAllowed: true };
  state = buildVerificationPlan(state, state.caseVersion, state.caseId);
  const staleCaseId = state.caseId;
  const staleStepId = state.verificationSteps[0]?.stepId ?? '';

  const fresh = { ...createOfferCase(), privacyConfirmed: true, agentChangesAllowed: true };
  harness.setState(fresh);
  const result = await harness.tool('update_verification_step').execute({
    caseId: staleCaseId,
    stepId: staleStepId,
    status: 'done',
    expectedVersion: fresh.caseVersion,
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0]?.text ?? '', /CASE_ID_CONFLICT/);
});

test('도구 메타데이터는 지원되는 WebMCP 힌트만 사용한다', () => {
  const harness = createHarness();
  for (const tool of harness.tools) {
    assert.equal('destructiveHint' in (tool.annotations ?? {}), false);
    assert.equal('openWorldHint' in (tool.annotations ?? {}), false);
  }
  assert.equal(harness.tool('get_case_summary').annotations?.untrustedContentHint, true);
  assert.equal(harness.tool('inspect_offer_signals').annotations?.untrustedContentHint, true);
});
