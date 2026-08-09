export interface RawJobItem {
  externalId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  workType: "remote" | "hybrid" | "onsite";
  postedTime: string;
  applyUrl: string;
  jobUrl: string;
  jobDescription: string;
  experienceLevel: string;
  salaryInfo: string;
  /** Per-item source override, used by the "all sources" fetch to keep each item's real
   * publisher (e.g. "Glassdoor") instead of forcing it into a single fixed bucket. */
  sourceOverride?: string;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

/** Realistic mock LinkedIn-shaped listings spanning the profile's target titles, timezones, and edge cases. */
export function mockLinkedinJobs(): RawJobItem[] {
  return [
    {
      externalId: "li-1001",
      jobTitle: "Agentic AI Engineer",
      companyName: "Northwind Systems (Dubai)",
      location: "Dubai, United Arab Emirates",
      workType: "remote",
      postedTime: hoursAgo(3),
      applyUrl: "https://www.linkedin.com/jobs/view/1001/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1001",
      jobDescription:
        "Build and evaluate multi-agent LLM systems using LangChain/CrewAI. Own hallucination and prompt-quality evals (RAGAS), CI/CD test gates, and RAG pipeline testing. ~4-6 years experience. Remote across GCC timezones. Salary AED 25-32k/mo (~28-35 LPA equivalent).",
      experienceLevel: "Mid-Senior",
      salaryInfo: "AED 25,000-32,000/month",
    },
    {
      externalId: "li-1002",
      jobTitle: "Gen AI Engineer",
      companyName: "Fenwick & Aldous",
      location: "London, United Kingdom",
      workType: "remote",
      postedTime: hoursAgo(6),
      applyUrl: "https://www.linkedin.com/jobs/view/1002/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1002",
      jobDescription:
        "We need an AI Engineer to build LLM evaluation harnesses and agentic workflow automation (n8n/Langflow). Python required. Must have eval/RAG experience. GBP 55-65k. Fully remote, EU/UK hours.",
      experienceLevel: "Mid-Senior",
      salaryInfo: "GBP 55,000-65,000/year",
    },
    {
      externalId: "li-1003",
      jobTitle: "AI Workflow Engineer",
      companyName: "Meridian Labs",
      location: "Singapore",
      workType: "remote",
      postedTime: hoursAgo(1),
      applyUrl: "https://www.linkedin.com/jobs/view/1003/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1003",
      jobDescription:
        "Design agentic automation pipelines and quality gates for our LLM product. Hands-on with prompt evaluation, RAG testing, CI/CD. 3-5 years. Remote, APAC hours. SGD 6,500-8,000/month.",
      experienceLevel: "Mid",
      salaryInfo: "SGD 6,500-8,000/month",
    },
    {
      externalId: "li-1004",
      jobTitle: "AI QA Engineer",
      companyName: "Bengaluru Cognitive Systems",
      location: "Pune, India",
      workType: "hybrid",
      postedTime: hoursAgo(4),
      applyUrl: "https://www.linkedin.com/jobs/view/1004/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1004",
      jobDescription:
        "Hybrid role in Pune. Own LLM test automation with Playwright/Selenium, hallucination evals, and regression suites for a RAG-based support assistant. 3-5 years. INR 22-26 LPA.",
      experienceLevel: "Mid",
      salaryInfo: "INR 22-26 LPA",
    },
    {
      externalId: "li-1005",
      jobTitle: "Principal AI Engineer",
      companyName: "Vantage Cloud",
      location: "Berlin, Germany",
      workType: "remote",
      postedTime: hoursAgo(10),
      applyUrl: "https://www.linkedin.com/jobs/view/1005/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1005",
      jobDescription:
        "Principal-level owner for our agentic AI platform architecture. 10+ years leading AI infra teams, deep Kubernetes/Go experience required. EUR 110-130k.",
      experienceLevel: "Principal",
      salaryInfo: "EUR 110,000-130,000/year",
    },
    {
      externalId: "li-1006",
      jobTitle: "AI Engineer, LLM Applications",
      companyName: "Ridgeline Analytics",
      location: "Austin, Texas, United States",
      workType: "remote",
      postedTime: hoursAgo(12),
      applyUrl: "https://www.linkedin.com/jobs/view/1006/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1006",
      jobDescription:
        "Build LLM-powered internal tools, own eval + RAG pipeline testing. US-based team but open to async collaborators. Must be authorized to work in the United States; no visa sponsorship. $130-150k.",
      experienceLevel: "Mid-Senior",
      salaryInfo: "$130,000-150,000/year",
    },
    {
      externalId: "li-1007",
      jobTitle: "LLM Application Engineer",
      companyName: "Sandpiper AI",
      location: "Remote - Worldwide",
      workType: "remote",
      postedTime: hoursAgo(2),
      applyUrl: "https://www.linkedin.com/jobs/view/1007/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1007",
      jobDescription:
        "Fully remote, async-first team spanning EU and APAC. Build and test agentic LLM workflows (LangChain, CrewAI), prompt evals, RAGAS. 4+ years. $95-115k or local equivalent.",
      experienceLevel: "Mid-Senior",
      salaryInfo: "$95,000-115,000/year (or local equivalent)",
    },
    {
      externalId: "li-1008",
      jobTitle: "Frontend React Developer",
      companyName: "Pixel & Co",
      location: "Pune, India",
      workType: "hybrid",
      postedTime: hoursAgo(5),
      applyUrl: "https://www.linkedin.com/jobs/view/1008/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1008",
      jobDescription:
        "React + TypeScript developer for e-commerce storefronts. No AI/ML component. 2-4 years. INR 12-16 LPA.",
      experienceLevel: "Mid",
      salaryInfo: "INR 12-16 LPA",
    },
    {
      externalId: "li-1009",
      jobTitle: "Agentic AI Quality Engineer",
      companyName: "Helios Intelligence",
      location: "Dublin, Ireland",
      workType: "remote",
      postedTime: hoursAgo(8),
      applyUrl: "https://www.linkedin.com/jobs/view/1009/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1009",
      jobDescription:
        "Own the QA strategy for our agentic AI product: hallucination testing, RAG pipeline eval, CI/CD test gates, Playwright automation. 3-6 years. EU hours, remote. EUR 70-85k.",
      experienceLevel: "Mid-Senior",
      salaryInfo: "EUR 70,000-85,000/year",
    },
    {
      externalId: "li-1010",
      jobTitle: "AI Evaluation Engineer",
      companyName: "Solace Robotics",
      location: "San Francisco, California, United States",
      workType: "onsite",
      postedTime: hoursAgo(20),
      applyUrl: "https://www.linkedin.com/jobs/view/1010/apply",
      jobUrl: "https://www.linkedin.com/jobs/view/1010",
      jobDescription:
        "On-site only, must relocate to SF. LLM eval harness ownership for robotics foundation models. Requires PhD or 8+ years research background. $180k+.",
      experienceLevel: "Senior",
      salaryInfo: "$180,000+/year",
    },
  ];
}

export function mockIndeedJobs(): RawJobItem[] {
  return [
    {
      externalId: "in-2001",
      jobTitle: "AI QA Engineer - LLM Evaluation",
      companyName: "Crestview Software",
      location: "Remote - India",
      workType: "remote",
      postedTime: hoursAgo(5),
      applyUrl: "https://www.indeed.com/viewjob?jk=2001",
      jobUrl: "https://www.indeed.com/viewjob?jk=2001",
      jobDescription:
        "Remote India role. Own test automation for a RAG-based enterprise assistant: RAGAS eval, hallucination checks, CI/CD gates, Playwright/Selenium. 3-5 years. INR 24-28 LPA.",
      experienceLevel: "Mid",
      salaryInfo: "INR 24-28 LPA",
    },
    {
      externalId: "in-2002",
      jobTitle: "Agentic AI Engineer (Remote, Worldwide)",
      companyName: "Tidewater AI",
      location: "Remote Worldwide",
      workType: "remote",
      postedTime: hoursAgo(1),
      applyUrl: "https://www.indeed.com/viewjob?jk=2002",
      jobUrl: "https://www.indeed.com/viewjob?jk=2002",
      jobDescription:
        "Async, worldwide remote. Build multi-agent workflow automations (CrewAI, n8n, Langflow), own agentic quality gates and prompt evals. 4+ years. $100-120k or local equivalent.",
      experienceLevel: "Mid-Senior",
      salaryInfo: "$100,000-120,000/year (or local equivalent)",
    },
    {
      externalId: "in-2003",
      jobTitle: "AI Automation Workflow Engineer",
      companyName: "Larkspur Digital",
      location: "Singapore",
      workType: "remote",
      postedTime: hoursAgo(14),
      applyUrl: "https://www.indeed.com/viewjob?jk=2003",
      jobUrl: "https://www.indeed.com/viewjob?jk=2003",
      jobDescription:
        "APAC remote. Automate internal ops with agentic LLM workflows, LangChain, evaluation pipelines. 3-5 years. SGD 6,000-7,500/month.",
      experienceLevel: "Mid",
      salaryInfo: "SGD 6,000-7,500/month",
    },
    {
      externalId: "in-2004",
      jobTitle: "Director of AI Engineering",
      companyName: "Blackstone Ridge",
      location: "New York, United States",
      workType: "hybrid",
      postedTime: hoursAgo(30),
      applyUrl: "https://www.indeed.com/viewjob?jk=2004",
      jobUrl: "https://www.indeed.com/viewjob?jk=2004",
      jobDescription:
        "Director-level leadership of a 20-person AI org. 12+ years, prior VP/Director experience required. $220k+. Must be a US citizen or green card holder; no sponsorship.",
      experienceLevel: "Director",
      salaryInfo: "$220,000+/year",
    },
    {
      externalId: "in-2005",
      jobTitle: "LLM Application Engineer",
      companyName: "Copperfield Health",
      location: "Remote - Europe",
      workType: "remote",
      postedTime: hoursAgo(2),
      applyUrl: "https://www.indeed.com/viewjob?jk=2005",
      jobUrl: "https://www.indeed.com/viewjob?jk=2005",
      jobDescription:
        "EU remote. Build and evaluate RAG pipelines for clinical documentation search. RAGAS, prompt testing, CI/CD required. 3-6 years. EUR 65-80k.",
      experienceLevel: "Mid-Senior",
      salaryInfo: "EUR 65,000-80,000/year",
    },
  ];
}
