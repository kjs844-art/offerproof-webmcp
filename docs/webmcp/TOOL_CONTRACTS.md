# OfferProof WebMCP Tool Contracts

## 1. Overview and Purpose

This document defines the **core WebMCP tool contracts** for OfferProof's deterministic risk-signal analysis. These tools enable MCP clients to interact with OfferProof's backend through a standardized imperative API, with JSON Schema input validation and structured JSON responses.

OfferProof exposes exactly five tools via WebMCP's `Document.modelContext.registerTool({ name, description, inputSchema, execute })`. Each tool's `inputSchema` is strictly validated with `additionalProperties: false`, and the `execute` function returns JSON-serializable results. All tools accept an `AbortSignal` for cancellation support.[1]

OfferProof tooling is designed as **read-only analysis**: no tool mutates backend state directly. Instead, tools return data that the client must present to the user for confirmation before any state change is committed. This ensures that runtime code (not the MCP client) validates confirmation states created by the visible UI.

> **Important**: Boolean flags like `privacyConfirmed` or string constants like `"user_confirmed"` are **NOT proof by themselves**. Runtime code **must** validate that a confirmation state was actually created and shown by the visible UI. A client can pass `privacyConfirmed: true` or `confirmation: "user_confirmed"` without any user interaction; the backend must verify the UI actually performed the confirmation flow.

OfferProof follows W3C WebMCP Standards Track guidance and community security considerations.[2]

## 2. Tool Overview

### 2.1 Tool List

| Tool | Purpose | UI Trigger | Data Sensitivity |
|---|---|---|---|
| `get_case_summary` | Read case status | View case details | Read-only; may contain masked sensitive data |
| `inspect_offer_signals` | Analyze offer for risk signals | Run signal analysis | Read-only; untrusted content analysis |
| `build_verification_plan` | Create verification steps | Build plan from signals | Read-only; returns plan structure |
| `update_verification_step` | Mark step complete/incomplete | User completes step | Requires UI confirmation validation |
| `get_official_resources` | Fetch official guidance | Look up resources | Read-only; verified official content |

All tool IDs use ASCII-only characters. Tool names are stable identifiers; descriptions and schemas may evolve with versioned changes.

### 2.2 ID Formats and Constraints

All IDs follow strict regex patterns with documented maximum lengths:

| ID Type | Regex | Max Length | Example |
|---|---|---|---|
| `caseId` | `^case_[a-z0-9]{16,64}$` | 64 chars | `case_0123456789abcdef` |
| `caseVersion` | `^v[1-9][0-9]{0,8}$` | 10 chars | `v3`, `v123456789` |
| `signalId` | `^[A-Z][A-Z0-9_]{2,63}$` | 64 chars | `SIG-0001` |
| `verificationPlanId` | `^plan_[a-z0-9]{16,64}$` | 64 chars | `plan_0123456789abcdef` |
| `verificationStepId` | `^step_[a-z0-9]{16,64}$` | 64 chars | `step_0123456789abcdef` |
| `resourceId` | `^[A-Z][A-Z0-9_-]{2,63}$` | 64 chars | `KR-FSS-001` |

`caseVersion` is auto-incremented by the backend on each mutation. If a tool receives a stale `caseVersion`, it returns `CASE_VERSION_CONFLICT`. Clients should always use the latest `caseVersion` from the previous response.

`changedIds` and `changedFields` in responses list modified entity IDs and JSON paths respectively. These are informational; clients should use the returned `caseVersion` as the source of truth.

### 2.3 Response Structure

All tools return a consistent response envelope:

```json
{
  "ok": true,
  "tool": "tool_name",
  "caseId": "case_xxxxx",
  "caseVersion": "vN",
  "changedIds": ["entity_id_1", "entity_id_2"],
  "changedFields": ["$.path.to.field1", "$.path.to.field2"],
  "data": { ... }
}
```

Error responses:

```json
{
  "ok": false,
  "tool": "tool_name",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "retryable": true,
    "fieldErrors": [{ "path": "$.field", "code": "INVALID_FORMAT", "message": "..." }],
    "currentCaseVersion": "vN"
  }
}
```

### 2.4 Error Codes

| Scenario | Error Code | Retryable |
|---|---|---|
| Input validation failure | `INVALID_INPUT` | No |
| Unknown case ID | `UNKNOWN_CASE` | No |
| Stale case version | `CASE_VERSION_CONFLICT` | Yes |
| Unknown entity ID | `UNKNOWN_ID` | No |
| Confirmation not validated by UI | `CONFIRMATION_REQUIRED` | No |
| Privacy/sensitive data restriction | `PRIVACY_RESTRICTION` | No |
| Tool unavailable | `TOOL_UNAVAILABLE` | Yes |
| Analysis failure | `ANALYSIS_FAILED` | Yes |
| Resource unavailable | `RESOURCE_UNAVAILABLE` | Yes |
| Operation cancelled | `CANCELLED` | No |

