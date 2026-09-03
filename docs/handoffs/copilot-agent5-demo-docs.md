# Agent 5 demo documentation handoff

## Work information

- Original provider: Copilot / Agent 5
- Integration correction: OpenAI Codex
- Branch: `codex/firstvibe/agent-5`
- Scope: documentation-only fictional demo material

## Files

- `docs/demo/DEMO_CASES.md`
- `docs/demo/DEMO_SCRIPT.md`
- `docs/handoffs/copilot-agent5-demo-docs.md`

## What is included

- Three fully fictional Korean offer cases aligned with the current deterministic rules.
- Expected canonical signal IDs and safe interpretations.
- Exact current WebMCP input shapes and consent/version prerequisites.
- A 2 minute 40 second demo flow using the built-in sample.
- Manual fallback and recording safety boundaries.

## Corrections made during integration review

- Removed signal IDs that do not exist in the implementation.
- Replaced US jurisdiction and external-resource assumptions with the current fixed `KR` behavior.
- Removed incorrect claims that tools receive or return the full offer text.
- Removed unimplemented selection controls and refresh persistence claims.
- Replaced realistic synthetic identifiers and contact details with harmless fictional wording.
- Updated button labels and expected signal counts to match the current UI and engine.

## Validation

- Compared all documented signal IDs with `src/domain/types.ts`.
- Compared each fictional phrase with the regular expressions in `src/domain/engine.ts`.
- Compared tool inputs and privacy/consent/version behavior with `src/webmcp/useOfferProofTools.ts`.
- Compared visible control labels with `src/App.tsx`.
- `git diff --check` must pass before the PR is opened.

## Limits

- These documents describe deterministic Korean patterns in the current MVP, not broad fraud detection coverage.
- Case IDs, versions, and step IDs are runtime values and must never be hard-coded in the recording.
- The final public deployment and all tool calls still require live verification before the video can claim them.

## Next step

Open a pull request from `codex/firstvibe/agent-5` to `codex/firstvibe/integration`. Do not merge until an independent reviewer confirms that the documentation still matches the implementation.
