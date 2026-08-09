import { isAnthropicConfigured } from "../lib/env";
import { callAnthropicJson } from "../lib/anthropic";

export interface ScoreInput {
  title: string;
  jdText: string;
  location: string;
  workType: string;
  salaryInfo: string;
  experienceLevel: string;
  targetTitles: string[];
}

export interface ScoreResult {
  fitScore: number;
  fitReasons: string[];
  flags: string[];
  tzOverlap: "full" | "partial" | "none";
}

const FULL_TZ = ["uae", "dubai", "saudi", "qatar", "kuwait", "bahrain", "oman", "gcc", "gulf",
  "uk", "united kingdom", "london", "ireland", "dublin", "europe", "eu", "germany", "berlin",
  "france", "netherlands", "spain", "singapore", "apac"];
const PARTIAL_TZ = ["united states", "usa", " us", "canada", "latam", "latin america", "mexico", "brazil"];
const FULL_MARKS_LOCATIONS = ["india", "pune", "bengaluru", "bangalore", "mumbai", "delhi", "hyderabad"];

export function computeTzOverlap(location: string): "full" | "partial" | "none" {
  const loc = location.toLowerCase();
  if (FULL_MARKS_LOCATIONS.some((k) => loc.includes(k))) return "full";
  if (FULL_TZ.some((k) => loc.includes(k))) return "full";
  if (loc.includes("worldwide") || loc.includes("remote")) return "partial";
  if (PARTIAL_TZ.some((k) => loc.includes(k))) return "partial";
  return "none";
}

const AGENTIC_KEYWORDS = [
  "agentic", "llm", "rag", "eval", "evaluation", "hallucination", "prompt",
  "langchain", "crewai", "n8n", "langflow", "ragas", "gen ai", "generative ai",
];
const SENIOR_PENALTY_TITLES = ["staff", "principal", "director", "vp", "head of", "chief"];
const RISKY_SKILL_KEYWORDS = ["kubernetes", "go ", "golang", "rust", "phd required", "phd or", "certified aws", "8+ years", "10+ years", "12+ years"];
const NO_SPONSORSHIP_KEYWORDS = ["no sponsorship", "no visa sponsorship", "must be authorized to work",
  "us citizen", "green card", "right to work", "in-country work authorization", "relocate"];

function titleMatchScore(title: string, targetTitles: string[]): number {
  const t = title.toLowerCase();
  const words = new Set(t.split(/\W+/).filter(Boolean));
  let best = 0;
  for (const target of targetTitles) {
    const targetWords = target.toLowerCase().split(/\W+/).filter(Boolean);
    const overlap = targetWords.filter((w) => words.has(w)).length;
    const ratio = overlap / targetWords.length;
    if (ratio > best) best = ratio;
  }
  return Math.round(best * 25);
}

function agenticOverlapScore(jdText: string): number {
  const text = jdText.toLowerCase();
  const hits = AGENTIC_KEYWORDS.filter((k) => text.includes(k)).length;
  return Math.min(25, Math.round((hits / 5) * 25));
}

function seniorityScore(title: string, experienceLevel: string): number {
  const t = `${title} ${experienceLevel}`.toLowerCase();
  if (SENIOR_PENALTY_TITLES.some((k) => t.includes(k))) return 0;
  return 15;
}

function remoteScore(workType: string): number {
  if (workType === "remote") return 10;
  if (workType === "hybrid") return 6;
  return 0;
}

function salaryScore(salaryInfo: string): number {
  const s = salaryInfo.toLowerCase();
  if (/\b(1[89]|[2-9]\d)\s*lpa\b/.test(s)) return 10;
  if (/(aed|eur|gbp|sgd|\$)\s?[\d,]{3,}/.test(s)) return 10;
  if (/lpa/.test(s)) return 4;
  return 3;
}

function tzScore(tzOverlap: "full" | "partial" | "none"): number {
  if (tzOverlap === "full") return 15;
  if (tzOverlap === "partial") return 7;
  return 0;
}

