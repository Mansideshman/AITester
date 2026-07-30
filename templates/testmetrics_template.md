# Test Metrics Template — Reference Documentation

**Document Type:** QA Test Management Standard
**Framework:** RICE-POT (Risks · Items · Criteria · Environment · People · Objectives · Tools)
**Maintained By:** QA Test Management
**Version:** 1.0

---

## 1. Purpose & Scope

This document defines the raw input requirements, source mapping, calculation rules,
and output format for the standardized Test Execution & Defect Metrics Report. It is
the companion reference for the reusable AI prompt in Section 6, and governs how
metrics are sourced from JIRA/Xray/Zephyr Scale and reported for release/sprint
sign-off.

---

## 2. Raw Input Checklist

These 14 values are the only inputs required. All percentages in Section 4 are
derived — do not source them separately.

| # | Field | Description | Source in JIRA/Xray/Zephyr |
|---|---|---|---|
| 1 | No. of Requirements | Count of Story/Epic issues in scope for the release/sprint | JQL: `issuetype in (Story, Epic) AND fixVersion = X` |
| 2 | Total No. of Test Cases | Count of Test issues linked to those requirements | Xray Test Repository filter / Zephyr Test Case count by Version |
| 3 | Test Cases Executed | Tests with any status other than "Not Executed" | Xray Test Execution report / Zephyr Test Cycle |
| 4 | Test Cases Passed | Tests with Status = Pass | Test Execution report |
| 5 | Test Cases Failed | Tests with Status = Fail | Test Execution report |
| 6 | Test Cases Blocked | Tests with Status = Blocked | Test Execution report |
| 7 | Test Cases Unexecuted | Tests with Status = Not Executed | Test Execution report (or Total − Executed) |
| 8 | Total Defects Identified | All Bug issues linked to the release/Test Execution | JQL: `issuetype = Bug AND fixVersion = X` |
| 9 | Critical Defects | Bugs grouped by Priority/Severity = Critical | Same Bug filter, grouped by Priority field |
| 10 | High Defects | Bugs grouped by Priority/Severity = High | Same Bug filter, grouped by Priority field |
| 11 | Medium Defects | Bugs grouped by Priority/Severity = Medium | Same Bug filter, grouped by Priority field |
| 12 | Low Defects | Bugs grouped by Priority/Severity = Low | Same Bug filter, grouped by Priority field |
| 13 | Customer Defects | Bugs labeled/sourced as customer-reported | Label/custom field = "Customer-reported," or linked support ticket |
| 14 | Defects in UAT | Bugs raised during the UAT Test Execution/Cycle | Filter by Test Phase = UAT or UAT-specific Test Execution key |

### Input Collection Sheet (copy and fill before generating metrics)

| Field | Value |
|---|---|
| No. of Requirements | |
| Total No. of Test Cases | |
| Test Cases Executed | |
| Test Cases Passed | |
| Test Cases Failed | |
| Test Cases Blocked | |
| Test Cases Unexecuted | |
| Total Defects Identified | |
| Critical Defects | |
| High Defects | |
| Medium Defects | |
| Low Defects | |
| Customer Defects | |
| Defects in UAT | |

---

## 3. Definitional Assumptions to Confirm

Confirm these before calculating — they change which denominator a metric uses:

- **Executed vs. Blocked:** Does "Executed" include Blocked test cases, or are
  Blocked tracked separately and excluded from the Executed denominator?
  Default used in this template: Blocked is included in Executed, but excluded
  from the Pass/Fail percentage base.
- **Customer Defects scope:** Is "Customer Defects" a subset of "Total Defects
  Identified," or sourced independently (e.g., support desk) and reported
  separately? Default used in this template: subset.

---

## 4. Calculation Rules

| Metric | Formula |
|---|---|
| Avg. No. of Test Cases/Requirement | Total Test Cases / No. of Requirements |
| % Test Cases Executed | (Executed / Total Test Cases) × 100 |
| % Test Cases Not Executed | (Unexecuted / Total Test Cases) × 100 |
| % Test Cases Passed | (Passed / Executed) × 100 |
| % Test Cases Failed | (Failed / Executed) × 100 |
| % Test Cases Blocked | (Blocked / Executed) × 100 |

