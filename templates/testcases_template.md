# JIRA Test Case Template — Reference Documentation

**Document Type:** QA Test Management Standard
**Format Compatibility:** JIRA (native fields), Xray, Zephyr Scale
**Maintained By:** QA Test Management
**Version:** 1.0

---

## 1. Purpose & Scope

This document defines the standardized field structure, controlled vocabulary, and formatting specification for the enterprise Test Case Template. It governs how test cases are authored, executed, and tracked across JIRA-based test management tools (Xray, Zephyr Scale) and serves as the field dictionary for the companion spreadsheet (`Test_Case_Template.xlsx`).

The template is designed for direct import into Xray (Test issue type) or Zephyr Scale (Test Case entity), with column headers aligned to each tool's expected import schema where applicable.

---

## 2. Field Dictionary

One-line definition per field, plus mapping to the corresponding JIRA, Xray, and Zephyr Scale fields for import/export purposes.

| # | Column Name | Definition | Data Type | Required | JIRA Field Mapping | Xray Field Mapping | Zephyr Scale Mapping |
|---|---|---|---|---|---|---|---|
| 1 | Test Case ID | Unique identifier for the test case, used for traceability across systems. | Text (TC-XXX-###) | Yes | Issue Key (auto-generated on import) | Test Issue Key | Test Case Key |
| 2 | Linked Story/Epic Key | JIRA key of the user story or epic the test case validates. | Text | Yes | Linked Issues ("tests" link type) | Test Coverage / Requirement Link | Linked Issue |
| 3 | Summary | One-line description of the test objective. | Text | Yes | Summary | Test Summary | Test Name |
| 4 | Test Type | Category of testing performed. | Dropdown | Yes | Custom field: Test Type | Test Type (custom field) | Test Type |
| 5 | Execution Type | Whether the test is executed manually or via automation. | Dropdown | Yes | Custom field: Execution Type | Test Execution Type | Automation Status |
| 6 | Priority | Business priority of the test case. | Dropdown | Yes | Priority | Priority | Priority |
| 7 | Severity | Impact level if the underlying functionality fails. | Dropdown | Yes | Custom field: Severity | Severity (custom field) | Severity (custom field) |
| 8 | Component | Application module or component under test. | Text/Dropdown | Yes | Component/s | Component | Component |
| 9 | Labels | Free-text tags used for filtering and grouping. | Text, comma-separated | No | Labels | Labels | Labels |
| 10 | Preconditions | System state or setup required before execution. | Multi-line text | Yes | Description (precondition section) | Precondition (linked Pre-Condition issue) | Precondition |
| 11 | Test Steps | Sequential, numbered actions to perform. | Multi-line text | Yes | Description / Steps field | Test Step (Action/Data/Expected grid) | Test Step |
| 12 | Test Data | Specific input values used during execution. | Text | Yes | Description (data section) | Test Data (per step) | Test Data |
| 13 | Expected Result | Anticipated system behavior/output. | Text | Yes | Description (expected section) | Expected Result (per step) | Expected Result |
| 14 | Actual Result | Observed behavior during execution. | Text | Conditional (post-execution) | Execution comment | Actual Result | Actual Result |
| 15 | Status | Current execution status of the test case. | Dropdown | Yes | Status | Test Run Status | Execution Status |
| 16 | Assignee | Person responsible for executing the test. | Text/User | Yes | Assignee | Assignee | Assignee |
| 17 | Reporter | Person who authored the test case. | Text/User | Yes | Reporter | Reporter | Created By |
| 18 | Sprint | Sprint in which the test is planned/executed. | Text | No | Sprint | Sprint | Sprint |
| 19 | Test Environment | Environment in which the test was executed. | Text/Dropdown | Yes | Custom field: Environment | Test Environment | Environment |
| 20 | Created Date | Date the test case was authored. | Date (YYYY-MM-DD) | Auto/Yes | Created | Created Date | Created On |
| 21 | Executed Date | Date the test was last run. | Date (YYYY-MM-DD) | Conditional | Custom field | Last Executed | Executed On |
| 22 | Defect ID | Linked bug/defect key if the test failed. | Text | Conditional | Linked Issues ("is defect of") | Defects (linked) | Linked Defect |
| 23 | Comments/Notes | Additional context, caveats, or execution notes. | Text | No | Comment | Comment | Comments |

---

## 3. Controlled Vocabulary (Dropdown / Data Validation Lists)

These lists are enforced as data-validation dropdowns in the spreadsheet to prevent free-text drift and ensure clean import mapping.

**Priority**
`Critical` · `High` · `Medium` · `Low`

**Severity**
`Critical` · `Major` · `Minor` · `Trivial`

**Test Type**
`Functional` · `Regression` · `Smoke` · `Integration` · `UAT` · `Performance` · `Security` · `Exploratory`

**Execution Type**
`Manual` · `Automated`

**Status**
`Not Executed` · `In Progress` · `Pass` · `Fail` · `Blocked` · `Deferred`

---

## 4. Sample Test Cases — Feature: User Login

Five test cases covering positive, negative, and boundary/edge scenarios.

### TC-LOGIN-001 — Positive: Valid Login

| Field | Value |
|---|---|
| Linked Story/Epic Key | LOGIN-101 |
| Summary | Verify successful login with valid registered credentials |
| Test Type | Functional |
| Execution Type | Manual |
| Priority | Critical |
| Severity | Critical |
| Component | Authentication |
| Labels | login, smoke, regression |
| Preconditions | User account exists and is active; user is on the Login page |
| Test Steps | 1. Enter valid username. 2. Enter valid password. 3. Click "Log In" |
| Test Data | username: qa_user01 / password: Valid@Pass123 |
| Expected Result | User is redirected to the Dashboard; session token is created |
| Actual Result | User redirected to Dashboard as expected |
| Status | Pass |
| Assignee | J. Mehta |
| Reporter | A. Singh |
| Sprint | Sprint 24 |
| Test Environment | Staging |
| Created Date | 2026-06-01 |
| Executed Date | 2026-06-10 |
| Defect ID | — |
| Comments/Notes | Baseline regression case; run on every release |

### TC-LOGIN-002 — Negative: Invalid Password

| Field | Value |
|---|---|
| Linked Story/Epic Key | LOGIN-101 |
| Summary | Verify login is rejected with correct username and incorrect password |
| Test Type | Functional |
| Execution Type | Manual |
| Priority | High |
| Severity | Major |
| Component | Authentication |
| Labels | login, negative |
| Preconditions | User account exists and is active; user is on the Login page |
| Test Steps | 1. Enter valid username. 2. Enter incorrect password. 3. Click "Log In" |
| Test Data | username: qa_user01 / password: WrongPass1 |
| Expected Result | Login is rejected; error message "Invalid username or password" is displayed; no session created |
| Actual Result | Error message displayed as expected |
| Status | Pass |
| Assignee | J. Mehta |
| Reporter | A. Singh |
| Sprint | Sprint 24 |
| Test Environment | Staging |
| Created Date | 2026-06-01 |
| Executed Date | 2026-06-10 |
| Defect ID | — |
| Comments/Notes | Confirms generic error message does not leak which field is incorrect |

### TC-LOGIN-003 — Negative: Empty Username Field

| Field | Value |
|---|---|
| Linked Story/Epic Key | LOGIN-102 |
| Summary | Verify login form validation when username field is left blank |
| Test Type | Functional |
| Execution Type | Automated |
| Priority | Medium |
| Severity | Minor |
| Component | Authentication |
| Labels | login, negative, validation |
| Preconditions | User is on the Login page |
| Test Steps | 1. Leave username field blank. 2. Enter any valid password. 3. Click "Log In" |
| Test Data | username: (blank) / password: Valid@Pass123 |
| Expected Result | Inline validation error "Username is required" displayed; form does not submit |
| Actual Result | Validation error displayed; submission blocked |
| Status | Pass |
| Assignee | R. Iyer |
| Reporter | A. Singh |
| Sprint | Sprint 24 |
| Test Environment | QA |
| Created Date | 2026-06-02 |
| Executed Date | 2026-06-11 |
| Defect ID | — |
| Comments/Notes | Automated via Selenium suite, nightly run |

### TC-LOGIN-004 — Boundary: Maximum Password Length

| Field | Value |
|---|---|
| Linked Story/Epic Key | LOGIN-103 |
| Summary | Verify login accepts password at maximum allowed length (64 characters) |
| Test Type | Functional |
| Execution Type | Manual |
| Priority | Medium |
| Severity | Minor |
| Component | Authentication |
| Labels | login, boundary |
| Preconditions | Test account configured with a 64-character password |
| Test Steps | 1. Enter valid username. 2. Enter password of exactly 64 characters. 3. Click "Log In" |
| Test Data | username: qa_user02 / password: 64-character string at system max length |
| Expected Result | Login succeeds; no truncation or character-limit error |
| Actual Result | Login succeeded as expected |
| Status | Pass |
| Assignee | J. Mehta |
| Reporter | A. Singh |
| Sprint | Sprint 25 |
| Test Environment | Staging |
| Created Date | 2026-06-03 |
| Executed Date | 2026-06-12 |
| Defect ID | — |
| Comments/Notes | Pairs with negative boundary case at 65 characters (TC-LOGIN-005) |

### TC-LOGIN-005 — Edge Case: Account Lockout After Repeated Failures

| Field | Value |
|---|---|
| Linked Story/Epic Key | LOGIN-104 |
| Summary | Verify account is locked after 5 consecutive failed login attempts |
| Test Type | Security |
| Execution Type | Manual |
| Priority | Critical |
| Severity | Critical |
| Component | Authentication |
| Labels | login, security, edge-case |
| Preconditions | User account exists and is active; lockout threshold set to 5 attempts |
| Test Steps | 1. Enter valid username with incorrect password 5 times consecutively. 2. Attempt a 6th login with the correct password |
| Test Data | username: qa_user03 / password attempts: 5x incorrect, then correct password |
| Expected Result | Account is locked after the 5th failed attempt; 6th attempt (even with correct password) is rejected with "Account locked, contact support" message |
| Actual Result | Account locked after 4th attempt instead of 5th | 
| Status | Fail |
| Assignee | R. Iyer |
| Reporter | A. Singh |
| Sprint | Sprint 25 |
| Test Environment | QA |
| Created Date | 2026-06-04 |
| Executed Date | 2026-06-13 |
| Defect ID | BUG-2291 |
| Comments/Notes | Off-by-one error in lockout counter logic; defect raised against LOGIN-104 |

---

## 5. Spreadsheet Formatting Specification

Applies to the companion `.xlsx` deliverable:

- **Sheet 1 — Test Cases:** all 23 columns per Section 2, header row bold, frozen at row 1, column widths sized for readable content (15–45 characters depending on field), no merged cells in any data row.
- **Sheet 2 — Field Dictionary:** static reference table matching Section 2 of this document.
- **Sheet 3 — Lookup Lists:** source ranges for all dropdown values in Section 3, referenced by data-validation rules on Sheet 1 (kept on a separate sheet to avoid cluttering the working view).
- **Data Validation:** list-based dropdowns applied to columns Test Type, Execution Type, Priority, Severity, and Status; invalid entries rejected at input.
- **Dates:** Created Date and Executed Date formatted as `YYYY-MM-DD` to avoid locale ambiguity on import.
- **Zero formula errors:** no calculated fields are used in the base template; any future formulas (e.g., pass-rate summaries) must be validated against blank/zero-row conditions before release.

---

## 6. Import Notes for Xray / Zephyr Scale

- **Xray (CSV/XLSX import):** map `Test Case ID` to the Xray Test issue key field (leave blank for new-issue creation; Xray will assign the key), map `Test Steps` / `Test Data` / `Expected Result` to Xray's step-grid import format (one row per step if multi-step granularity is required — the flat template stores all steps in a single numbered cell, which Xray's importer will parse if steps are separated by line breaks).
- **Zephyr Scale (Test Case import):** map `Linked Story/Epic Key` to the "Linked Issues" field on import; `Test Type` and `Execution Type` map directly to Zephyr's custom fields of the same name if those custom fields exist in the target project, otherwise create them prior to import.
- **Status values** in this template (`Not Executed`, `In Progress`, `Pass`, `Fail`, `Blocked`, `Deferred`) should be confirmed against the target project's workflow statuses before import; rename the dropdown list in Section 3 to match if the project uses different status names.
- **Component and Labels** must already exist in the target JIRA project (Components are project-scoped); imports will fail silently into "no component" if the name does not match exactly.

---

## 7. Usage Guidelines

- Populate `Test Case ID` using the convention `TC-<MODULE>-<###>` for traceability across modules.
- `Actual Result`, `Status`, `Executed Date`, and `Defect ID` remain blank at authoring time and are populated only during/after execution.
- One row = one test case. Do not combine multiple scenarios into a single row even if steps are similar; this breaks traceability and pass/fail reporting.
- Review and update the Lookup Lists sheet whenever organizational workflow statuses or severity scales change, rather than editing dropdown values inline on individual rows.
