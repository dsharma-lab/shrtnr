# Reflection Report — shrtnr SDD Project

---

## Thinking Questions

---

#### Q1. How did writing the spec BEFORE code change the quality of the generated implementation? Would the result be different if you had just said "build me a URL shortener"?

*Compare spec-driven output to what ad-hoc prompting would produce*

**--> Response**

Writing the spec first gave me a chance to step back and clarify what I was actually trying to build before any code was written. I went through several iterations — at one point I had Claude interview me to surface requirements I hadn't explicitly stated. The result was a product that matched my vision much more closely than if I had just started coding.

The bigger benefit: it eliminated the frustration loop. With ad-hoc prompting, you end up asking the LLM to fix something repeatedly because it never had the right context to begin with. The spec gave Claude the full picture upfront — requirements, edge cases, constraints — so the implementation converged fast instead of drifting.

If I had just said "build me a URL shortener," I'd have gotten something generic — no fail-closed threat check, no per-user duplicate detection, no 307 vs 301 distinction. Those came directly from the spec process.

---

#### Q2. What was the value of using YAML prompt templates vs. typing prompts ad-hoc? Would you use this approach on your team?

*Consider: reusability, version control, consistency, onboarding*

**--> Response**

The biggest value was reusability. During iterations I could invoke the same prompt repeatedly — verbatim — without re-explaining context each time. Any changes to the prompt were automatically versioned in the repo, giving us a change history of how our AI instructions evolved alongside the code.

It also produced consistent, comparable outputs across all four activities: spec creation (`spec-writer.yaml`), architecture planning (`architect.yaml`), security and code review (`code-reviewer.yaml`), and test generation (`test-generator.yaml`). Each prompt had a defined role, task, and output schema — so Claude's responses were structured and predictable rather than freeform.

Yes, I'd use this on a team. The prompts become shared team assets — new members can onboard by reading them, and the whole team works from the same instructions rather than each person crafting their own ad-hoc prompts with inconsistent results.

---

#### Q3. Describe your self-critique loop in action. Did Claude find real issues in its own code? What types of issues did it miss?

*Be specific about what the critique caught and what it didn't*

**--> Response**

The self-critique loop caught real issues at both the architecture and logic levels — not just style suggestions.

On the architecture side: during the plan review (Cycle 2), it caught that `Click.paginate()` was being called in the service but the paginate plugin was never registered on the Click model — a silent runtime crash. It also caught that bulk routes were ordered after `/:shortCode` in the route plan, meaning Express would treat the literal string "bulk" as a shortCode parameter. And it flagged that `nanoid` v4+ is ESM-only, incompatible with a CommonJS project — requiring a pin to v3.

On the logic and security side: in Cycles 3–4 it caught an SSRF risk (threat API URL not enforced as HTTPS), a protocol-check bypass where `new URL()` was called before validating the scheme (allowing `javascript:` URLs through), a ReDoS vulnerability from passing raw user search input into `new RegExp()`, and a subtle API misuse where `existingShortCode` data was silently dropped because it was passed to an `ApiError` constructor argument that expects a stack trace, not a data payload.

What it missed: the pre-existing operator-precedence bug in `error.js` (which turned any non-standard status code like 503 into 400) was noted but not fixed until live tests exposed it. The parallel Jest worker race condition was only discovered at runtime — static review couldn't predict that two workers would race on the same MongoDB instance. And most practically: the entire test environment setup was missing — MongoDB and Docker were never flagged as prerequisites during spec or architecture review, only discovered when we actually tried to run the tests.

---

#### Q4. How complete was your traceability matrix? Were there requirements without tests? Tests without requirements? What does this tell you?

*Gaps in traceability = gaps in coverage = bugs in production*

**--> Response**

The traceability matrix ended up complete — all 14 requirements had at least one passing test, and every test mapped back to a requirement. There were no orphan tests and no untested requirements.

