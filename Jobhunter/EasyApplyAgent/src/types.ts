export type JobStatus = 'Wishlist' | 'Applied' | 'Follow-up' | 'Interview' | 'Offer' | 'Rejected';

// Mirrors Jobhunter/JobTrackerAI/src/types.ts so the export file can be
// imported straight into the tracker board.
export interface TrackerJob {
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
}

export interface SearchConfig {
  keywords: string;
  location: string;
  easyApplyOnly?: boolean;
}

export interface Profile {
  search: SearchConfig;
  resumePath?: string;
  resumeLabel?: string;
  phone?: string;
  coverLetterDefault?: string;
  answers?: Record<string, string>;
}

export interface RunOptions {
  max: number;
  delayMinMs: number;
  delayMaxMs: number;
  dryRun: boolean;
  headless: boolean;
}
