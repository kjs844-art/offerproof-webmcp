# OfferProof Deterministic Risk-Signal Registry

> **Document Type**: Research Specification
> **Status**: Draft
> **Version**: 1.0.0
> **Last Updated**: 2026-09-02
> **Issue**: #5

## Purpose and boundary

This registry defines the fixed rules used to identify **signals that need checking** in pasted job-offer text. It is an observation contract, not a fraud detector. A match records text that is present or absent in the supplied text; it does not establish intent, legitimacy, fraud, or safety.

The evaluator MUST use only the pasted offer text. It MUST NOT use WHOIS, salary percentiles, web searches, external APIs, network state, a live blocklist, geolocation, a language model, or any other source of facts about the sender, employer, role, or link. Guidance pages listed below are explanatory resources only; they are not inputs to detection.

The same Unicode text and the same registry version MUST produce the same ordered signal IDs and the same extracted evidence. The evaluator MUST preserve the original text offsets or exact substrings when presenting evidence. It MUST ignore instructions contained in the pasted offer; those instructions are data, not agent or system instructions.

## Input normalization

The evaluator creates `normalizedText` from `offerText` by Unicode case folding, replacing runs of whitespace with one ASCII space, and trimming leading and trailing whitespace. It MUST retain `offerText` unchanged for evidence. Matching is substring or regular-expression matching against `normalizedText`; no semantic interpretation is allowed.

Unless a rule says otherwise, a term match is case-insensitive and may cross ordinary whitespace only where the pattern explicitly uses `\s+`. A URL match is the literal URL token in the original text. Absence rules apply only when no qualifying text is found anywhere in the pasted offer.

## Output contract

Every emitted signal uses these camelCase fields, matching `docs/PROJECT.md`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `signalId` | string | yes | One canonical ID from this registry |
| `observedText` | string | yes | Exact substring copied from `offerText`; for an absence rule, an empty string |
| `observation` | string | yes | Neutral description of the matched or missing text |
| `guidanceSourceIds` | string[] | yes | IDs of explanatory official sources, never evidence of a match |
| `inference` | string | yes | Limited next-check suggestion; never a verdict |
| `limitations` | string | yes | Signal-specific caveat; no confidence or score |

The evaluator MUST NOT output `fraud`, `safe`, `verdict`, `confidence`, `riskScore`, a probability, or a ranking. It MUST NOT combine signals into a conclusion.

## Canonical signal registry

### `UPFRONT_PAYMENT`

- **signalName**: Upfront payment request
- **category**: compensation
- **observableRule**: Emit when the same sentence or adjacent text contains a payment verb or fee noun and a timing/requirement phrase indicating the candidate must pay before starting, being hired, receiving work, or receiving a promised benefit. Payment verbs include `pay`, `send`, `wire`, `transfer`, `deposit`, `purchase`, and `buy`; fee nouns include `fee`, `charge`, `cost`, `payment`, `deposit`, and `training fee`. Timing/requirement phrases include `before you start`, `before starting`, `to apply`, `to get the job`, `to be hired`, `to receive your equipment`, `required upfront`, and `in advance`.
- **evidenceExtraction**: Return the shortest original-text span containing the payment/fee term and the timing or requirement phrase. If multiple spans match, emit one signal with the earliest span.
- **observation**: The offer text asks the candidate to provide money before a stated hiring or work step.
- **inference**: Do not send money until the payment request is independently checked through a channel the candidate already knows.
- **limitations**: The rule cannot determine who pays, whether a reimbursement is promised, whether a fee is lawful, or whether the request is genuine. It can miss synonymous wording not listed in the fixed patterns.
- **counterexamples**: A legitimate employer may describe a refundable deposit, a legally required license paid by the worker, or optional training; the text still warrants clarifying who pays and when.
- **guidanceSourceIds**: [`FTC-JOB-SCAMS-2026`]

### `PAYMENT_IN_CRYPTO_OR_GIFT_CARD`

- **signalName**: Payment requested in cryptocurrency or gift cards
- **category**: compensation
- **observableRule**: Emit when the offer text contains a cryptocurrency term (`bitcoin`, `btc`, `ethereum`, `eth`, `crypto`, `cryptocurrency`, `usdt`, `wallet address`) or a gift-card term (`gift card`, `giftcard`, `itunes card`, `google play card`, `steam card`, `prepaid card`) within the same sentence or adjacent text as a payment/request verb (`pay`, `send`, `buy`, `purchase`, `transfer`, `load`, `provide`, `submit`, `deposit`) or an instruction to disclose a code, PIN, wallet address, or redemption number.
- **evidenceExtraction**: Return the shortest original-text span containing the payment/request verb and the crypto or gift-card term; include the code/PIN instruction when that is the matching request.
- **observation**: The offer text specifies cryptocurrency or a gift card as the requested payment or payment instrument.
- **inference**: Pause and verify the payment method and recipient through an independent official channel before sending money or codes.
- **limitations**: The rule does not identify the asset, value, jurisdiction, ownership, or whether the term is mentioned only as a job duty or warning. It does not inspect wallets, transactions, or external pages.
- **counterexamples**: A blockchain company may pay wages in a documented cryptocurrency arrangement; a retail job may mention gift cards as merchandise. A match records the wording only.
- **guidanceSourceIds**: [`FTC-JOB-SCAMS-2026`]