Field-level errors are included in `fieldErrors` array with JSON-pointer paths.

### 2.5 WebMCP Annotations

**All tools are read-only**: No tool directly mutates backend state. Tools that appear to modify state (like `build_verification_plan` or `update_verification_step`) return the *intended* state change as data, which the client must confirm through UI before the backend commits it.

**Untrusted content behavior**:
- `inspect_offer_signals`: Accepts untrusted user input (offer text) and returns analysis. The input is treated as untrusted; the output contains derived signals, not the original content.
- All other tools: Work with internal IDs and structured data; input validation rejects malformed data.

**Privacy handling**:
- `get_case_summary`: May return `maskedInput` with privacy-sensitive data masked. The masking is performed server-side; clients should not attempt to unmask.
- All tools: Never return unmasked sensitive PII unless explicitly requested and authorized.

## 3. `get_case_summary`

### Purpose

Retrieves the current state of a case, including its signals, verification plans, and privacy status. This is a read-only operation.

### Input Schema

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

### Output Schema

`data` contains:
```json
{
  "status": "empty" | "input" | "result",
  "maskedInput": string | null,
  "signalIds": string[],
  "verificationPlanIds": string[],
  "counts": { "signals": integer, "steps": integer, "doneSteps": integer },
  "privacy": {
    "maskingStatus": "not_checked" | "needs_review" | "reviewed",
    "containsUnmaskedSensitiveData": boolean
  }
}
```

`maskedInput` is server-side masked; it must NOT contain complete emails, phone numbers, or other sensitive values. Example: `"Monthly salary: [MASKED]. Contact: [MASKED]@[MASKED].com"`. If no input exists, `maskedInput` is `null`.

`status` transitions: `empty` -> `input` -> `result`. A case with no input has `status: "empty"` and `maskedInput: null`.

`changedIds` and `changedFields` are always empty for this read-only tool.

### Verification Requirements

- `caseId` must exist, otherwise returns `UNKNOWN_CASE`
- No confirmation required (read-only)

### Example

Request:
```json
{ "caseId": "case_0123456789abcdef" }
```

Response:
```json
{
  "ok": true,
  "tool": "get_case_summary",
  "caseId": "case_0123456789abcdef",
  "caseVersion": "v3",
  "changedIds": [],
  "changedFields": [],
  "data": {
    "status": "result",
    "maskedInput": "Monthly salary: [MASKED]. Contact: [MASKED]@[MASKED].com",
    "signalIds": ["SIG-0001", "SIG-0103"],
    "verificationPlanIds": ["plan_0123456789abcdef"],
    "counts": { "signals": 2, "steps": 4, "doneSteps": 1 },
    "privacy": { "maskingStatus": "reviewed", "containsUnmaskedSensitiveData": false }
  }
}
```

### UI Equivalent

Viewing case details in the UI. Error cases: (a) unknown case -> `UNKNOWN_CASE`, (b) invalid caseId format -> `INVALID_INPUT`, (c) failed to load signals -> error with details.

## 4. `inspect_offer_signals`

### Purpose

Analyzes offer text for risk signals using the canonical signal registry (SIG-0001 through SIG-0403). Returns detected signals with metadata. This tool accepts untrusted user input and performs read-only analysis.

**WebMCP Annotation**: This tool processes untrusted content (user-provided offer text). The input is validated but treated as potentially malicious. Output contains only derived signal metadata, not the original untrusted content.

