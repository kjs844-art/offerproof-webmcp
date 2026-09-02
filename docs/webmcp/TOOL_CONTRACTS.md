# OfferProof WebMCP 도구 계약

## 1. 범위와 규격 경계

이 문서는 OfferProof가 **현재 브라우저 페이지에 노출하는 WebMCP 도구** 다섯 개의 제품 계약을 정의한다. 이는 원격 MCP 서버의 transport, 세션, JSON-RPC envelope 또는 별도 backend endpoint 계약이 아니다. 브라우저 WebMCP에서는 페이지의 `Document`에 연결된 `modelContext`가 도구를 관리하며, 공식 초안의 imperative 등록 형태는 `await document.modelContext.registerTool({ name, description, inputSchema, execute })`이다. `inputSchema`는 JSON Schema 형태의 입력 정의이고, `execute`는 입력을 받아 결과를 반환한다.[1] 긴 작업은 공식 문서에 따라 두 번째 실행 옵션의 `AbortSignal`을 취소 경로에 연결할 수 있다.[1]

OfferProof 제품 계약의 반환값은 `execute`가 반환하는 **JSON 직렬화 가능한 구조화 객체**로 정의한다. 브라우저 WebMCP 사양의 등록 문법과 아래의 도메인 입력·출력 스키마를 혼동하지 않는다. 이 문서의 `additionalProperties: false`와 길이·개수 제한은 OfferProof 계약이며, 도구 오염과 과도한 파라미터로 인한 개인정보 유출을 줄이기 위한 명시적 제품 제한이다. 공식 초안은 아직 W3C 표준이나 Standards Track 문서가 아님을 명시하므로, 런타임 구현 전 브라우저 지원과 최신 사양을 다시 확인한다.[2]

## 2. 공통 계약

### 2.1 도구 목록

| 도구 | 성격 | UI에서 하는 일 | 자동 확인 필요 |
|---|---|---|---|
| `get_case_summary` | 읽기 전용 | 현재 사례 요약과 버전 표시 | 아니오 |
| `inspect_offer_signals` | 파생 상태 변경 | 현재 입력을 고정 규칙으로 검사하고 신호 카드 생성 | 호출 전 개인정보 확인; 기존 입력을 삭제하지 않음 |
| `build_verification_plan` | 되돌릴 수 있는 상태 변경 | 선택된 신호를 확인 체크리스트로 변환 | 계획 생성 전 사용자 확인 |
| `update_verification_step` | 좁은 상태 변경 | 체크리스트 한 단계의 상태 또는 메모 변경 | 완료/해제 모두 사용자 의도 확인; 사용자·에이전트 호출 모두 동일 |
| `get_official_resources` | 읽기 전용 | 관할·주제에 맞는 허용 목록 링크 반환 | 아니오; 외부 링크를 자동 제출하지 않음 |

모든 도구 이름은 공식 WebMCP의 이름 제약과 맞추기 위해 소문자 ASCII와 밑줄만 사용하고, 이 문서의 다섯 이름 외에는 등록하지 않는다. 동일 이름을 두 번 등록하지 않으며, 페이지가 없어지거나 세션이 끝나면 도구도 사용할 수 없다.

### 2.2 식별자와 버전

모든 ID는 불투명한 문자열로 취급한다. UI가 ID의 의미를 추론하거나 순차 번호를 생성하지 않는다. API 경계에서 다음 형식을 검증한다.

| 식별자 | 형식 | 설명 |
|---|---|---|
| `caseId` | `^case_[a-z0-9]{16,64}$` | 현재 브라우저 작업공간의 사례 ID |
| `caseVersion` | `^v[1-9][0-9]{0,8}$` | 도구 실행 직전 읽은 사례의 단조 증가 버전 |
| `signalId` | `^[A-Z][A-Z0-9_]{2,63}$` | 고정 규칙 신호 ID; 예: `UPFRONT_PAYMENT` |
| `verificationPlanId` | `^plan_[a-z0-9]{16,64}$` | 확인 계획 ID |
| `verificationStepId` | `^step_[a-z0-9]{16,64}$` | 계획 안의 한 확인 단계 ID |
| `resourceId` | `^[A-Z][A-Z0-9_-]{2,63}$` | 허용 목록의 공식 자료 ID; 예: `KR-FSS-001` |

