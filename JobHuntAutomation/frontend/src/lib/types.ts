export interface Profile {
  id: string;
  name: string;
  base: string;
  constraints: Record<string, unknown>;
  targetTitles: string[];
  verifiedMetrics: string[];
  resumeText: string;
  updatedAt: string;
}

export interface SearchConfig {
  id: string;
  keywords: string[];
  locations: string[];
  workType: string[];
  datePosted: string;
  jobType: string[];
  spendCapUsd: number;
  updatedAt: string;
}

export type TzOverlap = "full" | "partial" | "none";
export type JobFlag = "workAuth" | "skillGap" | "salaryUnknown";

export interface Job {
  id: string;
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  workType: string | null;
  postedTime: string | null;
  jdUrl: string | null;
  applyUrl: string | null;
  jdText: string | null;
  estPay: string | null;
  tzOverlap: TzOverlap;
  fitScore: number;
  fitReasons: string[];
  flags: JobFlag[];
  status: "saved" | "dismissed";
  createdAt: string;
  hasApplication: boolean;
}

export interface ResumeVersion {
  id: string;
  summary: string;
  skills: string[];
  bullets: string[];
  atsText: string;
  diff: string[];
  createdAt: string;
}

export interface Draft {
  id: string;
  type: "coverLetter" | "coldEmail";
  body: string;
  createdAt: string;
}

export interface JobDetail extends Job {
  resumeVersions: ResumeVersion[];
  drafts: Draft[];
}

export type ApplicationStatus = "Saved" | "Applied" | "Screening" | "Interview" | "Offer" | "Rejected";

export interface Application {
  id: string;
  jobId: string;
  company: string;
  title: string;
  status: ApplicationStatus;
  appliedDate: string | null;
  resumeVersionId: string | null;
  coverLetterSent: boolean;
  coldEmailSent: boolean;
  recruiter: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  notes: string | null;
  timeZone: string | null;
  source?: string;
  location?: string;
  workType?: string;
  jdUrl?: string;
  applyUrl?: string;
  fitScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RunLog {
  id: string;
  source: string;
  itemsFetched: number;
  costUsd: number;
  mode: "mock" | "live";
  createdAt: string;
}

export interface DashboardSummary {
  funnelByStatus: Record<ApplicationStatus, number>;
  todaysNewMatches: number;
  spendThisMonthUsd: number;
  spendCapUsd: number;
}

export interface SettingsInfo {
  jsearch: { configured: boolean; status: string };
  apify: { configured: boolean; status: string };
  anthropic: { configured: boolean; status: string; model: string };
}
