import { runAgent1, runAgent2, runAgent3 } from "./agents";
import { excelManager } from "./excelManager";
import { PipelineState } from "./types";

const state: PipelineState = {
  running: false,
  currentStep: null,
  lastRun: null,
  lastError: null,
  nextScheduled: nextScheduledRun(),
};

function nextScheduledRun(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  if (now >= next) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

export function getPipelineState(): PipelineState {
  return { ...state };
}

export function refreshNextScheduled(): void {
  state.nextScheduled = nextScheduledRun();
}

export async function runPipeline(): Promise<void> {
  if (state.running) {
    console.log("[Pipeline] Already running, skipping.");
    return;
  }

  state.running = true;
  state.lastError = null;
  state.currentStep = "Agent1: Topic Generation";
  console.log("[Pipeline] Starting pipeline...");

  try {
    const topic = await runAgent1();

    state.currentStep = "Agent2: Content Writing";
    await runAgent2(topic);

    state.currentStep = "Agent3: Image Generation";
    await runAgent3(topic);

    state.currentStep = null;
    state.lastRun = new Date().toISOString();
    state.nextScheduled = nextScheduledRun();
    console.log("[Pipeline] Completed successfully.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    state.lastError = msg;
    state.currentStep = null;
    console.error("[Pipeline] Error:", msg);

    // Best-effort: mark today's row as Error
    try {
      const date = new Date().toISOString().split("T")[0];
      const row = await excelManager.readByDate(date);
      if (row) {
        await excelManager.updateRow(date, {
          status: "Error",
          errorMessage: msg,
        });
      }
    } catch {
      // swallow — the primary error is already captured
    }
  } finally {
    state.running = false;
  }
}
