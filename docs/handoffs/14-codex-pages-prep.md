# Issue 14 - Codex GitHub Pages deployment preparation

## 작업 정보

- Provider/Agent: OpenAI Codex
- Issue: #14 - Prepare public demo deployment
- Branch: `codex/firstvibe/deploy`
- Base branch: `codex/firstvibe/integration`

## 변경한 내용

- 프로덕션 빌드에서 GitHub Pages 프로젝트 경로 `/offerproof-webmcp/`를 사용하도록 Vite를 설정했습니다.
- 통합 브랜치에 반영될 때 테스트와 빌드를 거쳐 GitHub Pages에 배포하는 Actions 워크플로를 추가했습니다.
- 로컬 개발 서버는 기존처럼 `/` 경로를 사용합니다.
- README에 배포 준비 상태와 아직 완료되지 않은 공개 URL 단계를 명시했습니다.

## 수정 파일

- `vite.config.ts`
- `.github/workflows/deploy-pages.yml`
- `README.md`
- `docs/PROJECT_STATE.md`
- `docs/handoffs/14-codex-pages-prep.md`

## 검증

- `npm ci`: 고정된 의존성 설치 완료.
- `npm test`: 22개 테스트 통과.
- `npm run build`: TypeScript 검사와 Vite 프로덕션 빌드 통과.
- `npm audit --omit=dev`: 배포 의존성 취약점 0개.
- `git diff --check`: 공백 오류 없음.
- `dist/index.html`: JavaScript와 CSS 자산 경로가 `/offerproof-webmcp/assets/`를 사용하는 것을 확인.
- 로컬 프로덕션 미리보기: `/offerproof-webmcp/`와 빌드 JavaScript 자산이 모두 HTTP 200을 반환하는 것을 확인한 뒤 서버를 종료.

## 아직 완료되지 않은 외부 단계

- 저장소는 현재 비공개이며 공개 전환에는 소유자의 명시적 승인이 필요합니다.
- 공개 제출에 필요한 오픈소스 라이선스는 아직 추가하지 않았습니다.
- GitHub Pages는 아직 활성화하지 않았고 공개 URL도 실제 접속 검증하지 않았습니다.
- 이 브랜치를 통합하기 전에는 배포 워크플로가 실행되지 않습니다.

## 안전 확인

- 저장소 공개 범위 변경 없음: 예
- 라이선스 부여 없음: 예
- 외부 배포 실행 없음: 예
- 비밀값 포함 없음: 예
