import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
import {
  createOfferProofTools,
  OFFERPROOF_TOOL_COUNT,
  OFFERPROOF_TOOL_NAMES,
  type OfferProofToolApi,
} from '../src/webmcp/useOfferProofTools.ts';

function createHarness(overrides: { inspect?: () => OfferCase; showCase?: () => void } = {}) {
  let state = createOfferCase();
  let receipts: ActionReceipt[] = [];
  const api: OfferProofToolApi = {
    getState: () => state,
    inspect: () => {
      if (overrides.inspect) return overrides.inspect();
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
    showCase: overrides.showCase,
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
  assert.equal(harness.tool('get_case_summary').annotations?.readOnlyHint, false);
  assert.equal(harness.tool('inspect_offer_signals').annotations?.readOnlyHint, false);
  assert.equal(harness.tool('get_official_resources').annotations?.readOnlyHint, false);
  assert.equal(harness.tool('build_verification_plan').annotations?.readOnlyHint, false);
  assert.equal(harness.tool('update_verification_step').annotations?.readOnlyHint, false);
  assert.equal(harness.tool('build_verification_plan').annotations?.untrustedContentHint, true);
  assert.equal(harness.tool('update_verification_step').annotations?.untrustedContentHint, true);
  assert.equal(harness.tool('get_action_receipts').annotations?.readOnlyHint, true);
});

test('공개 도구 목록, 제목, 엄격한 입력 스키마가 화면 계약과 일치한다', () => {
  const harness = createHarness();

  assert.equal(OFFERPROOF_TOOL_COUNT, 6);
  assert.deepEqual(harness.tools.map((tool) => tool.name), [...OFFERPROOF_TOOL_NAMES]);
  assert.equal(new Set(harness.tools.map((tool) => tool.name)).size, OFFERPROOF_TOOL_COUNT);
  for (const tool of harness.tools) {
    assert.equal(typeof tool.title, 'string');
    assert.ok((tool.title ?? '').length > 0);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
});

test('WebMCP 실패는 원문 없이 안정적인 오류 코드를 반환한다', async () => {
  const harness = createHarness();
  harness.setState(updateOfferText(harness.getState(), '교육비를 먼저 입금하세요. secret@example.com'));

  const result = await harness.tool('inspect_offer_signals').execute({});
  const serialized = JSON.stringify(result);
  const error = (result.structuredContent as { error: { code: string } }).error;

  assert.equal(result.isError, true);
  assert.equal(error.code, 'CONFIRMATION_REQUIRED');
  assert.equal(serialized.includes('secret@example.com'), false);
});

test('알 수 없는 내부 오류 메시지는 도구 결과에 노출하지 않는다', async () => {
  const harness = createHarness({
    inspect: () => { throw new Error('internal secret value: hunter2'); },
  });
  let state = updateOfferText(harness.getState(), '교육비를 먼저 입금하세요.');
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);

  const result = await harness.tool('inspect_offer_signals').execute({});
  const serialized = JSON.stringify(result);

  assert.equal(result.isError, true);
  assert.equal(serialized.includes('hunter2'), false);
  assert.equal(serialized.includes('TOOL_EXECUTION_FAILED'), true);
});

test('성공 결과는 화면 변화 위치와 다음 작업을 구조화해 반환한다', async () => {
  const harness = createHarness();
  let state = updateOfferText(harness.getState(), '교육비를 먼저 입금하세요.');
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);

  const inspected = await harness.tool('inspect_offer_signals').execute({});
  const structured = inspected.structuredContent as {
    uiEffect: { kind: string; visibleAt: string };
    nextActions: string[];
    requiredHumanAction: string | null;
  };

  assert.equal(structured.uiEffect.kind, 'signals-replaced');
  assert.equal(structured.uiEffect.visibleAt, '#result-heading');
  assert.equal(structured.nextActions.includes('get_official_resources'), true);
  assert.equal(structured.nextActions.includes('build_verification_plan'), false);
  assert.equal(structured.requiredHumanAction, 'enable_agent_changes_in_ui');
});

