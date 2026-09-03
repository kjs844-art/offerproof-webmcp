# Issue 26 — Offroof experience and WebMCP polish

## Branch

- Working branch: `codex/firstvibe/issue-26-experience-polish`
- Base commit: `ad90924`
- Experience and submission-preparation commits were pushed and merged to `codex/firstvibe/integration` through PRs #28 and #30. Release PR #29 targets `main`.

## Outcome

The MVP now reads as an editorial evidence desk instead of a static demo or generic AI dashboard. The visible brand is **Offroof** and the hero line is “제안은 말로, 확인은 근거로.” It uses a dark case-file cover, browser-local source transcript, evidence cards, verification record, bibliography-style official sources, and table-like WebMCP activity log. A restrained blue web-glass treatment now connects the sticky header, navigation, major page shells, and workspace panels. Major shells use 22-26 pixel corners, inner cards use 16 pixels, and controls use 12-14 pixels. Solid reading and warning surfaces remain opaque for contrast. Cobalt tactile buttons keep a real pressed-depth state while reduced-motion and reduced-transparency fallbacks remain available.

The app now provides three state-preserving SPA views without a router dependency: Overview, Review offer, and Case record. Query-string navigation supports browser back/forward and GitHub Pages without a server rewrite. Manual or WebMCP signal inspection opens the Case record so the result and activity trail are visible. Buttons use restrained tactile depth and a pressed state while reduced-motion behavior remains available.

Review offer now accepts browser-local `.txt`, `.md`, and simple single-part `text/plain` `.eml` files up to 1 MiB and 50,000 characters. File contents flow through the existing `updateOfferText()` state transition, so privacy and agent-change consent are cleared and previous analysis is invalidated. Binary-like files, multipart/HTML/encoded email, PDF, Word, archives, and executables are rejected. Files, links, HTML, and email attachments are never opened or executed, and no filename or email metadata is exposed through WebMCP.

The interface now has a real Korean/English switch. Locale remains presentation-only: switching language preserves case ID/version, privacy and agent consent, signals, checklist completion, receipts, and the six stable WebMCP contracts. UI copy, notices, timestamps, signal explanations, verification labels, and receipt messages are localized; source evidence remains verbatim. A tested English fictional sample and English recognition patterns were added for the same six core signals used by the Korean sample.

The existing six WebMCP tools were strengthened without adding a seventh tool or expanding into email-account access:

- stable titles, strict schemas, fixed error codes, and bounded registration retries;
- privacy-safe structured results with visible UI destinations and consent-aware next actions;
- correctly conservative `readOnlyHint` values for receipt-producing tools;
- filtered newest-first activity receipt lookup;
- representative tool responses kept within a 1,500-character budget;
- unknown internal errors no longer leak raw messages.

The old `demo.html` mock now redirects to the real application so it cannot be mistaken for an implemented second interface. `robots.txt` and `llms.txt` were added for crawler and agent discovery.

## Files changed

- `src/App.tsx`
- `src/styles.css`
- `src/i18n.ts`
- `src/sourceIntake.ts`
- `src/domain/engine.ts`
- `src/webmcp/useOfferProofTools.ts`
- `tests/domain-engine.test.ts`
- `tests/webmcp-tools.test.ts`
- `demo.html`
- `DESIGN.md`
- `public/robots.txt`
- `public/llms.txt`

`package-lock.json` has the same filtered Git object hash as `HEAD`; Git reports it modified only because the Windows working copy uses CRLF line endings.

## Verification evidence

- `npm test`: 43/43 tests passed after the final accessibility and read-only contract regressions were added.
- `npm run build`: passed; Vite production bundle generated.
- `git diff --check`: no whitespace errors; Windows LF-to-CRLF notices only.
- `designmd lint DESIGN.md`: 0 errors, 0 warnings.
- Frontend Design Premium strict audit: 0 findings.
- Lighthouse desktop: Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100; 52 passed, 0 failed.
- Lighthouse mobile: Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100; 52 passed, 0 failed.
- Codex in-app browser native WebMCP discovery: all six tools were listed from `http://127.0.0.1:4184/`.
- Native WebMCP execution with the fictional sample: `inspect_offer_signals` returned six masked signals; after visible mutation consent, `get_case_summary` and `build_verification_plan` produced six visible checklist steps. The UI activity trail recorded the calls.
- Browser bilingual flow: the English sample produced six signals; switching English → Korean preserved the analyzed case and signal count without re-registering WebMCP.

## Deployment readiness snapshot

- The repository contains an MIT `LICENSE` and a GitHub Pages workflow for `main`.
- On 2026-09-03 the user approved the release; the repository was changed to public and GitHub Pages was enabled for Actions deployment.
- The judge-accessible deployment remains pending until release PR #29 reaches `main` and the resulting Pages run is verified.

## Explicit non-claims

- No Gmail, Naver, or Kakao login or inbox integration exists.
- Local text import is not a malware verdict, sender authentication, attachment inspection, or sandbox execution.
- No link is opened, employer contacted, payment sent, or report filed automatically.
- The deterministic rules surface observable verification signals; they do not determine that an offer is fraudulent or safe.

## Safe attachment feature boundary for a future issue

A browser-local first release can let the user deliberately select or drag a downloaded attachment without opening it, then inspect allow-listed metadata, file extension versus detected signature, size, hash, and safely extracted plain text. It must never execute active content and must report only signals and limitations. Direct pre-click inspection inside a third-party mailbox requires a separate browser-extension or approved OAuth/API integration. High-confidence malware verdicts require an isolated scanner or sandbox beyond this browser-local MVP.
