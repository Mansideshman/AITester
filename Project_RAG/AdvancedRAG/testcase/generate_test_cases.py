"""
Synthesizes a 5,000-row VWO test case dataset in a Jira test-case-import
shape, used as the corpus for the Advanced RAG Explorer demo.

Deterministic (fixed seed) so the CSV can be regenerated identically.
No external deps beyond the stdlib.
"""
import csv
import random
from datetime import date, timedelta

SEED = 20260730
random.seed(SEED)

OUT_PATH = "vwo_test_cases_5000.csv"
TARGET_ROWS = 5000

BROWSERS = ["Chrome", "Firefox", "Safari", "Edge"]
DEVICES = ["Desktop", "Mobile", "Tablet"]
ROLES = ["Account Owner", "Editor", "Viewer", "Account Admin"]
ENVS = ["Staging", "Production"]

# Each module: (name, default_priority, default_test_type, tag, [action templates])
# Action template placeholders: {browser} {device} {role} {env}
MODULES = [
    ("Visual Editor", "High", "Functional", "visual-editor", [
        "Edit heading text of the hero banner using the Visual Editor on {browser} ({device})",
        "Change the background color of the CTA button via the visual editor on {browser}",
        "Drag and reorder two sections on the landing page in the visual editor ({device})",
        "Add a custom CSS rule to hide an element via the visual editor",
        "Add a custom JS snippet to a variation and verify it executes on page load",
        "Swap a product image using the image-replace tool in the visual editor",
        "Undo and redo three consecutive edits made in the visual editor",
        "Preview a variation across the {device} breakpoint before publishing",
        "Delete an element from a variation and confirm it does not render on {browser}",
        "Duplicate an element and reposition the copy within the same section",
        "Insert a redirect action on a button click and verify the destination URL",
        "Save a variation as a draft and resume editing it later on {env}",
    ]),
    ("A/B Testing (Split URL)", "Critical", "Functional", "ab-testing", [
        "Create a new Split URL test with two variation URLs and launch it on {env}",
        "Verify traffic is split ~50/50 between control and variation over 1,000 sessions",
        "Pause a running A/B test and confirm no new visitors are bucketed",
        "Resume a paused A/B test and verify existing visitors keep their original variation",
        "Set a custom traffic allocation (e.g. 70/30) between control and variation",
        "Verify a returning visitor on {browser} keeps the same variation across sessions",
        "Add a conversion goal (pageview) to a running test and confirm reporting updates",
        "Add a revenue goal to a test and verify revenue attribution in the report",
        "Exclude a query parameter from URL matching in a Split URL test",
        "Stop a test and declare a winning variation, then verify 100% traffic routes there",
        "Schedule a test to auto-start at a future date and time on {env}",
        "Verify mutually exclusive test groups prevent a visitor from entering two tests",
    ]),
    ("Multivariate Testing", "High", "Functional", "mvt", [
        "Create an MVT campaign with 2 sections and 2 variations each (4 combinations)",
        "Verify full-factorial combination reporting shows all 4 combinations on {env}",
        "Use fractional factorial mode to reduce total combinations and verify allocation",
        "Verify the MVT winner combination calculation with a fixed sample size",
        "Add a section-level goal and confirm it only tracks that section's variations",
        "Preview each MVT combination individually before publishing on {browser}",
    ]),
    ("Web Personalization", "High", "Functional", "personalization", [
        "Create a personalization campaign targeting visitors from a specific geo on {env}",
        "Target returning visitors using a custom audience based on cookie value",
        "Personalize hero content for visitors arriving from a paid UTM campaign",
        "Verify a personalization campaign does not show to excluded segments",
        "Set a frequency cap so a personalized banner appears only once per session",
        "Verify personalization campaign priority order when two campaigns overlap",
        "Roll back a personalization campaign and confirm visitors see the original content",
    ]),
    ("Server-Side Testing", "Critical", "Integration", "server-side", [
        "Call the Server-Side API to fetch a variation for a given user ID on {env}",
        "Verify variation assignment is sticky across repeated Server-Side API calls",
        "Track a Server-Side conversion event via the REST API and verify it appears in reports",
        "Verify Server-Side SDK falls back to control when the API is unreachable",
        "Force a specific variation via the Server-Side API override parameter",
        "Verify Server-Side test respects a custom bucketing seed for a given user segment",
    ]),
    ("Mobile App A/B Testing", "High", "Functional", "mobile-app", [
        "Create a mobile app A/B test targeting the Android SDK on {env}",
        "Create a mobile app A/B test targeting the iOS SDK and verify variation delivery",
        "Verify app-open event triggers correct variation bucketing on first launch",
        "Verify a mobile test respects app version targeting rules",
        "Force-close and reopen the app and confirm the same variation persists",
        "Verify push-triggered deep link routes to the correct in-app variation",
    ]),
    ("Feature Flags & Rollouts", "Critical", "Functional", "feature-flags", [
        "Create a feature flag and roll it out to 10% of traffic on {env}",
        "Increase a feature flag rollout percentage from 10% to 50% without a redeploy",
        "Target a feature flag to a specific customer segment using custom attributes",
        "Kill-switch a feature flag and verify all traffic reverts to the fallback instantly",
        "Verify flag evaluation consistency for the same user across multiple requests",
        "Schedule a feature flag rollout increase for a future date on {env}",
        "Verify a dependent flag does not activate until its parent flag is enabled",
    ]),
    ("Web Push Notifications", "Medium", "Functional", "push-notifications", [
        "Prompt a visitor for push notification permission and verify opt-in tracking",
        "Send a scheduled web push campaign and verify delivery on {browser}",
        "Verify a triggered push notification fires after a cart-abandonment event",
        "Segment push notification recipients by geography and verify targeting",
        "Verify unsubscribe link in a push notification removes the visitor from future sends",
        "Verify push notification click-through is attributed to the correct campaign",
    ]),
    ("Surveys & Polls", "Medium", "Functional", "surveys", [
        "Create a single-question NPS survey and verify it displays after 30 seconds on-page",
        "Create a multi-step survey and verify progress persists between steps",
        "Verify survey response data appears correctly in the responses dashboard",
        "Set a survey to show only once per visitor using a cookie-based frequency cap",
        "Verify a survey with conditional branching skips irrelevant follow-up questions",
        "Export survey responses to CSV and verify column integrity",
    ]),
    ("Heatmaps & Session Recordings", "Medium", "Functional", "heatmaps", [
        "Generate a click heatmap for a landing page and verify hotspot rendering on {device}",
        "Generate a scroll-depth heatmap and verify the 25/50/75/100% markers",
        "Record a session and verify mouse movement playback matches the recorded session",
        "Verify rage-click detection flags a session with 3+ rapid clicks on one element",
        "Filter session recordings by {device} and verify only matching sessions display",
        "Verify form-field interaction is masked in a session recording for a password field",
    ]),
    ("Funnel Analysis", "High", "Functional", "funnels", [
        "Build a 4-step funnel (Landing > PDP > Cart > Checkout) and verify drop-off rates",
        "Add a time-window constraint to a funnel and verify sessions outside the window are excluded",
        "Verify funnel breakdown by {device} shows correct per-step conversion rates",
        "Verify a funnel step matching a URL wildcard pattern captures all matching pages",
        "Compare funnel conversion between two date ranges and verify the delta calculation",
    ]),
    ("Form Analytics", "Medium", "Functional", "form-analytics", [
        "Track field-level engagement and verify drop-off is reported on {device}",
        "Verify time-to-complete metric is calculated per form field",
        "Verify form resubmission after a validation error is tracked correctly",
        "Verify a multi-page form aggregates analytics across all pages as one form",
    ]),
    ("Audience Segmentation", "High", "Functional", "segmentation", [
        "Create a custom audience segment based on visitor's UTM source on {env}",
        "Create a segment combining device type AND geography with AND/OR logic",
        "Verify a segment based on number of previous visits updates in near real time",
        "Verify a segment using a custom JavaScript variable correctly evaluates on {browser}",
        "Export a segment's visitor count and verify it matches the reporting dashboard",
        "Verify nested segment logic (segment referencing another segment) evaluates correctly",
    ]),
    ("SmartCode / Async Snippet", "Critical", "Functional", "smartcode", [
        "Install the async SmartCode snippet and verify no flicker (FOOC) on {browser}",
        "Verify SmartCode loads correctly under a Content Security Policy with nonce",
        "Verify SmartCode initializes before the first paint on a slow 3G network throttle",
        "Verify SmartCode gracefully no-ops when the account ID is invalid",
        "Verify SmartCode respects a custom flicker-timeout configuration value",
    ]),
    ("Integrations", "High", "Integration", "integrations", [
        "Connect Google Analytics 4 and verify experiment data appears as a custom dimension",
        "Connect Segment and verify variation-viewed events forward to a configured destination",
        "Connect Shopify and verify a running test correctly targets the checkout page",
        "Connect HubSpot and verify a converted visitor is tagged with the correct list",
        "Connect Slack and verify a test-launched notification posts to the configured channel",
        "Disconnect an integration and verify historical data remains intact in reports",
    ]),
    ("Reports & Analytics Dashboard", "High", "Functional", "reporting", [
        "Verify the reporting dashboard significance calculation updates as sessions accrue",
        "Filter a report by date range and verify totals recompute correctly",
        "Export a report to PDF and verify all chart data matches the on-screen dashboard",
        "Verify a report segmented by {device} sums to the same total as the unsegmented report",
        "Verify Bayesian probability-to-beat-control display updates after each report refresh",
        "Share a report via a read-only link and verify an unauthenticated viewer can access it",
    ]),
    ("Goals & Conversion Tracking", "Critical", "Functional", "goals", [
        "Add a pageview goal and verify it fires exactly once per matching visitor session",
        "Add a custom event goal via the tracking API and verify attribution to the active test",
        "Add a revenue goal with a custom currency and verify totals convert correctly",
        "Verify a goal with a URL-contains condition matches partial paths correctly",
        "Verify goal de-duplication when the same event fires twice within one session",
    ]),
    ("User Management & SSO", "High", "Security", "user-management", [
        "Invite a new user with the {role} role and verify their permission scope on {env}",
        "Configure SAML SSO and verify a user can log in via the identity provider",
        "Revoke a user's access and verify their active session is terminated immediately",
        "Verify a {role} cannot access billing settings per the role's permission matrix",
        "Enable two-factor authentication and verify login is blocked without the OTP",
        "Verify SCIM-provisioned user deactivation syncs within the expected window",
    ]),
    ("Account & Billing Settings", "High", "Functional", "billing", [
        "Upgrade an account plan and verify the prorated invoice amount is correct",
        "Downgrade an account plan and verify feature access is revoked at the end of the cycle",
        "Update the billing payment method and verify the next invoice uses the new method",
        "Verify a failed payment retry sends the correct dunning notification email",
        "Apply a coupon code at checkout and verify the discount reflects on the invoice",
    ]),
    ("API & Webhooks", "High", "Integration", "api", [
        "Call the Reporting API for a given test ID and verify the JSON schema on {env}",
        "Register a webhook for test-completed events and verify the payload delivers",
        "Verify API rate limiting returns a 429 after exceeding the documented threshold",
        "Rotate an API key and verify requests using the old key are rejected",
        "Verify webhook retries with exponential backoff after a simulated 500 response",
    ]),
    ("Campaign Scheduling", "Medium", "Functional", "scheduling", [
        "Schedule a campaign to start at a future date/time in a specific timezone on {env}",
        "Schedule a campaign to auto-stop after reaching a target sample size",
        "Verify a scheduled campaign sends a reminder notification 1 hour before launch",
        "Reschedule a pending campaign and verify the original schedule is fully overwritten",
    ]),
    ("Targeting Rules", "High", "Functional", "targeting", [
        "Target visitors by geography (country + city) and verify correct inclusion on {env}",
        "Target visitors by {device} type and verify exclusion of non-matching devices",
        "Target visitors by UTM campaign parameter and verify case-insensitive matching",
        "Target visitors using a custom JavaScript condition and verify evaluation on {browser}",
        "Combine include and exclude targeting rules and verify exclude takes precedence",
    ]),
    ("Notifications & Alerts", "Low", "Functional", "notifications", [
        "Configure an email alert for statistically significant results and verify delivery",
        "Configure a Slack alert for a campaign pause event and verify the message content",
        "Verify a digest notification batches multiple campaign updates into one email",
        "Mute notifications for a specific campaign and verify no further alerts are sent",
    ]),
    ("Program Management", "Medium", "Functional", "programs", [
        "Group three related tests into a Program and verify combined reporting on {env}",
        "Verify a Program-level goal aggregates conversions across all child tests",
        "Archive a completed Program and verify it moves out of the active list",
    ]),
    ("Accessibility & Compatibility", "Medium", "Compatibility", "accessibility", [
        "Verify the variation editor is operable via keyboard navigation only",
        "Verify a published variation passes a basic WCAG color-contrast check on {browser}",
        "Verify the dashboard renders correctly at 200% browser zoom on {browser}",
        "Verify screen-reader labels are present on all primary dashboard navigation items",
    ]),
    ("Performance", "Medium", "Performance", "performance", [
        "Measure SmartCode script execution time on a throttled CPU and verify it stays under budget",
        "Load-test the reporting dashboard with 90 days of data and verify render time on {browser}",
        "Verify variation asset caching reduces repeat-visit load time on {device}",
    ]),
]

