# OfferProof final submission checklist

## Build and repository

- [x] Core MVP implemented on the integration branch.
- [x] Six WebMCP tools implemented; the original five-tool set was registered locally and the sixth is contract-tested.
- [x] Automated tests pass: 28/28.
- [x] Production build passes.
- [x] Production dependency audit reports zero vulnerabilities.
- [x] GitHub Pages workflow prepared in PR #15.
- [ ] Merge the reviewed deployment PR into `codex/firstvibe/integration`.
- [ ] Confirm the full integration diff and merge it into `main`.
- [ ] Change the GitHub repository to public after owner approval.
- [ ] Add an owner-approved open-source license.
- [ ] Confirm the repository contains no secrets or real personal information.

## Public demo

- [ ] Enable GitHub Pages with GitHub Actions as the source.
- [ ] Verify the public root page returns HTTP 200.
- [ ] Verify JavaScript and CSS assets return HTTP 200.
- [ ] Run the complete manual sample flow on the deployed URL.
- [ ] Verify all six WebMCP tools on the deployed URL.
- [ ] Verify mutation rejection before consent and success after consent.
- [ ] Verify read, analysis, blocked mutation, and successful mutation receipts appear without raw inputs.
- [ ] Verify no dedicated raw-text field or secret value is returned by tools; sanitized evidence sentences are expected after consent.
- [ ] Test the deployed UI at a narrow mobile width.

## Video and media

- [ ] Record the built-in fictional sample only.
- [ ] Show a WebMCP tool call changing visible page state.
- [ ] Include spoken English or accurate English subtitles.
- [ ] Keep the final cut under three minutes.
- [ ] Upload as a public YouTube video and verify playback while signed out.
- [ ] Capture a clean landscape hero image.
- [ ] Capture analysis evidence and consent-gate screenshots.
- [ ] Capture the WebMCP tool list and visible tool-result screenshot.
- [ ] Capture the action-receipt timeline showing one blocked and one successful mutation.

## Devpost

- [ ] Paste the verified live-demo URL.
- [ ] Paste the public GitHub repository URL.
- [ ] Paste the public YouTube URL.
- [ ] Paste and proofread `submission/DEVPOST.md`.
- [ ] Add technologies used: WebMCP, React, TypeScript, Vite, GitHub Pages.
- [ ] Add team/member information.
- [ ] Preview the submission and test every link.
- [ ] Submit before the deadline and save the confirmation page.