`caseVersion`은 낙관적 동시성 검사에 사용한다. 상태 변경 도구는 요청의 버전이 현재 버전과 다르면 변경하지 않고 `CASE_VERSION_CONFLICT`를 반환한다. 성공한 상태 변경은 새 `caseVersion`을 반환한다. `changedIds`는 실제로 변경된 ID만, `changedFields`는 실제로 변경된 JSON 경로만 반환하며, 변경이 없으면 두 배열은 빈 배열이다.

### 2.3 공통 성공·오류 구조

성공 결과의 최상위 구조는 다음과 같다. 도구별 `data` 구조는 각 절에 정의한다.

```json
{
  "ok": true,
  "tool": "get_case_summary",
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v3",
  "changedIds": [],
  "changedFields": [],
  "data": {}
}
```

오류도 예외를 화면에 노출하는 대신 아래 구조로 반환한다. 입력·버전·확인 문제는 재시도 전에 사용자가 수정할 수 있는 메시지와 함께 반환하고, 개인정보 원문이나 stack trace는 반환하지 않는다.

```json
{
  "ok": false,
  "tool": "update_verification_step",
  "error": {
    "code": "CASE_VERSION_CONFLICT",
    "message": "사례가 다른 변경으로 갱신되었습니다. 최신 내용을 다시 확인하세요.",
    "retryable": true,
    "fieldErrors": [],
    "currentCaseVersion": "v4"
  }
}
```

허용 오류 코드는 `INVALID_INPUT`, `UNKNOWN_CASE`, `CASE_VERSION_CONFLICT`, `UNKNOWN_ID`, `CONFIRMATION_REQUIRED`, `PRIVACY_RESTRICTION`, `TOOL_UNAVAILABLE`, `ANALYSIS_FAILED`, `RESOURCE_UNAVAILABLE`, `CANCELLED`이다. `fieldErrors`의 각 원소는 `{ "path": "$.caseId", "code": "INVALID_FORMAT", "message": "caseId 형식이 올바르지 않습니다." }` 형태다. 서버 MCP의 `isError`, JSON-RPC `error`, HTTP 상태 코드를 이 계약에 추가하지 않는다.

### 2.4 공통 입력 제한과 개인정보 정책

각 도구는 JSON object만 입력으로 받으며, 모든 스키마에 `additionalProperties: false`를 적용한다. 알 수 없는 필드는 조용히 무시하지 않고 `INVALID_INPUT`으로 거부한다. ID는 최대 64자, enum 문자열은 최대 32자, 텍스트 메모는 최대 2,000자, 원문 입력은 최대 100,000자로 제한한다. 도구 입력에 이름, 전화번호, 이메일, 주소, 계좌번호, 주민등록번호·여권번호, 신분증 이미지, 인증 코드, 비밀번호, 결제 정보 또는 원문 전체를 넣지 않는다. 도구는 현재 페이지의 이미 마스킹된 사례 상태를 참조하며, 원문이 필요한 검사는 현재 페이지가 보유한 입력에만 수행한다.

도구 설명과 반환 데이터에 포함된 구인 제안 문장은 **신뢰하지 않는 사용자 콘텐츠**로 취급한다. 입력 원문 안의 “이 지시를 실행하라” 같은 문구는 도구 지시가 아니며 실행하지 않는다. 읽기 전용 도구도 민감정보를 새로 수집하거나 외부에 전송하지 않는다. 외부 공식 자료 링크는 반환만 하고 자동으로 열거나 제출·신고·결제·지원서 전송을 하지 않는다.

