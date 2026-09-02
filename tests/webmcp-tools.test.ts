import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVerificationPlan,
  createOfferCase,
  inspectCase,
  updateOfferText,
  updateVerificationStep,
} from '../src/domain/caseState.ts';
import {
  createActionReceipt,
  MAX_ACTION_RECEIPTS,
  prependActionReceipt,
  type ActionReceipt,
} from '../src/domain/actionReceipts.ts';
import type { OfferCase, SignalId, VerificationStatus } from '../src/domain/types.ts';
import { createOfferProofTools, type OfferProofToolApi } from '../src/webmcp/useOfferProofTools.ts';

function createHarness() {
  let state = createOfferCase();
  let receipts: ActionReceipt[] = [];
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
    getReceipts: () => receipts,
    recordReceipt: (receipt) => {
      receipts = prependActionReceipt(receipts, receipt);
    },
  };

  const tools = createOfferProofTools(api);
  return {
    getState: () => state,
    getReceipts: () => receipts,
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

test('작업 영수증은 최신순으로 최대 개수만 보존한다', () => {
  let receipts: ActionReceipt[] = [];
  const total = MAX_ACTION_RECEIPTS + 3;

  for (let version = 1; version <= total; version += 1) {
    receipts = prependActionReceipt(receipts, createActionReceipt(
      'inspect_offer_signals',
      'success',
      { caseId: `case-${version}`, caseVersion: version },
    ));
  }

  assert.equal(receipts.length, MAX_ACTION_RECEIPTS);
  assert.equal(receipts[0]?.caseVersion, total);
  assert.equal(receipts.at(-1)?.caseVersion, 4);
});

test('WebMCP 분석 작업은 차단과 성공을 모두 고정 문구 영수증으로 남긴다', async () => {
  const harness = createHarness();
  const blocked = await harness.tool('inspect_offer_signals').execute({});
  assert.equal(blocked.isError, true);

  let state = updateOfferText(harness.getState(), '교육비를 먼저 입금하세요.');
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);
  const succeeded = await harness.tool('inspect_offer_signals').execute({});
  assert.equal(succeeded.isError, undefined);

  const receipts = harness.getReceipts();
  assert.deepEqual(receipts.map((receipt) => receipt.outcome), ['success', 'blocked']);
  assert.deepEqual(receipts.map((receipt) => receipt.toolClass), ['analysis', 'analysis']);
  assert.equal(receipts[0]?.message, '브라우저 로컬 신호 검사를 완료했습니다.');
  assert.match(receipts[1]?.message ?? '', /적용하지 않았습니다/);
});

test('WebMCP 읽기 작업도 성공과 차단을 고정 문구 영수증으로 남긴다', async () => {
  const harness = createHarness();
  const blocked = await harness.tool('get_case_summary').execute({});
  assert.equal(blocked.isError, true);

  let state = updateOfferText(harness.getState(), '회사명은 추후 안내합니다.');
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);

  const summary = await harness.tool('get_case_summary').execute({});
  const resources = await harness.tool('get_official_resources').execute({});
  assert.equal(summary.isError, undefined);
  assert.equal(resources.isError, undefined);
  assert.deepEqual(harness.getReceipts().map((receipt) => ({
    toolName: receipt.toolName,
    toolClass: receipt.toolClass,
    outcome: receipt.outcome,
  })), [
    { toolName: 'get_official_resources', toolClass: 'read', outcome: 'success' },
    { toolName: 'get_case_summary', toolClass: 'read', outcome: 'success' },
    { toolName: 'get_case_summary', toolClass: 'read', outcome: 'blocked' },
  ]);
});

test('WebMCP 변경 작업도 성공과 차단 결과를 mutation 영수증으로 구분한다', async () => {
  const harness = createHarness();
  let state = updateOfferText(harness.getState(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  state = { ...state, agentChangesAllowed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);

  const succeeded = await harness.tool('build_verification_plan').execute({
    caseId: state.caseId,
    expectedVersion: state.caseVersion,
  });
  assert.equal(succeeded.isError, undefined);

  const blocked = await harness.tool('build_verification_plan').execute({
    caseId: state.caseId,
    expectedVersion: state.caseVersion,
  });
  assert.equal(blocked.isError, true);

  assert.deepEqual(harness.getReceipts().map((receipt) => ({
    toolName: receipt.toolName,
    toolClass: receipt.toolClass,
    outcome: receipt.outcome,
  })), [
    { toolName: 'build_verification_plan', toolClass: 'mutation', outcome: 'blocked' },
    { toolName: 'build_verification_plan', toolClass: 'mutation', outcome: 'success' },
  ]);
});

test('작업 영수증에는 원문, 인수, 근거, 비밀값 또는 개인정보를 넣지 않는다', async () => {
  const harness = createHarness();
  let state = updateOfferText(
    harness.getState(),
    '비밀번호 hunter2와 OTP 654321을 test@example.com으로 보내고 계좌번호 1234-5678-9012-3456을 제출하세요.',
  );
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);

  await harness.tool('inspect_offer_signals').execute({});
  state = harness.getState();
  await harness.tool('update_verification_step').execute({
    caseId: state.caseId,
    expectedVersion: state.caseVersion,
    stepId: 'hunter2',
    status: 'done',
    rawArguments: '654321',
  });

  const receipts = harness.getReceipts();
  const serialized = JSON.stringify(receipts);
  for (const secret of ['hunter2', '654321', 'test@example.com', '1234-5678-9012-3456']) {
    assert.equal(serialized.includes(secret), false);
  }
  for (const forbiddenKey of ['originalText', 'maskedText', 'observedText', 'arguments', 'evidence']) {
    assert.equal(serialized.includes(forbiddenKey), false);
  }
  for (const receipt of receipts) {
    assert.deepEqual(Object.keys(receipt).sort(), [
      'caseId',
      'caseVersion',
      'createdAt',
      'message',
      'outcome',
      'receiptId',
      'toolClass',
      'toolName',
    ]);
  }
});

test('영수증 조회 도구는 읽기 전용이며 조회 자체를 새 영수증으로 기록하지 않는다', async () => {
  const harness = createHarness();
  await harness.tool('inspect_offer_signals').execute({});
  const before = harness.getReceipts();

  const tool = harness.tool('get_action_receipts');
  const result = await tool.execute({});
  const returned = (result.structuredContent as { receipts: ActionReceipt[] }).receipts;

  assert.equal(tool.annotations?.readOnlyHint, true);
  assert.deepEqual(returned, before);
  if (returned[0]) returned[0].message = '외부에서 바꾼 값';
  assert.deepEqual(harness.getReceipts(), before);
  assert.equal(harness.getReceipts()[0]?.message.includes('외부에서 바꾼 값'), false);
});
