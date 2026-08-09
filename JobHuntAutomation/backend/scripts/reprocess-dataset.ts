/**
 * One-off: re-process an already-fetched (already-paid-for) Apify dataset through the
 * current (fixed) normalizeItem/scoring pipeline, without starting a new paid actor run.
 * Usage: npx tsx scripts/reprocess-dataset.ts <datasetId> <source>
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { APIFY_TOKEN } from "../src/lib/env";
import { normalizeItem, processRawItems, type Source } from "../src/services/fetchJobs";
import { fromJson } from "../src/lib/json";

async function main() {
  const [datasetId, source] = process.argv.slice(2) as [string, Source];
  if (!datasetId || !source) throw new Error("Usage: reprocess-dataset.ts <datasetId> <linkedin|indeed>");

  const searchConfig = await prisma.searchConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  const profile = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!searchConfig || !profile) throw new Error("SearchConfig or Profile not seeded");

  const workType = fromJson<string[]>(searchConfig.workType, []);
  const targetTitles = fromJson<string[]>(profile.targetTitles, []);

  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
  );
  if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`);
  const rawApifyItems = (await res.json()) as unknown[];
  console.log(`Fetched ${rawApifyItems.length} raw items from dataset ${datasetId}`);

  const rawItems = rawApifyItems.map((i) => normalizeItem(i, workType)).filter((i) => i !== null);
  console.log(`${rawItems.length} items normalized`);

  const { savedJobs, newJobs } = await processRawItems(rawItems, source, targetTitles, profile.resumeText);
  console.log(`savedJobs=${savedJobs} newJobs=${newJobs}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
