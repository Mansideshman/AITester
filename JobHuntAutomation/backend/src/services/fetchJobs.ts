import { prisma } from "../lib/prisma";
import { isApifyConfigured, isJSearchConfigured } from "../lib/env";
import { runApifyActor } from "../lib/apify";
import { searchJSearch, JSearchItem } from "../lib/jsearch";
import { mockLinkedinJobs, mockIndeedJobs, RawJobItem } from "./mockJobs";
import { scoreJob } from "./scoring";
import { fromJson, toJson } from "../lib/json";
import type { SearchConfig } from "@prisma/client";

export type Source = "linkedin" | "indeed" | "all";

const LINKEDIN_ACTOR_ID = process.env.APIFY_LINKEDIN_ACTOR_ID || "cheap_scraper/linkedin-job-scraper";
const INDEED_ACTOR_ID = process.env.APIFY_INDEED_ACTOR_ID || "misceres/indeed-scraper";

export interface FetchOutcome {
  mode: "mock" | "live";
  itemsFetched: number;
  costUsd: number;
  savedJobs: number;
  newJobs: number;
}

function buildLinkedinInput(searchConfig: {
  keywords: string[];
  locations: string[];
  workType: string[];
  jobType: string[];
  datePosted: string;
}) {
  return {
    keyword: searchConfig.keywords,
    locations: searchConfig.locations,
    workType: searchConfig.workType,
    publishedAt: searchConfig.datePosted,
    jobType: searchConfig.jobType,
    saveOnlyUniqueItems: true,
  };
}

function buildIndeedInput(searchConfig: {
  keywords: string[];
  locations: string[];
  workType: string[];
  jobType: string[];
  datePosted: string;
}) {
  // This actor takes one position string, one country code, and one location string per
  // run (not arrays) — base-location coverage only. Broader multi-region coverage (the
  // spec's "IN + US-remote + remote worldwide") would need one call per region.
  return {
    position: searchConfig.keywords.map((k) => `"${k}"`).join(" OR "),
    country: "IN",
    location: "Remote",
    maxItemsPerSearch: 50,
    saveOnlyUniqueItems: true,
  };
}

const REMOTE_HINTS = ["fully remote", "100% remote", "remote-first", "remote first", "work from home", "work from anywhere"];
const HYBRID_HINTS = ["hybrid"];
const ONSITE_HINTS = ["on-site", "onsite", "in office", "in-office", "must relocate", "no remote"];

/**
 * The LinkedIn/Indeed actors don't reliably echo back a remote/hybrid/onsite field on each
 * item (their own `workType`/similar output fields mean something else, e.g. job function) —
 * infer it from the JD text instead, falling back to whatever the search itself filtered for.
 */
function inferWorkType(jdText: string, searchedWorkTypes: string[]): RawJobItem["workType"] {
  const text = jdText.toLowerCase();
  if (ONSITE_HINTS.some((h) => text.includes(h))) return "onsite";
  if (HYBRID_HINTS.some((h) => text.includes(h))) return "hybrid";
  if (REMOTE_HINTS.some((h) => text.includes(h))) return "remote";
  if (searchedWorkTypes.includes("remote")) return "remote";
  if (searchedWorkTypes.includes("hybrid")) return "hybrid";
  return "onsite";
}

function normalizeItem(item: unknown, searchedWorkTypes: string[]): RawJobItem | null {
  const raw = item as Record<string, unknown>;
  const externalId =
    (raw.jobId as string) ||
    (raw.externalId as string) ||
    (raw.id as string) ||
    (raw.jobUrl as string) ||
    (raw.applyUrl as string);
  if (!externalId) return null;
  const jobDescription = String(raw.jobDescription ?? raw.description ?? "");
  const salaryInfo = Array.isArray(raw.salaryInfo)
    ? raw.salaryInfo.join(", ")
    : String(raw.salaryInfo ?? raw.salary ?? "");
  return {
    externalId: String(externalId),
    jobTitle: String(raw.jobTitle ?? raw.title ?? "Untitled role"),
    companyName: String(raw.companyName ?? raw.company ?? "Unknown company"),
    location: String(raw.location ?? ""),
    workType: inferWorkType(jobDescription, searchedWorkTypes),
    // Prefer an absolute ISO timestamp (e.g. Apify's `publishedAt`) over relative strings
    // like "10 hours ago", which the frontend can't parse into a real Date.
    postedTime: String(raw.publishedAt ?? raw.postedAt ?? raw.postedTime ?? new Date().toISOString()),
    applyUrl: String(raw.applyUrl ?? raw.jobUrl ?? ""),
    jobUrl: String(raw.jobUrl ?? raw.applyUrl ?? ""),
    jobDescription,
    experienceLevel: String(raw.experienceLevel ?? ""),
    salaryInfo,
  };
}

/**
 * Round-robins SearchConfig.locations across successive fetches (rather than always
 * hitting locations[0]) so a free-tier query budget still eventually covers every
 * configured region instead of only ever searching the first one.
 */
