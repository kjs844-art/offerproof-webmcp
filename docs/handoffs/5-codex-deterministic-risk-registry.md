# AI 작업 인수인계: deterministic risk registry

## 작업 정보

- Provider/Agent: Codex
- Issue: #5
- Branch: `codex/firstvibe/agent-3`
- Base commit: `6c4c9dce6277f63266217d69817952be2bf6095f`
- Target branch: `codex/firstvibe/integration`

## 변경한 내용

`docs/research/RISK_SIGNAL_REGISTRY.md`를 붙여넣은 offer text만 입력으로 사용하는 결정적 규격으로 전면 교체했습니다. 기존의 WHOIS, 급여 백분위, 웹 검색, 외부 API, 언어 모델 의존 규칙을 제거하고, `docs/PROJECT.md`의 camelCase 출력 필드와 다음 8개 canonical ID만 정의했습니다: `UPFRONT_PAYMENT`, `PAYMENT_IN_CRYPTO_OR_GIFT_CARD`, `URGENCY_PRESSURE`, `OFF_PLATFORM_CONTACT`, `SENSITIVE_DATA_REQUEST`, `UNVERIFIED_OR_SHORTENED_LINK`, `MISSING_EMPLOYER_DETAILS`, `VAGUE_ROLE_OR_TERMS`.

각 신호에 정확한 관찰 텍스트 규칙, evidence 추출, 제한, 합법적 counterexample을 추가했습니다. fraud/safe verdict와 confidence score를 금지하고, 실제로 확인한 현재 FTC 공식 페이지 하나만 source registry에 남겼습니다. 날짜를 `2026-09-02`로 고쳤고, 비공식 source와 깨진 `LICENSE` 링크를 제거했습니다.

## 수정 파일

- `docs/research/RISK_SIGNAL_REGISTRY.md`
- `docs/handoffs/5-codex-deterministic-risk-registry.md`

## 검증

- 명령: `git diff --check`
- 실제 결과: 통과; 출력 없음
- 수동 확인: canonical ID 8개, camelCase 계약 필드, `2026-09-02` 날짜, obsolete SIG/source 항목 제거를 확인함
- 미검증: 애플리케이션 테스트/빌드는 애플리케이션 코드가 없어 실행하지 않음

## 알려진 문제

이 브랜치에는 `LICENSE` 파일이 없으므로 문서에서 라이선스 상태를 추론하지 않았습니다. 공식 guidance source의 현재성은 기록된 `lastChecked` 날짜에 다시 확인되어야 합니다.

## 다음 한 작업

통합 담당자가 PR을 검토하고 `codex/firstvibe/integration`에 병합하기 전에 문서 규격과 구현 입력 스키마의 일치를 확인합니다.

## 안전 확인

- 비밀값 미포함: 예
- 실제 개인정보·구인 원문 미포함: 예
- 직접 merge·배포·외부 전송하지 않음: 예