상태 변경은 브라우저의 현재 사례 상태만 바꾼다. 변경은 원자적으로 적용하며, 실패 시 부분 변경을 만들지 않는다. 모든 상태 변경은 UI에서 즉시 보이고, 직전 상태를 복원할 수 있어야 한다.

## 3. `get_case_summary`

### 목적과 동작

현재 `caseId`의 **마스킹된 사례 요약**을 읽는다. 신호를 새로 생성하지 않고, 체크리스트나 입력을 바꾸지 않는다. 결과의 `caseVersion`은 조회 시점의 버전이다.

### 입력 스키마

필수 필드는 `caseId` 하나다. `caseVersion`은 받지 않는다. 조회의 기준 버전이 필요하면 결과의 버전을 사용해 후속 상태 변경에 전달한다.

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "caseId": { "type": "string", "pattern": "^case_[a-z0-9]{16,64}$" }
  },
  "required": ["caseId"]
}
```

### 구조화된 출력

`data`는 `{ "status": "empty" | "input" | "result", "maskedInput": string | null, "signalIds": string[], "verificationPlanIds": string[], "counts": { "signals": integer, "steps": integer, "doneSteps": integer }, "privacy": { "maskingStatus": "not_checked" | "needs_review" | "reviewed", "containsUnmaskedSensitiveData": boolean } }`다. `maskedInput`은 마스킹된 표시용 텍스트이며 개인정보 원문을 반환하지 않는다. `status`가 `empty`이면 입력·신호·계획은 `null` 또는 빈 배열로 반환한다.

### 변경·확인·복원

`changedIds`와 `changedFields`는 항상 빈 배열이다. 사용자 확인은 필요하지 않다. 읽기 전용이며 복원할 상태 변경이 없다.

### 예시

요청:

```json
{ "caseId": "case_01j8k3m4n5p6q7r8" }
```

응답:

```json
{
  "ok": true,
  "tool": "get_case_summary",
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v3",
  "changedIds": [],
  "changedFields": [],
  "data": {
    "status": "result",
    "maskedInput": "교육비를 먼저 입금하세요. 연락처: example@example.com",
    "signalIds": ["UPFRONT_PAYMENT"],
    "verificationPlanIds": ["plan_01j8k3m4n5p6q7r8"],
    "counts": {"signals": 1, "steps": 4, "doneSteps": 1},
    "privacy": {"maskingStatus": "reviewed", "containsUnmaskedSensitiveData": false}
  }
}
```

수동 UI equivalent는 헤더의 `현재 검토 요약`을 여는 동작이다. 수용 기준은 (a) 존재하지 않는 사례면 `UNKNOWN_CASE`를 반환하고, (b) 동일 버전에서 반복 조회해도 어떤 상태도 변경하지 않으며, (c) 반환 텍스트에 입력 원문의 비마스킹 이메일·전화번호가 포함되지 않는 것이다.

## 4. `inspect_offer_signals`

### 목적과 동작

현재 사례의 사용자가 확인한 입력을 고정 규칙으로 검사하고, 원문 근거가 있는 위험 신호 카드를 만든다. 결과는 관찰 사실, 공식 안내와의 비교, 제한된 추론을 별도 필드로 유지한다. 신호 하나만으로 사기·안전 여부를 판정하지 않는다. 이 도구는 파생 상태를 생성하므로 상태 변경 도구로 분류하지만, 입력 원문을 수정·삭제하지 않는다.

### 입력 스키마

`caseId`, `caseVersion`, `privacyConfirmed`가 필수다. `replaceExisting`는 기본 `false`인 선택 enum-like boolean으로, 같은 입력 버전의 파생 결과를 다시 계산할 때만 `true`를 허용한다. `analysisScope`는 현재 MVP에서 `full`만 허용해 미래 확장을 위한 임의 값이 들어오지 않게 한다.

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "caseId": { "type": "string", "pattern": "^case_[a-z0-9]{16,64}$" },
    "caseVersion": { "type": "string", "pattern": "^v[1-9][0-9]{0,8}$" },
    "privacyConfirmed": { "type": "boolean", "const": true },
    "replaceExisting": { "type": "boolean", "default": false },
    "analysisScope": { "type": "string", "enum": ["full"] }
  },
  "required": ["caseId", "caseVersion", "privacyConfirmed"]
}
```

