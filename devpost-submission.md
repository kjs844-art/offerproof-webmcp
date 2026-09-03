# Offroof — Devpost submission draft

### ⏳ Not submitted yet

Nothing has been sent to Devpost.

## One-line summary

**Offroof turns suspicious job-offer wording into traceable evidence and a consent-controlled verification plan that a person and a WebMCP agent can work on together.**

## Inspiration

Job offers often arrive as a mixture of ordinary details, missing context, urgency, requests for money, and invitations to move to an unofficial channel. A person under pressure can miss the difference between an observed fact and an assumption. We wanted a calm workspace that preserves the original wording, shows why a phrase deserves verification, and keeps the person in control of every consequential change.

## What it does

Offroof accepts fictional or privacy-cleaned offer text by paste or browser-local `.txt`, `.md`, and simple `text/plain` `.eml` import. It detects deterministic verification signals, keeps each signal attached to the exact supporting excerpt, and separates:

- what the message literally says;
- the limited inference a reviewer may draw;
- what Offroof cannot conclude;
- the next verification step.

The app never labels an offer as fraudulent or safe. It never opens a link or attachment, contacts an employer, sends money, or files a report. Instead, it creates an inspectable case record and a reversible checklist.

## Why WebMCP

A normal webpage exposes visual controls that an agent must infer from layout. Offroof exposes the same case as six semantic, page-native tools through `document.modelContext.registerTool(...)`. The agent can read a sanitized summary, inspect signals, build a plan, update one step, fetch allow-listed official resources, and review a privacy-safe action trail.

WebMCP is central rather than decorative:

1. The human and agent share the same visible case and checklist.
2. Read/analysis operations are separated from state-changing operations.
3. Checklist mutations require explicit on-page consent.
4. Case ID and version guards reject stale mutations.
5. Operational calls create visible, sanitized receipts without retaining offer text or raw arguments; reading the receipt list does not create a recursive receipt.
6. The interface still works manually when no WebMCP client is connected.

## How we built it

Offroof is a static React, TypeScript, and Vite application. The domain engine, masking, signal inspection, file-intake validation, state transitions, and WebMCP adapters run entirely in the current browser tab. No backend, account, API key, or real personal data is required.

The six tools use bounded JSON schemas, required fields, enums, `additionalProperties: false`, stable error codes, conservative annotations, and structured results small enough for an agent to use reliably. Mutation tools validate consent plus the latest case ID and version. Local receipts record only the tool name, class, outcome, case reference, version, timestamp, and a safe summary.

The app provides three state-preserving views—Overview, Review offer, and Case record—and a Korean/English switch that does not reset the active case.

## WebMCP tools

- `get_case_summary` — returns a sanitized snapshot and safe next actions.
- `inspect_offer_signals` — runs deterministic inspection and returns evidence-backed signals.
- `build_verification_plan` — creates the visible checklist only after user consent.
- `update_verification_step` — updates one current step with case/version guards.
- `get_official_resources` — returns allow-listed public guidance for manual review.
- `get_action_receipts` — returns filtered, newest-first, privacy-safe activity receipts.

## Challenges we ran into

The hard part was not detecting keywords; it was defining a truthful safety boundary. A read can still create an activity receipt, a checklist update must not silently operate on stale state, and untrusted offer text must never be treated as agent instruction. We also had to make the manual and agent paths converge on the same domain transitions so the demo is not a separate mock.

## Accomplishments that we are proud of

- Six real WebMCP tools discovered and executed in a native client.
- Visible consent, stale-state guards, reversible mutations, and action receipts.
- Exact evidence excerpts with no fraud verdict or confidence theater.
- Browser-local import with strict rejection of active, binary, multipart, HTML, and encoded content.
- Korean/English presentation with case state preserved.
- 43 automated tests, passing production build, and zero production dependency vulnerabilities.
- Desktop and mobile audits scoring 100 for Accessibility, Best Practices, SEO, and Agentic Browsing.

