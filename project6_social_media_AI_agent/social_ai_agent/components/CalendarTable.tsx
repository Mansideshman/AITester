"use client";

import { ContentRow } from "@/lib/types";

interface Props {
  rows: ContentRow[];
}

const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Writing: "bg-blue-100 text-blue-700",
  Imaging: "bg-purple-100 text-purple-700",
  Done: "bg-green-100 text-green-700",
  Error: "bg-red-100 text-red-700",
};

export function CalendarTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
        No content rows yet. Run the pipeline to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Topic</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">LinkedIn</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Medium</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">IG</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">YT</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Dev.to</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Images</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Last Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={row.date} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">{row.date}</td>
              <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{row.topic}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_BADGE[row.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400">
                {row.linkedinPost ? <span className="text-green-500">✓</span> : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400">
                {row.mediumArticle ? <span className="text-green-500">✓</span> : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400">
                {row.igScript ? <span className="text-green-500">✓</span> : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400">
                {row.ytScript ? <span className="text-green-500">✓</span> : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400">
                {row.devtoArticle ? <span className="text-green-500">✓</span> : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400">
                {[row.linkedinImage, row.mediumImage, row.igImage].filter(Boolean).length}/3
              </td>
              <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                {row.lastUpdated
                  ? new Date(row.lastUpdated).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
