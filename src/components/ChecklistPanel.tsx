import { useState } from 'react';
import { versionLabel } from '../domain/ids';
import type { CaseState, SignalId, VerificationStep } from '../domain/types';
import type { OfferProofService } from '../services/offerProofService';

interface Props {
  service: OfferProofService;
  state: CaseState;
  selectedSignalIds: SignalId[];
}

const PRIORITY_LABELS: Record<VerificationStep['priority'], string> = {
  high: '우선순위 높음',
  medium: '우선순위 보통',
  low: '우선순위 낮음',
};

interface StepMemoInputProps {
  memoId: string;
  initialValue: string;
  onSave: (value: string) => void;
}

/**
 * Keyed by `${verificationStepId}:${step.memo}` in the parent, so whenever
 * the stored memo changes for a reason other than this input's own save
 * (undo, or a WebMCP `update_verification_step` call), React remounts this
 * component with the new value instead of showing a stale local draft.
 */
function StepMemoInput({ memoId, initialValue, onSave }: StepMemoInputProps) {
  const [draft, setDraft] = useState(initialValue);
  return (
    <>
      <input id={memoId} type="text" maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button
        type="button"
        className="button secondary small-button"
        onClick={() => onSave(draft)}
        disabled={draft === initialValue}
      >
        메모 저장
      </button>
    </>
  );
}

export function ChecklistPanel({ service, state, selectedSignalIds }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const plan = state.plan;
  const analysis = state.analysis;
  const currentSignalIds = new Set(analysis?.signals.map((s) => s.signalId) ?? []);
  const steps = plan?.steps ?? [];
  const done = steps.filter((s) => s.status === 'done').length;

  const buildPlan = () => {
    setError(null);
    setStatus(null);
    const result = service.buildVerificationPlan(
      {
        caseId: state.caseId,
        caseVersion: versionLabel(state.version),
        signalIds: selectedSignalIds,
        mode: plan ? 'replace' : 'create',
        confirmation: 'user_confirmed',
      },
      { source: 'manual' },
    );
    setConfirming(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setStatus(`확인 계획을 ${plan ? '교체' : '생성'}했습니다. 단계 ${result.data.steps.length}개.`);
  };

  const updateStep = (step: VerificationStep, nextStatus: VerificationStep['status'], memo?: string) => {
    if (!plan) return;
    setError(null);
    setStatus(null);
    const result = service.updateVerificationStep(
      {
        caseId: state.caseId,
        caseVersion: versionLabel(state.version),
        verificationPlanId: plan.verificationPlanId,
        verificationStepId: step.verificationStepId,
        status: nextStatus,
        ...(memo !== undefined ? { memo } : {}),
        confirmation: 'user_confirmed',
      },
      { source: 'manual' },
    );
    if (!result.ok) {
      setError(
        result.error.code === 'CASE_VERSION_CONFLICT'
          ? `${result.error.message} (최신 버전 ${result.error.currentCaseVersion ?? '알 수 없음'} — 화면이 자동으로 최신 상태를 표시합니다.)`
          : result.error.message,
      );
      return;
    }
    if (result.changedFields.length === 0) setStatus('변경할 내용이 없어 상태를 유지했습니다.');
  };

  return (
    <section className="card checklist" aria-labelledby="checklist-heading">
      <h3 id="checklist-heading">확인 체크리스트</h3>
      <p className="small">아래 항목은 서비스의 판정이 아니라 사용자가 직접 확인할 질문입니다. 앱은 신고·결제·메시지 전송을 하지 않습니다.</p>

      {!confirming ? (
        <div className="button-row">
          <button type="button" className="button primary" onClick={() => setConfirming(true)} disabled={!analysis || selectedSignalIds.length === 0}>
            {plan ? '확인 계획 다시 만들기(교체)' : '확인 계획 만들기'}
          </button>
          {!analysis && <span className="small muted">먼저 분석을 실행하세요.</span>}
          {analysis && selectedSignalIds.length === 0 && <span className="small muted">신호 카드에서 포함할 항목을 선택하세요.</span>}
          {state.previousPlan && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                if (service.restorePreviousPlan()) setStatus('이전 계획을 복원했습니다.');
              }}
            >
              이전 계획 복원
            </button>
          )}
        </div>
      ) : (
        <div className="inline-confirm" role="group" aria-label="확인 계획 생성 확인">
          <span>
            선택한 신호 {selectedSignalIds.length}개로 확인 계획을 {plan ? '교체' : '생성'}합니다.
            {plan ? ' 기존 계획과 완료 상태는 "이전 계획 복원"으로 되돌릴 수 있습니다.' : ''}
          </span>
          <button type="button" className="button primary" onClick={buildPlan}>
            {plan ? '교체' : '만들기'}
          </button>
          <button type="button" className="button secondary" onClick={() => setConfirming(false)}>
            취소
          </button>
        </div>
      )}

      {plan && (
        <>
          <p className="progress" aria-live="polite">
            {done}/{steps.length} 확인 · 계획 ID <code>{plan.verificationPlanId}</code>
          </p>
          <ol className="steps">
            {steps.map((step) => {
              const stale = step.signalId !== null && !currentSignalIds.has(step.signalId);
              const checkboxId = `chk-${step.verificationStepId}`;
              const memoId = `memo-${step.verificationStepId}`;
              return (
                <li key={step.verificationStepId} className={`step ${step.status}`} data-step-id={step.verificationStepId}>
                  <div className="step-main">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={step.status === 'done'}
                      onChange={(e) => updateStep(step, e.target.checked ? 'done' : 'todo')}
                      aria-describedby={`${checkboxId}-q`}
                    />
                    <label htmlFor={checkboxId}>
                      <strong>{step.title}</strong>{' '}
                      <span className={`badge priority ${step.priority}`}>{PRIORITY_LABELS[step.priority]}</span>{' '}
                      <span className="small muted">{step.status === 'done' ? '사용자가 확인함' : '확인 전'}</span>
                      {stale && <span className="badge stale">근거 신호가 현재 결과에 없음</span>}
                    </label>
                  </div>
                  <p id={`${checkboxId}-q`} className="question">
                    {step.question}
                  </p>
                  <div className="memo-row">
                    <label htmlFor={memoId} className="small">
                      메모(선택, 개인정보 제외)
                    </label>
                    <StepMemoInput
                      key={`${step.verificationStepId}:${step.memo ?? ''}`}
                      memoId={memoId}
                      initialValue={step.memo ?? ''}
                      onSave={(value) => updateStep(step, step.status, value)}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="notice success" role="status">
          {status}
        </p>
      )}
    </section>
  );
}
