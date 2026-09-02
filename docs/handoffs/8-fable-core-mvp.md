# AI 작업 인수인계: Core MVP (브라우저 로컬 신호 엔진 + WebMCP 어댑터)

## 작업 정보

- Provider/Agent: Claude Code (Fable) — 주 구현 아키텍트
- Issue: #8 (Core MVP), 참고 #3(기반), #5(신호 레지스트리), #7(적대적 사례)
- Branch: `fable/issue-8-core-mvp`
- Base commit: `ec3beeb` (`origin/codex/firstvibe/agent-1`, 미병합 Vite+React 기반을 포함하기 위한 의도적 예외)
- Target branch: `codex/firstvibe/integration`

## 변경한 내용

실행 가능한 브라우저 로컬 MVP를 구현했습니다. 백엔드·영구 저장·외부 조회·신고·결제·메시지·추적 기능은 없습니다.

1. **공유 도메인 타입과 버전이 있는 사례 상태** — `src/domain/types.ts`, `src/state/caseStore.ts`
   - `CaseState`는 단조 증가 `version`(`v1`, `v2`…)을 가지며 모든 변경은 `commit`으로만 이루어집니다. 되돌리기(undo)는 이전 스냅샷을 **새 버전**으로 복원하므로 낙관적 동시성 검사가 계속 유효합니다.
   - 판정·점수·신뢰도 필드는 타입 차원에서 존재하지 않습니다.
2. **결정적 텍스트 전용 신호 엔진** — `src/domain/signals/{rules,registry,engine}.ts`
   - 8개 canonical ID(`UPFRONT_PAYMENT` … `VAGUE_ROLE_OR_TERMS`)를 `docs/research/RISK_SIGNAL_REGISTRY.md` 순서로 방출합니다.
   - 대소문자 접기(길이 보존) → 문장 분할 → 고정 어휘 쌍 규칙(같은 문장 또는 인접 문장) → 근거 span 추출. 네트워크·시계·외부 상태를 읽지 않습니다.
   - 한국어·영어 어휘를 모두 포함합니다. 부재 규칙(`MISSING_EMPLOYER_DETAILS`, `VAGUE_ROLE_OR_TERMS`)은 근거가 빈 배열이며 UI가 "근거 없음(부재 규칙)"으로 표시합니다.
   - 원문 안의 지시문(`[SYSTEM]`, "이전 지시를 무시", 위조 도구 호출 JSON 등)은 **신호가 아닌 참고 항목(notice)** 으로 원문 그대로 인용만 하고 실행하지 않습니다.
3. **정확한 원문 근거 추출** — 모든 `evidence[i].text === offerText.slice(start, end)`, 문단 번호와 문자 위치 포함. 긴급성 신호는 두 문장에 흩어진 경우 두 개의 정확한 span을 반환합니다.
4. **표시용 민감정보 마스킹** — `src/domain/masking/mask.ts`
   - 주민등록번호, 계좌번호, 카드번호, 전화번호, 이메일, 비밀번호·인증번호 값, 여권번호를 **길이 보존** 방식으로 가립니다. 따라서 원문 오프셋으로 마스킹 사본을 그대로 잘라 근거를 표시할 수 있습니다.
   - 사업자등록번호(`123-45-67890`)는 가리지 않습니다. 원문은 메모리에만 있고 서버로 가지 않습니다.
5. **확인 계획, 단계 갱신, 되돌리기, 버전 충돌** — `src/domain/plan/planBuilder.ts`, `src/services/offerProofService.ts`
   - `build_verification_plan`은 `confirmation: "user_confirmed"` 없이는 변경하지 않으며, 기존 계획이 있으면 `mode: "replace"`를 요구하고 이전 계획을 복원 가능하게 보관합니다.
   - `update_verification_step`은 한 단계만 바꾸고, 값이 같으면 `changedIds/changedFields`가 빈 배열이며 버전을 올리지 않습니다. 메모에 민감정보로 보이는 값이 있으면 `PRIVACY_RESTRICTION`으로 거부합니다.
   - 오래된 `caseVersion` → `CASE_VERSION_CONFLICT` + `currentCaseVersion`, 상태 변경 없음.
