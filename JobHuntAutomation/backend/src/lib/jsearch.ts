import { JSEARCH_API_KEY } from "./env";

const JSEARCH_HOST = "jsearch.p.rapidapi.com";

export class JSearchError extends Error {}

export interface JSearchItem {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_publisher: string;
  job_city?: string | null;
  job_country?: string | null;
  job_is_remote?: boolean;
  job_posted_at_datetime_utc?: string;
  job_apply_link: string;
  job_google_link?: string;
  job_description: string;
  job_employment_type?: string;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_string?: string | null;
  job_salary_period?: string | null;
}

/**
 * Free-tier alternative to per-source paid scrapers (Apify): JSearch aggregates postings
 * from many publishers (LinkedIn, Indeed, Glassdoor, etc.) via Google for Jobs in one call.
 * Caller buckets results by `job_publisher` to split into per-source Job rows.
 *
 * Uses `/search-v2` — the classic `/search` endpoint returns 404 "Endpoint does not exist"
 * on current RapidAPI subscriptions (confirmed 2026-08-09); `/search-v2` is the live one.
 * Its response nests results under `data.jobs` (plus a `data.cursor` for pagination),
 * unlike classic `/search`'s flat `data` array.
 */
export async function searchJSearch(params: {
  query: string;
  datePosted: "today" | "3days" | "week" | "month" | "all";
  numPages?: number;
}): Promise<JSearchItem[]> {
  if (!JSEARCH_API_KEY) throw new JSearchError("JSEARCH_API_KEY is not configured");

  const qs = new URLSearchParams({
    query: params.query,
    date_posted: params.datePosted,
    num_pages: String(params.numPages ?? 1),
  });

  const res = await fetch(`https://${JSEARCH_HOST}/search-v2?${qs.toString()}`, {
    headers: {
      "x-rapidapi-key": JSEARCH_API_KEY,
      "x-rapidapi-host": JSEARCH_HOST,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new JSearchError(`JSearch API error: ${res.status} ${text}`);
  }
  const body = (await res.json()) as any;
  if (body?.status === "ERROR") throw new JSearchError(`JSearch API error: ${JSON.stringify(body)}`);
  return (body?.data?.jobs ?? []) as JSearchItem[];
}