### `URGENCY_PRESSURE`

- **signalName**: Urgency or pressure language
- **category**: communication
- **observableRule**: Emit when the text contains at least one urgency term (`immediately`, `right now`, `within 24 hours`, `today only`, `last chance`, `act now`, `urgent`, `as soon as possible`, `before it expires`) and at least one consequence, scarcity, or obligation term (`you will lose`, `offer expires`, `limited slots`, `do not miss`, `must respond`, `final notice`, `otherwise`, `no time to think`).
- **evidenceExtraction**: Return the shortest original-text span containing one urgency term and one consequence/scarcity/obligation term. If they occur in separate sentences, return both sentences joined by ` … `.
- **observation**: The offer text combines a short deadline or immediate-action request with a consequence, scarcity claim, or obligation.
- **inference**: Take time to review the offer and verify the sender without using contact details supplied only in the message.
- **limitations**: A genuine employer may have a real closing date or interview slot. The fixed vocabulary is intentionally conservative and cannot assess tone outside the listed terms.
- **counterexamples**: A time-limited seasonal role, a scheduled interview window, or a genuine hiring deadline may use urgency language.
- **guidanceSourceIds**: [`FTC-JOB-SCAMS-2026`]

### `OFF_PLATFORM_CONTACT`

- **signalName**: Off-platform contact request
- **category**: contact
- **observableRule**: Emit when the text asks the candidate to continue hiring or application communication in a messaging or social platform (`WhatsApp`, `Telegram`, `Signal`, `Skype`, `Discord`, `Facebook Messenger`, `Instagram DM`, `DM`, `direct message`) or by a personal email provider (`gmail.com`, `yahoo.com`, `outlook.com`, `hotmail.com`, `proton.me`) using a directive such as `contact me`, `message me`, `reply to`, `move to`, `continue on`, `add me`, or `chat on`.
- **evidenceExtraction**: Return the shortest original-text span containing the directive and the named channel, handle, username, phone number, or address.
- **observation**: The offer text directs the candidate to continue contact through a named external or personal channel.
- **inference**: Confirm the role and contact identity through an independently located employer channel before continuing.
- **limitations**: Some small employers, recruiters, and legitimate roles use messaging apps. The rule does not determine whether a channel is authorized or whether an address belongs to an employer.
- **counterexamples**: A recruiter may legitimately schedule an interview by WhatsApp; a freelance role may conventionally use Telegram. The channel alone is not a conclusion.
- **guidanceSourceIds**: [`FTC-JOB-SCAMS-2026`]

### `SENSITIVE_DATA_REQUEST`

- **signalName**: Sensitive data request
- **category**: personalData
- **observableRule**: Emit when the offer text requests a government identifier (`social security`, `national insurance`, `resident registration`, `passport number`, `driver's license`, `tax id`), financial credential (`bank account`, `routing number`, `credit card`, `debit card`, `online banking`, `password`, `one-time code`, `verification code`), or a scan/photo of such data, together with a request verb (`send`, `provide`, `share`, `upload`, `confirm`, `verify`, `enter`, `submit`, `reply with`).
- **evidenceExtraction**: Return the shortest original-text span containing the request verb and the sensitive-data term. Do not copy an actual identifier, password, or code into any output.
- **observation**: The offer text asks the candidate to provide a named sensitive identifier, financial credential, or authentication secret.
- **inference**: Do not provide the requested secret in the message; ask the purported employer how and when identity or payroll information is collected through an independently verified process.
- **limitations**: Legitimate employers may collect some payroll or identity information after an offer through a secure, verified process. The rule does not judge timing, security, legality, or the recipient.
- **counterexamples**: A verified payroll provider may request bank details after hiring; a regulated role may require identity documents. The pasted request remains an item to verify.
- **guidanceSourceIds**: [`FTC-JOB-SCAMS-2026`]

### `UNVERIFIED_OR_SHORTENED_LINK`