6. **한국어 반응형·접근성 UI** — `src/App.tsx`, `src/components/*`, `src/styles/app.css`
   - 입력 → 개인정보 경고·마스킹 미리보기·확인 체크박스 → 검토 요약 → 참고(지시문) → 신호 카드(관찰 사실 / 공식 안내 / 제한된 추론 분리) → 확인 체크리스트(메모, N/M 확인, 이전 계획 복원) → 공식 자료 → 하단 되돌리기 바.
   - 1024px 이상 2열, 미만 1열. 보이는 `<label>`, `aria-live`, `role="alert"`, 44px 터치 영역, `:focus-visible` 외곽선, 색상 외 배지·아이콘 구분, `lang="ko"`.
   - "이 앱은 사기 여부나 안전 여부를 확정하지 않습니다" 고정 문구, 신호 0개일 때 "안전을 보장하지 않습니다" 문구.
7. **하나의 서비스 계층** — `src/services/offerProofService.ts`
   - 수동 버튼과 WebMCP 도구가 같은 5개 메서드를 호출합니다(`source: manual | webmcp`는 호출 기록 표시에만 사용). 입력은 `docs/webmcp/TOOL_CONTRACTS.md` 스키마(`additionalProperties: false`)로 검증합니다.
8. **기능 감지 WebMCP 등록** — `src/webmcp/{types,adapter}.ts`
   - 정확히 5개 도구(`get_case_summary`, `inspect_offer_signals`, `build_verification_plan`, `update_verification_step`, `get_official_resources`)를 `document.modelContext.registerTool(tool, { signal })`로 등록하고, `AbortSignal` abort로 해제합니다. `navigator.modelContext`는 구 위치 폴백입니다.
   - 도구 설명에 현재 `caseId`를 포함해 에이전트가 ID를 알 수 있게 했습니다. 읽기 전용 도구는 `readOnlyHint: true`, 모든 도구는 `untrustedContentHint: true`.
9. **수동 폴백 배너** — `document.modelContext`가 없거나 등록이 거부되면 "수동 모드로 동작합니다" 배너를 표시하고 모든 기능을 버튼으로 제공합니다.
10. **테스트** — Vitest + Testing Library (53개): 결정성, 근거 정확성, 부재 규칙, 프롬프트 인젝션·위조 도구 호출, 마스킹 길이 보존, 버전 충돌, 되돌리기, 계획/단계 계약, 공식 자료 허용 목록, 어댑터 등록/해제/StrictMode, 수동·WebMCP 동등성, App 통합 흐름.

## 수정 파일