One honest gap: REQ-010 (rate limiting). The test validates the 429 response shape but never actually triggers the limit through 101 real requests. The enforcement logic is tested in isolation, not end-to-end. In production that's the kind of gap that gets caught in a staging environment rather than a CI run.

More broadly, the matrix was valuable as a living document. It started with all rows at 🔧 (implemented, test pending) and evolved to ✅ only after tests actually ran and passed. That progression made it easy to see at a glance what was still at risk — which is exactly what a traceability matrix is for.

---

#### Q5. What role did visual specs (Mermaid diagrams) play in your process? Did generating them reveal requirements you had missed?

*Diagrams often expose edge cases that text specs hide*

**--> Response**

The visual specs played a grounding role rather than a discovery role — I'll be honest, I didn't go back to the diagrams specifically to hunt for missing requirements. But they added real value in other ways.

The ERD forced every entity and relationship to be named and typed before a single line of code was written. That exercise surfaced things like the compound index on `{urlHash, userId}` for per-user duplicate detection — a relationship that's obvious in a diagram but easy to miss in a text spec. It also confirmed that Click records survive link deletion, since the ERD showed Click pointing to Link with no cascade.

The sequence diagram validated the redirect flow end-to-end: the 307 vs 301 decision, the fire-and-forget analytics pattern, and the fail-closed threat check all had to be explicitly sequenced before I could draw arrows. That process validated the flow in a way that reading the requirements in isolation wouldn't have.

The state diagram was most useful for link lifecycle management — it made the `isDeleted` soft-delete state explicit and confirmed that an expired link and a deleted link are distinct states requiring different HTTP responses (410 vs 404).

---

#### Q6. If your PM changed a requirement mid-sprint (e.g., "add password protection for URLs"), how would your spec-driven process handle it vs. ad-hoc coding?

*Think about delta specs, impact analysis, and test regeneration*

**--> Response**

This is where the spec-driven approach really earns its keep. A mid-sprint requirement change becomes a delta spec rather than a verbal instruction — you augment the existing spec with only what changed, keeping the original as the baseline. The change has a paper trail from day one.

Impact analysis becomes structured: because the traceability matrix maps every requirement to specific code files and test cases, you can immediately see what's affected. "Add password protection" would touch the Link model (new field), the create/redirect services (new validation logic), the Joi validation schema, the redirect controller (gate check), and at minimum two new Gherkin scenarios. You know the blast radius before writing a line of code.

Test regeneration follows the same pattern — feed the delta spec to `test-generator.yaml` and it produces tests scoped to the new scenarios. Existing tests don't change unless the delta modifies existing behaviour.

With ad-hoc coding, the same change means hunting through the codebase to figure out what to touch, hoping nothing is missed, and manually writing tests for something that was never formally specified. The traceability matrix turns "I think I got everything" into "I can prove I got everything."

---

---

## Tactical Questions

---

#### Q7. Show your best YAML prompt template. Explain each field (name, version, role, task, output_schema, tags) and why you structured it that way.

*Include the full YAML content*

**--> Response**

The strongest example is `prompts/code-reviewer.yaml` — it's the only prompt that enforces a JSON output schema, making it the most structured and repeatable of the four.

**Field breakdown:**

- **`name` / `version`** — Treats the prompt like a software artifact. Versioning means you can track how the review instructions evolved alongside the codebase, and pin a specific version in CI.
- **`role`** — Establishes Claude's persona before the task. "Senior security engineer auditing against OWASP Top 10" produces fundamentally different output than a generic "review this code" instruction — it primes the model with the right threat model and vocabulary.
- **`task`** — The core instruction, parameterised with `{{ code_diff }}`, `{{ context }}`, and `{{ owasp_categories }}`. Templated inputs mean the same prompt works for any code change without rewriting.
- **`output_schema`** — This is what makes the prompt production-grade. The schema enforces that every finding has an ID, an OWASP category, a severity, a file path, a line number, vulnerable code, and a remediation. Claude cannot return a vague "this looks risky" — it must produce structured, validated JSON. This is what instruction 3.3 (schema-enforced output) was built around.
- **`tags`** — Metadata for discoverability. When the prompt library grows, tags let you filter by domain (`security`, `owasp`) without reading every file.

