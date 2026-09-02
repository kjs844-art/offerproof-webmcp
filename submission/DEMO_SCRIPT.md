# OfferProof demo script

Target runtime: **2 minutes 50 seconds maximum**. Use the built-in fictional example only. Record at 1080p, include spoken English or accurate English subtitles, and keep the browser zoom high enough to read evidence and tool results.

| Time | Screen action | English narration |
| --- | --- | --- |
| 0:00–0:15 | Show the OfferProof title and main workspace. | “Suspicious job offers rarely look completely fake. Instead of asking AI for an unreliable scam verdict, OfferProof helps users identify exactly what needs verification and why.” |
| 0:15–0:35 | Load the safe example and briefly show the fictional offer. | “OfferProof is a browser-local, WebMCP-enabled job-offer verification workspace. The message is processed in the current browser tab. There is no required backend, account, or API key.” |
| 0:35–0:55 | Check the privacy confirmation and run the analysis. | “Before analysis, the user must confirm that personal information has been reviewed. OfferProof applies deterministic rules to the original message and masks sensitive values before returning evidence.” |
| 0:55–1:20 | Show several signal cards, including evidence, observation, inference, and limitation. | “The example produces evidence-backed signals for issues such as upfront payment, urgency, off-platform contact, a shortened link, missing employer details, and vague terms. Each card separates observed text from a limited inference and states what the signal cannot prove. There is no fraud score and no safety verdict.” |
| 1:20–1:38 | Show WebMCP status and the five registered tools in the compatible client or inspector. | “The page registers five semantic WebMCP tools. An agent can inspect the current case, build a verification plan, update one step, and retrieve official resources without scraping the interface.” |
| 1:38–1:58 | Call `get_case_summary`, then try `build_verification_plan` before enabling agent changes. Show the rejection. | “The summary omits the full offer text. When the client tries to change the checklist before permission is granted, OfferProof rejects the request. Agent access does not silently become write access.” |
| 1:58–2:20 | Enable agent checklist changes, build the plan, and mark one step complete through WebMCP. | “After the user explicitly enables agent changes, the tool can create a verification checklist. A second tool updates one current step, and the result immediately appears in the shared interface.” |
| 2:20–2:34 | Undo the change. Optionally edit the offer and show the previous checklist becoming locked. | “Changes are reversible and versioned. If the offer changes, previous analysis becomes stale, and outdated checklist steps are preserved but locked instead of being silently reused.” |
| 2:34–2:50 | Show official-resource cards and finish on the product title. | “OfferProof never sends a report, payment, or message. It guides the user toward official resources and keeps the final decision with the person. OfferProof: evidence first, consent always.” |

## Recording truth checks

- Say “WebMCP-enabled client” unless the final recording actually shows ChatGPT controlling the page.
- Say “public demo” only after the deployed URL has been opened and verified.
- Do not show real personal data, job offers, secrets, browser bookmarks, notifications, or API keys.
- Keep the final video under three minutes after upload processing.
