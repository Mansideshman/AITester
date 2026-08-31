import { NextResponse } from "next/server";
import { getPipelineState } from "@/lib/pipeline";
import { checkGroqHealth, checkGeminiHealth } from "@/lib/agents";
import { StatusResponse } from "@/lib/types";

// Cache key health for 60s to avoid hammering APIs on every poll
let keyHealthCache: { groq: boolean; gemini: boolean; ts: number } | null =
  null;

async function getKeyHealth(): Promise<{ groq: boolean; gemini: boolean }> {
  const now = Date.now();
  if (keyHealthCache && now - keyHealthCache.ts < 60_000) {
    return { groq: keyHealthCache.groq, gemini: keyHealthCache.gemini };
  }
  const [groq, gemini] = await Promise.all([
    checkGroqHealth().catch(() => false),
    checkGeminiHealth().catch(() => false),
  ]);
  keyHealthCache = { groq, gemini, ts: now };
  return { groq, gemini };
}

export async function GET(): Promise<NextResponse> {
  try {
    const [pipeline, keys] = await Promise.all([
      Promise.resolve(getPipelineState()),
      getKeyHealth(),
    ]);
    const body: StatusResponse = { pipeline, keys };
    return NextResponse.json(body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