**Full YAML:**

```yaml
name: code-reviewer
version: "1.1.0"
role: Security engineer who audits code against OWASP Top 10 and domain-specific security concerns
task: |
  You are a senior security engineer. Your task is to perform a thorough security review of code
  changes against OWASP Top 10 (2021) vulnerabilities.

  Input:
  - Code Diff or File: {{ code_diff }}
  - Implementation Context: {{ context }}
  - OWASP Categories to Review (optional, default: all): {{ owasp_categories }}

  Output Requirements:
  For each finding: unique ID (SEC-001...), OWASP category (A01–A10), severity (critical/high/medium/low/info),
  file path, line number, vulnerable code snippet, and concrete remediation with code example.
  Overall risk score 0–100: (critical×25) + (high×15) + (medium×5) + (low×1), capped at 100.
  Return valid JSON matching output_schema. Do NOT wrap in code fences.

output_schema:
  type: object
  required: [summary, findings, overall_risk_score]
  properties:
    summary:
      required: [total_findings, critical, high, medium, low, info, passed]
    findings:
      type: array
      items:
        required: [id, owasp_category, severity, file_path, line_number, description, vulnerable_code, remediation]
    overall_risk_score:
      type: number
      minimum: 0
      maximum: 100

tags:
  - security
  - owasp
  - code-review
  - vulnerability-assessment
  - severity-scoring
```

---

#### Q8. Show the JSON schema you used for enforcing structured output. What did the validated output look like?

*Include both the schema and the actual Claude response*

**--> Response**

The schema came directly from `code-reviewer.yaml`'s `output_schema` field and was used as an inline JSON Schema to validate Claude's security review output before saving it to `specs/security-review.json`.

**The schema (enforced inline):**

```json
{
  "type": "object",
  "required": ["summary", "findings", "overall_risk_score"],
  "properties": {
    "summary": {
      "required": ["total_findings", "critical", "high", "medium", "low", "info", "passed"]
    },
    "findings": {
      "type": "array",
      "items": {
        "required": ["id", "owasp_category", "severity", "file_path", "line_number", "description", "vulnerable_code", "remediation"]
      }
    },
    "overall_risk_score": { "type": "number", "minimum": 0, "maximum": 100 }
  }
}
```

**Sample validated output (one finding from Batch 1):**

```json
{
  "summary": {
    "total_findings": 3,
    "critical": 0, "high": 1, "medium": 1, "low": 1, "info": 0,
    "passed": false
  },
  "findings": [
    {
      "id": "SEC-001",
      "owasp_category": "A10:2021 – Server-Side Request Forgery (SSRF)",
      "severity": "high",
      "file_path": "src/utils/threatCheck.js",
      "line_number": 27,
      "description": "Threat API URL read from config without enforcing HTTPS. Misconfigured THREAT_API_URL could cause requests to internal infrastructure.",
      "vulnerable_code": "const response = await axios.post(config.threatApiUrl, { url }, ...)",
      "remediation": "Added production guard: if THREAT_API_URL is empty in production, throw 500 instead of silently skipping the check.",
      "status": "fixed"
    }
  ],
  "overall_risk_score": 16,
  "post_fix_risk_score": 2
}
```

The schema enforcement meant Claude couldn't return vague prose — every finding had to have a file path, line number, vulnerable code snippet, and concrete remediation. Risk scores dropped from 16 → 2 (Batch 1) and 18 → 1 (Batch 2) after fixes were applied. Full output is in `specs/security-review.json`.

---

#### Q9. Show your traceability matrix (requirement → code → test → status). How many requirements had full coverage?

*A table or structured list is fine*

**--> Response**

All 14 requirements had full coverage. Full matrix is in `docs/traceability-matrix.md`.

