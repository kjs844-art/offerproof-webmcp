# OfferProof live demo script

Target runtime: **2 minutes 40 seconds**. Use Case 1 from `DEMO_CASES.md` through the built-in **안전한 예시 불러오기** control. Record spoken English or add accurate English subtitles.

| Time | Screen action | English narration |
| --- | --- | --- |
| 0:00–0:15 | Show the title and empty workspace. | “OfferProof turns suspicious job-offer wording into an evidence-backed verification checklist. It does not declare an offer fraudulent or safe.” |
| 0:15–0:30 | Click **안전한 예시 불러오기**. | “This is a completely fictional Korean example. Processing happens in the current browser tab, with no required backend, account, or API key.” |
| 0:30–0:45 | Try inspection before privacy confirmation, then select **입력 내용을 확인했고 표시용 마스킹에 동의합니다.** | “Inspection is gated until the user confirms that personal information has been reviewed. This makes the privacy boundary visible instead of assuming consent.” |
| 0:45–1:05 | Call `inspect_offer_signals({})` from the WebMCP client and show the six cards. | “A page-native WebMCP tool runs the same deterministic inspection as the manual button. Six signals point to observable wording about upfront payment, urgency, off-platform contact, a shortened link, missing employer details, and vague terms.” |
| 1:05–1:20 | Show a card’s evidence, 관찰, 제한된 추론, and 한계. | “Each result separates what the text says, what may need checking, and what the rule cannot conclude. There is no score or verdict.” |
| 1:20–1:35 | Call `get_case_summary({})`; show case ID, numeric version, signals, and the absence of full input text. | “The agent receives structured page state, but the summary deliberately excludes the full offer text.” |
| 1:35–1:50 | Call `build_verification_plan` before enabling agent changes and show rejection. | “Read access does not silently become write access. A mutation is rejected until the user explicitly allows agent checklist changes.” |
| 1:50–2:10 | Enable **에이전트의 체크리스트 변경 허용**, retry with the current case ID and version, and show the checklist. | “After visible consent, the tool creates a verification plan. The request is tied to the current case and version, so stale agent actions cannot modify a newer review.” |
| 2:10–2:25 | Call `update_verification_step` for one current step and show it become complete. | “A second mutation updates one step, and the result appears immediately in the shared interface.” |
| 2:25–2:35 | Click **되돌리기**. | “The person can undo the change. Undo creates a newer version and never restores consent that was later withdrawn.” |
| 2:35–2:40 | Briefly show official resources and return to the title. | “Official links remain user-controlled. OfferProof: evidence first, consent always.” |

## Exact tool-call notes

- `inspect_offer_signals` and `get_case_summary` take `{}`.
- Use the latest returned `caseId` and `caseVersion` as `expectedVersion` for every mutation.
- `build_verification_plan` requires `caseId` and `expectedVersion`; `signalIds` is optional.
- `update_verification_step` requires `caseId`, `expectedVersion`, a current `stepId`, and `status` equal to `todo` or `done`.
- `get_official_resources` takes `{}` and does not open a link or submit a report.

## Recording guardrails

- Keep the uploaded video under three minutes.
- Hide bookmarks, notifications, account details, and any unrelated browser tabs.
- Do not use real personal information or a real job offer.
- Do not say the app remembers data after refresh; the current MVP stores state in the current tab memory.
- Do not say all five tools were successfully exercised until the final deployed-browser test actually confirms that claim.
- If WebMCP is unavailable during recording, stop and fix the client connection instead of pretending a manual click was a tool call.
