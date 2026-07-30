export type JobStatus = 'Wishlist' | 'Applied' | 'Follow-up' | 'Interview' | 'Offer' | 'Rejected';

export interface Job {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  jobDescription?: string;
  resumeUsed?: string;
  dateApplied: number;
  salaryRange?: string;
  notes?: string;
  status: JobStatus;
  followUpEmailSeries?: { title: string; message: string }[];
}

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface CandidateProfile {
  targetRole: string;
  yearsExperience: string;
  coreSkills: string[];
  strengths: string[];
  resumeFileName?: string;
  resumeSummary?: string;
  jobDescription?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  professionalSummary?: string;
  experience: ExperienceEntry[];
  education: string[];
  // Per-job answers to the no-fabrication confirm gate: which JD keywords
  // (not already evidenced by the profile) the candidate has confirmed or
  // declined as genuinely theirs. Keyed by Job.id.
  confirmedKeywordsByJob: Record<string, string[]>;
  declinedKeywordsByJob: Record<string, string[]>;
}

export interface AtsKeywordRow {
  keyword: string;
  inResume: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export interface JobInsight {
  fitScore: number;
  atsScore: number;
  atsMatchPct: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  atsTable: AtsKeywordRow[];
  mustConfirmKeywords: string[];
  remainingGaps: string[];
  resumeRecommendations: string[];
  nextActions: string[];
  emphasizedKeywords: string[];
  bulletStrengtheningIdeas: string[];
  summaryDraft: string;
  outreachDraft: string;
  coverLetterDraft: string;
  followUpEmailSeries: { title: string; message: string }[];
  generatedAt: number;
}
