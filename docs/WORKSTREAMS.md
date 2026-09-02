# OfferProof 협업 작업표

## 보호 규칙

- `main`: 검증 완료본만 유지합니다.
- `codex/firstvibe/integration`: 기능을 먼저 합치고 전체 검증하는 브랜치입니다.
- 작업자는 자기 브랜치만 수정하고 Pull Request를 만듭니다.
- 같은 파일을 여러 작업자가 동시에 수정하지 않습니다.
- 비밀값과 `.env` 파일은 커밋하지 않습니다.

## 브랜치 역할

| 브랜치 | 담당 범위 |
| --- | --- |
| `codex/firstvibe/ui` | 화면과 사용자 흐름 |
| `codex/firstvibe/risk-engine` | 위험 신호 및 안전 확인 규칙 |
| `codex/firstvibe/webmcp` | WebMCP 도구 등록과 실행 흐름 |
| `codex/firstvibe/demo-docs` | README, 시연 자료, 제출 문서 |

## 통합 순서

작업 브랜치 → Pull Request → `codex/firstvibe/integration` 검증 → `main`

