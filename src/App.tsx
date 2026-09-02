import { useMemo, useRef, useState } from 'react';
import {
  buildVerificationPlan,
  createOfferCase,
  inspectCase,
  restorePreviousCase,
  updateOfferText,
  updateVerificationStep,
} from './domain/caseState';
import {
  clearActionReceipts,
  MAX_ACTION_RECEIPTS,
  prependActionReceipt,
  type ActionReceipt,
} from './domain/actionReceipts';
import type { OfferCase, OfficialResource, SignalId, VerificationStatus } from './domain/types';
import { useOfferProofTools, type OfferProofToolApi } from './webmcp/useOfferProofTools';

const SAMPLE_OFFER = `회사명은 추후 안내합니다.
누구나 가능한 간단한 재택 업무이며 오늘 안에 바로 결정해 주세요.
업무 시작 전 교육비 5만원을 먼저 입금해야 합니다.
연락은 카카오톡 오픈채팅으로만 받습니다: https://bit.ly/example-offer`;

const OFFICIAL_RESOURCES: OfficialResource[] = [
  {
    resourceId: 'KR-MOEL-JOB-SCAM-NOTICE',
    agency: '대한민국 고용노동부',
    title: '구직자 취업사기 주의 안내문',
    jurisdiction: 'KR',
    url: 'https://www.moel.go.kr/local/busanbukbu/news/notice/noticeView.do?bbs_seq=20251200882',
    lastVerified: '2026-09-03',
    supports: ['UPFRONT_PAYMENT', 'MISSING_EMPLOYER_DETAILS', 'VAGUE_ROLE_OR_TERMS'],
  },
  {
    resourceId: 'KR-POLICE-ECRM',
    agency: '대한민국 경찰청',
    title: '사이버범죄 신고시스템 안내',
    jurisdiction: 'KR',
    url: 'https://ecrm.police.go.kr/minwon/main',
    lastVerified: '2026-09-03',
    supports: ['UNVERIFIED_OR_SHORTENED_LINK', 'UPFRONT_PAYMENT'],
  },
];

