# Issue #18 — Privacy-safe WebMCP action receipts

## Branch and base

- Branch: `codex/firstvibe/action-receipts`
- Base: `origin/codex/firstvibe/integration` at `386cbf5`
- Commit/push/PR: not performed by this handoff

## Implemented

- Added a browser-memory-only, newest-first receipt list capped at 20 entries.
- Receipt schema is allow-listed to receipt ID, timestamp, tool name, tool class, outcome, case ID, numeric case version, and fixed safe message.
- The receipt builder cannot accept raw tool arguments, offer text, evidence, or arbitrary messages.
- Recorded both `success` and `blocked` outcomes for the read, analysis, and mutation WebMCP tools. Receipt retrieval intentionally does not log itself.
- Receipt-producing information tools are marked `readOnlyHint: false` because they append visible local receipt state, although they never change the case or checklist.
- Added the read-only `get_action_receipts` WebMCP tool. It returns cloned receipt snapshots and does not log its own reads.
- Added a visible receipt timeline to the UI and updated the connected-tool count from five to six.
- `새 검토` clears the in-memory receipt list together with the case state.

## Files changed

- `src/domain/actionReceipts.ts`
- `src/webmcp/useOfferProofTools.ts`
- `src/App.tsx`
- `src/styles.css`
- `README.md`
- `tests/webmcp-tools.test.ts`
- `docs/handoffs/18-codex-action-receipts.md`

## Verification

- `npm test`: PASS, 28/28 tests (the original 22 plus 6 receipt tests)
- `npm run build`: PASS
- `npm audit`: development-only vulnerabilities remain; the full audit is not claimed clean (see the current audit output)
- `npm audit --omit=dev`: PASS, 0 production vulnerabilities
- `git diff --check`: PASS

Receipt tests cover newest-first ordering, the 20-entry bound, read/analysis/mutation success and blocked outcomes, absence of raw text/arguments/evidence/secret/PII fields and values, and read-only snapshot isolation.

## Integration notes

- This work intentionally does not persist receipts to local storage or a server.
- Manual UI actions are not labeled as WebMCP activity; only WebMCP read, analysis, and mutation tool executions create receipts.
- No external action, report, message, payment, or network request was added.
