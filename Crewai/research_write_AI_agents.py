#QA research agent

#QA Documentation writer

from groq_llm import get_groq_llm  # noqa: F401 (patches sqlite3 before crewai imports it)
from crewai import Agent, Task, Crew, Process

groq_llm = get_groq_llm()

researcher_agent = Agent(
    role="QA Research Analyst",
    goal="Find the common bug in the web application",
    backstory="You are a QA researcher who has analyzed"\
        "thousands of bug reports acrosss web applications "\
        "You specialize in identifying patterns and trends in software",
    llm=groq_llm,
    verbose=True
    )

writer_agent = Agent(
    role = "QA documentation Writer",
    goal = "Create clear,actionable bug prevention guidelines",
    backstory="""You are a technical writer specializing in QA documentation.YOu turn complex bug data into simple,actionable checklists that developers can follow.""",
    llm=groq_llm,
    verbose=True
    )


researcher_task = Task(
    description ="""Research and list the top 5 most common bug categories in modern web applications.
    For each category,provide:name,frequency(percentage),example, and impact level.""",
    expected_output="""A randked list of 5 bug categories with name,frequency,example,and impact for each.""",
    agent = researcher_agent
)

writing_task = Task(
    description="Based on the research provided,create a 'Bug Prevention Checklist' that developers can use before submitting a pull request.Make it practical and actionable.",
    expected_output="""A formatted checklist with 5-10 items that developers can quickly review before code submission.""",
    agent=writer_agent

)

crew = Crew(
    agents= [researcher_agent,writer_agent],
    tasks =[researcher_task,writing_task],
    process=Process.sequential,
    verbose=True
)
result = crew.kickoff()
print(result)
