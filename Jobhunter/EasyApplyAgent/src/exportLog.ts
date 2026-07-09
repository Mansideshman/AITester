import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { paths } from './config.js';
import type { TrackerJob, JobStatus } from './types.js';

function ensureOutputDir() {
  mkdirSync(paths.outputDir, { recursive: true });
}

export function loadAppliedUrls(): Set<string> {
  if (!existsSync(paths.appliedLog)) return new Set();
  const data = JSON.parse(readFileSync(paths.appliedLog, 'utf-8')) as string[];
  return new Set(data);
}

export function saveAppliedUrl(url: string, urls: Set<string>) {
  urls.add(url);
  ensureOutputDir();
  writeFileSync(paths.appliedLog, JSON.stringify(Array.from(urls), null, 2));
}

/**
 * Appends one entry in the same Job shape JobTrackerAI expects, so
 * output/applied-jobs.json can be dropped straight into the tracker's
 * "Import" button (see JobTrackerAI's merge-by-id import).
 */
export function appendTrackerJob(entry: {
  title: string;
  company: string;
  url: string;
  status: JobStatus;
  resumeUsed?: string;
  notes?: string;
}) {
  ensureOutputDir();
  const existing: TrackerJob[] = existsSync(paths.exportFile)
    ? JSON.parse(readFileSync(paths.exportFile, 'utf-8'))
    : [];

  existing.push({
    id: randomUUID(),
    companyName: entry.company,
    jobTitle: entry.title,
    jobUrl: entry.url,
    resumeUsed: entry.resumeUsed,
    dateApplied: Date.now(),
    status: entry.status,
    notes: entry.notes,
  });

  writeFileSync(paths.exportFile, JSON.stringify(existing, null, 2));
}
