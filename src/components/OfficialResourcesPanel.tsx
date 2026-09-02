import { useEffect, useState } from 'react';
import { JURISDICTION_LABELS, TOPIC_LABELS } from '../domain/resources/registry';
import {
  JURISDICTIONS,
  RESOURCE_TOPICS,
  type CaseState,
  type GetOfficialResourcesData,
  type Jurisdiction,
  type ResourceTopic,
} from '../domain/types';
import type { OfferProofService } from '../services/offerProofService';

interface Props {
  service: OfferProofService;
  state: CaseState;
}

export function OfficialResourcesPanel({ service, state }: Props) {
  const [topic, setTopic] = useState<ResourceTopic>('general_offer_review');
  const [data, setData] = useState<GetOfficialResourcesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jurisdiction = state.jurisdiction;

  useEffect(() => {
    const result = service.getOfficialResources({ caseId: state.caseId, jurisdiction, topic }, { source: 'manual' });
    if (result.ok) {
      setData(result.data);
      setError(null);
    } else {
      setData(null);
      setError(result.error.message);
    }
  }, [service, state.caseId, jurisdiction, topic]);

  return (
    <section className="card resources" aria-labelledby="resources-heading">
      <h3 id="resources-heading">공식 자료로 다시 확인하기</h3>
      <p className="small">
        공식 자료는 결론을 뒷받침하는 장식이 아니라 사용자가 직접 재확인하는 경로입니다. 링크는 사용자가 직접 열고 판단하며, 앱은 신고·제출을
        대행하지 않습니다. 지역·직종·계약 형태에 따라 적용 범위가 달라질 수 있습니다.
      </p>
      <div className="button-row">
        <label className="select-label" htmlFor="jurisdiction-select">
          관할 국가
        </label>
        <select id="jurisdiction-select" value={jurisdiction} onChange={(e) => service.setJurisdiction(e.target.value as Jurisdiction)}>
          {JURISDICTIONS.map((j) => (
            <option key={j} value={j}>
              {JURISDICTION_LABELS[j]}
            </option>
          ))}
        </select>
        <label className="select-label" htmlFor="topic-select">
          주제
        </label>
        <select id="topic-select" value={topic} onChange={(e) => setTopic(e.target.value as ResourceTopic)}>
          {RESOURCE_TOPICS.map((t) => (
            <option key={t} value={t}>
              {TOPIC_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <div className="stack" aria-live="polite">
          <p className="small muted">{data.notice}</p>
          <ul className="plain-list resource-list">
            {data.resources.map((r) => (
              <li key={r.resourceId} className="resource">
                <p>
                  <strong>{r.agency}</strong>
                  <br />
                  {r.linkStatus === 'verified' && r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.title} (외부 링크, 새 창)
                    </a>
                  ) : (
                    <span>
                      {r.title} — <span className="unverified">자료를 열 수 없음 · 링크 미검증</span>
                    </span>
                  )}
                </p>
                <p className="small muted">
                  주제: {TOPIC_LABELS[r.topic]} · 관할: {r.jurisdiction} · 링크 검증일: {r.lastVerifiedAt ?? '없음(미검증)'} ·{' '}
                  {r.isLegalAdvice ? '법률 자문 자료' : '법률 자문 아님'} · ID <code>{r.resourceId}</code>
                </p>
                <p className="small">{r.verificationNote}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
