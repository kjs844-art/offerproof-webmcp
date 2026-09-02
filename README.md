# OfferProof

OfferProof는 구인·채용 제안에서 **확인이 필요한 신호**를 원문 근거와 함께 정리하고, 사용자가 안전하게 사실을 확인할 수 있도록 검증 계획을 만드는 WebMCP 웹앱입니다.

## 안전 원칙

- 사기 여부를 단정하지 않습니다.
- 위험 신호와 그 근거를 분리해서 보여줍니다.
- 신고를 자동으로 실행하지 않습니다.
- 사용자가 확인한 뒤 공식 기관의 안내와 신고 경로로 이동하도록 돕습니다.

## 현재 상태

다중 AI 협업 온보딩 단계입니다. 애플리케이션 구현은 아직 시작하지 않았습니다.

## 협업 방식

Claude, Gemini, Cursor, Copilot, Codex 등 어떤 도구를 사용하더라도 먼저 [`AGENTS.md`](AGENTS.md)를 읽습니다. 각 작업자는 AI별·작업별 고유 브랜치에서 작업하고 Pull Request로 `codex/firstvibe/integration`에 모읍니다. 검증이 끝난 변경만 `main`에 반영합니다.

새 작업자는 다음 순서로 시작합니다.

1. `AGENTS.md`
2. `docs/PROJECT.md`
3. `docs/PROJECT_STATE.md`
4. `docs/WORKSTREAMS.md`
5. 자신에게 지정된 GitHub Issue
