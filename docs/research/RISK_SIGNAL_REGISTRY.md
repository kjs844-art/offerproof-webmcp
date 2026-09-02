# OfferProof Deterministic Risk-Signal Registry

> **Document Type**: Research Specification  
> **Status**: Draft  
> **Version**: 0.1.0  
> **Last Updated**: 2024-09-02  
> **Issue**: #5  

---

## Overview

This document defines a **deterministic observable-signal registry** for the OfferProof system. Each signal is designed to identify patterns that *may* correlate with anomalous or high-risk job postings, **without declaring fraud**. The registry is structured to ensure that:

- Identical inputs always produce identical outputs
- Signals are based on observable, verifiable conditions
- Each signal includes neutral, user-facing explanations
- Limitations and legitimate counterexamples are explicitly documented
- All official sources are cited with verification status

**Important**: This registry does **not** assign confidence scores, maintain company blacklists, or enable personal tracking. It is a neutral, deterministic catalog of observable patterns.

---

## Signal Registry Schema

Each signal entry follows this structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `signal_id` | string | Yes | Stable, unique identifier (format: `SIG-XXXX`) |
| `signal_name` | string | Yes | Human-readable name |
| `category` | string | Yes | Grouping category (e.g., `compensation`, `metadata`, `contact`) |
| `observable_condition` | string | Yes | Precise, deterministic condition that triggers the signal |
| `original_evidence_fields` | string[] | Yes | JSON paths or field names from the input that are evaluated |
| `user_facing_explanation` | string | Yes | Neutral, non-accusatory description shown to users |
| `limitations` | string[] | Yes | Contexts where the signal may be inaccurate or incomplete |
| `supported_jurisdictions` | string[] | Yes | ISO 3166-1 alpha-2 country codes where the signal is applicable |
| `counterexamples` | string[] | Yes | Legitimate scenarios that trigger the signal |

---

## Official Source Registry Schema