### 구조화된 출력

`data`는 `{ "analysisId": string, "signalIds": string[], "signals": Signal[], "privacy": { "maskingStatus": string, "unmaskedInputReturned": false } }`다. `Signal`은 `{ "signalId": string, "category": "observation" | "official_guidance" | "limited_inference", "title": string, "observedText": string, "observation": string, "sourceIds": string[], "inference": string | null, "limitations": string, "sourceLocation": { "paragraph": integer, "start": integer, "end": integer } | null, "userStatus": "unreviewed" }`다. `observedText`는 마스킹된 짧은 인용이고, `sourceIds`는 공식 자료 ID가 아닌 경우 빈 배열일 수 있다. 근거가 없으면 `signals`에 항목을 만들지 않는다.

성공 시 `changedIds`는 생성·교체된 `signalId`와 `analysisId`만 포함하고, `changedFields`는 예를 들어 `$.signals`, `$.analysisId`를 포함한다. 기존 입력, 체크리스트, 공식 자료 레지스트리는 변경하지 않는다.

### 확인·복원

`privacyConfirmed`가 `true`가 아니면 `CONFIRMATION_REQUIRED` 또는 `PRIVACY_RESTRICTION`으로 거부한다. UI는 분석 전 개인정보 경고와 마스킹 미리보기를 보여주고 사용자가 직접 확인해야 한다. 기존 파생 신호를 `replaceExisting: true`로 교체할 때는 UI가 “현재 신호 결과를 새 분석 결과로 교체합니다”를 먼저 확인해야 한다. 입력 원문은 보존되며 `입력 수정` 또는 이전 결과 복원으로 되돌릴 수 있다. 분석 취소는 `CANCELLED`를 반환하고 변경을 커밋하지 않는다.

### 예시

요청:

```json
{
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v3",
  "privacyConfirmed": true,
  "replaceExisting": false,
  "analysisScope": "full"
}
```

응답:

```json
{
  "ok": true,
  "tool": "inspect_offer_signals",
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v4",
  "changedIds": ["UPFRONT_PAYMENT", "analysis_01j8k3m4n5p6q7r8"],
  "changedFields": ["$.signals", "$.analysisId"],
  "data": {
    "analysisId": "analysis_01j8k3m4n5p6q7r8",
    "signalIds": ["UPFRONT_PAYMENT"],
    "privacy": {"maskingStatus": "reviewed", "unmaskedInputReturned": false},
    "signals": [{
      "signalId": "UPFRONT_PAYMENT",
      "category": "observation",
      "title": "선입금 요구 문구가 있습니다",
      "observedText": "교육비를 먼저 입금하세요",
      "observation": "업무 시작 전에 비용을 지급하라는 문구가 원문에 있습니다.",
      "sourceIds": [],
      "inference": null,
      "limitations": "이 신호 하나만으로 사기 여부를 판단할 수 없습니다.",
      "sourceLocation": {"paragraph": 1, "start": 1, "end": 18},
      "userStatus": "unreviewed"
    }]
  }
}
```

수동 UI equivalent는 개인정보 확인 후 `분석 시작`을 누르는 동작이다. 수용 기준은 (a) `privacyConfirmed`가 아니면 입력·결과를 변경하지 않고, (b) 모든 신호에 `observedText` 또는 유효한 위치와 `limitations`가 있으며, (c) 입력 안의 지시문을 실행하지 않고, (d) 같은 입력·같은 규칙 버전에서 결정론적으로 같은 `signalIds`와 근거를 반환하는 것이다.

