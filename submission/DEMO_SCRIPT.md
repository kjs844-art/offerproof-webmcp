# Offroof canonical demo script

Target final runtime: **2:35 or less**. Record at 1080p landscape. Use the built-in fictional sample only. Begin with the app already open and remove all loading, typing, and setup pauses.

| Time | Screen action | English narration |
| --- | --- | --- |
| 0:00–0:12 | On Review offer, load the fictional sample, confirm privacy, and run inspection. Cut directly to the six evidence cards. | “A suspicious job offer may mix normal details with pressure and risky requests. Offroof turns the exact wording into evidence-backed verification steps—without issuing a fraud verdict.” |
| 0:12–0:30 | Show one evidence card: excerpt, observation, limited inference, and limitation. | “Everything runs in this browser tab. Each signal stays tied to a source excerpt and clearly separates what was observed from what the app cannot conclude.” |
| 0:30–0:50 | Show the WebMCP client discovering all six tools, then call `get_case_summary`. | “The page exposes six semantic WebMCP tools. An agent can understand the current case through structured results instead of scraping buttons or guessing from layout.” |
| 0:50–1:10 | Call `build_verification_plan` before enabling agent changes. Show the blocked result and receipt. | “Reading and changing are different permissions. Without visible consent, a checklist mutation is rejected and recorded as a privacy-safe blocked action.” |
| 1:10–1:36 | Enable agent changes, call `build_verification_plan` with the current case ID/version, and show the checklist. | “After the person explicitly enables agent changes, the same tool creates a verification plan. Case and version guards prevent a stale request from changing another review.” |
| 1:36–1:55 | Call `update_verification_step`; show the visible completed step and Undo control. | “The agent updates one current step, the interface changes immediately, and the person can undo it. Offroof keeps human control visible.” |
| 1:55–2:12 | Call `get_action_receipts`; show read, blocked mutation, and successful mutation rows. | “A local activity trail shows what the agent read, changed, or was blocked from doing. It never stores the offer, personal data, secrets, or raw tool arguments.” |
| 2:12–2:25 | Show official resources, then briefly switch Korean ↔ English without losing the case. | “Official resources remain user-controlled, and the bilingual interface preserves the same case. No link, message, payment, or report is executed automatically.” |
| 2:25–2:35 | Finish on the hero and product name. | “Offroof: evidence before action, consent before change.” |

## Recording gates

- Show the project functioning in the first 10–15 seconds.
- Show real discovery and at least one real WebMCP call; do not substitute a mock panel.
- Keep browser bookmarks, notifications, accounts, real offers, and secrets outside the frame.
- Use clear English narration or the checked English subtitles in `OFFROOF_EN.srt`.
- Upload publicly to YouTube and verify playback while signed out.
- Do not edit the submitted video, repository, or live site after the deadline and until judging ends.
