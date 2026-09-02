import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVerificationPlan,
  createOfferCase,
  inspectCase,
  restorePreviousCase,
  updateOfferText,
  updateVerificationStep,
} from '../src/domain/caseState.ts';

test('검사 전 개인정보 확인 상태가 필요하다', () => {
  const state = updateOfferText(createOfferCase(), '교육비를 먼저 입금하세요.');
  assert.throws(() => inspectCase(state), /개인정보 확인/);
});

test('검사, 계획 생성, 단계 변경은 버전을 증가시키고 되돌릴 수 있다', () => {
  let state = updateOfferText(createOfferCase(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  state = buildVerificationPlan(state, state.caseVersion, state.caseId);
  const beforeUpdate = state;
  const firstStep = state.verificationSteps[0];
  assert.ok(firstStep);

  state = updateVerificationStep(state, firstStep.stepId, 'done', state.caseVersion, state.caseId);
  assert.equal(state.caseVersion, beforeUpdate.caseVersion + 1);
  assert.equal(state.verificationSteps[0]?.status, 'done');

  state = updateVerificationStep(state, firstStep.stepId, 'todo', state.caseVersion, state.caseId);
  assert.equal(state.verificationSteps[0]?.status, 'todo');
});

test('오래된 버전의 변경 요청을 거부한다', () => {
  let state = updateOfferText(createOfferCase(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  state = buildVerificationPlan(state, state.caseVersion, state.caseId);
  const firstStep = state.verificationSteps[0];
  assert.ok(firstStep);

  assert.throws(
    () => updateVerificationStep(state, firstStep.stepId, 'done', state.caseVersion - 1, state.caseId),
    /CASE_VERSION_CONFLICT/,
  );
});

test('원문 수정과 재검사는 기존 체크리스트를 조용히 삭제하지 않는다', () => {
  let state = updateOfferText(createOfferCase(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  state = buildVerificationPlan(state, state.caseVersion, state.caseId);
  const stepIds = state.verificationSteps.map((step) => step.stepId);

  state = updateOfferText(state, '교육비를 먼저 입금하세요. 오늘 안에 결정하세요.');
  assert.equal(state.analysisStale, true);
  assert.equal(state.signals.length, 0);
  assert.deepEqual(state.verificationSteps.map((step) => step.stepId), stepIds);
  assert.throws(
    () => buildVerificationPlan(state, state.caseVersion, state.caseId),
    /ANALYSIS_STALE/,
  );
  state = inspectCase({ ...state, privacyConfirmed: true });
  assert.deepEqual(state.verificationSteps.map((step) => step.stepId), stepIds);
});

test('신호 근거와 도구 상태에는 민감한 원문 값을 노출하지 않는다', () => {
  let state = updateOfferText(
    createOfferCase(),
    '계좌번호 1234-5678-9012-3456을 제출하고 교육비를 먼저 입금하세요.',
  );
  state = inspectCase({ ...state, privacyConfirmed: true });

  assert.equal(state.maskedText.includes('1234-5678-9012-3456'), false);
  assert.equal(state.signals.some((signal) => signal.observedText.includes('1234-5678-9012-3456')), false);
  assert.equal(state.maskedText.includes('[비밀값 가림]'), true);
});

test('새 검토 ID는 서로 다르고 이전 사례의 변경 요청을 거부한다', () => {
  const first = createOfferCase();
  const second = createOfferCase();
  assert.notEqual(first.caseId, second.caseId);

  let state = updateOfferText(second, '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  assert.throws(
    () => buildVerificationPlan(state, state.caseVersion, first.caseId),
    /CASE_ID_CONFLICT/,
  );
});

test('되돌리기는 사례 ID를 유지하며 버전을 항상 증가시킨다', () => {
  let state = updateOfferText(createOfferCase(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  const beforePlan = state;
  state = buildVerificationPlan(state, state.caseVersion, state.caseId);
  const versionBeforeUndo = state.caseVersion;

  state = restorePreviousCase(state, beforePlan);
  assert.equal(state.caseId, beforePlan.caseId);
  assert.equal(state.caseVersion, versionBeforeUndo + 1);
  assert.equal(state.verificationSteps.length, 0);
});

test('되돌리기는 사용자가 현재 철회한 동의를 다시 켜지 않는다', () => {
  const current = {
    ...createOfferCase(),
    caseVersion: 8,
    privacyConfirmed: false,
    agentChangesAllowed: false,
  };
  const previous = {
    ...current,
    caseVersion: 6,
    privacyConfirmed: true,
    agentChangesAllowed: true,
  };

  const restored = restorePreviousCase(current, previous);
  assert.equal(restored.caseVersion, 9);
  assert.equal(restored.privacyConfirmed, false);
  assert.equal(restored.agentChangesAllowed, false);
});

test('계획 재생성은 완료 상태를 지우지 않고 새 신호만 합친다', () => {
  let state = updateOfferText(createOfferCase(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  state = buildVerificationPlan(state, state.caseVersion, state.caseId);
  const firstStep = state.verificationSteps[0];
  assert.ok(firstStep);
  state = updateVerificationStep(state, firstStep.stepId, 'done', state.caseVersion, state.caseId);

  state = updateOfferText(state, '교육비를 먼저 입금하세요. 오늘 안에 결정하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  state = buildVerificationPlan(state, state.caseVersion, state.caseId);

  assert.equal(state.verificationSteps.find((step) => step.stepId === firstStep.stepId)?.status, 'done');
  assert.equal(state.verificationSteps.some((step) => step.signalId === 'URGENCY_PRESSURE'), true);
});

test('재분석에서 사라진 신호의 이전 단계는 보존하되 잠근다', () => {
  let state = updateOfferText(createOfferCase(), '교육비를 먼저 입금하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  state = buildVerificationPlan(state, state.caseVersion, state.caseId);
  const oldStep = state.verificationSteps[0];
  assert.ok(oldStep);

  state = updateOfferText(state, '오늘 안에 결정하세요.');
  state = inspectCase({ ...state, privacyConfirmed: true });
  const archived = state.verificationSteps.find((step) => step.stepId === oldStep.stepId);
  assert.equal(archived?.isCurrent, false);
  assert.throws(
    () => updateVerificationStep(state, oldStep.stepId, 'done', state.caseVersion, state.caseId),
    /STALE_STEP/,
  );

  state = buildVerificationPlan(state, state.caseVersion, state.caseId);
  assert.equal(state.verificationSteps.find((step) => step.stepId === oldStep.stepId)?.isCurrent, false);
  assert.equal(state.verificationSteps.some((step) => step.signalId === 'URGENCY_PRESSURE' && step.isCurrent), true);
});