## 5. `build_verification_plan`

### 목적과 동작

사용자가 선택한 신호를 바탕으로 확인 체크리스트를 생성하거나 명시적으로 재생성한다. 실제 신고, 연락, 결제, 지원서 제출 또는 외부 사이트의 상태 변경은 수행하지 않는다. 생성된 계획은 현재 사례에 연결된 되돌릴 수 있는 상태다.

### 입력 스키마

`caseId`, `caseVersion`, `signalIds`, `confirmation`이 필수다. `signalIds`는 1–20개의 중복 없는 유효 ID다. `mode`는 `create` 또는 `replace`이며, `replace`는 기존 계획을 교체할 때 사용한다. `confirmation`은 `"user_confirmed"`만 허용한다.

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "caseId": { "type": "string", "pattern": "^case_[a-z0-9]{16,64}$" },
    "caseVersion": { "type": "string", "pattern": "^v[1-9][0-9]{0,8}$" },
    "signalIds": { "type": "array", "minItems": 1, "maxItems": 20, "uniqueItems": true, "items": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]{2,63}$" } },
    "mode": { "type": "string", "enum": ["create", "replace"], "default": "create" },
    "confirmation": { "type": "string", "enum": ["user_confirmed"] }
  },
  "required": ["caseId", "caseVersion", "signalIds", "confirmation"]
}
```

### 구조화된 출력

`data`는 `{ "verificationPlanId": string, "status": "active", "steps": VerificationStep[] }`다. `VerificationStep`은 `{ "verificationStepId": string, "signalId": string | null, "title": string, "question": string, "priority": "high" | "medium" | "low", "status": "todo", "memo": null, "resourceIds": string[] }`다. 새 계획의 모든 단계는 `todo`로 시작한다. 성공 시 `changedIds`는 계획 ID와 새 단계 ID를 포함하고, `changedFields`는 `$.verificationPlan`, `$.verificationPlan.steps`를 포함한다.

### 확인·복원

`confirmation` 없이는 상태 변경을 하지 않는다. `replace`는 기존 계획과 완료 상태를 삭제할 수 있으므로 항상 사용자 확인을 요구한다. 계획 삭제를 수행하지 않으며, 교체 전 상태는 `이전 계획 복원`으로 되돌릴 수 있다. 새 계획을 만들어도 신호 카드의 `userStatus`는 바꾸지 않는다.

### 예시

요청:

```json
{
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v4",
  "signalIds": ["UPFRONT_PAYMENT"],
  "mode": "create",
  "confirmation": "user_confirmed"
}
```

응답:

```json
{
  "ok": true,
  "tool": "build_verification_plan",
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v5",
  "changedIds": ["plan_01j8k3m4n5p6q7r8", "step_01j8k3m4n5p6q7r8"],
  "changedFields": ["$.verificationPlan", "$.verificationPlan.steps"],
  "data": {
    "verificationPlanId": "plan_01j8k3m4n5p6q7r8",
    "status": "active",
    "steps": [{
      "verificationStepId": "step_01j8k3m4n5p6q7r8",
      "signalId": "UPFRONT_PAYMENT",
      "title": "비용 요구 조건 확인",
      "question": "교육비·보증금·장비비의 금액, 목적, 환불 조건이 계약서에 명시되어 있나요?",
      "priority": "high",
      "status": "todo",
      "memo": null,
      "resourceIds": ["KR-FSS-001"]
    }]
  }
}
```

수동 UI equivalent는 신호를 선택하고 `확인 계획 만들기`를 누른 뒤 확인 대화상자에서 `만들기`를 선택하는 동작이다. 수용 기준은 (a) 빈 배열·중복·존재하지 않는 신호를 거부하고, (b) 확인 없이 `caseVersion`, 계획, 단계가 바뀌지 않으며, (c) 모든 새 단계가 `todo`이고, (d) `replace` 취소 시 이전 계획과 단계 상태가 유지되는 것이다.

## 6. `update_verification_step`

### 목적과 동작

확인 계획의 **한 단계만** 상태 또는 사용자 메모로 변경한다. 허용 상태는 `todo`와 `done`뿐이다. 여러 단계, 신호 카드, 사례 입력을 한 번에 변경하지 않는다.

### 입력 스키마

`caseId`, `caseVersion`, `verificationPlanId`, `verificationStepId`, `status`, `confirmation`이 필수다. `memo`는 선택 사항이며 입력하면 문자열 0–2,000자다. `confirmation`은 `"user_confirmed"`만 허용한다.

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "caseId": { "type": "string", "pattern": "^case_[a-z0-9]{16,64}$" },
    "caseVersion": { "type": "string", "pattern": "^v[1-9][0-9]{0,8}$" },
    "verificationPlanId": { "type": "string", "pattern": "^plan_[a-z0-9]{16,64}$" },
    "verificationStepId": { "type": "string", "pattern": "^step_[a-z0-9]{16,64}$" },
    "status": { "type": "string", "enum": ["todo", "done"] },
    "memo": { "type": "string", "maxLength": 2000 },
    "confirmation": { "type": "string", "enum": ["user_confirmed"] }
  },
  "required": ["caseId", "caseVersion", "verificationPlanId", "verificationStepId", "status", "confirmation"]
}
```