TAGS_EXTRA = ["regression", "smoke", "release-9.4", "release-9.5", "critical-path", "flaky-candidate", "new-ui"]

STATUS_WEIGHTS = [("Passed", 55), ("Not Run", 20), ("Failed", 15), ("Blocked", 10)]


def weighted_choice(pairs, rng):
    total = sum(w for _, w in pairs)
    r = rng.uniform(0, total)
    upto = 0
    for val, w in pairs:
        upto += w
        if r <= upto:
            return val
    return pairs[-1][0]


def build_combo_pool():
    pool = []
    for m_idx, (module, prio, ttype, tag, actions) in enumerate(MODULES):
        for a_idx, action in enumerate(actions):
            for browser in BROWSERS:
                for device in DEVICES:
                    for role in ROLES:
                        pool.append((m_idx, module, prio, ttype, tag, a_idx, action, browser, device, role))
    return pool


def render(template, browser, device, role, env):
    return template.format(browser=browser, device=device, role=role, env=env)


def make_steps(action_text, browser, device, role, env, rng):
    login_step = f"Log in to the VWO dashboard as {role} on {env}."
    nav_step = f"Navigate to the relevant module and open the {browser}/{device} test context."
    action_step = f"Perform the action: {action_text}."
    verify_step = "Observe the resulting behavior and capture a screenshot for evidence."
    steps = [login_step, nav_step, action_step, verify_step]
    if rng.random() < 0.3:
        steps.insert(3, "Refresh the page and confirm the state persists after reload.")
    return " ".join(f"{i+1}. {s}" for i, s in enumerate(steps))


