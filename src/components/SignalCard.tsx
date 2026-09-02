import { useId } from 'react';
import { findResource } from '../domain/resources/registry';
import type { Signal, SignalUserStatus } from '../domain/types';

interface Props {
  signal: Signal;
  index: number;
  selectedForPlan: boolean;
  onToggleSelect: (selected: boolean) => void;
  onUserStatusChange: (status: SignalUserStatus) => void;
}

const USER_STATUS_LABELS: Record<SignalUserStatus, string> = {
  unreviewed: '확인 전',
  reviewing: '확인 중',
  reviewed: '확인 완료',
  not_applicable: '해당 없음',
};

export function SignalCard({ signal, index, selectedForPlan, onToggleSelect, onUserStatusChange }: Props) {
  const headingId = useId();
  const statusId = useId();
  const hasEvidence = signal.evidence.length > 0;

  return (
    <article className="card signal-card" aria-labelledby={headingId} data-signal-id={signal.signalId}>
      <header className="card-header">
        <h4 id={headingId}>
          <span className="index">{index + 1}.</span> {signal.title}
        </h4>
        <span className="badge observation">❝ 관찰 사실 (Observation)</span>
        <code className="signal-id">{signal.signalId}</code>
      </header>

      <section className="block observation-block" aria-label="원문 근거">
        <h5>원문 근거</h5>
        {hasEvidence ? (
          signal.evidence.map((e, i) => (
            <figure className="evidence" key={`${e.start}-${e.end}-${i}`}>
              <blockquote>{e.text}</blockquote>
              <figcaption className="small muted">
                입력 {e.paragraph}번째 문단 · 문자 위치 {e.start + 1}–{e.end}
                {e.label ? ` · ${e.label}` : ''}
              </figcaption>
            </figure>
          ))
        ) : (
          <p className="small">
            <strong>근거 없음(부재 규칙):</strong> {signal.observation}
          </p>
        )}
        <p>{signal.observation}</p>
      </section>

      <section className="block guidance-block" aria-label="공식 안내">
        <h5>
          <span className="badge guidance">▤ 공식 안내 (Official guidance)</span>
        </h5>
        <ul className="plain-list">
          {signal.guidanceSourceIds.map((id) => {
            const r = findResource(id);
            if (!r) {
              return (
                <li key={id}>
                  <code>{id}</code> — 레지스트리에 없는 자료 ID (미검증)
                </li>
              );
            }
            return (
              <li key={id}>
                <span>
                  {r.agency} · {r.title}
                </span>{' '}
                {r.linkStatus === 'verified' && r.url ? (
                  <span className="small">
                    (검증일 {r.lastVerifiedAt}) — 링크는 아래 공식 자료 영역에서 직접 열 수 있습니다.
                  </span>
                ) : (
                  <span className="small unverified">링크 미검증 · 기관명을 직접 검색해 확인하세요.</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="small muted">공식 안내는 확인 방법을 설명할 뿐, 이 신호의 참·거짓을 결정하지 않습니다.</p>
      </section>

      <section className="block inference-block" aria-label="제한된 추론">
        <h5>
          <span className="badge inference">◌ 제한된 추론 (Limited inference)</span>
        </h5>
        <p>{signal.inference}</p>
        <p className="small">
          <strong>한계:</strong> {signal.limitations}
        </p>
      </section>

      <footer className="card-footer">
        <label className="select-label" htmlFor={statusId}>
          사용자 확인 상태
        </label>
        <select id={statusId} value={signal.userStatus} onChange={(e) => onUserStatusChange(e.target.value as SignalUserStatus)}>
          {(Object.keys(USER_STATUS_LABELS) as SignalUserStatus[]).map((s) => (
            <option key={s} value={s}>
              {USER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="checkbox inline">
          <input type="checkbox" checked={selectedForPlan} onChange={(e) => onToggleSelect(e.target.checked)} />
          <span>확인 계획에 포함</span>
        </label>
      </footer>
    </article>
  );
}
