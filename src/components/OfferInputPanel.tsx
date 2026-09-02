import { useId, useState } from 'react';
import { MASK_KIND_LABELS } from '../domain/masking/mask';
import type { CaseState, MaskKind } from '../domain/types';
import { versionLabel } from '../domain/ids';
import { INPUT_MAX_LENGTH } from '../services/schemas';
import type { OfferProofService } from '../services/offerProofService';
import { isAnalysisStale } from '../services/offerProofService';

interface Props {
  service: OfferProofService;
  state: CaseState;
}

export function OfferInputPanel({ service, state }: Props) {
  const textId = useId();
  const hintId = useId();
  const countId = useId();
  const privacyHeadingId = useId();
  const [showMasked, setShowMasked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const text = state.input?.rawText ?? '';
  const findings = state.input?.maskFindings ?? [];
  const privacyConfirmed = state.input?.privacyConfirmed ?? false;
  const stale = isAnalysisStale(state);

  const findingSummary = summarizeFindings(findings.map((f) => f.kind));

  const analyze = () => {
    setError(null);
    setStatus(null);
    const result = service.inspectOfferSignals(
      {
        caseId: state.caseId,
        caseVersion: versionLabel(state.version),
        privacyConfirmed: true,
        replaceExisting: state.analysis !== null && !stale,
        analysisScope: 'full',
      },
      { source: 'manual' },
    );
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setStatus(
      result.changedIds.length === 0
        ? '같은 입력에 대한 기존 결과를 유지했습니다.'
        : `분석을 완료했습니다. 확인이 필요한 신호 ${result.data.signalIds.length}개를 표시합니다.`,
    );
  };

  return (
    <div className="stack">
      <h2 id="input-heading">① 구인 제안 원문 붙여넣기</h2>
      <p className="muted" id={hintId}>
        이메일, 메신저, PDF에서 복사한 텍스트를 붙여넣으세요. 분석 전에 개인정보를 확인할 수 있습니다. 내용은 이 브라우저 탭 안에서만
        처리되며 서버로 전송되거나 저장되지 않습니다. 새로고침하면 사라집니다.
      </p>
      <label className="label" htmlFor={textId}>
        구인 제안 원문
      </label>
      <textarea
        id={textId}
        className="offer-textarea"
        rows={12}
        maxLength={INPUT_MAX_LENGTH}
        value={text}
        placeholder="예: 직무, 급여, 근무지, 시작일, 담당자 안내…"
        aria-describedby={`${hintId} ${countId}`}
        onChange={(e) => {
          service.setInputText(e.target.value);
          setError(null);
          setStatus(null);
        }}
      />
      <p className="muted small" id={countId}>
        현재 {text.length.toLocaleString('ko-KR')}자 / 최대 {INPUT_MAX_LENGTH.toLocaleString('ko-KR')}자. 분석에 필요한 정보가 부족할 수
        있습니다. 짧은 입력도 분석할 수 있습니다.
      </p>

      <section className="notice warning" aria-labelledby={privacyHeadingId}>
        <h3 id={privacyHeadingId}>⚠ 개인정보를 먼저 확인하세요</h3>
        <p>
          이름, 전화번호, 이메일, 주소, 계좌번호, 주민등록번호·여권번호, 서명, 내부 직원 ID 등은 가능한 한 삭제하거나{' '}
          <code>홍길동</code>, <code>example@example.com</code>, <code>010-****-1234</code>처럼 가린 뒤 검토하세요. 실제 개인정보를
          입력하지 않아도 제안의 신호를 검토할 수 있습니다.
        </p>
        <p className="small">
          자동 감지된 값은 <strong>표시용 사본</strong>에서만 가려지며 원문은 바뀌지 않습니다. 분석 결과와 에이전트 도구 응답에는 가려진
          값만 포함됩니다.
        </p>
        {state.input && (
          <p className="small" aria-live="polite">
            {findings.length === 0
              ? '자동 감지된 민감정보 후보가 없습니다. 감지되지 않은 개인정보가 있을 수 있으니 직접 확인하세요.'
              : `자동 감지된 민감정보 후보 ${findings.length}개: ${findingSummary} — 표시용 사본에서 가려집니다.`}
          </p>
        )}
        <div className="button-row">
          <button
            type="button"
            className="button secondary"
            aria-pressed={showMasked}
            onClick={() => setShowMasked((v) => !v)}
            disabled={!state.input}
          >
            {showMasked ? '마스킹 미리보기 닫기' : '표시용 마스킹 미리보기'}
          </button>
        </div>
        {showMasked && state.input && (
          <div className="masked-preview" role="region" aria-label="표시용 마스킹 미리보기">
            <p className="small muted">마스킹된 표시용 사본입니다. 원문은 위 입력창에 그대로 있습니다.</p>
            <pre className="masked-text">{state.input.maskedText}</pre>
          </div>
        )}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={privacyConfirmed}
            disabled={!state.input}
            onChange={(e) => {
              service.setPrivacyConfirmed(e.target.checked);
              setError(null);
            }}
          />
          <span>개인정보를 제거하거나 가렸음을 확인했고, 이 브라우저 세션에서만 결과를 표시하는 데 동의합니다.</span>
        </label>
      </section>

      {stale && (
        <p className="notice info" role="status">
          원문이 마지막 분석 이후 변경되었습니다. 다시 분석하면 현재 결과가 새 결과로 교체됩니다. 체크리스트는 유지됩니다.
        </p>
      )}

      <div className="button-row">
        <button type="button" className="button primary" onClick={analyze} disabled={!state.input}>
          {state.analysis ? '다시 분석' : '분석 시작'}
        </button>
        {!confirmClear ? (
          <button type="button" className="button secondary" onClick={() => setConfirmClear(true)} disabled={!state.input}>
            입력 지우기
          </button>
        ) : (
          <span className="inline-confirm" role="group" aria-label="입력 지우기 확인">
            <span>입력을 지울까요? 되돌리기로 복구할 수 있습니다.</span>
            <button
              type="button"
              className="button danger"
              onClick={() => {
                service.clearInput();
                setConfirmClear(false);
                setShowMasked(false);
                setStatus('입력을 지웠습니다. 하단의 되돌리기로 복구할 수 있습니다.');
              }}
            >
              지우기
            </button>
            <button type="button" className="button secondary" onClick={() => setConfirmClear(false)}>
              취소
            </button>
          </span>
        )}
        {!confirmReset ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => setConfirmReset(true)}
            disabled={state.status === 'empty' && !state.input && !state.analysis && !state.plan}
          >
            새 검토 시작(초기화)
          </button>
        ) : (
          <span className="inline-confirm" role="group" aria-label="초기화 확인">
            <span>입력·결과·체크리스트를 모두 지웁니다. 되돌리기로 복구할 수 있습니다.</span>
            <button
              type="button"
              className="button danger"
              onClick={() => {
                service.resetCase();
                setConfirmReset(false);
                setShowMasked(false);
                setStatus('초기화했습니다. 하단의 되돌리기로 복구할 수 있습니다.');
              }}
            >
              초기화
            </button>
            <button type="button" className="button secondary" onClick={() => setConfirmReset(false)}>
              취소
            </button>
          </span>
        )}
      </div>
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
    </div>
  );
}

function summarizeFindings(kinds: MaskKind[]): string {
  const counts = new Map<MaskKind, number>();
  for (const k of kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
  return [...counts.entries()].map(([k, n]) => `${MASK_KIND_LABELS[k]} ${n}`).join(', ');
}
