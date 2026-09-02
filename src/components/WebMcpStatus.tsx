import type { RegistrationResult } from '../webmcp/adapter';
import type { OfferProofService } from '../services/offerProofService';
import { useCallLog } from './useService';

interface Props {
  service: OfferProofService;
  registration: RegistrationResult | null;
  caseId: string;
  version: number;
}

export function WebMcpStatus({ service, registration, caseId, version }: Props) {
  const log = useCallLog(service);
  const recent = log.slice(-5).reverse();

  let banner: JSX.Element;
  if (!registration) {
    banner = (
      <p className="banner pending" role="status">
        WebMCP 지원 여부를 확인하는 중입니다… 모든 기능은 수동 버튼으로 동일하게 사용할 수 있습니다.
      </p>
    );
  } else if (registration.status === 'registered') {
    banner = (
      <p className="banner ok" role="status">
        WebMCP 연결됨: <code>{registration.source === 'document' ? 'document.modelContext' : 'navigator.modelContext'}</code>에 도구{' '}
        {registration.toolNames.length}개를 등록했습니다 ({registration.toolNames.join(', ')}). 에이전트가 변경한 내용은 이 화면에 즉시
        표시되며 되돌릴 수 있습니다.
      </p>
    );
  } else {
    banner = (
      <p className="banner warning" role="status" data-testid="webmcp-fallback">
        이 브라우저는 WebMCP를 지원하지 않아 <strong>수동 모드</strong>로 동작합니다. {registration.reason} 모든 기능은 아래 버튼으로 동일하게
        사용할 수 있습니다.
      </p>
    );
  }

  return (
    <section className="webmcp-status" aria-labelledby="webmcp-heading">
      <h2 id="webmcp-heading" className="sr-only">
        WebMCP 상태
      </h2>
      {banner}
      <p className="small muted">
        현재 caseId <code data-testid="case-id">{caseId}</code> · 사례 버전 <code data-testid="case-version">v{version}</code>
      </p>
      {recent.length > 0 && (
        <details>
          <summary>도구 호출 기록 (최근 {recent.length}건)</summary>
          <ol className="call-log" aria-live="polite">
            {recent.map((r) => (
              <li key={r.seq}>
                <span className={`badge source ${r.source}`}>{r.source === 'webmcp' ? '에이전트' : '수동'}</span> <code>{r.tool}</code>{' '}
                {r.ok ? `성공 · ${r.caseVersion ?? ''}` : `오류 · ${r.errorCode ?? ''}`}
                {r.changedIds.length > 0 ? ` · 변경 ${r.changedIds.length}건` : ''}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
