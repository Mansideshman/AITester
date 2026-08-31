import { NextResponse } from "next/server";
import { runPipeline, getPipelineState } from "@/lib/pipeline";

export async function POST(): Promise<NextResponse> {
  const state = getPipelineState();
  if (state.running) {
    return NextResponse.json(
      { message: "Pipeline already running", state },
      { status: 409 }
    );
  }

  // Fire and forget — client polls /api/status for progress
  runPipeline().catch((err) =>
    console.error("[POST /api/run] Unhandled error:", err)
  );

  return NextResponse.json({ message: "Pipeline started" }, { status: 202 });
}
