"use client";

import { ContentRow, PipelineState, ApiKeyHealth } from "@/lib/types";

interface Props {
  today: ContentRow | null;
  pipeline: PipelineState | null;
  keys: ApiKeyHealth | null;
  onRunPipeline: () => void;
  running: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Writing: "bg-blue-100 text-blue-800 border-blue-200",
  Imaging: "bg-purple-100 text-purple-800 border-purple-200",
  Done: "bg-green-100 text-green-800 border-green-200",
  Error: "bg-red-100 text-red-800 border-red-200",
};

function KeyIndicator({ label, ok }: { label: string; ok: boolean | null }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          ok === null ? "bg-gray-300" : ok ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

export function StatusCards({ today, pipeline, keys, onRunPipeline, running }: Props) {
  const statusColor = today?.status
    ? STATUS_COLOR[today.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
    : "bg-gray-100 text-gray-500 border-gray-200";

  const nextRun = pipeline?.nextScheduled
    ? new Date(pipeline.nextScheduled).toLocaleString()
    : "—";

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <KeyIndicator label="Groq" ok={keys?.groq ?? null} />
          <KeyIndicator label="Gemini" ok={keys?.gemini ?? null} />
          <span className="text-sm text-gray-400">Next: {nextRun}</span>
        </div>
        <button
          onClick={onRunPipeline}
          disabled={running}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {running ? "Running…" : "Run Pipeline Now"}
        </button>
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Today's Topic</p>
          <p className="text-gray-900 font-semibold leading-snug">
            {today?.topic ?? "No topic generated yet"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</p>
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-medium border ${statusColor}`}
          >
            {today?.status ?? "—"}
          </span>
          {pipeline?.currentStep && (
            <p className="mt-1 text-xs text-gray-400">{pipeline.currentStep}</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Last Updated</p>
          <p className="text-gray-700 text-sm">
            {today?.lastUpdated
              ? new Date(today.lastUpdated).toLocaleString()
              : "—"}
          </p>
          {pipeline?.lastError && (
            <p className="mt-1 text-xs text-red-500 truncate" title={pipeline.lastError}>
              Error: {pipeline.lastError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