**Rules:**
- Round all percentages to 1 decimal place.
- If a denominator is 0, report "N/A" — never divide by zero.
- **Reconciliation Check 1:** Passed + Failed + Blocked + Unexecuted must equal
  Total Test Cases.
- **Reconciliation Check 2:** Critical + High + Medium + Low must equal Total
  Defects Identified.
- If either check fails, flag the discrepancy and correct the input before
  reporting — do not silently adjust numbers to force a match.

---

## 5. Output Structure

### 5.1 Metrics Table (fixed row order)

| Metric | Value |
|---|---|
| No. of Requirements | |
| Avg. No. of Test Cases/Requirement | |
| Total No. of Test Cases | |
| Test Cases Executed | |
| Test Cases Passed | |
| Test Cases Failed | |
| Test Cases Blocked | |
| Test Cases Unexecuted | |
| Total Defects Identified | |
| Critical Defects | |
| High Defects | |
| Medium Defects | |
| Low Defects | |
| Customer Defects | |
| Defects in UAT | |
| % Test Cases Executed | |
| % Test Cases Not Executed | |
| % Test Cases Passed | |
| % Test Cases Failed | |
| % Test Cases Blocked | |

### 5.2 RICE-POT Interpretation (one line per applicable letter)

- **Risks:** Flag if Critical Defects > 0 open at release, or Customer/UAT
  Defects > 0.
- **Items:** Flag if Avg. Test Cases/Requirement is unusually low (e.g., <2) —
  possible under-coverage of requirements.
- **Criteria:** State MET or NOT MET against Exit Criteria (default: % Passed
  ≥ 95% AND zero open Critical defects, unless overridden).
- **Environment:** Flag if Defects in UAT > 0 — indicates environment/data
  gaps not caught in earlier test phases.
- **People:** Flag if % Blocked is high (e.g., >5%) — may indicate tester
  dependency/availability issues rather than product defects.
- **Objectives:** One-line statement on whether current results support the
  stated release quality objective.
- **Tools:** Include only if automation coverage data is separately supplied;
  otherwise omit.

---

## 6. Worked Example

Based on a sample release dataset:

| Metric | Value |
|---|---|
| No. of Requirements | 10 |
| Avg. No. of Test Cases/Requirement | 2 |
| Total No. of Test Cases | 20 |
| Test Cases Executed | 18 |
| Test Cases Passed | 16 |
| Test Cases Failed | 2 |
| Test Cases Blocked | 0 |
| Test Cases Unexecuted | 2 |
| Total Defects Identified | 10 |
| Critical Defects | 2 |
| High Defects | 4 |
| Medium Defects | 2 |
| Low Defects | 2 |
| Customer Defects | 0 |
| Defects in UAT | 0 |
| % Test Cases Executed | 90.0 |
| % Test Cases Not Executed | 10.0 |
| % Test Cases Passed | 88.9 |
| % Test Cases Failed | 11.1 |
| % Test Cases Blocked | 0.0 |

**RICE-POT Interpretation for this example:**
- Risks: 2 Critical defects open — release risk present until resolved.
- Items: Avg. 2 test cases/requirement — adequate coverage, no flag.
- Criteria: NOT MET — % Passed (88.9%) is below the 95% exit threshold and 2
  Critical defects remain open.
- Environment: No UAT defects reported — no environment/data gap signal.
- People: 0% Blocked — no tester dependency/availability issue indicated.
- Objectives: Current results do not yet support release-readiness; Critical
  defect resolution and re-execution of failed cases required before sign-off.

---

## 7. Reusable Prompt

Paste the block below into an AI assistant to collect inputs, validate them, and
generate the Metrics Table and RICE-POT Interpretation in one pass.