async function pickRotatingLocation(searchConfigRow: SearchConfig, locations: string[]): Promise<string> {
  if (locations.length === 0) return "remote";
  const index = searchConfigRow.lastLocationIndex % locations.length;
  await prisma.searchConfig.update({
    where: { id: searchConfigRow.id },
    data: { lastLocationIndex: (index + 1) % locations.length },
  });
  return locations[index];
}

export async function runFetch(source: Source): Promise<FetchOutcome> {
  const searchConfigRow = await prisma.searchConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  const profile = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!searchConfigRow || !profile) {
    throw new Error("SearchConfig or Profile not seeded");
  }

  const searchConfig = {
    keywords: fromJson<string[]>(searchConfigRow.keywords, []),
    locations: fromJson<string[]>(searchConfigRow.locations, []),
    workType: fromJson<string[]>(searchConfigRow.workType, []),
    jobType: fromJson<string[]>(searchConfigRow.jobType, []),
    datePosted: searchConfigRow.datePosted,
  };
  const targetTitles = fromJson<string[]>(profile.targetTitles, []);

  // Spend cap check: sum this month's RunLog costs against the cap before running.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const spentThisMonth = await prisma.runLog.aggregate({
    _sum: { costUsd: true },
    where: { createdAt: { gte: monthStart } },
  });
  const spent = spentThisMonth._sum.costUsd ?? 0;
  if (spent >= searchConfigRow.spendCapUsd) {
    throw new Error(
      `Spend cap reached: $${spent.toFixed(2)} spent of $${searchConfigRow.spendCapUsd.toFixed(2)} cap this month`
    );
  }

  let mode: "mock" | "live" = "mock";
  let rawItems: RawJobItem[] = [];
  let costUsd = 0;

  if (isJSearchConfigured()) {
    // Free-tier aggregator (JSearch/RapidAPI) — preferred over Apify since it costs $0
    // within its monthly quota. "all" skips the publisher filter entirely, keeping every
    // source JSearch returns (Glassdoor, ZipRecruiter, company career pages, etc.), not
    // just LinkedIn/Indeed.
    mode = "live";
    const location = await pickRotatingLocation(searchConfigRow, searchConfig.locations);
    rawItems = await fetchViaJSearch(source, searchConfig, location);
    costUsd = 0;
  } else if (isApifyConfigured() && source !== "all") {
    mode = "live";
    const actorId = source === "linkedin" ? LINKEDIN_ACTOR_ID : INDEED_ACTOR_ID;
    const input = source === "linkedin" ? buildLinkedinInput(searchConfig) : buildIndeedInput(searchConfig);
    const remainingBudget = searchConfigRow.spendCapUsd - spent;
    const result = await runApifyActor(actorId, input, remainingBudget);
    rawItems = result.items
      .map((i) => normalizeItem(i, searchConfig.workType))
      .filter((i): i is RawJobItem => i !== null);
    costUsd = result.costUsd;
  } else if (source === "all") {
    // Neither JSearch nor a per-source paid actor applies to "all" — combine mock data
    // from both known mock sources rather than silently doing nothing.
    rawItems = [
      ...mockLinkedinJobs().map((m) => ({ ...m, sourceOverride: "linkedin" })),
      ...mockIndeedJobs().map((m) => ({ ...m, sourceOverride: "indeed" })),
    ];
    costUsd = 0;
  } else {
    rawItems = source === "linkedin" ? mockLinkedinJobs() : mockIndeedJobs();
    costUsd = 0;
  }

  const { savedJobs, newJobs } = await processRawItems(rawItems, source, targetTitles, profile.resumeText);

  await prisma.runLog.create({
    data: { source, itemsFetched: rawItems.length, costUsd, mode },
  });

  return { mode, itemsFetched: rawItems.length, costUsd, savedJobs, newJobs };
}

/**
 * Scores, upserts (dedupe by source+externalId), and logs each raw item into the tracker.
 * Split out from runFetch so an already-fetched Apify dataset can be re-processed (e.g.
 * after fixing a mapping bug) without spending on another actor run. Each item's `source`
 * is its own `sourceOverride` when set (the "all sources" fetch), else the route's fixed
 * `source` param (the linkedin/indeed-specific fetches).
 */
