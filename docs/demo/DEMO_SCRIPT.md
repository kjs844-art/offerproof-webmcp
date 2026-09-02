# OfferProof Demo Script – 2-Minute Flow

## Purpose

This script guides a live demonstrator through a 2-minute walkthrough of OfferProof's core functionality using the fictional Case 1 from DEMO_CASES.md. The demo does not claim the app is production-ready and focuses on the signal detection and verification planning workflow.

---

## Setup (Before Demo)

- Have DEMO_CASES.md Case 1 text copied to clipboard
- Open app in browser (or have two windows: one for app, one for this script)
- Ensure WebMCP capability is present (or note if running manual fallback)
- Confirm no real personal data is visible on screen
- Have a phone/browser ready to show "official resource lookup" concept

**Total time budget: 2 minutes (120 seconds)**

---

## Demo Flow with Timing

### Segment 1: Introduction & Paste (0:00–0:20)

**Narration:**
> "OfferProof helps you spot what needs verification in job offers. It's not a pass/fail tool—it's a checklist builder. Let me walk through an example."

**Actions:**
1. **Show the app's input screen** (empty state)
2. **Paste Case 1 fictional offer text** into the input field
3. **Point out the data warning**: "The app shows a warning that your input may contain sensitive info—we're not sending it to a server."

**Key message:** "This is a fictional example so we can safely show the workflow."

---

### Segment 2: Signal Detection (0:20–0:50)

**Narration:**
> "Watch what happens when we ask the app to inspect this offer."

**Actions:**
1. **Click "Inspect Signals"** (or equivalent WebMCP call to `inspect_offer_signals`)
2. **Four signals appear on screen**:
   - ✓ **Upfront Payment** – "transfer $450 for the training materials"
   - ✓ **Urgency Pressure** – "by tomorrow or we'll lose your spot"
   - ✓ **Off-Platform Contact** – "Contact me directly at [email]"
   - ✓ **Restricted Discussion** – "Don't talk to anyone on other platforms"

3. **Point to each signal's structure**:
   - **Evidence phrase** from the original text (highlighted or quoted)
   - **What it means** (observation)
   - **Limitation** (e.g., "Can't confirm if the company is real")

**Key message:** "Notice each signal points to the exact words in the offer and explains what makes it unusual—not a judgment of 'scam,' just 'needs verification.'"

---

### Segment 3: Verification Planning (0:50–1:20)

**Narration:**
> "Now let's build a checklist. The app asks: 'Which of these signals concern you most?' We select all four, pick a country for official guidance, and get a plan."

**Actions:**
1. **Select all four signals** (checkboxes or similar)
2. **Choose jurisdiction** (e.g., "United States")
3. **Click "Build Verification Plan"** (or equivalent WebMCP call to `build_verification_plan`)
4. **A checklist appears with 7–8 steps**:
   - Search official company website
   - Check LinkedIn for careers page
   - Contact company via official phone/email
   - Verify training provider (if any)
   - Ask HR why upfront payment is needed
   - Confirm with coworkers
   - Research norms for this role

**Key message:** "The app doesn't do the verification for you—it tells you *what* to verify and *why*. You stay in control."

---

### Segment 4: Official Resources & Manual Fallback (1:20–1:50)

**Narration:**
> "If the app supports WebMCP, it links to official government and nonprofit guidance. If not, users manually look up the same resources."

**Actions:**
1. **Show "Get Official Resources"** (WebMCP call to `get_official_resources` with jurisdiction + topics)
2. **Display sample links**:
   - FTC Job Scams guidance
   - Better Business Bureau tips
   - IC3 (Internet Crime Complaint Center) report form
3. **Point out**: "The app doesn't send your case to these sites—you open the links yourself and decide what to report."

**Alternative (Manual Fallback):**
- "If WebMCP isn't available, the user would manually search for these sites."
- Show browser search: "FTC job offer scams" → Same resources found

**Key message:** "Official guidance is always accessible, whether through the app or directly. Verification is your responsibility."

---

### Segment 5: Ongoing Checklist & Case Tracking (1:50–2:00)

**Narration:**
> "As you complete steps, you update the checklist. The app keeps track so you don't lose your progress."

**Actions:**
1. **Mark 1–2 checklist items as "Done"** (e.g., "Searched official company website," "Called reception number")
2. **Show the updated state** (timestamp, case version number)
3. **Explain**: "If you come back to this case tomorrow, the checklist remembers where you stopped."

**Key message:** "Your work is saved locally in your browser—no account needed, nothing uploaded."

---

## Closing (2:00–2:10, if time allows)

**Narration:**
> "OfferProof doesn't replace your judgment—it organizes what you need to check. Start with the signals, build the checklist, and verify through official channels. You're in control the whole time."

---

## What NOT to Say During Demo

- ❌ "This offer is a scam" – Only: "This needs verification."
- ❌ "This company is definitely safe" – Only: "No red flags found" or "Verification needed."
- ❌ "The app proved it's fraud" – Only: "The app flagged concerns that need checking."
- ❌ "The app can replace talking to a lawyer" – Only: "For legal questions, consult a professional."
- ❌ "We've already checked all offers in this database" – Reality: "This is a demo with fictional data."
- ❌ "Your data is secured on our server" – Reality: "Your input stays in your browser; we don't store it."

---

## Handling Questions During Demo

| Question | Answer |
|----------|--------|
| "Can it detect all scams?" | "No. It flags patterns that need verification. Real scams are creative, so we focus on signal consistency rather than perfect detection." |
| "Why not auto-report to police?" | "Because automated reports aren't reliable and could harm innocent people. You report through official channels only when you're sure." |
| "Can I use this in [country]?" | "The demo uses US resources. Full version will support more jurisdictions, but each needs official guidance that's current and accurate." |
| "How is this different from a resume checker?" | "This is specifically for *you* to verify *your* safety before committing to a job. It's not about grading the employer." |
| "What if I disagree with a signal?" | "Great question. Each signal has a limitation note—you decide if it's relevant to you. The app is a starting point, not a final answer." |

---

## Technical Notes for Demonstrator

- If WebMCP fails or is unavailable: Proceed with manual workflow (show browser searching for same resources).
- If any personal data appears on screen: Stop and re-stage with fully anonymized/fictional data.
- If checklist state doesn't persist: Explain "In the real version, your progress is saved."
- If signal wording differs from demo text: Explain "The app detected the same concern in different wording—this is expected."

---

## Debrief Talking Points

After the 2-minute demo, if time allows:

1. **"This is a prototype showing the workflow."** Real implementation will iterate based on feedback.
2. **"We're not building a fraud detector."** We're building a verification checklist builder.
3. **"Every signal has a limitation."** This prevents overconfidence and maintains user agency.
4. **"Official resources stay official."** The app links to them but doesn't replace them.
5. **"This works offline-first."** No account, no tracking, just local browser state.

