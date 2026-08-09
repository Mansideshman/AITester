import { isAnthropicConfigured } from "../lib/env";
import { callAnthropicJson } from "../lib/anthropic";

export interface DraftInput {
  jobTitle: string;
  companyName: string;
  jdText: string;
  profileName: string;
  verifiedMetrics: string[];
  matchedSkills: string[];
}

export type DraftType = "coverLetter" | "coldEmail";

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ") + ".";
}

export function draftMock(type: DraftType, input: DraftInput): string {
  const skill = input.matchedSkills[0] ?? "LLM evaluation and agentic AI quality";
  const metric = input.verifiedMetrics[0] ?? "70% regression-time reduction";

  if (type === "coverLetter") {
    const body = `Dear Hiring Team at ${input.companyName},

I'm writing to apply for the ${input.jobTitle} role. As an AI QA Engineer with ~4 years of experience in LLM testing, evaluation, and agentic AI quality, I built Qualia, a production 11-agent AI QA platform that delivered ${metric} and 90% test coverage with zero released regressions.

Your posting's emphasis on ${skill} lines up directly with my hands-on work in RAG pipeline testing, hallucination/eval/prompt testing, and CI/CD test gates using Python, Playwright, and LangChain/CrewAI.

I'd welcome the chance to bring that same rigor to ${input.companyName}. Thank you for your consideration.

Best regards,
${input.profileName}`;
    return truncateWords(body, 150);
  }

  const body = `Hi, I'm ${input.profileName}, an AI QA Engineer focused on LLM evaluation and agentic AI quality. I saw the ${input.jobTitle} opening at ${input.companyName} and wanted to reach out directly.

I built Qualia, an 11-agent production AI QA platform, achieving ${metric} and 90% test coverage. My background in ${skill}, RAGAS, and CI/CD test gates maps closely to this role.

Would you be open to a short conversation? Happy to share more detail or my resume.

Best,
${input.profileName}`;
  return truncateWords(body, 120);
}

export async function draft(type: DraftType, input: DraftInput): Promise<string> {
  if (!isAnthropicConfigured()) return draftMock(type, input);

  const wordLimit = type === "coverLetter" ? 150 : 120;
  const prompt = `Write a ${type === "coverLetter" ? "cover letter" : "cold email to the recruiter"}, under ${wordLimit} words, specific to this job and company.
HONESTY RULES: use only experience below, never invent skills. Preserve these verified metrics verbatim if used: ${input.verifiedMetrics.join(", ")}.

Candidate: ${input.profileName}
Job title: ${input.jobTitle}
Company: ${input.companyName}
Job description: """${input.jdText}"""

Respond with ONLY strict JSON: {"body": "the full text"}`;

  try {
    const result = await callAnthropicJson<{ body: string }>(prompt, 600);
    return truncateWords(result.body, wordLimit);
  } catch {
    return draftMock(type, input);
  }
}