export async function processRawItems(
  rawItems: RawJobItem[],
  source: Source,
  targetTitles: string[],
  profileResumeText: string
): Promise<{ savedJobs: number; newJobs: number }> {
  let savedJobs = 0;
  let newJobs = 0;

  for (const item of rawItems) {
    const itemSource = item.sourceOverride || source;
    const scoreInput = {
      title: item.jobTitle,
      jdText: item.jobDescription,
      location: item.location,
      workType: item.workType,
      salaryInfo: item.salaryInfo,
      experienceLevel: item.experienceLevel,
      targetTitles,
    };
    const score = await scoreJob(scoreInput, profileResumeText);
    if (score.fitScore < 60) continue;

    const existing = await prisma.job.findUnique({
      where: { source_externalId: { source: itemSource, externalId: item.externalId } },
    });

    const job = await prisma.job.upsert({
      where: { source_externalId: { source: itemSource, externalId: item.externalId } },
      update: {
        title: item.jobTitle,
        company: item.companyName,
        location: item.location,
        workType: item.workType,
        postedTime: item.postedTime,
        jdUrl: item.jobUrl,
        applyUrl: item.applyUrl,
        jdText: item.jobDescription,
        estPay: item.salaryInfo,
        tzOverlap: score.tzOverlap,
        fitScore: score.fitScore,
        fitReasons: toJson(score.fitReasons),
        flags: toJson(score.flags),
      },
      create: {
        externalId: item.externalId,
        source: itemSource,
        title: item.jobTitle,
        company: item.companyName,
        location: item.location,
        workType: item.workType,
        postedTime: item.postedTime,
        jdUrl: item.jobUrl,
        applyUrl: item.applyUrl,
        jdText: item.jobDescription,
        estPay: item.salaryInfo,
        tzOverlap: score.tzOverlap,
        fitScore: score.fitScore,
        fitReasons: toJson(score.fitReasons),
        flags: toJson(score.flags),
        status: "saved",
      },
    });

    savedJobs++;
    if (!existing) newJobs++;

    // Log every new find into the tracker as "Saved" (appendix step 6). Never downgrade
    // an existing Company+Role row that's already further along the pipeline.
    const existingApplication = await prisma.application.findUnique({
      where: { company_title: { company: job.company, title: job.title } },
    });
    if (!existingApplication) {
      await prisma.application.create({
        data: { jobId: job.id, company: job.company, title: job.title, status: "Saved" },
      });
    }
  }

  return { savedJobs, newJobs };
}

function mapDatePostedForJSearch(datePosted: string): "today" | "3days" | "week" | "month" | "all" {
  if (datePosted === "r86400") return "today";
  if (datePosted === "r604800") return "week";
  return "month";
}

function buildJSearchQuery(searchConfig: { keywords: string[] }, location: string): string {
  // JSearch/Google-for-Jobs parses `query` as a natural-language phrase, not boolean search —
  // a compound "X OR Y OR Z jobs in Location" string matches nothing (confirmed 2026-08-09:
  // 0 results vs. 10 for a single-role phrase with the same date/location). Use just the
  // top keyword; Google's own semantic matching still surfaces adjacent related roles.
  const role = searchConfig.keywords[0] ?? "AI Engineer";
  return `${role} jobs in ${location}`;
}

function normalizeJSearchItem(item: JSearchItem, searchedWorkTypes: string[], keepOwnSource: boolean): RawJobItem | null {
  if (!item.job_id) return null;
  const jobDescription = item.job_description ?? "";
  const workType: RawJobItem["workType"] = item.job_is_remote
    ? "remote"
    : inferWorkType(jobDescription, searchedWorkTypes);
  const salaryInfo =
    item.job_salary_string ||
    (item.job_min_salary && item.job_max_salary
      ? `${item.job_min_salary}-${item.job_max_salary}/${item.job_salary_period ?? "year"}`
      : "");
  return {
    externalId: item.job_id,
    jobTitle: item.job_title ?? "Untitled role",
    companyName: item.employer_name ?? "Unknown company",
    location: [item.job_city, item.job_country].filter(Boolean).join(", "),
    workType,
    postedTime: item.job_posted_at_datetime_utc ?? new Date().toISOString(),
    applyUrl: item.job_apply_link ?? item.job_google_link ?? "",
    jobUrl: item.job_google_link ?? item.job_apply_link ?? "",
    jobDescription,
    experienceLevel: "",
    salaryInfo,
    sourceOverride: keepOwnSource ? (item.job_publisher || "other").trim().toLowerCase() : undefined,
  };
}

/**
 * JSearch aggregates many publishers (LinkedIn, Indeed, Glassdoor, ZipRecruiter, company
 * career pages, regional boards, ...) in one free-tier call. `source: "all"` keeps every
 * publisher found (real worldwide multi-source coverage); `"linkedin"`/`"indeed"` filter
 * down to just that one, matching the dedicated per-source fetch buttons.
 */
async function fetchViaJSearch(
  source: Source,
  searchConfig: { keywords: string[]; workType: string[]; datePosted: string },
  location: string
): Promise<RawJobItem[]> {
  const items = await searchJSearch({
    query: buildJSearchQuery(searchConfig, location),
    datePosted: mapDatePostedForJSearch(searchConfig.datePosted),
    numPages: 1,
  });
  const filtered =
    source === "all" ? items : items.filter((i) => (i.job_publisher ?? "").toLowerCase().includes(source));
  return filtered
    .map((i) => normalizeJSearchItem(i, searchConfig.workType, source === "all"))
    .filter((i): i is RawJobItem => i !== null);
}

export { normalizeItem };
