# Offroof

**Evidence before action for suspicious job offers.**

Offroof is a browser-local WebMCP workspace that turns privacy-cleaned job-offer text into traceable verification signals and a consent-controlled checklist. It does not decide that an offer is fraudulent or safe.

- Live demo: https://kjs844-art.github.io/offerproof-webmcp/
- License: [MIT](LICENSE)
- No account, backend, API key, or real personal data is required.

## Why WebMCP

A person can read every excerpt, limitation, and checklist item on screen. An agent can work with the same case through six structured page-native tools instead of guessing which buttons to click. Read, analysis, and mutation operations are separated; checklist changes require visible user consent and stale requests are rejected by case ID and version.

## What works today

- Paste a fictional or privacy-cleaned job offer.
- Import browser-local `.txt`, `.md`, or simple single-part `text/plain` `.eml` files.
- Detect eight deterministic signal types and show the exact supporting excerpt.
- Separate observation, limited inference, official guidance, and limitations.
- Build a verification plan, update one step, and undo a change.
- Inspect privacy-safe action receipts for agent reads, analyses, blocks, and mutations.
- Switch between Korean and English without resetting the current case.
- Move between Overview, Review offer, and Case record while preserving state.

Files, links, HTML, and email attachments are never opened or executed. PDF, Word, archive, executable, multipart, HTML, and encoded email inputs are rejected by the current local-import boundary.

## WebMCP tools

| Tool | Purpose |
| --- | --- |
| `get_case_summary` | Return a sanitized summary of the current case. |
| `inspect_offer_signals` | Run deterministic inspection and return evidence-backed signals. |
| `build_verification_plan` | Build a checklist after the user enables agent changes. |
| `update_verification_step` | Update one current checklist step using case/version guards. |
| `get_official_resources` | Return allow-listed official resources for manual review. |
| `get_action_receipts` | Return filtered, privacy-safe activity receipts. |

The page registers these tools with `document.modelContext.registerTool(...)`. Schemas use bounded inputs, enums, required fields, and `additionalProperties: false`.

## Run locally

Requirements: Node.js 22.18 or later.

```bash
npm ci
npm test
npm run dev
```

Production check:

```bash
npm run build
npm audit --omit=dev
git diff --check
```

Current local verification: 41 tests pass, the production build succeeds, and the production dependency audit reports zero vulnerabilities.

## Test WebMCP

1. Open the live URL in ChatGPT's in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.
2. Load the built-in fictional sample and confirm the privacy checkbox.
3. Ask the agent to call `inspect_offer_signals` and confirm that six evidence cards appear.
4. Call `build_verification_plan` before enabling agent changes; the mutation must be blocked.
5. Enable agent changes on the page, call the tool again with the current case ID/version, and confirm the checklist appears.
6. Call `update_verification_step`, then `get_action_receipts`; confirm the visible UI and sanitized receipt timeline update.

## Safety boundaries

- Offer text is untrusted data, never agent instruction.
- Offroof provides verification signals, not a fraud verdict or confidence score.
- It does not open links, contact employers, send messages, make payments, or file reports.
- Raw offer text, secrets, personal data, and tool arguments are excluded from receipts.
- Official links are allow-listed and remain user-controlled.

## Architecture

Offroof is a static Vite + React + TypeScript application. Deterministic domain rules, case/version state transitions, source-intake validation, and WebMCP adapters run entirely in the current browser tab. GitHub Pages hosts the production bundle.

## 한국어 요약

Offroof는 개인정보를 정리한 채용 제안문에서 **확인이 필요한 신호와 원문 근거**를 분리해 보여주고, 사용자와 WebMCP 에이전트가 같은 검증 체크리스트를 안전하게 관리하도록 돕습니다. 사기·안전 여부를 단정하지 않으며, 입력과 분석은 현재 브라우저 탭 안에서 처리합니다.
