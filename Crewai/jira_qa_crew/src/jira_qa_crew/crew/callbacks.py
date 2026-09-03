"""Per-ticket stage-progress tracking for the Streamlit pipeline view.

CrewAI's sequential `Crew.kickoff()` runs all tasks in one blocking call, so
there's no built-in "task N is now running" hook -- only "task N just
finished" (a Task's `callback`, given its TaskOutput). We reconstruct
Pending/Running/Completed/Failed state from that: the pipeline marks stage 0
running right before kickoff, and each stage's callback marks itself
completed and immediately marks the next stage running.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime

STAGE_ORDER = ["jira_analyst", "test_plan_writer", "test_case_writer", "playwright_coder"]
STAGE_TITLES = {
    "jira_analyst": "Jira Analyst",
    "test_plan_writer": "Test Plan Writer",
    "test_case_writer": "Test Case Writer",
    "playwright_coder": "Playwright Coder",
}


@dataclass
class StageState:
    name: str
    status: str = "pending"  # pending | running | completed | failed
    started_at: datetime | None = None
    completed_at: datetime | None = None
    message: str = ""


@dataclass
class StageTracker:
    ticket_key: str
    stages: dict[str, StageState] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def __post_init__(self) -> None:
        if not self.stages:
            self.stages = {name: StageState(name=name) for name in STAGE_ORDER}

    def start(self, stage_name: str) -> None:
        with self._lock:
            stage = self.stages[stage_name]
            stage.status = "running"
            stage.started_at = datetime.utcnow()

    def complete(self, stage_name: str, message: str = "") -> None:
        with self._lock:
            stage = self.stages[stage_name]
            stage.status = "completed"
            stage.completed_at = datetime.utcnow()
            stage.message = message

    def fail(self, stage_name: str, message: str) -> None:
        with self._lock:
            stage = self.stages[stage_name]
            stage.status = "failed"
            stage.completed_at = datetime.utcnow()
            stage.message = message

    def make_task_callback(self, stage_name: str, next_stage_name: str | None):
        def _on_task_output(output) -> None:  # output: crewai.tasks.task_output.TaskOutput
            self.complete(stage_name)
            if next_stage_name:
                self.start(next_stage_name)

        return _on_task_output

    def snapshot(self) -> list[dict]:
        with self._lock:
            return [
                {
                    "name": name,
                    "title": STAGE_TITLES[name],
                    "status": self.stages[name].status,
                    "started_at": self.stages[name].started_at,
                    "completed_at": self.stages[name].completed_at,
                    "message": self.stages[name].message,
                }
                for name in STAGE_ORDER
            ]