export function scoreJobMock(input: ScoreInput): ScoreResult {
  const tzOverlap = computeTzOverlap(input.location);
  const titleScore = titleMatchScore(input.title, input.targetTitles);
  const agenticScore = agenticOverlapScore(input.jdText);
  const seniority = seniorityScore(input.title, input.experienceLevel);
  const remote = remoteScore(input.workType);
  const salary = salaryScore(input.salaryInfo);
  const tz = tzScore(tzOverlap);
  const fitScore = titleScore + agenticScore + seniority + remote + salary + tz;

  const fitReasons: string[] = [];
  if (titleScore >= 15) fitReasons.push("Title closely matches target roles");
  else if (titleScore > 0) fitReasons.push("Partial title match to target roles");
  if (agenticScore >= 15) fitReasons.push("Strong agentic/LLM/eval/RAG overlap in JD");
  else if (agenticScore > 0) fitReasons.push("Some agentic/LLM overlap in JD");
  if (seniority === 0) fitReasons.push("Seniority mismatch (Staff/Principal/Director-level)");
  else fitReasons.push("Seniority fits ~4-6 yrs experience");
  if (remote === 10) fitReasons.push("Fully remote");
  else if (remote === 6) fitReasons.push("Hybrid work type");
  else fitReasons.push("On-site only");
  if (tzOverlap === "full") fitReasons.push("Full IST timezone overlap");
  else if (tzOverlap === "partial") fitReasons.push("Partial timezone overlap (async-friendly)");
  else fitReasons.push("Little to no IST timezone overlap");

  const flags: string[] = [];
  const jdLower = input.jdText.toLowerCase();
  if (NO_SPONSORSHIP_KEYWORDS.some((k) => jdLower.includes(k))) flags.push("workAuth");
  if (RISKY_SKILL_KEYWORDS.some((k) => jdLower.includes(k))) flags.push("skillGap");
  if (salary <= 4) flags.push("salaryUnknown");

  return { fitScore: Math.min(100, fitScore), fitReasons, flags, tzOverlap };
}

interface AnthropicScoreResponse {
  fitScore: number;
  fitReasons: string[];
  flags: string[];
}

export async function scoreJob(
  input: ScoreInput,
  profileResumeText: string
): Promise<ScoreResult> {
  const tzOverlap = computeTzOverlap(input.location);
  if (!isAnthropicConfigured()) return scoreJobMock(input);

  const prompt = `You are scoring a job posting's fit for a candidate, 0-100, using this exact weighted rubric:
- Title/keyword match to target titles: 25 pts
- Agentic/LLM/eval/RAG overlap: 25 pts
- Seniority fit (~4-6 yrs; penalize Staff/Principal/Director): 15 pts
- Remote-friendly: 10 pts
- Likely >= 20 LPA / global equivalent: 10 pts
- IST timezone overlap (full=15, partial/US=7, none=0): 15 pts (job is already computed as tzOverlap="${tzOverlap}")

Candidate resume:
"""${profileResumeText}"""

Target titles: ${input.targetTitles.join(", ")}

Job posting:
Title: ${input.title}
Location: ${input.location}
Work type: ${input.workType}
Experience level: ${input.experienceLevel}
Salary info: ${input.salaryInfo}
Description: """${input.jdText}"""

Respond with ONLY strict JSON, no prose, in this exact shape:
{"fitScore": <int 0-100>, "fitReasons": ["short reason", ...], "flags": ["workAuth"|"skillGap"|"salaryUnknown", ...]}
Add "workAuth" only if the post implies in-country right-to-work or no sponsorship.
Add "skillGap" only if it needs a skill/cert the resume doesn't honestly demonstrate.`;

  try {
    const result = await callAnthropicJson<AnthropicScoreResponse>(prompt);
    return {
      fitScore: Math.max(0, Math.min(100, Math.round(result.fitScore))),
      fitReasons: result.fitReasons ?? [],
      flags: result.flags ?? [],
      tzOverlap,
    };
  } catch {
    return scoreJobMock(input);
  }
}
