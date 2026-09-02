import { useEffect, useMemo, useState } from 'react';
import { ChecklistPanel } from './components/ChecklistPanel';
import { NoticeList } from './components/NoticeList';
import { OfferInputPanel } from './components/OfferInputPanel';
import { OfficialResourcesPanel } from './components/OfficialResourcesPanel';
import { SignalCard } from './components/SignalCard';
import { SummaryPanel } from './components/SummaryPanel';
import { UndoBar } from './components/UndoBar';
import { WebMcpStatus } from './components/WebMcpStatus';
import { useCaseState } from './components/useService';
import { NON_VERDICT_DISCLAIMER, type SignalId } from './domain/types';
import { createOfferProofService, type OfferProofService } from './services/offerProofService';
import { registerOfferProofTools, type RegistrationResult } from './webmcp/adapter';
import type { ModelContextLike } from './webmcp/types';

export interface AppProps {
  /** Injected for tests. Defaults to one shared in-memory service per page. */
  service?: OfferProofService;
  /**
   * `undefined` → feature-detect `document.modelContext` / `navigator.modelContext`.
   * `null` → force manual mode. An object → use it as the ModelContext (tests).
   */
  modelContext?: ModelContextLike | null;
}

let defaultService: OfferProofService | null = null;
function getDefaultService(): OfferProofService {
  if (!defaultService) defaultService = createOfferProofService();
  return defaultService;
}

interface Selection {
  analysisId: string | null;
  ids: SignalId[];
}

export default function App({ service: injected, modelContext }: AppProps) {
  const service = useMemo(() => injected ?? getDefaultService(), [injected]);
  const state = useCaseState(service);
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const [selection, setSelection] = useState<Selection>({ analysisId: null, ids: [] });

  useEffect(() => {
    const controller = new AbortController();
    registerOfferProofTools(service, {
      ...(modelContext !== undefined ? { modelContext } : {}),
      abortController: controller,
    }).then((result) => {
      if (controller.signal.aborted) return;
      setRegistration(result);
    });
    return () => {
      // Aborting the registration signal unregisters the tools (WebMCP spec) and cancels an in-flight registration.
      controller.abort();
    };
  }, [service, modelContext]);

  const analysis = state.analysis;
  const analysisId = analysis?.analysisId ?? null;
  const allSignalIds = useMemo(() => analysis?.signals.map((s) => s.signalId) ?? [], [analysis]);
  const selectedIds = selection.analysisId === analysisId ? selection.ids : allSignalIds;

  const toggleSelect = (id: SignalId, on: boolean) => {
    const next = on ? [...new Set([...selectedIds, id])] : selectedIds.filter((x) => x !== id);
    setSelection({ analysisId, ids: next });
  };

  return (
    <div className="app">
      <a className="skip-link" href="#result-heading">
        결과로 건너뛰기
      </a>
      <header className="app-header">
        <div className="brand">
          <h1>OfferProof</h1>
          <p className="tagline">구인 제안에서 확인이 필요한 신호를 원문 근거와 함께 정리하고, 사용자가 직접 확인할 체크리스트를 만드는 WebMCP 협업 보드</p>
        </div>
        <p className="disclaimer" role="note">
          {NON_VERDICT_DISCLAIMER} 확률형 점수, 블랙리스트, 자동 신고·결제·메시지 전송 기능은 없습니다.
        </p>
        <WebMcpStatus service={service} registration={registration} caseId={state.caseId} version={state.version} />
      </header>

      <main className="workspace">
        <section className="panel input-panel" aria-labelledby="input-heading">
          <OfferInputPanel service={service} state={state} />
        </section>

        <section className="panel result-panel" aria-labelledby="result-heading">
          <h2 id="result-heading">② 분석 결과</h2>
          <SummaryPanel state={state} />

          {analysis && <NoticeList notices={analysis.notices} />}

          {analysis && analysis.signals.length > 0 && (
            <section aria-labelledby="signals-heading" className="stack">
              <h3 id="signals-heading">확인이 필요한 신호 ({analysis.signals.length}개)</h3>
              <p className="small muted">
                각 카드는 <strong>관찰 사실 → 공식 안내 → 제한된 추론</strong> 순서로 나뉘어 있으며, 근거가 없는 카드는 만들지 않습니다.
                순서는 규칙 등록 순서이며 심각도 순위가 아닙니다.
              </p>
              {analysis.signals.map((signal, index) => (
                <SignalCard
                  key={signal.signalId}
                  signal={signal}
                  index={index}
                  selectedForPlan={selectedIds.includes(signal.signalId)}
                  onToggleSelect={(on) => toggleSelect(signal.signalId, on)}
                  onUserStatusChange={(status) => service.setSignalUserStatus(signal.signalId, status)}
                />
              ))}
            </section>
          )}

          <h2 id="checklist-section-heading" className="sr-only">
            ③ 확인 체크리스트
          </h2>
          <ChecklistPanel service={service} state={state} selectedSignalIds={selectedIds} />

          <h2 id="resources-section-heading" className="sr-only">
            ④ 공식 자료
          </h2>
          <OfficialResourcesPanel service={service} state={state} />
        </section>
      </main>

      <UndoBar service={service} canUndo={service.canUndo()} undoLabel={service.undoLabel()} />
    </div>
  );
}