test('WebMCP 성공 호출은 사용자가 결과를 볼 수 있도록 사례 화면을 요청한다', async () => {
  let showCaseCount = 0;
  const harness = createHarness({ showCase: () => { showCaseCount += 1; } });
  let state = updateOfferText(harness.getState(), '교육비를 먼저 입금하세요.');
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);

  await harness.tool('inspect_offer_signals').execute({});
  await harness.tool('get_official_resources').execute({});

  assert.equal(showCaseCount, 2);
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

test('영수증 조회 도구는 읽기 전용이며 조회 자체를 기록하거나 화면 전환하지 않는다', async () => {
  let showCaseCount = 0;
  const harness = createHarness({ showCase: () => { showCaseCount += 1; } });
  await harness.tool('inspect_offer_signals').execute({});
  const before = harness.getReceipts();

  const tool = harness.tool('get_action_receipts');
  const result = await tool.execute({});
  const returned = (result.structuredContent as {
    receipts: Array<{ toolName: string; outcome: string }>;
  }).receipts;

  assert.equal(tool.annotations?.readOnlyHint, true);
  assert.equal(returned.length, before.length);
  assert.equal(returned[0]?.toolName, before[0]?.toolName);
  if (returned[0]) returned[0].toolName = '외부에서 바꾼 값';
  assert.deepEqual(harness.getReceipts(), before);
  assert.equal(harness.getReceipts()[0]?.toolName.includes('외부에서 바꾼 값'), false);
  assert.equal(showCaseCount, 0);
});

test('숨긴 파일 입력은 접근성 트리와 탭 순서에서 제외하고 표시 버튼으로 동작한다', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const fileInput = appSource.match(/<input\s+ref=\{fileInputRef\}[\s\S]*?\/>/)?.[0] ?? '';

  assert.match(fileInput, /tabIndex=\{-1\}/);
  assert.match(fileInput, /aria-hidden="true"/);
  assert.doesNotMatch(fileInput, /aria-label=/);
  assert.match(appSource, /onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}/);
});

test('SPA 화면 전환은 새 제목에 포커스하고 감소된 모션에서는 즉시 스크롤한다', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /querySelector<HTMLElement>\('h1'\)\?\.focus\(\{ preventScroll: true \}\)/);
  assert.equal([...appSource.matchAll(/<h1[^>]*tabIndex=\{-1\}/g)].length, 3);
  assert.match(appSource, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  assert.match(appSource, /behavior: prefersReducedMotion \? 'auto' : 'smooth'/);
});

test('영수증 조회는 개수와 결과·작업 분류 필터를 검증한다', async () => {
  const harness = createHarness();
  await harness.tool('inspect_offer_signals').execute({});
  let state = updateOfferText(harness.getState(), '교육비를 먼저 입금하세요.');
  state = { ...state, privacyConfirmed: true, caseVersion: state.caseVersion + 1 };
  harness.setState(state);
  await harness.tool('inspect_offer_signals').execute({});
  await harness.tool('get_case_summary').execute({});

  const filtered = await harness.tool('get_action_receipts').execute({
    limit: 1,
    outcome: 'success',
    toolClass: 'analysis',
  });
  const structured = filtered.structuredContent as {
    returnedReceiptCount: number;
    receipts: Array<{ outcome: string; toolClass: string }>;
  };

  assert.equal(structured.returnedReceiptCount, 1);
  assert.deepEqual(structured.receipts.map((receipt) => [receipt.outcome, receipt.toolClass]), [['success', 'analysis']]);

  const invalid = await harness.tool('get_action_receipts').execute({ limit: 11 });
  assert.equal(invalid.isError, true);
  assert.equal((invalid.structuredContent as { error: { code: string } }).error.code, 'INVALID_INPUT');
});

test('대표 최대 신호 흐름의 각 WebMCP 결과는 1500자 예산 안에 머문다', async () => {
  const harness = createHarness();
  let state = updateOfferText(harness.getState(), [
    '교육비를 먼저 입금하고 비트코인으로 송금하세요.',
    '오늘 안에 바로 결정하고 카카오톡 오픈채팅으로만 연락하세요.',
    '비밀번호 hunter2를 제출하고 https://bit.ly/example-offer 를 확인하세요.',
    '회사명은 추후 안내하며 누구나 가능한 간단한 업무입니다.',
  ].join('\n'));
  state = {
    ...state,
    privacyConfirmed: true,
    agentChangesAllowed: true,
    caseVersion: state.caseVersion + 1,
  };
  harness.setState(state);

  const inspected = await harness.tool('inspect_offer_signals').execute({});
  const current = harness.getState();
  const summary = await harness.tool('get_case_summary').execute({});
  const plan = await harness.tool('build_verification_plan').execute({
    caseId: current.caseId,
    expectedVersion: current.caseVersion,
  });
  for (let index = 0; index < 8; index += 1) {
    await harness.tool('get_official_resources').execute({});
  }
  const receipts = await harness.tool('get_action_receipts').execute({ limit: 10 });

  for (const result of [inspected, summary, plan, receipts]) {
    const toolName = (result.structuredContent as { tool?: string })?.tool ?? 'unknown';
    assert.ok(JSON.stringify(result).length <= 1500, `${toolName} 결과가 1500자를 초과했습니다: ${JSON.stringify(result).length}`);
  }
});
