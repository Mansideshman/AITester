import type {
  Application,
  DashboardSummary,
  Job,
  JobDetail,
  Profile,
  RunLog,
  SearchConfig,
  SettingsInfo,
} from "./types";

// In dev, Vite proxies relative /api/* calls to the local backend (see vite.config.ts).
// In production the frontend (Vercel) and backend (Fly.io) are different origins, so a
// build-time base URL is needed — set via VITE_API_BASE_URL at deploy time.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getProfile: () => request<Profile>("/profile"),
  updateProfile: (data: Partial<Profile>) =>
    request<Profile>("/profile", { method: "PUT", body: JSON.stringify(data) }),

  getSearchConfig: () => request<SearchConfig>("/search-config"),
  updateSearchConfig: (data: Partial<SearchConfig>) =>
    request<SearchConfig>("/search-config", { method: "PUT", body: JSON.stringify(data) }),

  runFetch: (source: "linkedin" | "indeed" | "all") =>
    request<{ mode: string; itemsFetched: number; costUsd: number; savedJobs: number; newJobs: number }>(
      `/fetch/${source}`,
      { method: "POST" }
    ),

  getJobSources: () => request<string[]>("/jobs/sources"),
  getJobs: (params?: { tz?: string; minFit?: number; source?: string; flag?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.tz) qs.set("tz", params.tz);
    if (params?.minFit) qs.set("minFit", String(params.minFit));
    if (params?.source) qs.set("source", params.source);
    if (params?.flag) qs.set("flag", params.flag);
    if (params?.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Job[]>(`/jobs${suffix}`);
  },
  getJob: (id: string) => request<JobDetail>(`/jobs/${id}`),
  setJobStatus: (id: string, status: "saved" | "dismissed") =>
    request<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  tailorResume: (jobId: string) =>
    request<{ id: string; summary: string; skills: string[]; bullets: string[]; atsText: string; diff: string[]; createdAt: string }>(
      "/ai",
      { method: "POST", body: JSON.stringify({ action: "tailor", jobId }) }
    ),
  generateDraft: (jobId: string, draftType: "coverLetter" | "coldEmail") =>
    request<{ id: string; type: string; body: string; createdAt: string }>("/ai", {
      method: "POST",
      body: JSON.stringify({ action: "draft", jobId, draftType }),
    }),

  downloadResumeUrl: (resumeVersionId: string, format: "docx" | "txt") =>
    `${API_BASE_URL}/api/resume-versions/${resumeVersionId}/download?format=${format}`,

  getApplications: () => request<Application[]>("/applications"),
  markApplied: (jobId: string, opts?: { resumeVersionId?: string; coverLetterSent?: boolean; coldEmailSent?: boolean }) =>
    request<Application>("/applications/mark-applied", {
      method: "POST",
      body: JSON.stringify({ jobId, ...opts }),
    }),
  updateApplication: (id: string, data: Partial<Application>) =>
    request<Application>(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  exportCsvUrl: () => `${API_BASE_URL}/api/applications/export.csv`,

  getRunLogs: () => request<RunLog[]>("/run-logs"),
  getDashboard: () => request<DashboardSummary>("/dashboard"),
  getSettings: () => request<SettingsInfo>("/settings"),
};
