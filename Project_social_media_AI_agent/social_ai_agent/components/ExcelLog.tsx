"use client";

import { ContentRow } from "@/lib/types";

interface Props {
  rows: ContentRow[];
  fileModified: string | null;
}

const AGENT_MAP: Array<{
  label: string;
  written: (r: ContentRow) => boolean;
}> = [
  {
    label: "Agent 1 — Topic Generator",
    written: (r) => !!r.topic,
  },
  {
    label: "Agent 2 — Content Writer",
    written: (r) =>
      !!(r.linkedinPost || r.mediumArticle || r.igScript || r.ytScript || r.devtoArticle),
  },
  {
    label: "Agent 3 — Image Generator",
    written: (r) => !!(r.linkedinImage || r.mediumImage || r.igImage),
  },
];

export function ExcelLog({ rows, fileModified }: Props) {
  return (
    <div className="space-y-4">
      {/* File meta + download */}
      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-700">content_calendar.xlsx</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Last modified:{" "}
            {fileModified ? new Date(fileModified).toLocaleString() : "—"}
          </p>
        </div>
        <a
          href="/api/download"
          download="content_calendar.xlsx"
          className="px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg transition-colors"
        >
          Download .xlsx
        </a>
      </div>

      {/* Per-row log */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
          No rows yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.date}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-mono text-sm text-gray-500">{row.date}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-sm font-medium text-gray-800">{row.topic}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {row.lastUpdated
                    ? new Date(row.lastUpdated).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AGENT_MAP.map((a) => (
                  <span
                    key={a.label}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      a.written(row)
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-gray-50 text-gray-400 border border-gray-100"
                    }`}
                  >
                    {a.label} {a.written(row) ? "✓" : "pending"}
                  </span>
                ))}
              </div>
              {row.errorMessage && (
                <p className="mt-2 text-xs text-red-500">{row.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
