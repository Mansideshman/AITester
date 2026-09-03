"""Sanity-check: one CrewAI agent running on Groq."""

from groq_llm import get_groq_llm  # noqa: F401 (patches sqlite3 before crewai imports it)
from crewai import Agent, Task, Crew

llm = get_groq_llm()

analyst = Agent(
    role="Test Analyst",
    goal="Write a concise test plan for the given feature",
    backstory="Senior QA analyst who writes tight, high-signal test plans.",
    llm=llm,
    verbose=True,
)

task = Task(
    description="Write a short test plan (5 bullet points) for a login form "
    "with email + password fields and a 'Forgot password' link.",
    expected_output="5 bullet-point test cases covering happy path and edge cases.",
    agent=analyst,
)

crew = Crew(agents=[analyst], tasks=[task], verbose=True)

if __name__ == "__main__":
    result = crew.kickoff()
    print("\n--- RESULT ---")
    print(result)
