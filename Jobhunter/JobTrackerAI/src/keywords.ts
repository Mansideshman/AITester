// Offline, deterministic keyword matching — no LLM call. Mirrors the manual
// process described in ../ats-analysis.md: scan the JD for named hard
// skills/tools, cross-reference against the resume, and separate what's
// already evidenced from what would need the candidate to confirm it.
import type { AtsKeywordRow, CandidateProfile } from './types';

// A broad, deliberately generic set of named tools/skills an ATS commonly
// filters on. Not exhaustive — the candidate's own coreSkills/strengths are
// always included too, so anything they've already told us about is caught
// even if it's missing from this list.
const KNOWN_KEYWORDS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Ruby', 'PHP',
  'React', 'Angular', 'Vue', 'Node.js', 'Next.js', 'Express',
  'Selenium', 'Playwright', 'Cypress', 'Appium', 'TestNG', 'JUnit', 'Mocha',
  'RestAssured', 'Postman', 'SoapUI', 'Karate',
  'API Testing', 'Performance Testing', 'Load Testing', 'JMeter', 'Gatling',
  'Test Automation', 'Automation Framework', 'CI/CD', 'Jenkins', 'GitLab CI',
  'GitHub Actions', 'CircleCI',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  'AWS', 'Azure', 'GCP', 'Google Cloud',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'Git', 'Agile', 'Scrum', 'Kanban', 'Jira',
  'OWASP', 'Security Testing', 'Penetration Testing',
  'Monitoring', 'Grafana', 'Datadog', 'New Relic',
  'Mobile Testing', 'iOS', 'Android',
  'Machine Learning', 'Data Engineering', 'ETL',
  'Microservices', 'Distributed Systems', 'REST', 'GraphQL', 'gRPC',
  'Leadership', 'Mentorship', 'Cross-functional Collaboration',
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesKeyword(text: string, keyword: string): boolean {
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(keyword.toLowerCase())}(?:[^a-z0-9]|$)`, 'i');
  return pattern.test(text.toLowerCase());
}

function countOccurrences(text: string, keyword: string): number {
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(keyword.toLowerCase())}(?:[^a-z0-9]|$)`, 'gi');
  return (text.match(pattern) ?? []).length;
}

export function extractJdKeywords(jdText: string, profile: CandidateProfile): string[] {
  if (!jdText.trim()) return [];
  const candidates = new Set([...KNOWN_KEYWORDS, ...profile.coreSkills, ...profile.strengths]);
  return Array.from(candidates).filter((keyword) => includesKeyword(jdText, keyword));
}

export function resumeText(profile: CandidateProfile): string {
  return [
    profile.professionalSummary ?? '',
    profile.resumeSummary ?? '',
    profile.coreSkills.join(' '),
    profile.strengths.join(' '),
    ...profile.experience.flatMap((entry) => [entry.title, entry.company, ...entry.bullets]),
  ].join(' ');
}

export interface AtsAnalysis {
  table: AtsKeywordRow[];
  matched: string[];
  missing: string[];
  matchPct: number;
}

export function buildAtsAnalysis(jdText: string, profile: CandidateProfile): AtsAnalysis {
  const jdKeywords = extractJdKeywords(jdText, profile);
  const resume = resumeText(profile);

  const table: AtsKeywordRow[] = jdKeywords.map((keyword) => {
    const occurrences = countOccurrences(jdText, keyword);
    return {
      keyword,
      inResume: includesKeyword(resume, keyword),
      priority: occurrences >= 3 ? 'High' : occurrences === 2 ? 'Medium' : 'Low',
    };
  });

  const matched = table.filter((row) => row.inResume).map((row) => row.keyword);
  const missing = table.filter((row) => !row.inResume).map((row) => row.keyword);
  const matchPct = table.length ? Math.round((matched.length / table.length) * 100) : 0;

  return { table, matched, missing, matchPct };
}

/**
 * The no-fabrication gate: of the JD keywords missing from the resume,
 * which ones has the candidate already confirmed or declined for this job.
 */
export function splitByConfirmation(
  missingKeywords: string[],
  jobId: string,
  profile: CandidateProfile
): { needsConfirmation: string[]; confirmedExtra: string[] } {
  const confirmed = new Set(profile.confirmedKeywordsByJob[jobId] ?? []);
  const declined = new Set(profile.declinedKeywordsByJob[jobId] ?? []);
  const needsConfirmation = missingKeywords.filter((k) => !confirmed.has(k) && !declined.has(k));
  const confirmedExtra = missingKeywords.filter((k) => confirmed.has(k));
  return { needsConfirmation, confirmedExtra };
}

/**
 * Folds job-specific confirmations into the raw ATS table/match numbers, so
 * the displayed ✅/❌ and match % reflect what the candidate has actually
 * told us — not just literal text in their stored resume.
 */
export function applyConfirmations(analysis: AtsAnalysis, confirmedExtra: string[]): AtsAnalysis {
  if (confirmedExtra.length === 0) return analysis;
  const confirmedSet = new Set(confirmedExtra);
  const table = analysis.table.map((row) =>
    confirmedSet.has(row.keyword) ? { ...row, inResume: true } : row
  );
  const matched = table.filter((row) => row.inResume).map((row) => row.keyword);
  const missing = table.filter((row) => !row.inResume).map((row) => row.keyword);
  const matchPct = table.length ? Math.round((matched.length / table.length) * 100) : 0;
  return { table, matched, missing, matchPct };
}
