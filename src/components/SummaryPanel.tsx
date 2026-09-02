import type { CaseState } from '../domain/types';
import { NON_VERDICT_DISCLAIMER } from '../domain/types';
import { isAnalysisStale } from '../services/offerProofService';

interface Props {
  state: CaseState;
}

const STATUS_LABELS: Record<CaseState['status'], string> = {
  empty: '빈 상태 — 아직 검토한 제안이 없습니다',
  input: '입력 상태 — 분석 전',
  result: '분석 결과 상태',
};

export function SummaryPanel({ state }: Props) {
  const analysis = state.analysis;
  const stale = isAnalysisStale(state);
  const steps = state.plan?.steps ?? [];
  const done = steps.filter((s) => s.status === 'done').length;

  return (
    <section className="card summary" aria-labelledby="summary-heading">
      <h3 id="summary-heading">검토 요약</h3>
      <p className="small muted">
        상태: {STATUS_LABELS[state.status]} · 사례 버전 <code>v{state.version}</code>
      </p>
      <p className="disclaimer-inline" role="note">
        {NON_VERDICT_DISCLAIMER}
      </p>
      {!analysis && (
        <p>
          구인 제안 원문을 붙여넣고 개인정보 확인 후 <strong>분석 시작</strong>을 누르면 근거와 확인 질문을 정리합니다. 샘플은 자동으로
          채워지지 않습니다.
        </p>
      )}
      {analysis && (
        <div className="stack" aria-live="polite">
          <ul className="stats">
            <li>
              <strong>확인 필요 신호</strong> {analysis.signals.length}개
            </li>
            <li>
              <strong>지시문처럼 보이는 문구</strong> {analysis.notices.length}개
            </li>
            <li>
              <strong>체크리스트</strong> {steps.length > 0 ? `${done}/${steps.length} 확인` : '아직 없음'}
            </li>
          </ul>
          {analysis.signals.length === 0 && (
            <p className="notice info">
              고정 규칙에 해당하는 신호를 원문에서 찾지 못했습니다. <strong>이는 안전을 보장하지 않습니다.</strong> 회사명·사업자등록번호·담당자
              소속은 공식 채널에서 직접 확인하세요.
            </p>
          )}
          <ul className="coverage">
            <li className={analysis.coverage.hasEmployerDetails ? 'ok' : 'missing'}>
              {analysis.coverage.hasEmployerDetails ? '✓ 고용주 표기 있음' : '△ 고용주 표기 없음 — 확인 필요 정보 부족'}
            </li>
            <li className={analysis.coverage.hasRoleDuty ? 'ok' : 'missing'}>
              {analysis.coverage.hasRoleDuty ? '✓ 담당 업무 표기 있음' : '△ 담당 업무 표기 없음 — 확인 필요 정보 부족'}
            </li>
            <li className={analysis.coverage.hasWorkTerms ? 'ok' : 'missing'}>
              {analysis.coverage.hasWorkTerms ? '✓ 급여·근무 조건 표기 있음' : '△ 급여·근무 조건 표기 없음 — 확인 필요 정보 부족'}
            </li>
          </ul>
          <p className="small muted">
            규칙 버전 {analysis.engineVersion} · 분석 시각 {analysis.analyzedAt}
            {stale ? ' · 원문이 이후 변경됨' : ''}
          </p>
        </div>
      )}
    </section>
  );
}
