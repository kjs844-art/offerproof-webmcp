# Offroof 현재 상태

마지막 갱신: 2026-09-03

## 완료

- GitHub 저장소와 MIT 라이선스 준비
- `main`, 통합 브랜치, 작업 분야 브랜치 생성
- 다중 AI 공통 계약과 공급자별 포인터 파일 작성
- Vite + React + TypeScript 기반 브라우저 로컬 MVP 구현
- 구인 제안문 확인 신호, 근거, 검증 체크리스트 UI 구현
- 개인정보·에이전트 변경 동의와 비밀값 마스킹 구현
- WebMCP 도구 6개 등록 및 네이티브 브라우저 호출 검증
- 개인정보 안전한 WebMCP 작업 영수증과 조회 도구 구현
- 자동 테스트 43개, 프로덕션 빌드, 배포 의존성 감사 통과
- 한/영 전환, 3개 상태 보존 화면, 로컬 텍스트 파일 가져오기 구현
- Devpost 제출 초안, 심사자 테스트 안내, 2분 35초 영상 대본과 영어 자막 준비
- GitHub Pages 배포 워크플로 준비

## 현재 단계

핵심 MVP는 `codex/firstvibe/integration`에 통합되어 있으며 최신 경험·WebMCP 보강은 `codex/firstvibe/issue-26-experience-polish`에서 최종 검증 중입니다. 현재 공개 데모 배포와 제출 자료를 준비하는 단계입니다.

## 다음 한 작업

최종 준비 변경을 통합한 뒤 저장소를 공개 전환하고, GitHub Pages 공개 URL에서 네이티브 WebMCP 호출을 다시 검증합니다.

## 실행 및 검증 명령

```powershell
npm ci
npm test
npm run build
npm audit --omit=dev
git diff --check
```

최근 확인 결과는 테스트 43개 통과, TypeScript + Vite 빌드 통과, 배포 의존성 취약점 0개입니다.

## 알려진 제한

- WebMCP API와 대회 제출 규칙은 구현·제출 시점에 최신 공식 자료로 재확인해야 합니다.
- Git 기능이 없는 일반 채팅 AI는 코드 제안만 가능하고 저장소 작업은 할 수 없습니다.
- 저장소는 MIT 라이선스와 함께 공개되었고 Pages는 활성화되었습니다. `main` 릴리스·공개 URL 검증, 실제 데모 영상 녹화·공개 업로드, Devpost 최종 제출은 아직 완료되지 않았습니다.

## 상태 갱신 소유자

이 파일은 통합 담당자만 수정합니다. 개별 AI는 `docs/handoffs/`에 고유 파일을 남깁니다.
