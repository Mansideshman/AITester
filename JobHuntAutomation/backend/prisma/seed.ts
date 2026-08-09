import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const profileCount = await prisma.profile.count();
  if (profileCount === 0) {
    await prisma.profile.create({
      data: {
        name: "Mansi Deshman",
        base: "Pune, India",
        constraints: JSON.stringify({
          workType: ["remote", "hybrid"],
          locationScope: "India + global remote",
          employmentType: "full-time-permanent",
          targetLpaMin: 20,
          preferredTimezone: "UTC+5:30 (IST)",
          fullMarksTimezones: ["Gulf/ME (UTC+3-4)", "Europe/UK (UTC 0..+2)", "Singapore/APAC (UTC+8)"],
          partialTimezones: ["US/Canada/LATAM"],
          flagNoSponsorship: true,
        }),
        targetTitles: JSON.stringify([
          "AI QA Engineer",
          "AI Evaluation Engineer",
          "Agentic AI Engineer",
          "AI Engineer LLM",
          "LLM Application Engineer",
          "AI Workflow Engineer",
          "Gen AI Engineer",
        ]),
        verifiedMetrics: JSON.stringify([
          "70% regression-time reduction",
          "90% test coverage",
          "60% faster releases",
          "zero released regressions",
          "100% audit readiness",
        ]),
        resumeText: `Mansi Deshman — AI QA Engineer (LLM Testing & Evaluation, Agentic AI Quality)
Base: Pune, India. ~4 years experience.

Flagship project: Qualia — production 11-agent AI QA platform (qualiaqa.vercel.app).

Verified metrics: 70% regression-time reduction, 90% test coverage, 60% faster releases,
zero released regressions, 100% audit readiness.

Core stack: Python, Playwright, Selenium (Java), REST API testing, RAGAS, RAG pipeline
testing, LangChain, CrewAI, n8n, Langflow, CI/CD gates, hallucination/eval/prompt testing.

Certifications: ADISA, NIST 800-88.`,
      },
    });
    console.log("Seeded Profile");
  }

  const searchConfigCount = await prisma.searchConfig.count();
  if (searchConfigCount === 0) {
    await prisma.searchConfig.create({
      data: {
        keywords: JSON.stringify([
          "AI QA Engineer",
          "AI Evaluation Engineer",
          "Agentic AI Engineer",
          "AI Engineer LLM",
          "LLM Application Engineer",
          "AI Workflow Engineer",
        ]),
        locations: JSON.stringify([
          "India",
          "United Arab Emirates",
          "United Kingdom",
          "European Union",
          "Singapore",
          "Germany",
        ]),
        workType: JSON.stringify(["remote", "hybrid"]),
        datePosted: "r86400",
        jobType: JSON.stringify(["full-time"]),
        spendCapUsd: 0.25,
      },
    });
    console.log("Seeded SearchConfig");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
