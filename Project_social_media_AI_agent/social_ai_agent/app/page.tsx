"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusCards } from "@/components/StatusCards";
import { ContentTabs } from "@/components/ContentTabs";
import { CalendarTable } from "@/components/CalendarTable";
import { ExcelLog } from "@/components/ExcelLog";
import { ContentRow, PipelineState, ApiKeyHealth } from "@/lib/types";

type ActiveTab = "today" | "calendar" | "log";

interface StatusData {
  pipeline: PipelineState;
  keys: ApiKeyHealth;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("today");
  const [todayRow, setTodayRow] = useState<ContentRow | null>(null);
  const [calendarRows, setCalendarRows] = useState<ContentRow[]>([]);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [fileModified, setFileModified] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const running = statusData?.pipeline.running ?? false;

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/today");
      const data = await res.json() as { row: ContentRow | null };
      setTodayRow(data.row ?? null);
    } catch {
      // network error — keep stale data
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar");
      const rows = await res.json() as ContentRow[];
      setCalendarRows(rows);
      // Use the most-recent lastUpdated as a proxy for file modified time
      const latest = rows[0]?.lastUpdated ?? null;
      setFileModified(latest);
    } catch {
      // keep stale data
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json() as StatusData;
      setStatusData(data);
    } catch {
      // keep stale data
    }
  }, []);

  const runPipeline = async () => {
    setRunError(null);
    try {
      const res = await fetch("/api/run", { method: "POST" });
      if (!res.ok && res.status !== 202) {
        const body = await res.json() as { message?: string };
        setRunError(body.message ?? "Failed to start pipeline");
      }
      // Immediately re-fetch status so running=true shows up
      await fetchStatus();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Network error");
    }
  };

  // Initial load
  useEffect(() => {
    void fetchToday();
    void fetchCalendar();
    void fetchStatus();
  }, [fetchToday, fetchCalendar, fetchStatus]);

  // Poll every 3s when running, every 30s otherwise
  useEffect(() => {
    const interval = setInterval(
      () => {
        void fetchStatus();
        void fetchToday();
        if (running) void fetchCalendar();
      },
      running ? 3000 : 30000
    );
    return () => clearInterval(interval);
  }, [running, fetchStatus, fetchToday, fetchCalendar]);

  // Refresh calendar when pipeline stops running
  const prevRunning = usePrev(running);
  useEffect(() => {
    if (prevRunning && !running) {
      void fetchCalendar();
      void fetchToday();
    }
  }, [running, prevRunning, fetchCalendar, fetchToday]);

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "today", label: "Today's Content" },
    { key: "calendar", label: "Calendar" },
    { key: "log", label: "Excel Log" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navbar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold text-gray-900">ContentForge</span>
        </div>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-400">AI Content Pipeline</span>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {runError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {runError}
          </div>
        )}

        <StatusCards
          today={todayRow}
          pipeline={statusData?.pipeline ?? null}
          keys={statusData?.keys ?? null}
          onRunPipeline={() => void runPipeline()}
          running={running}
        />

        {/* Main tab panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 px-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  if (t.key === "calendar" || t.key === "log") void fetchCalendar();
                }}
                className={`py-4 px-2 mr-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === "today" && <ContentTabs row={todayRow} />}
            {activeTab === "calendar" && <CalendarTable rows={calendarRows} />}
            {activeTab === "log" && (
              <ExcelLog rows={calendarRows} fileModified={fileModified} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function usePrev<T>(value: T): T | undefined {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  useEffect(() => {
    setPrev(value);
  }, [value]);
  return prev;
}