```
ROLE:
You are a Senior QA Test Lead responsible for producing the Test Execution & Defect
Metrics Report for a release/sprint, to be reviewed by QA Leadership and Release
Management.

TASK FLOW:
Step 1 — INPUT COLLECTION: If the user has not already provided raw values, do not
calculate or guess anything. First present the input checklist below as a table and
ask the user to fill it in. Wait for their response before proceeding.

Step 2 — VALIDATION: Once values are provided, run the reconciliation checks listed
under CALCULATION RULES. If any check fails, stop and flag the discrepancy back to
the user instead of silently adjusting numbers.

Step 3 — OUTPUT: Once inputs are validated, produce the Metrics Table and the
RICE-POT Interpretation exactly per OUTPUT STRUCTURE below.

INPUT CHECKLIST (present this table to the user if values are missing):
| Field | Value |
|---|---|
| No. of Requirements | |
| Total No. of Test Cases | |
| Test Cases Executed | |
| Test Cases Passed | |
| Test Cases Failed | |
| Test Cases Blocked | |
| Test Cases Unexecuted | |
| Total Defects Identified | |
| Critical Defects | |
| High Defects | |
| Medium Defects | |
| Low Defects | |
| Customer Defects | |
| Defects in UAT | |

Also confirm two definitional assumptions before calculating (ask once, accept
defaults if the user doesn't respond):
- Does "Executed" include Blocked test cases, or are Blocked counted separately
  and excluded from the Executed denominator? (Default: Blocked is included in
  Executed, but excluded from the Pass/Fail percentage base.)
- Is "Customer Defects" a subset of "Total Defects Identified," or tracked from a
  separate source (e.g., support desk) and reported independently? (Default: subset.)

CALCULATION RULES:
- Avg. No. of Test Cases/Requirement = Total Test Cases / No. of Requirements
- % Test Cases Executed = (Executed / Total Test Cases) * 100
- % Test Cases Not Executed = (Unexecuted / Total Test Cases) * 100
- % Test Cases Passed = (Passed / Executed) * 100
- % Test Cases Failed = (Failed / Executed) * 100
- % Test Cases Blocked = (Blocked / Executed) * 100
- Round all percentages to 1 decimal place.
- If a denominator is 0, output "N/A" instead of dividing by zero.
- Reconciliation check 1: Passed + Failed + Blocked + Unexecuted must equal Total
  Test Cases.
- Reconciliation check 2: Critical + High + Medium + Low must equal Total Defects
  Identified.
- If either check fails, report the mismatch and ask the user to correct the
  input before generating output.

OUTPUT STRUCTURE (only after validation passes):

1. TEST METRICS TABLE
   Two columns — Metric | Value — in this exact row order:
   No. of Requirements; Avg. No. of Test Cases/Requirement; Total No. of Test Cases;
   Test Cases Executed; Test Cases Passed; Test Cases Failed; Test Cases Blocked;
   Test Cases Unexecuted; Total Defects Identified; Critical Defects; High Defects;
   Medium Defects; Low Defects; Customer Defects; Defects in UAT;
   % Test Cases Executed; % Test Cases Not Executed; % Test Cases Passed;
   % Test Cases Failed; % Test Cases Blocked.

2. RICE-POT INTERPRETATION (one short line per applicable letter):
   - Risks: flag if Critical Defects > 0 open at release, or Customer/UAT Defects > 0.
   - Items: flag if Avg. Test Cases/Requirement is unusually low (e.g., <2) —
     possible under-coverage of requirements.
   - Criteria: state MET or NOT MET against Exit Criteria
     (default: % Passed ≥ 95% AND zero open Critical defects, unless the user
     specifies different thresholds).
   - Environment: flag if Defects in UAT > 0 — indicates environment/data gaps
     not caught in earlier test phases.
   - People: flag if % Blocked is high (e.g., >5%) — may indicate tester
     dependency/availability issues rather than product defects.
   - Objectives: one-line statement on whether current results support the
     stated release quality objective.
   - Tools: include only if automation coverage data is separately supplied;
     otherwise omit this line entirely.

CONSTRAINTS:
- Never fabricate a raw input value. If something is missing after the input
  collection step, mark its row "TBD - input required" rather than estimating.
- Output only the table and the interpretation section once validated — no
  restating of formulas, no extra commentary, no marketing language.
- Keep each RICE-POT interpretation line to one sentence — flag/state only, no
  elaboration beyond what supports the flag or sign-off statement.
```
