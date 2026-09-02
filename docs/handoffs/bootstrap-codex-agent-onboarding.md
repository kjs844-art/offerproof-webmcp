# AI 온보딩 부트스트랩 인수인계

## 작업 정보

- Provider/Agent: Codex
- Issue: bootstrap (Issue 생성 전 초기 세팅)
- Branch: `codex/firstvibe/agent-onboarding`
- Base commit: `a7f4c4a`

## 변경한 내용

- `AGENTS.md`를 모든 AI가 따르는 단일 공통 계약으로 추가
- Claude, Gemini, Cursor, GitHub Copilot용 포인터 파일 추가
- 제품 계약, 결정 기록, 현재 상태, 작업 분야, 공통 시작 프롬프트 추가
- AI 작업 Issue 및 Pull Request 템플릿 추가
- AI별 고유 handoff 규칙과 비밀값 경계 추가

## 수정 파일

- 루트 온보딩 문서
- `.github/` 템플릿
- `.cursor/` 규칙
- `docs/` 제품·상태·협업 문서

## 검증

- 명령: `git status --short --branch`, `git diff --check`, `rg --files -uu -g '!.git/**'`
- 실제 결과: 예상한 온보딩 파일만 변경·추가되었고 diff whitespace 오류 없음
- 수동 확인: 모든 공급자별 포인터가 루트 `AGENTS.md`를 가리킴
- 미검증: 애플리케이션 코드가 없어 런타임·빌드·WebMCP 테스트는 실행하지 않음

## 알려진 문제

- 비공개 저장소 접근은 각 AI 서비스의 GitHub OAuth 또는 Git 인증이 필요함
- 애플리케이션 기반 프로젝트와 테스트 명령은 아직 없음

## 다음 한 작업

- Vite + React + TypeScript 기반 프로젝트 생성 Issue를 만들고 한 작업자에게만 배정

## 안전 확인

- 비밀값 미포함: 예
- 실제 개인정보·구인 원문 미포함: 예
- 직접 배포·Devpost 제출·저장소 공개 전환하지 않음: 예