### 구조화된 출력

`data`는 `{ "verificationPlanId": string, "step": VerificationStep }`다. 성공 시 `changedIds`는 대상 `verificationStepId`만 포함한다. 상태가 실제로 바뀌면 `changedFields`에 `$.verificationPlan.steps[<stepId>].status`를, 메모리가 바뀌면 `$.verificationPlan.steps[<stepId>].memo`를 포함한다. 요청값과 현재값이 같으면 성공하되 `changedIds`와 `changedFields`는 빈 배열이다.

### 확인·복원

체크 완료와 해제 모두 사용자의 명시적 확인 또는 사용자가 직접 조작한 UI 이벤트에서만 수행한다. 에이전트가 호출하는 경우 `confirmation` 없이는 변경하지 않는다. `done`에서 `todo`로 다시 바꾸는 것은 정상적인 되돌리기이며, 직전 메모리와 상태를 복원하는 `undo`를 UI에서 제공한다. 계획·다른 단계·신호·원문은 변경하지 않는다.

### 예시

요청:

```json
{
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v5",
  "verificationPlanId": "plan_01j8k3m4n5p6q7r8",
  "verificationStepId": "step_01j8k3m4n5p6q7r8",
  "status": "done",
  "memo": "계약서의 환불 조건을 확인함",
  "confirmation": "user_confirmed"
}
```

응답:

```json
{
  "ok": true,
  "tool": "update_verification_step",
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v6",
  "changedIds": ["step_01j8k3m4n5p6q7r8"],
  "changedFields": ["$.verificationPlan.steps[step_01j8k3m4n5p6q7r8].status", "$.verificationPlan.steps[step_01j8k3m4n5p6q7r8].memo"],
  "data": {
    "verificationPlanId": "plan_01j8k3m4n5p6q7r8",
    "step": {
      "verificationStepId": "step_01j8k3m4n5p6q7r8",
      "signalId": "UPFRONT_PAYMENT",
      "title": "비용 요구 조건 확인",
      "question": "교육비·보증금·장비비의 금액, 목적, 환불 조건이 계약서에 명시되어 있나요?",
      "priority": "high",
      "status": "done",
      "memo": "계약서의 환불 조건을 확인함",
      "resourceIds": ["KR-FSS-001"]
    }
  }
}
```

