"""Jira QA Crew: a CrewAI pipeline that turns Jira tickets into QA artifacts.

Patches sqlite3 -> pysqlite3 before anything imports crewai (crewai's
Chroma-backed memory layer requires sqlite3 >= 3.35.0, which most system
Python builds don't ship). This must run before the first `import crewai`
anywhere in the process, so it lives at the top of this package's __init__.
"""

import sys

try:
    __import__("pysqlite3")
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
except ImportError:
    pass