### Input Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "caseId": { "type": "string", "pattern": "^case_[a-z0-9]{16,64}$" },
    "caseVersion": { "type": "string", "pattern": "^v[1-9][0-9]{0,8}$" },
    "privacyConfirmed": { "type": "boolean" },
    "replaceExisting": { "type": "boolean", "default": false },
    "analysisScope": { "type": "string", "enum": ["full"], "default": "full" }
  },
  "required": ["caseId", "caseVersion", "privacyConfirmed"]
}
```

**Important**: `privacyConfirmed: true` is NOT sufficient proof. Runtime code MUST validate that the UI actually displayed a privacy confirmation and the user interacted with it. A malicious or buggy client can send `privacyConfirmed: true` without any user action.

`replaceExisting: true` requests re-analysis of existing input. Default is `false`.

`analysisScope` is currently fixed to `"full"`; future versions may support partial analysis.

### Output Schema

`data` contains:
```json
{
  "analysisId": string,
  "signalIds": string[],
  "signals": Signal[],
  "privacy": { "maskingStatus": string, "unmaskedInputReturned": false }
}
```

`Signal` structure:
```json
{
  "signalId": string,
  "category": "observation" | "official_guidance" | "limited_inference",
  "title": string,
  "observedText": string,
  "observation": string,
  "sourceIds": string[],
  "inference": string | null,
  "limitations": string,
  "sourceLocation": { "paragraph": integer, "start": integer, "end": integer } | null,
  "userStatus": "unreviewed"
}
```

`observedText` is a snippet from the input (already present in the case), `sourceIds` references canonical signal IDs (e.g., `SIG-0001`, `SIG-0103`). `inference` and `limitations` come from the signal registry. `sourceLocation` is the position in the input text.

`unmaskedInputReturned` is always `false` - this tool never returns raw untrusted input.

`changedIds` includes the `analysisId` and all `signalId` values. `changedFields` includes `$.signals` and `$.analysisId`.

### Verification Requirements

- `privacyConfirmed` must be validated against UI confirmation state (not just the boolean value)
- If privacy not confirmed by UI: `CONFIRMATION_REQUIRED` or `PRIVACY_RESTRICTION`
- If `replaceExisting: true`, UI must have confirmed re-analysis

### Example

Request:
```json
{
  "caseId": "case_0123456789abcdef",
  "caseVersion": "v3",
  "privacyConfirmed": true,
  "replaceExisting": false,
  "analysisScope": "full"
}
```

Response:
```json
{
  "ok": true,
  "tool": "inspect_offer_signals",
  "caseId": "case_0123456789abcdef",
  "caseVersion": "v4",
  "changedIds": ["SIG-0001", "SIG-0103", "analysis_0123456789abcdef"],
  "changedFields": ["$.signals", "$.analysisId"],
  "data": {
    "analysisId": "analysis_0123456789abcdef",
    "signalIds": ["SIG-0001", "SIG-0103"],
    "privacy": { "maskingStatus": "reviewed", "unmaskedInputReturned": false },
    "signals": [{
      "signalId": "SIG-0001",
      "category": "observation",
      "title": "Unusually High Hourly Rate",
      "observedText": "$500/hour",
      "observation": "Hourly rate exceeds 99th percentile for this role and location",
      "sourceIds": ["SIG-0001"],
      "inference": "Rate is significantly above market average",
      "limitations": "Market data may be outdated for niche roles",
      "sourceLocation": { "paragraph": 1, "start": 10, "end": 20 },
      "userStatus": "unreviewed"
    }, {
      "signalId": "SIG-0103",
      "category": "metadata",
      "title": "Generic Company Email Domain",
      "observedText": "contact@gmail.com",
      "observation": "Contact uses generic email provider",
      "sourceIds": ["SIG-0103"],
      "inference": null,
      "limitations": "Small businesses may legitimately use generic emails",
      "sourceLocation": { "paragraph": 1, "start": 50, "end": 70 },
      "userStatus": "unreviewed"
    }]
  }
}
```

### UI Equivalent

Running "Analyze Offer" in the UI. Error cases: (a) privacy not confirmed by UI -> error, (b) all signals already analyzed and replace not confirmed -> no-op, (c) analysis fails -> `ANALYSIS_FAILED`, (d) signals returned -> display to user.

## 5. `build_verification_plan`

### Purpose

Creates a verification plan from selected signals. Returns the plan structure for UI confirmation. Does NOT persist the plan until the UI confirms it.

**WebMCP Annotation**: Read-only. Returns a proposed plan; the client must present it to the user and receive confirmation before the backend creates the actual plan.

### Input Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "caseId": { "type": "string", "pattern": "^case_[a-z0-9]{16,64}$" },
    "caseVersion": { "type": "string", "pattern": "^v[1-9][0-9]{0,8}$" },
    "signalIds": {
      "type": "array",
      "minItems": 1,
      "maxItems": 20,
      "uniqueItems": true,
      "items": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]{2,63}$" }
    },
    "mode": { "type": "string", "enum": ["create", "replace"], "default": "create" },
    "confirmation": { "type": "string", "enum": ["user_confirmed"] }
  },
  "required": ["caseId", "caseVersion", "signalIds", "confirmation"]
}
```

**Important**: `confirmation: "user_confirmed"` is NOT sufficient proof. Runtime code MUST validate that the UI actually displayed the plan and the user confirmed it. The backend must verify the UI confirmation state, not just the string value.

`signalIds` must be canonical signal IDs (SIG-XXXX format).

