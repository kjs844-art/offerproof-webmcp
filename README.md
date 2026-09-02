# OfferProof

OfferProof는 구인·채용 제안에서 **확인이 필요한 신호**를 원문 근거와 함께 정리하고, 사용자가 안전하게 사실을 확인할 수 있도록 검증 계획을 만드는 WebMCP 웹앱입니다.

## 안전 원칙

- 사기 여부를 단정하지 않습니다.
- 위험 신호와 그 근거를 분리해서 보여줍니다.
- 신고를 자동으로 실행하지 않습니다.
- 사용자가 확인한 뒤 공식 기관의 안내와 신고 경로로 이동하도록 돕습니다.

## 현재 상태

브라우저 로컬 MVP가 구현되어 있습니다. 사용자가 구인 제안문을 붙여 넣으면 고정된 규칙으로 확인 신호와 원문 근거를 정리하고, 검증 체크리스트를 만들 수 있습니다. 입력은 서버로 전송하지 않으며 자동 신고·결제·외부 페이지 실행을 하지 않습니다.

GitHub Pages용 자동 빌드·배포 워크플로가 준비되어 있습니다. 공개 데모 URL은 저장소 공개 전환과 Pages 활성화가 끝난 뒤 이 문서에 추가합니다.

현재 등록되는 WebMCP 도구는 다음 6개입니다.

- `get_case_summary`
- `inspect_offer_signals`
- `build_verification_plan`
- `update_verification_step`
- `get_official_resources`
- `get_action_receipts`

체크리스트를 변경하는 도구는 페이지 안에서 사용자가 먼저 허용해야 합니다.
읽기·분석·변경 도구의 허용·차단 결과는 민감한 입력이나 인수 없이 현재 탭의 작업 영수증에 최대 20개까지 기록됩니다.

## 로컬 실행

Node.js 22.18 이상이 필요합니다.

```powershell
npm ci
npm run dev
```

브라우저에서 Vite가 안내하는 로컬 주소를 엽니다.

## 검증

```powershell
npm test
npm run build
npm audit --omit=dev
git diff --check
```

현재 자동 테스트는 개인정보 확인과 에이전트 변경 게이트, 결정적 신호 분석, 원문·문맥형 비밀값 마스킹, 사례·버전 충돌, 동의를 복원하지 않는 단조 증가 실행 취소, 오래된 분석·단계 차단, 체크리스트 진행 상태 보존, WebMCP 도구 응답과 작업 영수증의 개인정보 안전성을 검사합니다.

프로덕션 빌드는 GitHub Pages의 프로젝트 경로인 `/offerproof-webmcp/`를 기준으로 정적 파일을 생성합니다. 로컬 개발 서버는 계속 `/` 경로를 사용합니다.

## 협업 방식

Claude, Gemini, Cursor, Copilot, Codex 등 어떤 도구를 사용하더라도 먼저 [`AGENTS.md`](AGENTS.md)를 읽습니다. 각 작업자는 AI별·작업별 고유 브랜치에서 작업하고 Pull Request로 `codex/firstvibe/integration`에 모읍니다. 검증이 끝난 변경만 `main`에 반영합니다.

새 작업자는 다음 순서로 시작합니다.

1. `AGENTS.md`
2. `docs/PROJECT.md`
3. `docs/PROJECT_STATE.md`
4. `docs/WORKSTREAMS.md`
5. 자신에게 지정된 GitHub Issue