def make_expected(action_text, rng):
    endings = [
        "the change is reflected immediately without a page reload error.",
        "the expected value is persisted and visible after a refresh.",
        "no console errors are logged and the UI updates as designed.",
        "the reporting/analytics data reconciles with the action performed.",
        "the system enforces the rule consistently across repeated attempts.",
    ]
    return f"After the action completes, {rng.choice(endings)} Specifically: {action_text[0].lower()}{action_text[1:]} succeeds as specified."


def main():
    pool = build_combo_pool()
    rng = random.Random(SEED)
    rng.shuffle(pool)
    if len(pool) < TARGET_ROWS:
        raise SystemExit(f"combo pool too small: {len(pool)} < {TARGET_ROWS}")
    chosen = pool[:TARGET_ROWS]

    # cluster jira ids per (module, action) so multiple browser/device/role
    # variants of the same scenario roll up under the same ticket, like a
    # real cross-browser test matrix exported from Jira.
    jira_base = 1000
    jira_map = {}
    next_id = jira_base
    for m_idx, _module, _p, _t, _tag, a_idx, *_ in pool:
        key = (m_idx, a_idx)
        if key not in jira_map:
            jira_map[key] = next_id
            next_id += 1

    start_date = date(2025, 1, 6)
    rows = []
    for i, (m_idx, module, prio, ttype, tag, a_idx, action, browser, device, role) in enumerate(chosen, start=1):
        env = rng.choice(ENVS)
        title_text = render(action, browser, device, role, env)
        title = title_text[0].upper() + title_text[1:]
        steps = make_steps(title, browser, device, role, env, rng)
        expected = make_expected(title, rng)
        precond = (
            f"Test account provisioned on {env}; visitor is not an internal/QA-excluded IP; "
            f"{module} feature is enabled for the account; browser under test is {browser} on {device}."
        )
        extra_tags = rng.sample(TAGS_EXTRA, k=rng.randint(1, 2))
        tags = ",".join([tag, browser.lower(), device.lower()] + extra_tags)
        jira_id = f"VWO-{jira_map[(m_idx, a_idx)]}"
        created = start_date + timedelta(days=rng.randint(0, 540))
        status = weighted_choice(STATUS_WEIGHTS, rng)
        row = {
            "id": f"TC-{i:05d}",
            "jira_id": jira_id,
            "title": title,
            "module": module,
            "priority": prio,
            "test_type": ttype,
            "tags": tags,
            "preconditions": precond,
            "steps": steps,
            "expected": expected,
            "status": status,
            "created_date": created.isoformat(),
        }
        rows.append(row)

    fieldnames = ["id", "jira_id", "title", "module", "priority", "test_type",
                  "tags", "preconditions", "steps", "expected", "status", "created_date"]
    with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {OUT_PATH}")
    print(f"Unique jira tickets: {len(jira_map)}")


if __name__ == "__main__":
    main()