`mode`: `"create"` builds a new plan, `"replace"` replaces an existing plan for these signals.

### Output Schema

`data` contains:
```json
{
  "verificationPlanId": string,
  "status": "active",
  "steps": VerificationStep[]
}
```

`VerificationStep` structure:
```json
{
  "verificationStepId": string,
  "signalId": string | null,
  "title": string,
  "question": string,
  "priority": "high" | "medium" | "low",
  "status": "todo",
  "memo": null,
  "resourceIds": string[]
}
```

All steps start with `status: "todo"`. The `signalId` references the canonical signal from the input.

`changedIds` includes the `verificationPlanId` and all `verificationStepId` values. `changedFields` includes `$.verificationPlan` and `$.verificationPlan.steps`.

### Verification Requirements

- `confirmation` must be validated against UI confirmation state
- If confirmation not validated: return error, do NOT create plan
- `replace` mode: UI must confirm overwriting existing plan

### Example

Request:
```json
{
  "caseId": "case_0123456789abcdef",
  "caseVersion": "v4",
  "signalIds": ["SIG-0001", "SIG-0103"],
  "mode": "create",
  "confirmation": "user_confirmed"
}
```

Response:
```json
{
  "ok": true,
  "tool": "build_verification_plan",
  "caseId": "case_0123456789abcdef",
  "caseVersion": "v5",
  "changedIds": ["plan_0123456789abcdef", "step_0123456789abcdef"],
  "changedFields": ["$.verificationPlan", "$.verificationPlan.steps"],
  "data": {
    "verificationPlanId": "plan_0123456789abcdef",
    "status": "active",
    "steps": [{
      "verificationStepId": "step_0123456789abcdef",
      "signalId": "SIG-0001",
      "title": "Verify compensation rate",
      "question": "Is the stated hourly rate consistent with market averages for this role?",
      "priority": "high",
      "status": "todo",
      "memo": null,
      "resourceIds": ["KR-FSS-001"]
    }]
  }
}
```

### UI Equivalent

User clicks "Build Verification Plan" after reviewing signals. Error cases: (a) no signals selected -> validation error, (b) confirmation not from UI -> error, (c) version conflict -> `CASE_VERSION_CONFLICT`, (d) plan created -> display steps to user.

## 6. `update_verification_step`

### Purpose

Updates the status of a verification step (todo <-> done). Returns the updated step for UI confirmation. Does NOT persist until UI confirmation is validated.

**WebMCP Annotation**: Requires UI confirmation validation. The `confirmation` field must correspond to a state created by the visible UI, not just a hardcoded string.

### Input Schema

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

**Important**: `confirmation: "user_confirmed"` is NOT sufficient proof. Runtime code MUST validate that the UI actually displayed the step update and the user confirmed it. The backend must check the UI confirmation state.

`status` toggles between `"todo"` and `"done"`. Changing from `done` back to `todo` is allowed (undo).

`memo` is optional user notes, max 2000 characters.

### Output Schema

`data` contains:
```json
{
  "verificationPlanId": string,
  "step": VerificationStep
}
```

`changedIds` contains the `verificationStepId`. `changedFields` contains the JSON paths to modified fields, e.g., `$.verificationPlan.steps[step_xxx].status` and `$.verificationPlan.steps[step_xxx].memo`.

### Verification Requirements

- Validate `verificationPlanId` and `verificationStepId` exist
- Validate `confirmation` against UI state (not just the string)
- If step doesn't exist: `UNKNOWN_ID`
- If version conflict: `CASE_VERSION_CONFLICT`
- If confirmation not validated: error, do NOT update

### Example

Request:
```json
{
  "caseId": "case_0123456789abcdef",
  "caseVersion": "v5",
  "verificationPlanId": "plan_0123456789abcdef",
  "verificationStepId": "step_0123456789abcdef",
  "status": "done",
  "memo": "Verified via official salary database",
  "confirmation": "user_confirmed"
}
```

Response:
```json
{
  "ok": true,
  "tool": "update_verification_step",
  "caseId": "case_0123456789abcdef",
  "caseVersion": "v6",
  "changedIds": ["step_0123456789abcdef"],
  "changedFields": [
    "$.verificationPlan.steps[step_0123456789abcdef].status",
    "$.verificationPlan.steps[step_0123456789abcdef].memo"
  ],
  "data": {
    "verificationPlanId": "plan_0123456789abcdef",
    "step": {
      "verificationStepId": "step_0123456789abcdef",
      "signalId": "SIG-0001",
      "title": "Verify compensation rate",
      "question": "Is the stated hourly rate consistent with market averages for this role?",
      "priority": "high",
      "status": "done",
      "memo": "Verified via official salary database",
      "resourceIds": ["KR-FSS-001"]
    }
  }
}
```