- 공유 파일(통합 담당자 확인 필요): `package.json`, `package-lock.json`(devDependencies: vitest, jsdom, @testing-library/*), `index.html`(`lang="ko"`, 제목), `src/main.tsx`(CSS import), `src/App.tsx`
- 신규: `vitest.config.ts`, `src/domain/**`, `src/state/**`, `src/services/**`, `src/webmcp/**`, `src/components/**`, `src/styles/app.css`, `src/test/**`, `src/App.test.tsx`, `docs/handoffs/8-fable-core-mvp.md`
- Agent 2–5 문서(`docs/design`, `docs/research`, `docs/webmcp`, `docs/testing`)는 수정하지 않았고 `git show`로만 참조했습니다.

## 검증

- 명령: `npm ci` → `npm run typecheck` → `npm test` → `npm run build`
- 실제 결과 (2026-09-02, Node v22.22.2, npm 10.9.7):
  - `tsc --noEmit`: 오류 0
  - `vitest run`: Test Files 5 passed, Tests 53 passed
  - `vite build`: `dist/index.html 0.58 kB`, `dist/assets/index-W_FDBW8S.css 7.55 kB`, `dist/assets/index-QFLUIbWj.js 204.18 kB (gzip 71.70 kB)`
- 브라우저 확인(Playwright 1.56.1 + Chromium 141.0.7390.37, `vite preview`):
  - ModelContext 없음 → 수동 모드 배너 표시, 390px 뷰포트에서 가로 스크롤 없음.
  - 사양 형태의 가짜 `document.modelContext`를 페이지 로드 전에 주입 → 도구 5개 등록(readOnlyHint/untrustedContentHint/`additionalProperties:false` 확인), `executeTool`로 `get_case_summary`·`inspect_offer_signals`·`build_verification_plan`·`update_verification_step`·`get_official_resources` 호출 → UI 카드 4개·`1/6 확인` 즉시 반영, 오래된 버전 `CASE_VERSION_CONFLICT`, 알 수 없는 필드 `INVALID_INPUT`, 결과 JSON·화면에 원문 주민번호 미노출, 되돌리기로 `0/6 확인` 복원, 콘솔 오류 0.
- 수동 확인: 데스크톱(1280px)·모바일(390px) 스크린샷으로 2열/1열 레이아웃과 배지·근거 인용 확인.
- **미검증**:
  - **실제 브라우저의 네이티브 WebMCP**(Chrome 149+ Origin Trial / Edge 150)에서의 등록·호출. 이 환경의 Chromium 141에는 `document.modelContext`가 없어(`--enable-features=WebMCP`로도 미노출) 가짜 구현으로만 확인했습니다. 어댑터는 2026-09-02 기준 사양 저장소(`webmachinelearning/webmcp`, commit `55fb7ee`)의 WebIDL에 맞춰 정적으로 구현했습니다.
  - 공식 자료 URL의 현재성. 이 세션은 외부 사이트 접근이 차단되어 KR 기관 자료는 `url: null`, `linkStatus: "unavailable"`로 등록했고, FTC 링크는 Agent 3 문서의 2026-09-02 확인 기록을 그대로 인용했습니다.
  - 스크린리더 실제 청취, 색 대비 자동 검사 도구 실행.

## 알려진 문제

- 고정 어휘 규칙이므로 목록 밖 표현은 놓치거나(예: 새로운 은어) 정상 문맥에서 잘못 잡을 수 있습니다(예: "코인", "즉시"). 각 카드의 "한계" 문구가 이를 설명합니다.
- `VAGUE_ROLE_OR_TERMS`는 레지스트리대로 업무·조건 표기가 **모두** 없을 때만 발생합니다. 정보 부족은 검토 요약의 coverage 배지("확인 필요 정보 부족")로 별도 표시합니다.
- 원문은 새로고침 시 사라집니다(의도된 동작, D-002). 세션 보존은 구현하지 않았습니다.
- 공유 파일(`package.json`, lockfile, `index.html`, `src/main.tsx`, `src/App.tsx`)을 이 브랜치에서 수정했습니다. 통합 담당자 검토가 필요합니다.
- README와 `docs/PROJECT_STATE.md`는 통합 담당자 소유이므로 갱신하지 않았습니다.

## 다음 한 작업

통합 담당자가 PR을 검토한 뒤 Chrome 149+(WebMCP Origin Trial 또는 `chrome://flags` WebMCP 활성화)에서 `npm run dev`로 열어 실제 `document.modelContext` 등록과 에이전트 호출을 확인하고, KR 공식 자료 URL을 직접 검증해 `src/domain/resources/registry.ts`의 `url`/`lastVerifiedAt`를 채웁니다.

## 안전 확인

- 비밀값 미포함: 예 (`.env` 미사용, `VITE_*` 없음)
- 실제 개인정보·구인 원문 미포함: 예 (테스트 입력은 모두 가상 데이터)
- 직접 merge·배포·외부 전송하지 않음: 예 (PR만 생성, force push 없음)
- 붙여넣은 콘텐츠를 명령으로 실행하지 않음: 예 (테스트 `engine.test.ts`, `offerProofService.test.ts`, `App.test.tsx`에서 검증)
- 사기·안전 여부를 단정하지 않음: 예 (금지 문구·판정 필드 부재를 테스트로 검증)