## What we learned

WebMCP works best when the page is already a trustworthy product for a person. Semantic tools can then expose the same safe operations to an agent, with schemas, consent, state guards, visible effects, and receipts. The protocol does not replace product boundaries; it makes those boundaries machine-operable and easier to audit.

## What's next

Future work could add an opt-in browser extension or approved provider integration for pre-click mailbox review. A separate isolated scanner could inspect deliberately selected attachments by signature, hash, metadata, and safely extracted text. Those capabilities are intentionally outside this browser-only submission and would never silently open or execute content.

## Try it

Live app: https://kjs844-art.github.io/offerproof-webmcp/

Public repository: https://github.com/kjs844-art/offerproof-webmcp

## Testing instructions for judges

1. Open the live app in a WebMCP-capable client.
2. Choose **Try the sample** (or **예시로 시작**) to load fictional data.
3. Confirm the privacy checkbox and run **Inspect signals**.
4. Discover the six page tools and call `get_case_summary`, then `inspect_offer_signals`.
5. Call `build_verification_plan` before enabling agent changes; verify that it is blocked and a receipt appears.
6. Enable **Allow agent changes** on the page.
7. Read the latest case ID/version with `get_case_summary`, then call `build_verification_plan` again.
8. Call `update_verification_step` for one current step, verify the visible change, and use **Undo** if desired.
9. Call `get_action_receipts` and verify that read, blocked, and successful actions appear without raw offer text.
10. Switch Korean/English and navigate among the three views; confirm that the case remains intact.

Exact prompts and expected results are in `submission/TESTING_INSTRUCTIONS.md`.

## Demo video

**Pending public YouTube URL.** The canonical 2:35 script is in `submission/DEMO_SCRIPT.md`, with English captions in `submission/OFFROOF_EN.srt`.

## Technologies used

WebMCP, React, TypeScript, Vite, Node.js test runner, GitHub Actions, and GitHub Pages.

## Draft answers for required form fields

- Submitter type: **Team of Individuals**
- Country/region: **[USER CONFIRM every team member's country; likely Korea Republic of if both reside in Korea]**
- Organization: **[Optional; leave blank if submitting as an individual]**
- App status: **New app**
- Existing-app changes: **Not applicable**
- Live URL: `https://kjs844-art.github.io/offerproof-webmcp/`
- Public repository: `https://github.com/kjs844-art/offerproof-webmcp`
- Agents/clients tested: **Codex in-app browser with native WebMCP discovery and execution on the deployed public URL**
- AI tools leveraged: **[USER CONFIRM exact list; current draft: OpenAI Codex and Claude-family coding agents]**
- Learning level: **[USER CONFIRM]**
- Did AI make a career in tech feel more achievable?: **[USER CONFIRM]**
- Demo video URL: **[PENDING PUBLIC YOUTUBE URL]**

## Screenshot shot list

1. Overview hero with Offroof, Korean/English switch, and WebMCP connection status.
2. Review offer with fictional sample, privacy boundary, and local-file intake.
3. Case record with evidence cards and exact excerpts.
4. Consent-controlled checklist plus the blocked/successful action receipts.
5. Native WebMCP client showing all six discovered tools and one successful structured result.

## Submission readiness notes

- Use only fictional sample data in screenshots and video.
- Keep accounts, notifications, bookmarks, tokens, and personal files outside the frame.
- Verify the live app, repository, and YouTube video while signed out.
- Do not edit the repository, live site, video, or Devpost entry after the deadline until judging ends.

## Known limitations

- Offroof provides verification signals, not a fraud or malware verdict.
- It does not authenticate a sender, open links, inspect remote inboxes, execute files, or scan attachments in a sandbox.
- Local `.eml` support is deliberately limited to simple single-part plain text.
- WebMCP availability depends on a compatible browser or agent client; the full manual workflow remains available without it.