### UI Equivalent

User marks a verification step as complete. Error cases: (a) invalid step ID -> `UNKNOWN_ID`, (b) version conflict -> `CASE_VERSION_CONFLICT`, (c) confirmation not from UI -> error, (d) step updated -> update UI.

## 7. `get_official_resources`

### Purpose

Retrieves official guidance resources (government documents, regulations) relevant to specific signals and jurisdictions. This is a read-only lookup of verified official content.

**WebMCP Annotation**: Read-only. Returns only verified official resources from an allowlist. URLs are HTTPS-only and point to official government or regulatory sources.

### Input Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "caseId": { "type": "string", "pattern": "^case_[a-z0-9]{16,64}$" },
    "jurisdiction": { "type": "string", "enum": ["KR", "US", "GB", "AU", "CA", "OTHER"] },
    "topic": { "type": "string", "enum": ["general_offer_review", "upfront_payment", "personal_information", "contract_terms"] },
    "signalIds": {
      "type": "array",
      "maxItems": 20,
      "uniqueItems": true,
      "items": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]{2,63}$" }
    }
  },
  "required": ["caseId", "jurisdiction"]
}
```

`jurisdiction` uses ISO 3166-1 alpha-2 codes. `OTHER` is a catch-all for jurisdictions not in the allowlist.

`topic` filters resources by category. `signalIds` further filters to resources that specifically address those canonical signals.

### Output Schema

`data` contains:
```json
{
  "jurisdiction": string,
  "resources": OfficialResource[]
}
```

`OfficialResource` structure:
```json
{
  "resourceId": string,
  "agency": string,
  "title": string,
  "url": string,
  "topic": string,
  "jurisdiction": string,
  "lastVerifiedAt": string,
  "isLegalAdvice": boolean,
  "supportsSignalIds": string[],
  "linkStatus": "verified" | "unavailable"
}
```

`url` is always HTTPS. `isLegalAdvice: true` indicates the resource contains official legal guidance (requires special UI handling). `linkStatus: "unavailable"` means the URL was verified but is currently unreachable.

`changedIds` and `changedFields` are always empty (read-only).

### Verification Requirements

- All resources returned are from the verified allowlist
- No user confirmation required (read-only)
- If no resources match: return empty array, not error

### Example

Request:
```json
{
  "caseId": "case_0123456789abcdef",
  "jurisdiction": "KR",
  "topic": "upfront_payment",
  "signalIds": ["SIG-0001"]
}
```

Response:
```json
{
  "ok": true,
  "tool": "get_official_resources",
  "caseId": "case_0123456789abcdef",
  "caseVersion": "v6",
  "changedIds": [],
  "changedFields": [],
  "data": {
    "jurisdiction": "KR",
    "resources": [{
      "resourceId": "KR-FSS-001",
      "agency": "Financial Supervisory Service",
      "title": "Employment Contract Fairness Guidelines",
      "url": "https://www.fss.or.kr/resource/kr-fss-001",
      "topic": "upfront_payment",
      "jurisdiction": "KR",
      "lastVerifiedAt": "2026-08-26",
      "isLegalAdvice": false,
      "supportsSignalIds": ["SIG-0001", "SIG-0004"],
      "linkStatus": "verified"
    }]
  }
}
```

### UI Equivalent

User looks up official resources for a signal. Error cases: (a) invalid jurisdiction -> validation error, (b) no resources found -> empty list, (c) resource unavailable -> `RESOURCE_UNAVAILABLE` for specific entries.

## 8. Tool Registration and Transport

Tools are registered with WebMCP's imperative API:

```javascript
await document.modelContext.registerTool({
  name: "get_case_summary",
  description: "Retrieves case status and summary information. Read-only.",
  inputSchema: GET_CASE_SUMMARY_SCHEMA,
  execute: async (input, { signal }) => {
    return await offerProofToolRuntime.getCaseSummary(input, { signal });
  }
});
```

The transport layer handles JSON-RPC enveloping. If the backend is unavailable, tools return `TOOL_UNAVAILABLE`. If the MCP client disconnects, pending operations are aborted via `AbortSignal`.[2]

All tools support a maximum of 400 concurrent requests per client with automatic rate limiting. Excess requests receive `TOOL_UNAVAILABLE` with retry-after headers.

## References

[1]: https://developer.chrome.com/docs/ai/webmcp/imperative-api "Chrome for Developers - Imperative API"
[2]: https://webmachinelearning.github.io/webmcp/ "WebMCP Draft Community Group Report - ModelContext API and security considerations"
