### Thinking Questions

---



Q1. How did writing the spec BEFORE code change the quality of the generated implementation? Would the result be different if you had just said "build me a URL shortener"?

###### (Compare spec-driven output to what ad-hoc prompting would produce)

**--> Response**


| ```
 ``` |
| ---------------- |


---

Q2. What was the value of using YAML prompt templates vs. typing prompts ad-hoc?Would you use this approach on your team?

(Consider: reusability, version control, consistency, onboarding)

**--> Response**


| ```plaintext ``` |
| ------------- |


---

Q3. Describe your self-critique loop in action. Did Claude find real issues in its own code?What types of issues did it miss?

(Be specific about what the critique caught and what it didn't)

**--> Response**


| ```plaintext ``` |
| -------------- |


---

Q4. How complete was your traceability matrix? Were there requirements without tests? Tests without requirements? What does this tell you?

(Gaps in traceability = gaps in coverage = bugs in production)

**--> Response**


| ```plaintext ``` |
| -------------- |


---

Q5. What role did visual specs (Mermaid diagrams) play in your process? Did generating them reveal requirements you had missed?

(Diagrams often expose edge cases that text specs hide)

**--> Response**


| ```plaintext ``` |
| -------------- |


---

Q6. If your PM changed a requirement mid-sprint (e.g., "add password protection for URLs"), how would your spec-driven process handle it vs. ad-hoc coding?

(Think about delta specs, impact analysis, and test regeneration)

**--> Response**


| ```plaintext ``` |
| -------------- |


---
---



**Tactical Questions**

Q7. Show your best YAML prompt template. Explain each field (name, version, role, task, output_schema, tags) and why you structured it that way.

(Include the full YAML content)

**--> Response**


| ```plaintext ``` |
| -------------- |


---

Q8. Show the JSON schema you used for enforcing structured output. What did the validated output look like?

(Include both the schema and the actual Claude response)

**--> Response**


| ```plaintext ``` |
| -------------- |


---

Q9. Show your traceability matrix (requirement → code → test → status). How many requirements had full coverage?

(A table or structured list is fine)

**--> Response**


| ```plaintext ``` |
| -------------- |


---

Q10. What percentage of auto-generated tests passed on the first run? What types of failures occurred?

(Be honest — first-run pass rate is a key SDD metric)

**--> Response**


| ```plaintext ``` |
| -------------- |


---

Q11. Show a Gherkin scenario and the test code Claude generated from it. How faithful was the implementation to the spec?

(Include both the Given/When/Then and the actual test code)

**--> Response**


| ```plaintext ``` |
| -------------- |


---

Q12. What was the total time breakdown across the 4 parts? Which part took longest and why?

(This helps you estimate SDD adoption cost for your team)

**--> Response**


| ```plaintext ``` |
| -------------- |


---