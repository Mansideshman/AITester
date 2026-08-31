from .selenium_loader import load as load_selenium_code
from .playwright_loader import load as load_playwright_code
from .test_case_loader import load as load_test_case
from .jira_loader import load as load_jira_ticket
from .company_doc_loader import load as load_company_doc
from .meeting_note_loader import load as load_meeting_note
from .lucidchart_loader import load as load_lucidchart
from .prd_loader import load as load_prd_doc
from .jenkins_log_loader import load as load_jenkins_log

# Dispatch table used by qabuddy/ingest.py — one loader per active
# source_type (figma_design has no entry: no loader exists for it yet).
LOADERS = {
    "selenium_code": load_selenium_code,
    "playwright_code": load_playwright_code,
    "test_case": load_test_case,
    "jira_ticket": load_jira_ticket,
    "company_doc": load_company_doc,
    "meeting_note": load_meeting_note,
    "lucidchart": load_lucidchart,
    "prd_doc": load_prd_doc,
    "jenkins_log": load_jenkins_log,
}