수동 UI equivalent는 체크리스트 한 행의 체크박스 또는 `완료로 표시`를 누르는 동작이다. 수용 기준은 (a) 다른 `verificationStepId`가 바뀌지 않고, (b) 잘못된 plan/step 조합이면 `UNKNOWN_ID`와 함께 변경이 없으며, (c) 오래된 버전이면 `CASE_VERSION_CONFLICT`를 반환하고, (d) 성공 후 `get_case_summary`에서 완료 수가 정확히 1만큼 반영되며, (e) undo 후 원래 상태가 복원되는 것이다.

## 7. `get_official_resources`

### 목적과 동작

현재 허용 목록(allowlist)에서 관할과 주제에 맞는 공식 자료 링크를 읽는다. 검색 엔진 결과를 임의로 반환하지 않으며, 링크를 자동으로 열거나 기관에 제출하지 않는다. 자료의 제목·기관·관할·검증일을 UI가 사용자에게 보여줄 수 있도록 한다.

### 입력 스키마

`caseId`와 `jurisdiction`이 필수다. `topic`은 선택이며 기본값은 `general_offer_review`다. `signalIds`는 선택적 필터로 0–20개의 유효 신호 ID다. `includeExpired`는 받지 않는다. 오래된 자료를 강제로 포함하는 우회 필드를 허용하지 않는다.

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "caseId": { "type": "string", "pattern": "^case_[a-z0-9]{16,64}$" },
    "jurisdiction": { "type": "string", "enum": ["KR", "US", "GB", "AU", "CA", "OTHER"] },
    "topic": { "type": "string", "enum": ["general_offer_review", "upfront_payment", "personal_information", "contract_terms"] },
    "signalIds": { "type": "array", "maxItems": 20, "uniqueItems": true, "items": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]{2,63}$" } }
  },
  "required": ["caseId", "jurisdiction"]
}
```

### 구조화된 출력

`data`는 `{ "jurisdiction": string, "resources": OfficialResource[] }`다. `OfficialResource`는 `{ "resourceId": string, "agency": string, "title": string, "url": string, "topic": string, "jurisdiction": string, "lastVerifiedAt": string, "isLegalAdvice": boolean, "supportsSignalIds": string[], "linkStatus": "verified" | "unavailable" }`다. URL은 HTTPS만 허용하고, 허용 목록에 등록된 origin과 path만 반환한다. `isLegalAdvice`가 `true`인 자료는 법률 자문으로 오인하지 않도록 UI가 범위를 함께 표시한다.

`changedIds`와 `changedFields`는 항상 빈 배열이다. 자료가 없으면 성공과 빈 배열을 반환할 수 있으며, 허용 목록 자체를 사용할 수 없으면 `RESOURCE_UNAVAILABLE`을 반환한다.

### 확인·복원

사용자 확인은 필요하지 않다. 읽기 전용이며 사례, 신호, 계획, 체크리스트를 변경하지 않는다. 외부 링크를 여는 것은 사용자가 링크를 누르는 수동 행동으로만 수행한다.

### 예시

요청:

```json
{
  "caseId": "case_01j8k3m4n5p6q7r8",
  "jurisdiction": "KR",
  "topic": "upfront_payment",
  "signalIds": ["UPFRONT_PAYMENT"]
}
```

응답:

```json
{
  "ok": true,
  "tool": "get_official_resources",
  "caseId": "case_01j8k3m4n5p6q7r8",
  "caseVersion": "v6",
  "changedIds": [],
  "changedFields": [],
  "data": {
    "jurisdiction": "KR",
    "resources": [{
      "resourceId": "KR-FSS-001",
      "agency": "공식 기관 레지스트리의 기관명",
      "title": "구인 제안 비용 요구 확인 안내",
      "url": "https://official.example.kr/resource/kr-fss-001",
      "topic": "upfront_payment",
      "jurisdiction": "KR",
      "lastVerifiedAt": "2026-08-26",
      "isLegalAdvice": false,
      "supportsSignalIds": ["UPFRONT_PAYMENT"],
      "linkStatus": "verified"
    }]
  }
}
```

예시 URL은 계약 형태를 설명하기 위한 placeholder이며, 구현 시 허용 목록에 등록된 실제 공식 URL로 교체한다. 수동 UI equivalent는 결과의 `공식 자료로 다시 확인하기` 영역을 여는 동작이다. 수용 기준은 (a) `jurisdiction` enum 밖의 값과 알 수 없는 필드를 거부하고, (b) 반환 자료의 URL이 HTTPS·allowlist 조건을 만족하며, (c) 자료 조회 후 `caseVersion`, 신호, 계획, 체크리스트가 변하지 않고, (d) 링크 장애는 `linkStatus: "unavailable"` 또는 `RESOURCE_UNAVAILABLE`로 명시되는 것이다.

## 8. 등록·실행 및 공통 테스트 시나리오

런타임 등록은 브라우저 WebMCP의 공식 imperative API 형태에 맞추되, 각 도구의 `inputSchema`에 이 문서의 정확한 스키마를 넣는다. 예시는 문법 경계를 보여주기 위한 것이며, 원격 MCP 서버의 `tools/list`나 JSON-RPC 호출을 의미하지 않는다.

```js
await document.modelContext.registerTool({
  name: "get_case_summary",
  description: "현재 사례의 마스킹된 요약을 읽습니다. 상태를 변경하지 않습니다.",
  inputSchema: GET_CASE_SUMMARY_SCHEMA,
  execute: async (input, { signal }) => {
    return await offerProofToolRuntime.getCaseSummary(input, { signal });
  }
});
```

등록 시 도구 이름·설명은 비어 있지 않아야 하며, 공식 사양상 중복 도구 이름은 등록 오류가 될 수 있다.[2] 페이지 생명주기나 등록 해제 신호로 도구를 사용할 수 없게 된 경우 호출자는 `TOOL_UNAVAILABLE`에 준하는 사용자 안내를 표시하고, 자동으로 다른 원격 MCP 경로로 전환하지 않는다.

| 테스트 시나리오 | 기대 결과 |
|---|---|
| 올바른 요청을 각 도구에 한 번 호출 | `ok: true`, 도구명, `caseId`, `caseVersion`, `changedIds`, `changedFields`, `data`가 존재 |
| 알 수 없는 입력 필드 추가 | `INVALID_INPUT`, 상태 변경 없음 |
| 잘못된 ID·enum·길이 | `INVALID_INPUT`와 `fieldErrors`, 상태 변경 없음 |
| 오래된 `caseVersion`으로 변경 도구 호출 | `CASE_VERSION_CONFLICT`, 현재 버전 안내, 상태 변경 없음 |
| 확인 없는 변경 도구 호출 | `CONFIRMATION_REQUIRED`, 상태 변경 없음 |
| 개인정보를 입력 인자로 전달 | `PRIVACY_RESTRICTION`, 원문을 오류·로그에 재출력하지 않음 |
| 원문 안에 도구 지시처럼 보이는 문장 포함 | 문장을 데이터로만 처리하고 명령으로 실행하지 않음 |
| 변경 직후 `get_case_summary` 호출 | 반환된 버전·요약·완료 수가 변경 결과와 일치 |
| 변경 직후 undo 또는 역변경 | 직전 상태로 복원되고 복원된 ID·필드만 보고 |
| WebMCP 미지원 브라우저에서 같은 UI 사용 | 수동 UI equivalent가 동일한 제품 상태와 결과를 생성 |

## References

[1]: https://developer.chrome.com/docs/ai/webmcp/imperative-api "Chrome for Developers — Imperative API"
[2]: https://webmachinelearning.github.io/webmcp/ "WebMCP Draft Community Group Report — ModelContext API and security considerations"
