# Issue 11 - Codex core MVP handoff

## 작업 정보

- Provider/Agent: OpenAI Codex
- Issue: #11 - Build the browser-local OfferProof core MVP
- Branch: `codex/firstvibe/core-mvp`
- Base commit: `ec3beeb78f054b07f0b2df3445c6d5557b7cb75d`

## 변경한 내용

- 구인 제안문을 브라우저 안에서만 분석하는 한국어 MVP 화면을 구현했습니다.
- 8개 정식 신호 ID와 사용자가 붙여 넣은 문장 안의 관찰 근거를 연결했습니다.
- 판정이나 위험 점수 대신 확인할 항목, 한계, 공식 도움 링크를 표시합니다.
- 개인정보 확인 게이트, 화면 표시용 마스킹, 버전 충돌 방지, 체크리스트 변경과 실행 취소를 구현했습니다.
- WebMCP 도구 5개를 등록하고 읽기 도구와 변경 도구를 분리했습니다.
- 변경 도구는 페이지에서 사용자가 명시적으로 허용한 경우에만 실행됩니다.

## 수정 파일

- `index.html`
- `package.json`
- `README.md`
- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`
- `src/domain/types.ts`
- `src/domain/engine.ts`
- `src/domain/caseState.ts`
- `src/webmcp/useOfferProofTools.ts`
- `tests/domain-engine.test.ts`
- `tests/case-state.test.ts`
- `tests/webmcp-tools.test.ts`
- `docs/handoffs/11-codex-core-mvp.md`

## 검증

- 명령: `npm test`
- 실제 결과: 22개 테스트 통과. 결정적 분석, 값 유무와 무관한 민감정보 요청 탐지, 한국어 신호와 근거, 프롬프트 인젝션의 일반 텍스트 처리, 표시·신호·도구 결과 및 문맥형 비밀값 마스킹, 개인정보·에이전트 변경 게이트, 사례·버전 충돌, 동의를 되살리지 않는 단조 증가 실행 취소, 오래된 분석·단계 차단, 체크리스트 진행 상태 보존, WebMCP 계약을 확인했습니다.
- 명령: `npm run build`
- 실제 결과: TypeScript 검사와 Vite 프로덕션 빌드 통과.
- 명령: `npm audit --omit=dev`
- 실제 결과: 배포 의존성 취약점 0개.
- 명령: `git diff --check`
- 실제 결과: 오류 없음.
- 수동 확인: `http://127.0.0.1:4178/`에서 예시 입력, 신호 분석, 체크리스트 생성, 단계 완료, 실행 취소 UI를 확인했습니다.
- WebMCP 확인: Codex 인앱 브라우저에서 5개 도구 등록을 확인했습니다. `get_case_summary`를 호출했고, UI 허용 전 `build_verification_plan`이 거부되는 것과 허용 후 생성되는 것, `update_verification_step` 결과가 즉시 화면에 반영되는 것을 확인했습니다.
- 미검증: 공개 배포 URL, ChatGPT 브라우저의 실제 연결, 여러 브라우저 호환성, 모바일 실기기.

## 알려진 문제

- 현재 신호 탐지는 고정된 한국어 패턴 기반이며 모든 표현을 포괄하지 않습니다.
- 마스킹은 이메일, 한국 휴대전화 번호, 주민등록번호 형태, 금융번호 길이 숫자를 대상으로 하며 이름과 주소는 자동 탐지하지 않습니다.
- 개발 의존성의 기존 Vite/esbuild 감사 경고가 남아 있습니다. 배포 의존성에는 알려진 취약점이 없습니다.
- 공식 링크는 2026-09-03에 접근 가능 여부를 확인했지만, 특정 사건에 대한 법률 판단이나 신고 적합성을 보장하지 않습니다.

## 다음 한 작업

- PR을 `codex/firstvibe/integration`에 리뷰 후 병합하고, 공개 미리보기를 배포한 뒤 실제 ChatGPT WebMCP 연결을 녹화합니다.

## 안전 확인

- 비밀값 미포함: 예
- 실제 개인정보·구인 원문 미포함: 예. 샘플은 허구입니다.
- 직접 merge·배포·외부 전송하지 않음: 예. PR까지만 생성합니다.