const RECEIPT_TIME_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function App() {
  const [offerCase, setOfferCase] = useState<OfferCase>(() => createOfferCase());
  const [actionReceipts, setActionReceipts] = useState<ActionReceipt[]>(() => clearActionReceipts());
  const [notice, setNotice] = useState('제안 원문을 붙여넣고 개인정보를 확인해 주세요.');
  const [previousCase, setPreviousCase] = useState<OfferCase | null>(null);
  const caseRef = useRef(offerCase);
  const receiptsRef = useRef(actionReceipts);

  const commit = (change: (current: OfferCase) => OfferCase) => {
    const next = change(caseRef.current);
    caseRef.current = next;
    setOfferCase(next);
    return next;
  };

  const recordReceipt = (receipt: ActionReceipt) => {
    const next = prependActionReceipt(receiptsRef.current, receipt);
    receiptsRef.current = next;
    setActionReceipts(next);
  };

  const toolApi = useMemo<OfferProofToolApi>(() => ({
    getState: () => caseRef.current,
    inspect: () => {
      const next = commit(inspectCase);
      setNotice(`확인이 필요한 신호 ${next.signals.length}개를 찾았습니다.`);
      return next;
    },
    buildPlan: (caseId: string, expectedVersion: number, signalIds?: SignalId[]) => {
      const before = caseRef.current;
      const next = commit((current) => buildVerificationPlan(current, expectedVersion, caseId, signalIds));
      setPreviousCase(before);
      setNotice(`확인 체크리스트 ${next.verificationSteps.length}개를 만들었습니다.`);
      return next;
    },
    updateStep: (caseId: string, stepId: string, status: VerificationStatus, expectedVersion: number) => {
      const before = caseRef.current;
      const next = commit((current) => updateVerificationStep(current, stepId, status, expectedVersion, caseId));
      setPreviousCase(before);
      setNotice('확인 항목 상태를 변경했습니다.');
      return next;
    },
    getResources: () => OFFICIAL_RESOURCES,
    getReceipts: () => receiptsRef.current,
    recordReceipt,
  }), []);

  const webMcpStatus = useOfferProofTools(toolApi);
  const currentSteps = offerCase.verificationSteps.filter((step) => step.isCurrent);
  const completedSteps = currentSteps.filter((step) => step.status === 'done').length;
  const hasArchivedSteps = offerCase.verificationSteps.some((step) => !step.isCurrent);

  const handleInspect = () => {
    try {
      setPreviousCase(null);
      toolApi.inspect();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '검사를 완료하지 못했습니다.');
    }
  };

  const handleBuildPlan = () => {
    try {
      toolApi.buildPlan(offerCase.caseId, offerCase.caseVersion);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '체크리스트를 만들지 못했습니다.');
    }
  };

  const handleStepChange = (stepId: string, checked: boolean) => {
    try {
      toolApi.updateStep(offerCase.caseId, stepId, checked ? 'done' : 'todo', offerCase.caseVersion);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '상태를 변경하지 못했습니다.');
    }
  };

  const handleUndo = () => {
    if (!previousCase) return;
    try {
      const restored = restorePreviousCase(caseRef.current, previousCase);
      caseRef.current = restored;
      setOfferCase(restored);
      setPreviousCase(null);
      setNotice('직전 변경을 새 버전으로 되돌렸습니다.');
    } catch (error) {
      setPreviousCase(null);
      setNotice(error instanceof Error ? error.message : '되돌리지 못했습니다.');
    }
  };

  const reset = () => {
    const fresh = createOfferCase();
    const noReceipts = clearActionReceipts();
    caseRef.current = fresh;
    receiptsRef.current = noReceipts;
    setOfferCase(fresh);
    setActionReceipts(noReceipts);
    setPreviousCase(null);
    setNotice('새 검토를 시작했습니다.');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main">OfferProof</a>
        <div className="topbar-actions">
          <span className={`status-pill status-${webMcpStatus}`}>
            <span aria-hidden="true">●</span>{' '}
            {webMcpStatus === 'registered' && 'WebMCP 도구 6개 연결됨'}
            {webMcpStatus === 'checking' && 'WebMCP 확인 중'}
            {webMcpStatus === 'unsupported' && '수동 모드'}
            {webMcpStatus === 'error' && 'WebMCP 연결 오류'}
          </span>
          <button className="ghost-button" type="button" onClick={reset}>새 검토</button>
        </div>
      </header>

      <main id="main" className="workspace">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">채용 제안 확인 보드</p>
          <h1 id="page-title">결론 대신, 확인할 근거를 찾습니다.</h1>
          <p>붙여넣은 문구를 이 브라우저에서만 고정 규칙으로 살펴봅니다. OfferProof는 사기 또는 안전 여부를 판정하지 않습니다.</p>
        </section>

        {webMcpStatus !== 'registered' && (
          <div className="fallback-banner" role="status">
            <strong>수동 모드 사용 가능</strong>
            <span>WebMCP를 찾지 못해도 아래 버튼으로 같은 기능을 사용할 수 있습니다.</span>
          </div>
        )}

        <div className="workspace-grid">
          <section className="panel input-panel" aria-labelledby="input-heading">
            <div className="panel-heading">
              <div><p className="step-label">STEP 1</p><h2 id="input-heading">제안 원문 붙여넣기</h2></div>
              <button className="text-button" type="button" onClick={() => {
                setPreviousCase(null);
                commit((current) => updateOfferText(current, SAMPLE_OFFER));
              }}>
                안전한 예시 불러오기
              </button>
            </div>

            <label htmlFor="offer-text">받은 이메일이나 메시지의 텍스트</label>
            <textarea
              id="offer-text"
              value={offerCase.originalText}
              onChange={(event) => {
                setPreviousCase(null);
                commit((current) => updateOfferText(current, event.target.value));
              }}
              placeholder="실제 개인정보를 지운 뒤 제안 내용을 붙여넣으세요."
              rows={12}
            />
            <div className="field-meta"><span>{offerCase.originalText.length.toLocaleString('ko-KR')}자</span><span>서버 전송 없음 · 현재 탭 메모리</span></div>

            <div className="privacy-card">
              <strong>개인정보를 먼저 확인하세요</strong>
              <p>이름, 전화번호, 이메일, 주소, 계좌·식별·인증번호는 지우거나 가린 뒤 진행하세요.</p>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={offerCase.privacyConfirmed}
                  onChange={(event) => {
                    setPreviousCase(null);
                    commit((current) => ({
                      ...current,
                      privacyConfirmed: event.target.checked,
                      caseVersion: current.caseVersion + 1,
                      updatedAt: new Date().toISOString(),
                    }));
                  }}
                />
                입력 내용을 확인했고 표시용 마스킹에 동의합니다.
              </label>
            </div>

            <button className="primary-button" type="button" disabled={!offerCase.originalText.trim()} onClick={handleInspect}>
              확인 신호 살펴보기
            </button>

            {offerCase.maskedText && offerCase.maskedText !== offerCase.originalText && (
              <details className="masked-preview"><summary>마스킹된 표시용 원문 미리보기</summary><pre>{offerCase.maskedText}</pre></details>
            )}
          </section>

          <section className="panel result-panel" aria-labelledby="result-heading">
            <div className="panel-heading result-heading">
              <div><p className="step-label">STEP 2</p><h2 id="result-heading">확인 보드</h2></div>
              <span className="version-badge">사례 v{offerCase.caseVersion}</span>
            </div>
            <p className="live-notice" aria-live="polite">{notice}</p>

            {offerCase.signals.length === 0 ? (
              <div className="empty-state"><span aria-hidden="true">⌁</span><h3>아직 생성된 신호가 없습니다</h3><p>신호가 없더라도 안전하다는 뜻은 아닙니다.</p></div>
            ) : (
              <>
                <div className="summary-strip">
                  <div><strong>{offerCase.signals.length}</strong><span>확인 신호</span></div>
                  <div><strong>{completedSteps}/{currentSteps.length}</strong><span>현재 확인 완료</span></div>
                  <div><strong>0</strong><span>자동 외부 실행</span></div>
                </div>
                <div className="signal-list" aria-label="확인이 필요한 신호">
                  {offerCase.signals.map((signal) => (
                    <article className="signal-card" key={signal.signalId}>
                      <div className="signal-title-row"><span className="observation-badge">관찰 사실</span><code>{signal.signalId}</code></div>
                      <h3>{signal.title}</h3>
                      <blockquote>{signal.observedText}</blockquote>
                      <dl>
                        <div><dt>관찰</dt><dd>{signal.observation}</dd></div>
                        <div><dt>제한된 추론</dt><dd>{signal.inference}</dd></div>
                        <div><dt>한계</dt><dd>{signal.limitations}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
                <div className="plan-actions">
                  <button className="secondary-button" type="button" onClick={handleBuildPlan}>확인 체크리스트 만들기</button>
                  <label className="agent-consent">
                    <input
                      type="checkbox"
                      checked={offerCase.agentChangesAllowed}
                      onChange={(event) => {
                        setPreviousCase(null);
                        commit((current) => ({
                          ...current,
                          agentChangesAllowed: event.target.checked,
                          caseVersion: current.caseVersion + 1,
                          updatedAt: new Date().toISOString(),
                        }));
                      }}
                    />
                    에이전트의 체크리스트 변경 허용
                  </label>
                </div>
              </>
            )}

            {offerCase.verificationSteps.length > 0 && (
              <section className="checklist" aria-labelledby="checklist-heading">
                <div className="subheading-row"><div><p className="step-label">STEP 3</p><h3 id="checklist-heading">직접 확인할 체크리스트</h3></div>{previousCase && <button className="text-button" type="button" onClick={handleUndo}>되돌리기</button>}</div>
                {offerCase.analysisStale && <p className="stale-notice">원문이 바뀌어 이전 체크리스트를 보존했습니다. 신호를 다시 살펴본 뒤 계속하세요.</p>}
                {!offerCase.analysisStale && hasArchivedSteps && <p className="stale-notice">현재 원문에서 근거가 다시 확인되지 않은 이전 항목은 보관 상태로 잠겼습니다.</p>}
                {offerCase.verificationSteps.map((step) => (
                  <label className={`verification-row ${step.status === 'done' ? 'is-done' : ''} ${!step.isCurrent ? 'is-stale' : ''}`} key={step.stepId}>
                    <input type="checkbox" disabled={offerCase.analysisStale || !step.isCurrent} checked={step.status === 'done'} onChange={(event) => handleStepChange(step.stepId, event.target.checked)} />
                    <span>{step.label}{!step.isCurrent && <small>이전 분석 항목</small>}</span>
                  </label>
                ))}
              </section>
            )}

            <section className="action-receipts" aria-labelledby="receipts-heading">
              <div className="subheading-row">
                <div>
                  <p className="step-label">STEP 4</p>
                  <h3 id="receipts-heading">WebMCP 작업 영수증</h3>
                </div>
                <span className="receipt-count">최근 {actionReceipts.length}/{MAX_ACTION_RECEIPTS}</span>
              </div>
              <p>에이전트가 실행한 분석·변경의 결과만 남깁니다. 원문, 도구 인수, 근거, 개인정보는 저장하지 않습니다.</p>
              {actionReceipts.length === 0 ? (
                <p className="receipt-empty">아직 WebMCP 작업 영수증이 없습니다.</p>
              ) : (
                <ol className="receipt-list" aria-live="polite">
                  {actionReceipts.map((receipt) => (
                    <li className={`receipt-row receipt-${receipt.outcome}`} key={receipt.receiptId}>
                      <div className="receipt-title-row">
                        <strong>{receipt.outcome === 'success' ? '적용됨' : '차단됨'}</strong>
                        <time dateTime={receipt.createdAt}>{RECEIPT_TIME_FORMAT.format(new Date(receipt.createdAt))}</time>
                      </div>
                      <code>{receipt.toolName}</code>
                      <p>{receipt.message}</p>
                      <small>{receipt.toolClass === 'read' ? '읽기' : receipt.toolClass === 'analysis' ? '분석' : '변경'} · {receipt.caseId} · v{receipt.caseVersion}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="resources" aria-labelledby="resources-heading">
              <p className="step-label">STEP 5</p><h3 id="resources-heading">공식 자료에서 직접 확인</h3>
              <p>자동 신고나 판정을 하지 않습니다. 적용 범위와 최신 내용을 직접 확인하세요.</p>
              <div className="resource-list">
                {OFFICIAL_RESOURCES.map((resource) => (
                  <a href={resource.url} target="_blank" rel="noreferrer" key={resource.resourceId}>
                    <span>{resource.agency}</span><strong>{resource.title} ↗</strong><small>링크 확인일 {resource.lastVerified}</small>
                  </a>
                ))}
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
