import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
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
import {
  LOCALE_TAG,
  RESOURCE_COPY_EN,
  SAMPLE_OFFERS,
  UI_COPY,
  localizeReceiptMessage,
  localizeSignal,
  localizeVerificationLabel,
  noticeText,
  sourceFileErrorText,
  type Locale,
  type NoticeKey,
} from './i18n';
import {
  readSourceFile,
  SOURCE_FILE_ACCEPT,
  SourceFileError,
  type ImportedSourceMeta,
  type SourceFileErrorCode,
} from './sourceIntake';
import {
  OFFERPROOF_TOOL_COUNT,
  OFFERPROOF_TOOL_NAMES,
  useOfferProofTools,
  type OfferProofToolApi,
} from './webmcp/useOfferProofTools';

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

interface NoticeState {
  key: NoticeKey;
  count?: number;
}

type AppView = 'overview' | 'review' | 'case';

type SourceImportState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'ready'; meta: ImportedSourceMeta }
  | { status: 'error'; code: SourceFileErrorCode };

function viewFromLocation(): AppView {
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'review' || view === 'case' ? view : 'overview';
}

function App() {
  const [locale, setLocale] = useState<Locale>('ko');
  const [activeView, setActiveView] = useState<AppView>(() => viewFromLocation());
  const [offerCase, setOfferCase] = useState<OfferCase>(() => createOfferCase());
  const [actionReceipts, setActionReceipts] = useState<ActionReceipt[]>(() => clearActionReceipts());
  const [notice, setNotice] = useState<NoticeState>({ key: 'initial' });
  const [sourceImport, setSourceImport] = useState<SourceImportState>({ status: 'idle' });
  const [isFileDragActive, setFileDragActive] = useState(false);
  const [previousCase, setPreviousCase] = useState<OfferCase | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const caseRef = useRef(offerCase);
  const receiptsRef = useRef(actionReceipts);
  const t = UI_COPY[locale];
  const receiptTimeFormat = useMemo(() => new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t.documentTitle;
  }, [locale, t.documentTitle]);

  useEffect(() => {
    const updateViewFromHistory = () => setActiveView(viewFromLocation());
    window.addEventListener('popstate', updateViewFromHistory);
    return () => window.removeEventListener('popstate', updateViewFromHistory);
  }, []);

  const navigateTo = (view: AppView, replace = false) => {
    const url = new URL(window.location.href);
    if (view === 'overview') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      setNotice({ key: 'signalsFound', count: next.signals.length });
      return next;
    },
    buildPlan: (caseId: string, expectedVersion: number, signalIds?: SignalId[]) => {
      const before = caseRef.current;
      const next = commit((current) => buildVerificationPlan(current, expectedVersion, caseId, signalIds));
      setPreviousCase(before);
      setNotice({ key: 'planBuilt', count: next.verificationSteps.filter((step) => step.isCurrent).length });
      return next;
    },
    updateStep: (caseId: string, stepId: string, status: VerificationStatus, expectedVersion: number) => {
      const before = caseRef.current;
      const next = commit((current) => updateVerificationStep(current, stepId, status, expectedVersion, caseId));
      setPreviousCase(before);
      setNotice({ key: 'stepUpdated' });
      return next;
    },
    getResources: () => OFFICIAL_RESOURCES,
    getReceipts: () => receiptsRef.current,
    recordReceipt,
    showCase: () => navigateTo('case', true),
  }), []);

  const { status: webMcpStatus, reconnect: reconnectWebMcp } = useOfferProofTools(toolApi);
  const currentSteps = offerCase.verificationSteps.filter((step) => step.isCurrent);
  const completedSteps = currentSteps.filter((step) => step.status === 'done').length;
  const hasArchivedSteps = offerCase.verificationSteps.some((step) => !step.isCurrent);
  const activeStage = !offerCase.originalText.trim()
    ? 0
    : offerCase.signals.length === 0
      ? 1
      : currentSteps.length === 0 || completedSteps < currentSteps.length
        ? 2
        : 3;

  const loadSample = () => {
    setPreviousCase(null);
    setSourceImport({ status: 'idle' });
    commit((current) => updateOfferText(current, SAMPLE_OFFERS[locale]));
    setNotice({ key: 'sampleLoaded' });
  };

  const loadSampleAndReview = () => {
    loadSample();
    navigateTo('review');
  };

  const handleSourceFile = async (file: File | undefined) => {
    if (!file) return;
    setSourceImport({ status: 'reading' });
    try {
      const imported = await readSourceFile(file);
      setPreviousCase(null);
      commit((current) => updateOfferText(current, imported.text));
      setSourceImport({ status: 'ready', meta: imported.meta });
      setNotice({ key: 'initial' });
    } catch (error) {
      setSourceImport({
        status: 'error',
        code: error instanceof SourceFileError ? error.code : 'read-failed',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setFileDragActive(false);
    void handleSourceFile(event.dataTransfer.files[0]);
  };

  const handleInspect = () => {
    try {
      setPreviousCase(null);
      toolApi.inspect();
      navigateTo('case');
    } catch {
      setNotice({ key: 'inspectFailed' });
    }
  };

  const handleBuildPlan = () => {
    try {
      toolApi.buildPlan(offerCase.caseId, offerCase.caseVersion);
    } catch {
      setNotice({ key: 'planFailed' });
    }
  };

  const handleStepChange = (stepId: string, checked: boolean) => {
    try {
      toolApi.updateStep(offerCase.caseId, stepId, checked ? 'done' : 'todo', offerCase.caseVersion);
    } catch {
      setNotice({ key: 'updateFailed' });
    }
  };

  const handleUndo = () => {
    if (!previousCase) return;
    try {
      const restored = restorePreviousCase(caseRef.current, previousCase);
      caseRef.current = restored;
      setOfferCase(restored);
      setPreviousCase(null);
      setNotice({ key: 'undoDone' });
    } catch {
      setPreviousCase(null);
      setNotice({ key: 'undoFailed' });
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
    setSourceImport({ status: 'idle' });
    setNotice({ key: 'resetDone' });
    navigateTo('review');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigateTo('overview')}>
          <span className="brand-mark" aria-hidden="true">OF</span>
          <span>Offroof</span>
        </button>
        <nav className="page-navigation" aria-label={t.pageNavLabel}>
          <button type="button" aria-current={activeView === 'overview' ? 'page' : undefined} onClick={() => navigateTo('overview')}>{t.navOverview}</button>
          <button type="button" aria-current={activeView === 'review' ? 'page' : undefined} onClick={() => navigateTo('review')}>{t.navReview}</button>
          <button type="button" aria-current={activeView === 'case' ? 'page' : undefined} onClick={() => navigateTo('case')}>
            {t.navCase}<span>{offerCase.signals.length}</span>
          </button>
        </nav>
        <div className="topbar-actions">
          <div className="language-switch" role="group" aria-label={t.languageLabel}>
            <button type="button" aria-pressed={locale === 'ko'} onClick={() => setLocale('ko')}>한</button>
            <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
          </div>
          <span className="local-pill">{t.localMode}</span>
          <span className={`status-pill status-${webMcpStatus}`} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            {webMcpStatus === 'registered' && t.connected(OFFERPROOF_TOOL_COUNT)}
            {webMcpStatus === 'checking' && t.checking}
            {webMcpStatus === 'unsupported' && t.manualMode}
            {webMcpStatus === 'error' && t.connectionError}
          </span>
          <button className="ghost-button" type="button" onClick={reset}>{t.newReview}</button>
        </div>
      </header>

      <main id="main" className="workspace">
        {activeView === 'overview' && (
          <>
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-copy">
            <p className="eyebrow">{t.caseFile}</p>
            <h1 id="page-title">
              <span className="title-line title-lead">{t.titleLead}</span>
              <span className="title-line title-accent">{t.titleAccent}{t.titleTail}</span>
            </h1>
            <p>{t.intro}</p>
          </div>
          <aside className="trust-console" aria-label={t.handlingNote}>
            <p className="handling-label">{t.handlingNote}</p>
            <ul className="trust-line">
              <li><span>01</span><strong>{t.localProcessing}</strong></li>
              <li><span>02</span><strong>{t.noExternalAction}</strong></li>
              <li><span>03</span><strong>{t.noVerdict}</strong></li>
            </ul>
          </aside>
        </section>

        <ol className="workflow-rail" aria-label={t.workflowLabel}>
          {t.stages.map((stage, index) => (
            <li
              className={index < activeStage ? 'is-complete' : index === activeStage ? 'is-active' : ''}
              aria-current={index === activeStage ? 'step' : undefined}
              key={stage}
            >
              <span>{index + 1}</span>
              <strong>{stage}</strong>
            </li>
          ))}
        </ol>

        <section className="overview-actions" aria-label={t.pageNavLabel}>
          <div className="overview-cta">
            <button className="primary-button" type="button" onClick={() => navigateTo('review')}>{t.overviewPrimary}</button>
            <button className="text-button" type="button" onClick={loadSampleAndReview}>{t.overviewDemo}</button>
          </div>
          <ol className="overview-card-list">
            {t.overviewCards.map((item) => (
              <li key={item.number}>
                <span>{item.number}</span>
                <div><strong>{item.title}</strong><p>{item.body}</p></div>
              </li>
            ))}
          </ol>
        </section>
          </>
        )}

        {activeView === 'review' && (
          <header className="page-heading">
            <p className="section-kicker">{t.reviewPageKicker}</p>
            <h1>{t.reviewPageTitle}</h1>
            <p>{t.reviewPageBody}</p>
          </header>
        )}

        {activeView === 'case' && (
          <header className="page-heading">
            <p className="section-kicker">{t.casePageKicker}</p>
            <h1>{t.casePageTitle}</h1>
            <p>{t.casePageBody}</p>
          </header>
        )}

        {activeView !== 'overview' && webMcpStatus !== 'registered' && (
          <div className="fallback-banner" role="status">
            <div><strong>{t.fallbackTitle}</strong><span>{t.fallbackBody}</span></div>
            {webMcpStatus !== 'checking' && <button type="button" onClick={reconnectWebMcp}>{t.reconnect}</button>}
          </div>
        )}

        {activeView !== 'overview' && (
        <div className={`workspace-grid workspace-${activeView}`}>
          {activeView === 'review' && (
          <>
          <section className="panel input-panel" aria-labelledby="input-heading">
            <div className="panel-heading">
              <div><p className="section-kicker">{t.sourceKicker}</p><h2 id="input-heading">{t.sourceTitle}</h2></div>
              <button className="sample-button" type="button" onClick={loadSample}>{t.loadSample}</button>
            </div>
            <p className="case-reference">CASE / {offerCase.caseId.slice(-8).toUpperCase()}</p>

            <form onSubmit={(event) => { event.preventDefault(); handleInspect(); }} noValidate>
              <div
                className={`file-drop ${isFileDragActive ? 'is-dragging' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); setFileDragActive(true); }}
                onDragOver={(event) => { event.preventDefault(); setFileDragActive(true); }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileDragActive(false);
                }}
                onDrop={handleFileDrop}
              >
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept={SOURCE_FILE_ACCEPT}
                  aria-label={t.chooseFile}
                  onChange={(event) => void handleSourceFile(event.currentTarget.files?.[0])}
                />
                <span className="file-drop-mark" aria-hidden="true">↓</span>
                <div><strong>{t.fileDropTitle}</strong><p>{t.fileDropBody}</p></div>
                <button type="button" onClick={() => fileInputRef.current?.click()}>{t.chooseFile}</button>
                <small>{t.supportedFiles}</small>
              </div>
              <p className="file-boundary">{t.fileSafetyBoundary}</p>
              {sourceImport.status === 'reading' && <p className="file-status" role="status">{t.fileReading}</p>}
              {sourceImport.status === 'ready' && (
                <div className="file-status is-ready" role="status">
                  <span>{t.fileLoaded(sourceImport.meta.name)}</span>
                  <button type="button" onClick={() => setSourceImport({ status: 'idle' })}>{t.clearImportedFile}</button>
                </div>
              )}
              {sourceImport.status === 'error' && <p className="file-status is-error" role="alert">{sourceFileErrorText(locale, sourceImport.code)}</p>}

              <div className="input-divider"><span>{t.manualInputDivider}</span></div>
              <label htmlFor="offer-text">{t.offerLabel}</label>
              <textarea
                id="offer-text"
                className="offer-textarea resize-none"
                value={offerCase.originalText}
                onChange={(event) => {
                  setPreviousCase(null);
                  setSourceImport({ status: 'idle' });
                  commit((current) => updateOfferText(current, event.target.value));
                }}
                placeholder={t.offerPlaceholder}
                rows={12}
              />
              <div className="field-meta"><span>{t.characters(offerCase.originalText.length)}</span><span>{t.noServerTransfer}</span></div>

              <div className="privacy-card">
                <div className="privacy-heading"><span aria-hidden="true">!</span><strong>{t.privacyTitle}</strong></div>
                <p>{t.privacyBody}</p>
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
                  {t.privacyConsent}
                </label>
              </div>

              <button className="primary-button" type="submit" disabled={!offerCase.originalText.trim()}>
                {t.inspect}
              </button>
            </form>

            {offerCase.maskedText && offerCase.maskedText !== offerCase.originalText && (
              <details className="masked-preview"><summary>{t.maskedPreview}</summary><pre lang={locale === 'en' ? 'ko' : undefined}>{offerCase.maskedText}</pre></details>
            )}
          </section>

          <aside className="panel intake-notes" aria-label={t.handlingNote}>
            <p className="section-kicker">{t.handlingNote}</p>
            <ol>
              {t.overviewCards.map((item) => (
                <li key={item.number}><span>{item.number}</span><div><strong>{item.title}</strong><p>{item.body}</p></div></li>
              ))}
            </ol>
            <div className="intake-boundary"><strong>{t.fileSafetyBoundary}</strong><p>{t.noSignalCaveat}</p></div>
          </aside>
          </>
          )}

          {activeView === 'case' && (
          <section className="panel result-panel" aria-labelledby="result-heading">
            <div className="panel-heading result-heading">
              <div><p className="section-kicker">{t.evidenceKicker}</p><h2 id="result-heading">{t.evidenceTitle}</h2></div>
              <span className="version-badge">{t.caseVersion(offerCase.caseVersion)}</span>
            </div>
            <p className="live-notice" aria-live="polite">{noticeText(locale, notice.key, notice.count)}</p>

            {offerCase.signals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-mark" aria-hidden="true"><span /><span /><span /></div>
                <p className="section-kicker">{t.emptyKicker}</p>
                <h3>{offerCase.originalText.trim() ? t.emptyTitle : t.caseEmptyTitle}</h3>
                {!offerCase.originalText.trim() && <p className="case-empty-copy">{t.caseEmptyBody}</p>}
                <ol className="empty-guide">
                  {t.emptySteps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <button className="empty-cta" type="button" onClick={() => navigateTo('review')}>{t.caseEmptyCta}</button>
                <p>{t.noSignalCaveat}</p>
              </div>
            ) : (
              <>
                <div className="case-status-band">
                  <div className="case-status-main">
                    <span>{t.currentReview}</span><strong>{t.signalCount(offerCase.signals.length)}</strong>
                    <small>{t.notVerdict}</small>
                  </div>
                  <div className="completion-meter">
                    <div><span>{t.planProgress}</span><strong>{completedSteps}/{currentSteps.length}</strong></div>
                    <progress value={completedSteps} max={Math.max(currentSteps.length, 1)} aria-label={t.progressLabel(completedSteps, currentSteps.length)} />
                  </div>
                  <span className="no-action-badge">{t.zeroExternal}</span>
                </div>

                <div className="signal-list" aria-label={t.signalsLabel}>
                  {offerCase.signals.map((signal, index) => {
                    const displaySignal = localizeSignal(signal, locale);
                    return (
                      <article className="signal-card" key={signal.signalId}>
                        <div className="signal-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
                        <div className="signal-content">
                          <div className="signal-title-row"><span className="observation-badge">{t.observedFact}</span><code>{signal.signalId}</code></div>
                          <h3>{displaySignal.title}</h3>
                          <blockquote lang={locale === 'en' && /[가-힣]/.test(signal.observedText) ? 'ko' : undefined}>{signal.observedText}</blockquote>
                          <dl>
                            <div><dt>{t.observation}</dt><dd>{displaySignal.observation}</dd></div>
                            <div><dt>{t.boundedInference}</dt><dd>{displaySignal.inference}</dd></div>
                            <div><dt>{t.limitation}</dt><dd>{displaySignal.limitations}</dd></div>
                          </dl>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="plan-actions">
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
                    <span><strong>{t.allowAgent}</strong><small>{t.allowAgentBody}</small></span>
                  </label>
                  <button className="secondary-button" type="button" onClick={handleBuildPlan}>{t.buildPlan}</button>
                </div>
              </>
            )}

            {offerCase.verificationSteps.length > 0 && (
              <section className="checklist" aria-labelledby="checklist-heading">
                <div className="subheading-row">
                  <div><p className="section-kicker">{t.verifyKicker}</p><h3 id="checklist-heading">{t.verifyTitle}</h3></div>
                  {previousCase && <button className="text-button" type="button" onClick={handleUndo}>{t.undo}</button>}
                </div>
                {offerCase.analysisStale && <p className="stale-notice">{t.staleAnalysis}</p>}
                {!offerCase.analysisStale && hasArchivedSteps && <p className="stale-notice">{t.archivedAnalysis}</p>}
                {offerCase.verificationSteps.map((step) => (
                  <label className={`verification-row ${step.status === 'done' ? 'is-done' : ''} ${!step.isCurrent ? 'is-stale' : ''}`} key={step.stepId}>
                    <input type="checkbox" disabled={offerCase.analysisStale || !step.isCurrent} checked={step.status === 'done'} onChange={(event) => handleStepChange(step.stepId, event.target.checked)} />
                    <span>{localizeVerificationLabel(step.signalId, step.label, locale)}{!step.isCurrent && <small>{t.archivedItem}</small>}</span>
                  </label>
                ))}
              </section>
            )}

            <section id="agent-activity" className="action-receipts" aria-labelledby="receipts-heading">
              <div className="subheading-row">
                <div><p className="section-kicker">{t.activityKicker}</p><h3 id="receipts-heading">{t.activityTitle}</h3></div>
                <span className="receipt-count">{t.recentReceipts(actionReceipts.length, MAX_ACTION_RECEIPTS)}</span>
              </div>
              <p>{t.activityBody}</p>
              <details className="tool-map">
                <summary>{t.toolMap(OFFERPROOF_TOOL_COUNT)}</summary>
                <ul>{OFFERPROOF_TOOL_NAMES.map((name) => <li key={name}><code>{name}</code></li>)}</ul>
              </details>
              {actionReceipts.length === 0 ? (
                <p className="receipt-empty">{t.noReceipts}</p>
              ) : (
                <ol className="receipt-list" aria-live="polite">
                  {actionReceipts.map((receipt) => (
                    <li className={`receipt-row receipt-${receipt.outcome}`} key={receipt.receiptId}>
                      <div className="receipt-title-row">
                        <strong>{receipt.outcome === 'success' ? t.applied : t.blocked}</strong>
                        <time dateTime={receipt.createdAt}>{receiptTimeFormat.format(new Date(receipt.createdAt))}</time>
                      </div>
                      <code>{receipt.toolName}</code>
                      <p>{localizeReceiptMessage(receipt.toolName, receipt.outcome, receipt.message, locale)}</p>
                      <small>{receipt.toolClass === 'read' ? t.read : receipt.toolClass === 'analysis' ? t.analysis : t.mutation} · {receipt.caseId} · v{receipt.caseVersion}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="resources" aria-labelledby="resources-heading">
              <div className="subheading-row">
                <div><p className="section-kicker">{t.resourcesKicker}</p><h3 id="resources-heading">{t.resourcesTitle}</h3></div>
                <span className="no-action-badge">{t.noAutoReport}</span>
              </div>
              <p>{t.resourcesBody}</p>
              <div className="resource-list">
                {OFFICIAL_RESOURCES.map((resource) => {
                  const english = RESOURCE_COPY_EN[resource.resourceId];
                  return (
                    <a href={resource.url} target="_blank" rel="noreferrer" key={resource.resourceId}>
                      <span>{locale === 'en' && english ? english.agency : resource.agency}</span>
                      <strong>{locale === 'en' && english ? english.title : resource.title} ↗</strong>
                      {locale === 'en' && english && <small className="resource-original" lang="ko">{resource.agency} · {resource.title}</small>}
                      <small>{t.linkChecked(resource.lastVerified)}</small>
                    </a>
                  );
                })}
              </div>
            </section>
          </section>
          )}
        </div>
        )}
      </main>
    </div>
  );
}

export default App;