Each official source referenced in this document follows this structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agency` | string | Yes | Name of the issuing agency or organization |
| `jurisdiction` | string | Yes | ISO 3166-1 alpha-2 country code |
| `title` | string | Yes | Official title of the document or resource |
| `url` | string | Yes | Direct URL to the official source |
| `verification_action` | string | Yes | Action taken to verify (e.g., "Downloaded and reviewed", "Checked via API") |
| `last_checked` | string | Yes | Date in YYYY-MM-DD format when the source was last verified |
| `verified` | boolean | Yes | Whether the link was confirmed against a current official source |

---

## Signal Registry

### Category: Compensation Anomalies

#### SIG-0001: Unusually High Hourly Rate

- **Signal ID**: `SIG-0001`
- **Signal Name**: Unusually High Hourly Rate
- **Category**: `compensation`
- **Observable Condition**: Hourly rate exceeds the 99th percentile for the job title and location, based on publicly available labor statistics.
- **Original Evidence Fields**: `compensation.hourly_rate`, `job_title`, `location.country`, `location.region`
- **User-Facing Explanation**: "The hourly rate for this position is significantly higher than typical rates for similar roles in this area."
- **Limitations**:
  - Labor statistics may be outdated or incomplete for niche roles
  - High rates may be justified for specialized or urgent positions
  - Regional variations are not always captured in national data
- **Supported Jurisdictions**: `US`, `CA`, `GB`, `DE`, `FR`, `JP`
- **Counterexamples**:
  - Senior executive roles with high hourly rates
  - Specialized technical roles in high-demand, low-supply markets
  - Contract roles requiring unique or rare expertise

#### SIG-0002: Missing Compensation Information

- **Signal ID**: `SIG-0002`
- **Signal Name**: Missing Compensation Information
- **Category**: `compensation`
- **Observable Condition**: No compensation information (hourly rate, salary range, or payment terms) is provided in the job posting.
- **Original Evidence Fields**: `compensation`
- **User-Facing Explanation**: "This posting does not include compensation details."
- **Limitations**:
  - Some jurisdictions do not require compensation disclosure
  - Employers may prefer to discuss compensation during interviews
  - Salary may be negotiable or dependent on experience
- **Supported Jurisdictions**: `US`, `CA`, `GB`, `DE`, `FR`, `JP`, `AU`, `NZ`
- **Counterexamples**:
  - Postings in regions where salary disclosure is not customary
  - Roles where compensation is highly variable based on candidate qualifications

#### SIG-0003: Vague Compensation Range

- **Signal ID**: `SIG-0003`
- **Signal Name**: Vague Compensation Range
- **Category**: `compensation`
- **Observable Condition**: Compensation range spans more than 100% of the lower bound (e.g., "$20,000 - $50,000" has a span of 150%).
- **Original Evidence Fields**: `compensation.min`, `compensation.max`
- **User-Facing Explanation**: "The compensation range for this position is unusually wide."
- **Limitations**:
  - Wide ranges may be appropriate for roles with variable responsibilities
  - Some employers intentionally use broad ranges to attract diverse candidates
- **Supported Jurisdictions**: `US`, `CA`, `GB`, `DE`, `FR`, `JP`
- **Counterexamples**:
  - Entry-level to senior roles combined in one posting
  - Postings that combine multiple positions with different pay grades

#### SIG-0004: Non-Standard Payment Terms

- **Signal ID**: `SIG-0004`
- **Signal Name**: Non-Standard Payment Terms
- **Category**: `compensation`
- **Observable Condition**: Payment terms include non-standard currencies (e.g., cryptocurrency), barter, or equity-only compensation for non-executive roles.
- **Original Evidence Fields**: `compensation.currency`, `compensation.type`
- **User-Facing Explanation**: "The payment terms for this position use non-standard methods."
- **Limitations**:
  - Cryptocurrency payments may be legitimate in some industries
  - Equity compensation is common in startups
  - Barter arrangements may be valid in certain contexts
- **Supported Jurisdictions**: `US`, `CA`, `GB`, `DE`, `FR`, `JP`
- **Counterexamples**:
  - Startup roles offering equity as part of compensation
  - International remote roles paid in a currency other than the local currency

---

### Category: Metadata Anomalies

#### SIG-0101: Missing Company Information

- **Signal ID**: `SIG-0101`
- **Signal Name**: Missing Company Information
- **Category**: `metadata`
- **Observable Condition**: No company name, website, or physical address is provided in the job posting.
- **Original Evidence Fields**: `company.name`, `company.website`, `company.address`
- **User-Facing Explanation**: "This posting does not include company details."
- **Limitations**:
  - Some postings may be made by recruitment agencies on behalf of clients
  - Startups or small businesses may not have a website
  - Remote-first companies may not have a physical address
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Postings by recruitment agencies representing confidential clients
  - Individual contractors or freelancers hiring subcontractors

#### SIG-0102: Newly Created Company Domain

- **Signal ID**: `SIG-0102`
- **Signal Name**: Newly Created Company Domain
- **Category**: `metadata`
- **Observable Condition**: The company website domain was registered less than 30 days ago, based on WHOIS data.
- **Original Evidence Fields**: `company.website`
- **User-Facing Explanation**: "The company's website domain was registered recently."
- **Limitations**:
  - New companies may legitimately have recently registered domains
  - WHOIS data may be incomplete or inaccurate
  - Domain privacy protections may obscure registration dates
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Recently founded startups
  - Companies that rebranded and registered a new domain

#### SIG-0103: Generic Company Email Domain

- **Signal ID**: `SIG-0103`
- **Signal Name**: Generic Company Email Domain
- **Category**: `metadata`
- **Observable Condition**: The contact email uses a generic domain (e.g., Gmail, Yahoo, Hotmail) instead of a company-specific domain.
- **Original Evidence Fields**: `contact.email`
- **User-Facing Explanation**: "The contact email uses a generic email provider rather than a company domain."
- **Limitations**:
  - Small businesses or startups may use generic email domains
  - Some legitimate companies use generic emails for initial contact
  - Recruitment agencies may use generic emails
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Small businesses without a custom email domain
  - Independent recruiters or freelancers

#### SIG-0104: Inconsistent Location Information

- **Signal ID**: `SIG-0104`
- **Signal Name**: Inconsistent Location Information
- **Category**: `metadata`
- **Observable Condition**: The job location (city, region, or country) does not match the company's registered address or website domain.
- **Original Evidence Fields**: `job.location`, `company.address`, `company.website`
- **User-Facing Explanation**: "The job location and company address do not appear to match."
- **Limitations**:
  - Companies may have multiple offices or remote workers
  - Job postings may target candidates in different regions
  - Company websites may not list all locations
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Remote-first companies hiring in multiple regions
  - Companies with distributed teams

---

### Category: Contact Anomalies

#### SIG-0201: Missing Contact Information

- **Signal ID**: `SIG-0201`
- **Signal Name**: Missing Contact Information
- **Category**: `contact`
- **Observable Condition**: No contact email, phone number, or application URL is provided in the job posting.
- **Original Evidence Fields**: `contact.email`, `contact.phone`, `application_url`
- **User-Facing Explanation**: "This posting does not include contact information for applications."
- **Limitations**:
  - Some postings may direct applicants to a company website
  - Application processes may be handled through a third-party platform
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Postings that use an application form on the company website
  - Postings on job boards with built-in application systems

#### SIG-0202: International Phone Number for Local Job

- **Signal ID**: `SIG-0202`
- **Signal Name**: International Phone Number for Local Job
- **Category**: `contact`
- **Observable Condition**: The contact phone number has a country code that does not match the job location's country.
- **Original Evidence Fields**: `contact.phone`, `job.location.country`
- **User-Facing Explanation**: "The contact phone number is from a different country than the job location."
- **Limitations**:
  - Companies may have international hiring teams
  - Remote jobs may have global contact points
  - Phone number parsing may be inaccurate
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Multinational companies with centralized hiring
  - Remote jobs with global teams

#### SIG-0203: Disposable Email Domain

- **Signal ID**: `SIG-0203`
- **Signal Name**: Disposable Email Domain
- **Category**: `contact`
- **Observable Condition**: The contact email uses a known disposable or temporary email domain.
- **Original Evidence Fields**: `contact.email`
- **User-Facing Explanation**: "The contact email uses a temporary email service."
- **Limitations**:
  - Disposable email domains may be used for legitimate privacy reasons
  - New disposable email services are frequently created
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - None (disposable emails are generally not used for legitimate business contact)

---

### Category: Job Description Anomalies

#### SIG-0301: Excessive Capitalization or Exclamation Marks

- **Signal ID**: `SIG-0301`
- **Signal Name**: Excessive Capitalization or Exclamation Marks
- **Category**: `job_description`
- **Observable Condition**: More than 20% of the job description text is in ALL CAPS, or more than 5 exclamation marks per 100 words.
- **Original Evidence Fields**: `job.description`
- **User-Facing Explanation**: "The job description uses an unusually high amount of capitalization or exclamation marks."
- **Limitations**:
  - Some industries or roles may use more emphatic language
  - Writing style varies by region and culture
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Marketing or sales roles where enthusiasm is emphasized
  - Postings targeting regions with different writing norms

#### SIG-0302: Poor Grammar or Spelling

- **Signal ID**: `SIG-0302`
- **Signal Name**: Poor Grammar or Spelling
- **Category**: `job_description`
- **Observable Condition**: The job description contains more than 3 grammar or spelling errors per 100 words, based on a standard language model.
- **Original Evidence Fields**: `job.description`
- **User-Facing Explanation**: "The job description contains multiple grammar or spelling errors."
- **Limitations**:
  - Language models may produce false positives
  - Non-native speakers may make errors in legitimate postings
  - Some errors may be intentional or stylistic
- **Supported Jurisdictions**: `US`, `CA`, `GB`, `AU`, `NZ` (English-language jurisdictions)
- **Counterexamples**:
  - Postings from non-native speakers
  - Postings with intentional informal or creative language

#### SIG-0303: Vague Job Title

- **Signal ID**: `SIG-0303`
- **Signal Name**: Vague Job Title
- **Category**: `job_description`
- **Observable Condition**: The job title consists of generic terms (e.g., "Assistant", "Manager", "Associate") without a specific role or industry.
- **Original Evidence Fields**: `job.title`
- **User-Facing Explanation**: "The job title is unusually generic and does not specify the role or industry."
- **Limitations**:
  - Some industries use generic titles intentionally
  - Entry-level roles may have less specific titles
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Generalist roles (e.g., "Administrative Assistant")
  - Roles in industries with standardized generic titles

#### SIG-0304: Unrealistic Job Requirements

- **Signal ID**: `SIG-0304`
- **Signal Name**: Unrealistic Job Requirements
- **Category**: `job_description`
- **Observable Condition**: The job requires more than 10 years of experience in a technology or skill that has existed for less than 10 years.
- **Original Evidence Fields**: `job.requirements`, `job.skills`
- **User-Facing Explanation**: "The job requirements include experience with a technology or skill that has not existed for the stated duration."
- **Limitations**:
  - Technology adoption timelines may vary by region or industry
  - Some skills may have predecessors with similar names
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Postings that conflate related technologies (e.g., "10 years of React" when React was released 9 years ago)

---

### Category: Application Process Anomalies

#### SIG-0401: Request for Sensitive Personal Information

- **Signal ID**: `SIG-0401`
- **Signal Name**: Request for Sensitive Personal Information
- **Category**: `application_process`
- **Observable Condition**: The application process requests sensitive personal information (e.g., social security number, passport details, bank account information) before an interview or offer.
- **Original Evidence Fields**: `application.questions`, `application.required_documents`
- **User-Facing Explanation**: "The application requests sensitive personal information early in the hiring process."
- **Limitations**:
  - Some jurisdictions or industries may require early disclosure of certain information
  - Background checks may require sensitive information
- **Supported Jurisdictions**: `US`, `CA`, `GB`, `DE`, `FR`, `JP`
- **Counterexamples**:
  - Government or security-clearance roles requiring background checks
  - Financial industry roles with strict compliance requirements

#### SIG-0402: Request for Payment or Fees

- **Signal ID**: `SIG-0402`
- **Signal Name**: Request for Payment or Fees
- **Category**: `application_process`
- **Observable Condition**: The application process requests payment, fees, or purchases (e.g., equipment, training, background checks) from the candidate.
- **Original Evidence Fields**: `application.fees`, `application.required_purchases`
- **User-Facing Explanation**: "The application process requests payment or fees from the candidate."
- **Limitations**:
  - Some legitimate roles may require candidates to purchase equipment
  - Background checks or certifications may require fees
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Roles requiring specialized equipment not provided by the employer
  - Positions requiring candidates to obtain specific certifications

#### SIG-0403: Unusual Application Method

- **Signal ID**: `SIG-0403`
- **Signal Name**: Unusual Application Method
- **Category**: `application_process`
- **Observable Condition**: The application method involves unconventional channels (e.g., messaging apps, social media direct messages, or non-company email).
- **Original Evidence Fields**: `application.method`, `application.url`
- **User-Facing Explanation**: "The application method uses an unconventional channel."
- **Limitations**:
  - Some industries or regions may use non-traditional application methods
  - Small businesses may prefer direct communication
- **Supported Jurisdictions**: All
- **Counterexamples**:
  - Startups or small businesses using direct communication
  - Roles in creative or tech industries with informal hiring processes

---

## Official Source Registry

The following official sources are referenced in the development of this registry. **Only links marked as `verified: true` have been confirmed against current official sources.**

| Agency | Jurisdiction | Title | URL | Verification Action | Last Checked | Verified |
|--------|--------------|-------|-----|---------------------|--------------|----------|
| U.S. Bureau of Labor Statistics | US | Occupational Employment and Wage Statistics | https://www.bls.gov/oew/ | Downloaded and reviewed | 2024-09-01 | true |
| Statistics Canada | CA | Labour Force Survey | https://www.statcan.gc.ca/en/lfs | Downloaded and reviewed | 2024-09-01 | true |
| UK Office for National Statistics | GB | Annual Survey of Hours and Earnings | https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours | Downloaded and reviewed | 2024-09-01 | true |
| Eurostat | EU | Earnings Statistics | https://ec.europa.eu/eurostat/web/labour-market/earnings | Downloaded and reviewed | 2024-09-01 | true |
| ICANN | Global | WHOIS Lookup | https://lookup.icann.org/ | Tested with sample domains | 2024-09-01 | true |
| Disposable Email Domain List | Global | Disposable Email Domains | https://github.com/disposable-email-domains/disposable-email-domains | Reviewed repository | 2024-09-01 | false |

---

## Deterministic Behavior Guarantee

Each signal in this registry is designed to be **deterministic**: given identical input data, the signal will always produce the same output. This is achieved by:

1. **Precise Conditions**: Observable conditions are defined using exact thresholds or patterns (e.g., "exceeds 99th percentile", "registered less than 30 days ago").
2. **Field-Based Evaluation**: Signals evaluate specific fields in the input data, ensuring consistency.
3. **No Randomness**: Signals do not incorporate randomness, time-based variation, or external state that could affect the result.
4. **Static Data**: Where external data is referenced (e.g., labor statistics), it is either:
   - Embedded in the signal logic (e.g., lists of disposable email domains)
   - Versioned and static for the lifetime of the signal

---

## Usage Notes

1. **Neutrality**: All user-facing explanations are neutral and non-accusatory. They describe observable facts without implying intent or fraud.
2. **Counterexamples**: Every signal includes legitimate scenarios that may trigger it, reinforcing that signals are not definitive indicators of fraud.
3. **Jurisdiction Awareness**: Signals explicitly state the jurisdictions where they are applicable, as norms and regulations vary globally.
4. **No Scoring**: This registry does not assign scores, weights, or priorities to signals. It is a catalog of observable patterns.
5. **No Tracking**: The registry does not enable or suggest tracking of individuals, companies, or devices.

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2024-09-02 | OfferProof Contributors | Initial draft |

---

## License

This document is part of the OfferProof project and is licensed under the [MIT License](../LICENSE).
