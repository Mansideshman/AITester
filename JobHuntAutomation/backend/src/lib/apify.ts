import { APIFY_TOKEN } from "./env";

const APIFY_BASE = "https://api.apify.com/v2";

export class ApifyError extends Error {}

async function pollRun(actorId: string, runId: string): Promise<number> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    if (!res.ok) throw new ApifyError(`Apify run status check failed: ${res.status}`);
    const body = (await res.json()) as any;
    const status = body?.data?.status;
    if (status === "SUCCEEDED") return Number(body?.data?.usageTotalUsd ?? 0);
    if (status === "ABORTED" && /charge|budget|limit/i.test(String(body?.data?.statusMessage ?? ""))) {
      // Apify stopped the run early because it hit maxTotalChargeUsd — this is the spend
      // cap working as intended, not a failure. Whatever's in the dataset already is kept.
      return Number(body?.data?.usageTotalUsd ?? 0);
    }
    if (status === "FAILED" || status === "TIMED-OUT" || status === "ABORTED") {
      throw new ApifyError(`Apify actor ${actorId} run ${status}: ${body?.data?.statusMessage ?? "no details"}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new ApifyError(`Apify actor ${actorId} run timed out waiting for completion`);
}

export interface ApifyRunResult {
  items: unknown[];
  costUsd: number;
}

/**
 * Runs an Apify actor, polls until finished, and returns dataset items plus the actual
 * billed cost. maxTotalChargeUsd enforces the spend cap server-side via Apify itself for
 * pay-per-event actors (the current pricing model for the LinkedIn/Indeed actors used here).
 */
export async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  maxTotalChargeUsd: number
): Promise<ApifyRunResult> {
  if (!APIFY_TOKEN) throw new ApifyError("APIFY_TOKEN is not configured");

  const encodedActorId = actorId.replace("/", "~");
  const startRes = await fetch(
    `${APIFY_BASE}/acts/${encodedActorId}/runs?token=${APIFY_TOKEN}&maxTotalChargeUsd=${maxTotalChargeUsd}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!startRes.ok) {
    const text = await startRes.text();
    throw new ApifyError(`Failed to start Apify actor ${actorId}: ${startRes.status} ${text}`);
  }
  const startBody = (await startRes.json()) as any;
  const runId = startBody?.data?.id;
  const datasetId = startBody?.data?.defaultDatasetId;
  if (!runId || !datasetId) throw new ApifyError("Apify run response missing id/defaultDatasetId");

  const costUsd = await pollRun(actorId, runId);

  const itemsRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
  );
  if (!itemsRes.ok) throw new ApifyError(`Failed to fetch Apify dataset items: ${itemsRes.status}`);
  const items = (await itemsRes.json()) as unknown[];
  return { items, costUsd };
}
