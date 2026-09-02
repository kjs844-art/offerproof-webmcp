# OfferProof 현재 상태

마지막 갱신: 2026-09-03

## 완료

- 비공개 GitHub 저장소 생성
- `main`, 통합 브랜치, 작업 분야 브랜치 생성
- 다중 AI 공통 계약과 공급자별 포인터 파일 작성
- Vite + React + TypeScript 기반 브라우저 로컬 MVP 구현
- 구인 제안문 확인 신호, 근거, 검증 체크리스트 UI 구현
- 개인정보·에이전트 변경 동의와 비밀값 마스킹 구현
- WebMCP 도구 5개 등록 및 브라우저 호출 검증
- 자동 테스트 22개, 프로덕션 빌드, 배포 의존성 감사 통과
- GitHub Pages 배포 워크플로 준비

## 현재 단계

핵심 MVP는 `codex/firstvibe/integration`에 통합되어 있습니다. 현재 공개 데모 배포와 제출 자료를 준비하는 단계입니다.

## 다음 한 작업

배포 브랜치를 검증·통합한 뒤, 저장소 공개 전환과 오픈소스 라이선스 추가 승인을 받아 GitHub Pages 공개 URL을 검증합니다.

## 실행 및 검증 명령

```powershell
npm ci
npm test
npm run build
npm audit --omit=dev
git diff --check
```

최근 확인 결과는 테스트 22개 통과, TypeScript + Vite 빌드 통과, 배포 의존성 취약점 0개입니다.

## 알려진 제한

- WebMCP API와 대회 제출 규칙은 구현·제출 시점에 최신 공식 자료로 재확인해야 합니다.
- 저장소가 비공개이므로 각 AI 서비스에 사용자 GitHub 권한이 연결되어 있어야 clone·push·PR이 가능합니다.
- Git 기능이 없는 일반 채팅 AI는 코드 제안만 가능하고 저장소 작업은 할 수 없습니다.
- 공개 URL, 공개 저장소, 오픈소스 라이선스, 3분 미만 공개 데모 영상, Devpost 제출문은 아직 완료되지 않았습니다.

## 상태 갱신 소유자

이 파일은 통합 담당자만 수정합니다. 개별 AI는 `docs/handoffs/`에 고유 파일을 남깁니다.
