# OfferProof — Devpost submission copy

## Project title

OfferProof

## Tagline

A consent-aware WebMCP workspace that turns job-offer text into an evidence-backed verification checklist while analysis stays in the browser.

## Inspiration

Suspicious job offers rarely look completely fake. They often mix normal details with urgency, vague responsibilities, unusual payment requests, shortened links, or requests for sensitive information.

Most tools try to answer, “Is this a scam?” with a score or verdict. We wanted to ask a safer and more useful question: **What should the user verify, and what exact words in the offer made that verification necessary?**

OfferProof is an evidence-first workspace where a person and a WebMCP agent can collaborate on the same verification checklist without uploading the original message to a backend or letting the agent act without visible permission.

## What it does

A user pastes the text of a job offer and confirms that personal information has been removed or masked. OfferProof then analyzes the message locally in the browser using deterministic rules.

The current MVP supports eight canonical signal types:

- upfront payment requests;
- cryptocurrency or gift-card payment;
- urgency pressure;
- off-platform contact;
- sensitive-data requests;
- shortened links;
- missing employer details; and
- vague job terms.

Every detected signal includes supporting evidence, a factual observation, a limited inference, and an explicit limitation. When evidence could contain a sensitive value, OfferProof returns a fixed redacted placeholder instead of reproducing that excerpt. OfferProof never produces a fraud verdict, safety verdict, confidence score, automatic report, payment, message, or external action.

The user can generate a verification checklist, mark steps complete, undo a change, and open curated Korean official resources for manual review.

Through WebMCP, an agent can use five page-native tools:

- `get_case_summary`
- `inspect_offer_signals`
- `build_verification_plan`
- `update_verification_step`
- `get_official_resources`

Read operations and mutation operations are separated. Checklist mutations are rejected until the user explicitly enables agent changes on the page. The same core workflow remains available manually when WebMCP is unavailable.

## How we built it

OfferProof is a Vite, React, and TypeScript client-side application with no required backend or API key.

The analysis engine uses deterministic Korean-language patterns so the same input produces the same ordered signals. Detection runs against the original input, while evidence shown to the interface and WebMCP tools is masked before being returned. Full offer text is intentionally excluded from the case-summary tool.

The page registers five typed tools through `document.modelContext`. Their JSON schemas restrict inputs with required fields, enums, item limits, and `additionalProperties: false`.

Each review receives a unique case ID and a monotonically increasing numeric version. Agent mutations must provide the current ID and expected version, preventing stale requests from changing a new or edited case. Editing the offer invalidates the previous analysis while preserving and locking earlier checklist history. Undo creates a new version and never restores consent that the user has since withdrawn.

The automated suite contains 22 passing tests covering deterministic analysis, sensitive-value masking, prompt-injection text handling, consent gates, case and version conflicts, stale analysis, checklist preservation, undo behavior, and WebMCP tool responses. The production build and production-dependency audit also pass locally.

## Challenges we ran into

The hardest problem was not detecting words; it was designing safe collaboration between page state, user actions, and agent actions.

Offer text is untrusted content and may itself contain instructions such as “ignore previous instructions.” We had to ensure that such text remained data for inspection rather than becoming executable guidance.

Another challenge was detecting a sensitive-data request without leaking the sensitive value. We solved this by detecting signals from the original input, then masking the evidence before exposing it through the interface or tools.

State synchronization was also important. A checklist update based on an old case or version could otherwise modify the wrong review. Unique case IDs, monotonic versions, stale-state rejection, explicit mutation consent, and undo make those boundaries visible and testable.

## Accomplishments that we're proud of

We built a working browser-local MVP that demonstrates WebMCP as more than a collection of button shortcuts.

OfferProof exposes meaningful, stateful operations while retaining human control. It can reject an unauthorized agent mutation, generate a verification plan after consent, update one checklist item, preserve progress across reanalysis, lock obsolete steps, and safely undo changes.

All five tools were registered in a local WebMCP-enabled browser test. The core read-and-mutation flow was exercised with `get_case_summary`, `build_verification_plan`, and `update_verification_step`, including rejection before consent and visible success after consent. The application also works as a manual interface without WebMCP.

We are especially proud that the product avoids sensational verdicts. Every signal stays connected to observable source text and communicates what the system cannot conclude.

## What we learned

WebMCP is most valuable when a website exposes its real domain operations instead of forcing an agent to infer intent from buttons and layout.

We also learned that agent-compatible interfaces need more than tool schemas. They need consent boundaries, redaction, stale-state handling, reversible mutations, and visible feedback for the person sharing control with the agent.

Separating observations, inferences, and limitations made the experience more trustworthy than presenting a single opaque risk score.

## What's next

- Expand language coverage beyond the current Korean deterministic patterns.
- Add carefully maintained official-resource registries for more jurisdictions.
- Improve accessibility and mobile-device testing.
- Add an opt-in, privacy-preserving export for user-owned verification records.

The evidence-first model will remain central: agents may help organize verification, but users retain control over external actions and final decisions.

## Links to fill after live verification

- Live demo: `[ADD VERIFIED PUBLIC URL]`
- Source code: `https://github.com/kjs844-art/offerproof-webmcp`
- Public demo video: `[ADD PUBLIC YOUTUBE URL]`
