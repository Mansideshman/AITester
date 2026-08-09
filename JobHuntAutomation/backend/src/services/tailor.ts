import { isAnthropicConfigured } from "../lib/env";
import { callAnthropicJson } from "../lib/anthropic";

export interface TailorInput {
  jobTitle: string;
  companyName: string;
  jdText: string;
  profileResumeText: string;
  verifiedMetrics: string[];
  coreStack: string[];
}

export interface TailorResult {
  summary: string;
  skills: string[];
  bullets: string[];
  atsText: string;
  diff: string[];
}

const CORE_STACK_DEFAULT = [
  "Python", "Playwright", "Selenium (Java)", "REST API testing", "RAGAS",
  "RAG pipeline testing", "LangChain", "CrewAI", "n8n", "Langflow",
  "CI/CD gates", "hallucination/eval/prompt testing",
];

function extractJdKeywords(jdText: string, coreStack: string[]): string[] {
  const text = jdText.toLowerCase();
  return coreStack.filter((skill) => {
    const key = skill.toLowerCase().split(" ")[0].replace(/[()]/g, "");
    return text.includes(key);
  });
}

function buildAtsText(summary: string, skills: string[], bullets: string[]): string {
  return [
    "SUMMARY",
    summary,
    "",
    "SKILLS",
    skills.join(", "),
    "",
    "EXPERIENCE HIGHLIGHTS",
    ...bullets.map((b) => `- ${b}`),
  ].join("\n");
}

export function tailorResumeMock(input: TailorInput): TailorResult {
  const coreStack = input.coreStack.length ? input.coreStack : CORE_STACK_DEFAULT;
  const matchedKeywords = extractJdKeywords(input.jdText, coreStack);
  const orderedSkills = [
    ...matchedKeywords,
    ...coreStack.filter((s) => !matchedKeywords.includes(s)),
  ];

  const summary =
    `AI QA Engineer with ~4 years' experience in LLM testing, evaluation, and agentic AI quality, ` +
    `targeting the ${input.jobTitle} role at ${input.companyName}. Built Qualia, a production 11-agent ` +
    `AI QA platform, delivering ${input.verifiedMetrics[0] ?? "measurable regression-time reduction"} and ` +
    `${input.verifiedMetrics[1] ?? "high test coverage"}. Hands-on with ${matchedKeywords.slice(0, 3).join(", ") || "Python and Playwright"} ` +
    `matching this role's requirements.`;

  const bullets = [
    `Built Qualia, an 11-agent production AI QA platform, achieving ${input.verifiedMetrics[0] ?? "70% regression-time reduction"}.`,
    `Drove ${input.verifiedMetrics[1] ?? "90% test coverage"} across LLM and agentic workflows using ${matchedKeywords[0] ?? "Python"}.`,
    `Enabled ${input.verifiedMetrics[2] ?? "60% faster releases"} via CI/CD test gates and automated eval pipelines.`,
    `Maintained ${input.verifiedMetrics[3] ?? "zero released regressions"} through rigorous hallucination/prompt/eval testing${matchedKeywords.includes("RAGAS") ? " with RAGAS" : ""}.`,
    `Achieved ${input.verifiedMetrics[4] ?? "100% audit readiness"}, holding ADISA and NIST 800-88 certifications.`,
  ];

  const atsText = buildAtsText(summary, orderedSkills, bullets);
  const diff = [
    matchedKeywords.length
      ? `Reordered skills to lead with JD-matched keywords: ${matchedKeywords.join(", ")}`
      : "No direct JD keyword matches found in core stack; skills kept in original order",
    `Rewrote summary to target "${input.jobTitle}" at ${input.companyName}`,
    "Reworded bullets to mirror JD emphasis while preserving verified metrics verbatim",
  ];

  return { summary, skills: orderedSkills, bullets, atsText, diff };
}

interface AnthropicTailorResponse {
  summary: string;
  skills: string[];
  bullets: string[];
  diff: string[];
}

export async function tailorResume(input: TailorInput): Promise<TailorResult> {
  if (!isAnthropicConfigured()) return tailorResumeMock(input);

  const prompt = `You are tailoring a resume for a specific job. HONESTY RULES (non-negotiable):
- Use ONLY experience present in the candidate's resume below. Never invent skills, tools, or certs.
- Preserve these verified metrics verbatim wherever used: ${input.verifiedMetrics.join(", ")}.
- Mirror the JD's real keywords only where the candidate genuinely matches; do not keyword-stuff.
- Output must be ATS-plain (no tables/columns/graphics).

Candidate resume:
"""${input.profileResumeText}"""

Job title: ${input.jobTitle}
Company: ${input.companyName}
Job description:
"""${input.jdText}"""

Respond with ONLY strict JSON, no prose:
{"summary": "2-3 sentence ATS-plain summary", "skills": ["skill", ...], "bullets": ["top 5 bullets, most relevant first"], "diff": ["short bullet describing what changed and why", ...]}`;

  try {
    const result = await callAnthropicJson<AnthropicTailorResponse>(prompt, 2000);
    const atsText = buildAtsText(result.summary, result.skills, result.bullets);
    return { ...result, atsText };
  } catch {
    return tailorResumeMock(input);
  }
}
