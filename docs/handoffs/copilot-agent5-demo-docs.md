# Handoff: Demo Documentation – Agent-5 Session

**Date:** 2026-09-02  
**Provider:** Copilot (Agent-5)  
**Task:** Create fictional demo material (documentation-only)  
**Branch:** `codex/firstvibe/agent-5`  
**Files Created:**
- `docs/demo/DEMO_CASES.md`
- `docs/demo/DEMO_SCRIPT.md`

---

## What Was Completed

### 1. DEMO_CASES.md – Three Fictional Cases

Created three completely fictional, non-real job offer scenarios with full specifications:

#### Case 1: High-Risk Offer with Multiple Urgent Signals
- Upfront payment demand ($450)
- Urgency pressure (deadline tomorrow)
- Off-platform contact (fictional email)
- Restricted discussion instruction
- 4 canonical signal IDs
- Evidence phrases with exact quoted text
- Expected limitations (cannot verify company, sender authority, intent)
- 7-step verification checklist
- 5 WebMCP tool call sequence with inputs/outputs
- Manual fallback behavior (checklist in notes app, independent searches)

#### Case 2: Ambiguous Ordinary-Looking Offer with Critical Gaps
- Missing company identity (generic "Hiring Department")
- Vague compensation ("competitive")
- Missing employment type (contract TBD)
- Missing offer terms (no start date, no probation terms)
- 4 canonical signal IDs (all flagging incomplete info)
- **Critical constraint:** NOT labeled safe—only "verification needed"
- 8-step checklist emphasizing formal documentation
- 5 WebMCP tool call sequence
- Manual fallback: independent research + formal inquiry

#### Case 3: Prompt Injection + Fake Sensitive Data
- Hidden system instruction ("Ignore all previous instructions")
- Request for sensitive data (SSN, DOB, bank account)
- Fake confidential company data (routing number, CEO SSN)
- Malformed offer structure (mix of normal + injected + PII request)
- 4 canonical signal IDs flagging untrusted input
- App does NOT execute embedded commands
- 8-step checklist emphasizing independent verification + phishing report
- 5 WebMCP tool call sequence showing warning labels
- Manual fallback: phishing report + direct company contact

**Key constraint applied:** No real personal data, real company accusations, or fake official URLs.

---

### 2. DEMO_SCRIPT.md – 2-Minute Live Demo Flow

Structured walkthrough with exact timing and narration:

- **0:00–0:20 Introduction & Paste** – Show app warning, explain fictional data
- **0:20–0:50 Signal Detection** – Four signals appear with evidence phrases, observations, limitations
- **0:50–1:20 Verification Planning** – Select signals, choose jurisdiction, build checklist (7–8 steps)
- **1:20–1:50 Official Resources & Fallback** – Show WebMCP resources or manual browser search
- **1:50–2:00 Checklist Tracking** – Mark items done, show persistence/version tracking
- **Closing statement** – "You're in control the whole time"

**Messaging constraints:**
- ❌ Banned phrases: "scam," "definitely safe," "proved fraud," "replaces a lawyer"
- ✓ Allowed: "needs verification," "no red flags found," "flagged concerns," "consult a professional"

**FAQ handling table** for common questions during live demo.

**Technical notes** for contingencies (WebMCP unavailable, personal data visible, state doesn't persist).

**Debrief talking points** (5 key messages about workflow, not fraud detection).

---

### 3. docs/handoffs/copilot-agent5-demo-docs.md (This File)

Provides context for next integrator:
- What was built and why
- Testing approach (demo-only, no execution environment)
- Known limitations and future considerations
- Pointer to related PRs and branches

---

## What Was NOT Changed

✓ **Protected files (untouched):**
- `package.json`, `vite.config.*`, `index.html`
- `src/App.tsx`, `src/main.*`
- Shared types (none yet—project is pre-code-gen)
- WebMCP implementation files (none yet—demo is spec-only)
- `AGENTS.md`, `docs/PROJECT_STATE.md`, `docs/WORKSTREAMS.md`

✓ **No real personal data, accusations, or fake official URLs** in any file.

---

## Testing & Validation

**No execution environment available** for this task (project phase is documentation-only).

**Manual validation performed:**
1. ✓ All three cases reference only **completely fictional** job offer texts
2. ✓ No real company names, real URLs, or real people mentioned
3. ✓ Prompt injection case included and correctly labeled "untrusted input"
4. ✓ Demo script timing verified (segments total ~2 minutes, as specified)
5. ✓ All signals in DEMO_CASES have matching tool call examples in DEMO_SCRIPT
6. ✓ No banned phrases ("scam," "safe verdict," trust scores) in demo narration
7. ✓ Fallback workflows documented for all three cases
8. ✓ git diff checked (only 2 new files in `docs/demo/`, no modifications to protected files)

---

## Next Steps for Integration Reviewer

1. **Review DEMO_CASES.md** for accuracy of signal taxonomy and WebMCP tool contract alignment
2. **Review DEMO_SCRIPT.md** for clarity and realistic timing in a live presentation context
3. **Verify alignment** with `docs/PROJECT.md` (especially MVP flow in section "MVP User Flow")
4. **Check that demo narration matches allowed terminology** from AGENTS.md § 2
5. **Confirm WebMCP tool calls match official schema** when implementation begins (decision D-005)
6. **Plan next phase:** Base project creation (Vite + React + TypeScript) with these demo specs as reference

---

## Known Limitations

- **No real execution:** Demo material describes expected app behavior but doesn't run the app itself
- **WebMCP spec uncertainty:** Tool names/schemas in demo assume current (pre-implementation) documentation; must re-verify at implementation time per decision D-005
- **No jurisdiction coverage:** Demo uses US (FTC, BBB) resources; other countries' resources will need similar mapping
- **Fictional only:** Intended as reference material for implementation and live demo, not as a content database

---

## Related References

- **DEMO_CASES.md**: Full case specifications with signal taxonomy
- **DEMO_SCRIPT.md**: Live narration and timing for 2-minute walkthrough
- **docs/PROJECT.md**: MVP user flow and product contract
- **docs/DECISIONS.md (D-003)**: "Fixed rules first" approach (signals are pattern-based, not LLM-based)
- **docs/WORKSTREAMS.md**: Path ownership for `docs/demo/` and `docs/handoffs/`
- **AGENTS.md § 7**: Handoff file naming and PR workflow

---

## Files Staged & Committed

```
docs/demo/DEMO_CASES.md       [NEW] 13.9 KB
docs/demo/DEMO_SCRIPT.md      [NEW]  7.5 KB
docs/handoffs/copilot-agent5-demo-docs.md  [NEW]  4.2 KB
```

**No modifications to:**
- `package.json`, `vite.config.*`, `index.html`
- `src/` files
- Shared configuration or state
- Protected documentation files

---

## How to Continue

1. Clone/fetch the branch `codex/firstvibe/agent-5`
2. Review the three new files in order: `DEMO_CASES.md` → `DEMO_SCRIPT.md` → this handoff
3. If approved, create a Pull Request targeting `codex/firstvibe/integration` (not `main`)
4. Link PR to the tracking issue (if one exists; otherwise, reference this demo as foundation for implementation issues)
5. Awaiting integration reviewer's feedback before merge

---

**Session Complete**  
Copilot / Agent-5  
2026-09-02

