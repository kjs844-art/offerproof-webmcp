# OfferProof 협업 작업표

## 보호 규칙

- `main`: 검증 완료본만 유지합니다.
- `codex/firstvibe/integration`: 기능을 먼저 합치고 전체 검증하는 브랜치입니다.
- 작업자는 AI별·Issue별 고유 브랜치만 수정하고 Pull Request를 만듭니다.
- 같은 파일을 여러 작업자가 동시에 수정하지 않습니다.
- 비밀값과 `.env` 파일은 커밋하지 않습니다.
- GitHub Issue가 작업 배정과 파일 잠금의 기준입니다.

## 작업 분야 브랜치

아래 브랜치는 분야 표시용입니다. 여러 AI가 같은 브랜치에서 직접 작업하지 않습니다.

| 브랜치 | 담당 범위 |
| --- | --- |
| `codex/firstvibe/ui` | 화면과 사용자 흐름 |
| `codex/firstvibe/risk-engine` | 위험 신호 및 안전 확인 규칙 |
| `codex/firstvibe/webmcp` | WebMCP 도구 등록과 실행 흐름 |
| `codex/firstvibe/demo-docs` | README, 시연 자료, 제출 문서 |

## 실제 작업 브랜치 형식

```text
claude/issue-<번호>-<작업명>
gemini/issue-<번호>-<작업명>
cursor/issue-<번호>-<작업명>
copilot/issue-<번호>-<작업명>
codex/firstvibe/issue-<번호>-<작업명>
```

모든 실제 작업 브랜치는 최신 `origin/codex/firstvibe/integration`에서 시작합니다.

## 경로 소유권

기반 프로젝트 생성 후 Issue에서 실제 경로를 확정합니다.

| 분야 | 기본 허용 경로 | 공유 파일 |
| --- | --- | --- |
| UI | `src/components/`, `src/styles/` | `src/App.*`, 라우터는 통합 담당자 |
| 위험 신호 | `src/domain/signals/`, `src/data/` | 공통 타입은 통합 담당자 |
| WebMCP | `src/webmcp/` | 앱 등록 진입점은 통합 담당자 |
| 테스트 | 해당 기능 옆 테스트 파일 | 전역 테스트 설정은 통합 담당자 |
| 시연·문서 | `docs/demo/`, `docs/submission/` | 루트 문서와 상태 파일은 통합 담당자 |

`package.json`, lockfile, `vite.config.*`, `index.html`, `src/main.*`, `src/App.*`, 공통 타입·전역 상태·라우터는 한 번에 통합 담당자 한 명만 수정합니다.

## 통합 순서

고유 작업 브랜치 → Pull Request → `codex/firstvibe/integration` 검증 → 사용자 승인 → `main`