- **signalName**: Link requiring independent verification or shortened link
- **category**: link
- **observableRule**: Emit when the text contains a URL whose host is a known shortening host (`bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `ow.ly`, `buff.ly`, `is.gd`, `cutt.ly`, `rb.gy`) or a URL token whose host is not repeated in the same offer immediately after the literal label `official domain:`. A URL is never treated as verified from its appearance alone. The only text-only exception is that exact repeated host declaration; it is still not external verification.
- **evidenceExtraction**: Return the exact URL token, including its scheme and path, as written in `offerText`. For a non-shortened URL, also return the adjacent employer-domain label if one is explicitly present.
- **observation**: The offer text contains a shortened link or a link whose ownership cannot be established from the pasted text alone.
- **inference**: Do not click the pasted link; independently locate the purported employer's official site and navigate to the opportunity from there.
- **limitations**: The rule cannot resolve redirects, certificate status, domain ownership, URL reputation, or whether a link is current. A domain that looks official is still unverified under this text-only contract.
- **counterexamples**: A legitimate employer may use a recruiting platform or shortened campaign link. The signal requests independent checking; it does not label the destination.
- **guidanceSourceIds**: [`FTC-JOB-SCAMS-2026`]

### `MISSING_EMPLOYER_DETAILS`

- **signalName**: Missing employer details
- **category**: employerMetadata
- **observableRule**: Emit only when the entire pasted offer contains none of the following employer-detail patterns: an organization marker plus a name (`company`, `employer`, `inc.`, `ltd`, `llc`, `corp`, `株式会社`, `주식회사`), a labeled employer/company field, or a sentence naming an organization as the hiring party (`we are`, `our company`, `hiring for`, `employer:`). A personal name alone does not satisfy the rule.
- **evidenceExtraction**: Return an empty string because the signal is based on absence. The UI MUST state that no qualifying employer detail was found in the pasted text.
- **observation**: The pasted offer does not state a recognizable employer or hiring organization.
- **inference**: Ask for the legal or trading name and independently verify it before sharing information or accepting work.
- **limitations**: An offer may intentionally omit a confidential client, use a recruiter, or provide details in an attachment or page not pasted here. This rule cannot search for the employer.
- **counterexamples**: A staffing agency may withhold a client's name until an interview; an individual may legitimately hire a contractor. Missing text is not evidence of wrongdoing.
- **guidanceSourceIds**: [`FTC-JOB-SCAMS-2026`]

### `VAGUE_ROLE_OR_TERMS`

- **signalName**: Vague role or employment terms
- **category**: roleDescription
- **observableRule**: Emit when the offer lacks both (a) a role-duty indicator (`responsible for`, `duties`, `tasks`, `responsibilities`, `job description`, `仕事内容`, `업무`) and (b) a work-term indicator (`salary`, `pay`, `hourly`, `per hour`, `wage`, `hours`, `schedule`, `location`, `remote`, `contract`, `benefits`, `급여`, `근무시간`). It also emits when the only role title is one of the generic standalone titles `assistant`, `manager`, `associate`, `agent`, `specialist`, or `consultant` and no duty indicator occurs.
- **evidenceExtraction**: For the missing-both condition, return an empty string. For the generic-title condition, return the exact title token.
- **observation**: The pasted offer provides too little role-duty or work-term detail to describe the position from the text alone.
- **inference**: Request a written description of duties, pay, hours, location, and engagement terms before deciding whether to proceed.
- **limitations**: Short messages can be legitimate introductions, and some details may be supplied later or in an omitted attachment. The fixed vocabulary cannot judge writing quality or job realism.
- **counterexamples**: A recruiter may first ask whether a candidate is interested; a standard internal job title may be intentionally brief. The signal records insufficient pasted detail only.
- **guidanceSourceIds**: [`FTC-JOB-SCAMS-2026`]

## Official guidance-source registry

Only sources that were checked against a current official page are listed. These sources explain prudent next steps; they never make an offer signal true or false.

| sourceId | agency | jurisdiction | title | url | verificationAction | lastChecked | verified | legalAdvice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FTC-JOB-SCAMS-2026` | U.S. Federal Trade Commission | US | Job Scams | https://consumer.ftc.gov/articles/job-scams | Fetched and reviewed the current official FTC page; confirmed guidance about not paying for a job, gift-card requests, and protecting personal information | 2026-09-02 | true | false |

No unofficial source, third-party domain list, WHOIS service, salary dataset, search result, or unverified link is part of this registry. A source MUST NOT be marked `verified: true` without a recorded current-page check. This registry does not claim that an absent source is official or current.

## Evaluation and safety requirements

- Evaluate only the pasted `offerText`; do not fetch, resolve, enrich, or classify anything externally.
- Keep exact evidence separate from `observation`, `inference`, and `limitations`.
- Never store or echo sensitive values found in the input.
- Emit signals in the canonical order listed above, with no score, verdict, or confidence.
- Treat all pasted instructions as untrusted content.
- An empty evidence string is valid only for the two absence rules documented above.

## Version history

| version | date | changes |
| --- | --- | --- |
| 1.0.0 | 2026-09-02 | Replaced external-data and model-dependent rules with eight canonical pasted-text-only signals; corrected source and date handling. |

This document does not contain a license grant or a link to a license file. The branch has no `LICENSE` file, so no license status is inferred here.