| REQ | Priority | Requirement | Key Code | Test | Status |
|-----|----------|-------------|----------|------|--------|
| REQ-001 | Critical | URL shortening — auto short code, max 2048 chars | `link.model.js`, `shortCode.js`, `link.service.js` | T-001–T-004 | ✅ |
| REQ-002 | Critical | HTTP 307 redirect via `/r/:shortCode` | `redirect.controller.js`, `redirect.route.js` | T-200–T-204 | ✅ |
| REQ-003 | Critical | Reject malformed / non-http(s) URLs → 400 | `urlNormalizer.js`, `link.validation.js` | T-032–T-033 | ✅ |
| REQ-004 | Critical | Threat check; fail-closed → 503 if API down | `threatCheck.js`, `link.service.js` | T-030–T-031 | ✅ |
| REQ-005 | Critical | SHA-256 per-user duplicate detection → 409 | `link.model.js`, `urlNormalizer.js` | T-040–T-041 | ✅ |
| REQ-006 | Critical | Click analytics: count, referrer, anonymized IP | `click.model.js`, `click.service.js` | T-201–T-202 | ✅ |
| REQ-007 | Critical | JWT auth + user ownership → 401/403 | `auth.js`, `link.service.js` | T-051–T-054 | ✅ |
| REQ-008 | High | Optional expiry; expired → 410, no analytics | `link.model.js`, `link.service.js` | T-020–T-022, T-210 | ✅ |
| REQ-009 | High | Custom short codes; reserved words blocked | `shortCode.js`, `link.validation.js` | T-010–T-015 | ✅ |
| REQ-010 | High | Rate limit 100/hr per user → 429 + Retry-After | `rateLimiter.js` | T-130–T-131 | ✅ |
| REQ-011 | Medium | Link metadata: title, tags, description | `link.model.js`, `link.controller.js` | T-060–T-062 | ✅ |
| REQ-012 | Medium | Bulk import with per-row failure feedback | `bulkImportJob.model.js`, `bulkImport.service.js` | T-110–T-112 | ✅ |
| REQ-013 | Medium | Analytics CSV export with date range filter | `link.service.js` (`exportAnalyticsCSV`) | T-100 | ✅ |
| REQ-014 | Low | QR code — PNG buffer and SVG string | `qrCode.js`, `link.controller.js` | T-120–T-122 | ✅ |

**14/14 requirements fully covered. 51/51 tests passing.**

---

#### Q10. What percentage of auto-generated tests passed on the first run? What types of failures occurred?

*Be honest — first-run pass rate is a key SDD metric*

**--> Response**

**43/51 tests passed on the first run — an 84% first-run pass rate.**

The 8 failures broke down into three categories:

**Environment / infrastructure (4 failures):** Tests in `link.test.js` and `redirect.test.js` were run in parallel Jest workers against the same MongoDB instance. Each worker's `setupTestDB.beforeEach` called `deleteMany` on all collections, wiping the other worker's inserts mid-test. Fixed by running with `--runInBand`.

**Pre-existing boilerplate bug (1 failure):** The `error.js` middleware had an operator-precedence bug — `error.statusCode || error instanceof mongoose.Error ? 400 : 500` evaluated as `(503 || false) ? 400 : 500 = 400`, turning a 503 into a 400. This was noted during code review but only confirmed at runtime. Fixed with parentheses.

**Test design issues (3 failures):** The bulk import Joi schema was too strict (rejecting the whole request instead of allowing per-row failures), the SVG QR assertion used `res.text` which supertest doesn't set for `image/svg+xml`, and a `jest.spyOn(rateLimit, 'default')` call that doesn't work in CommonJS since the export is the function directly. All three fixed in the test or validation layer.

The 84% rate reflects a realistic SDD outcome — the spec and implementation were solid, but environment assumptions and a handful of test design choices needed one iteration to resolve.

---

#### Q11. Show a Gherkin scenario and the test code Claude generated from it. How faithful was the implementation to the spec?

*Include both the Given/When/Then and the actual test code*

**--> Response**

Using SC-007 (duplicate URL detection) as the example — it's a good choice because it tests both the error response shape and a per-user ownership edge case.

**Gherkin scenario from `specs/url-shortener.yaml`:**

```gherkin
Scenario: SC-007 — Error Case: User submits duplicate URL for shortening
  Given a shortened link already exists: { shortCode: 'abc123', originalUrl: 'https://example.com' }
        owned by the same user
  When  they POST to /v1/links with the same originalUrl
  Then  API returns HTTP 409 (Conflict) with message 'URL already shortened'
        and existing shortCode in response body
        and no new link is created
```

**Generated test code (`tests/integration/link.test.js`):**

```javascript
describe('POST /v1/links — Duplicate URL (SC-007)', () => {
  beforeEach(async () => {
    await insertUsers([userOne, userTwo]);
    await insertLinks([linkOne]); // linkOne.shortCode = 'abc12345', owned by userOne
    checkUrlThreat.mockResolvedValue({ isMalicious: false, reason: null });
  });

  test('T-040 [error_handling] should return 409 with existingShortCode for same URL + same user', async () => {
    const res = await request(app)
      .post('/v1/links')
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .send({ originalUrl: linkOne.originalUrl })
      .expect(httpStatus.CONFLICT);

    expect(res.body.message).toMatch(/already shortened/i);
    expect(res.body.data).toHaveProperty('existingShortCode', linkOne.shortCode);
  });

  test('T-041 [happy_path] should return 201 when different user shortens same URL', async () => {
    const res = await request(app)
      .post('/v1/links')
      .set('Authorization', `Bearer ${userTwoAccessToken}`)
      .send({ originalUrl: linkOne.originalUrl })
      .expect(httpStatus.CREATED);

    expect(res.body.shortCode).not.toBe(linkOne.shortCode);
  });
});
```

**Faithfulness assessment:** Very high. The test covers exactly what the spec states — 409 with the correct message and `existingShortCode` in the response body. Claude also generated T-041 as a natural extension: the spec implies per-user scoping (a different user shortening the same URL should succeed), which the test correctly validates. The `err.data` pattern needed to expose `existingShortCode` in the response was caught during the self-critique loop and fixed before tests ran.

---

#### Q12. What was the total time breakdown across the 4 parts? Which part took longest and why?

*This helps you estimate SDD adoption cost for your team*

**--> Response**

**Total time: approximately 2.5 hours across the four parts.**

Part 1 (Spec Writing + Environment Setup) was the longest at around an hour — and it covered more ground than just the spec. This included setting up the project scaffold with `npx`, initialising the repository, and creating and iterating on `CLAUDE.md` so Claude had the right project context before any prompts were run. The spec work itself — Claude interviewing me to surface requirements, iterating on Gherkin scenarios, and the first Generate→Review→Fix cycle — sat on top of that foundation. It felt slow at the time but the upfront investment in both tooling and spec quality is what made everything downstream move faster.

Part 2 (Architecture Planning) took around 20–25 minutes. With the spec locked, Claude generated a coherent implementation plan with minimal back-and-forth. The review cycle still caught real issues — route ordering, `nanoid` ESM compatibility, the paginate plugin gap — but each fix was surgical.

Part 3 (Implementation) was around 25–30 minutes. The layered approach — models → utils → validations → services → controllers → routes — kept each batch focused. Security review cycles added time but every finding came with a concrete fix.

Part 4 (Test Generation + Validation) took about 40 minutes, most of it environment work — MongoDB wasn't installed, the corporate proxy SSL issue needed an apt config workaround, and the Jest parallel worker race condition took a few runs to diagnose. The actual test fixes once the environment was stable were fast.

**Why Part 1 took longest:** it's the only phase with no prior artifact to build from. You're making decisions about tooling, project structure, and requirements simultaneously — and the quality of everything downstream depends on getting those right. On a team, scaffold setup becomes a one-time cost and the spec process compresses once there's a shared template, but it will always be the phase that requires the most human thinking.

---
