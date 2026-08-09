import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { LoadingBlock, ErrorState } from "../components/ui/Spinner";
import type { ApplicationStatus } from "../lib/types";

const STATUS_ORDER: ApplicationStatus[] = ["Saved", "Applied", "Screening", "Interview", "Offer", "Rejected"];
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Saved: "bg-slate-400",
  Applied: "bg-indigo-500",
  Screening: "bg-amber-500",
  Interview: "bg-purple-500",
  Offer: "bg-emerald-500",
  Rejected: "bg-rose-500",
};

export function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboard });

  if (isLoading) return <LoadingBlock label="Loading dashboard..." />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const total = STATUS_ORDER.reduce((sum, s) => sum + (data.funnelByStatus[s] ?? 0), 0);
  const spendPct = data.spendCapUsd > 0 ? Math.min(100, (data.spendThisMonthUsd / data.spendCapUsd) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-500">Your job-hunt pipeline at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Today's new matches</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-50">{data.todaysNewMatches}</p>
          <Link to="/jobs" className="mt-2 inline-block text-xs font-medium text-indigo-600 hover:underline">
            View jobs →
          </Link>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Total tracked</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-50">{total}</p>
          <Link to="/tracker" className="mt-2 inline-block text-xs font-medium text-indigo-600 hover:underline">
            Open tracker →
          </Link>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Spend this month</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-50">
            ${data.spendThisMonthUsd.toFixed(2)}{" "}
            <span className="text-sm font-normal text-slate-400">/ ${data.spendCapUsd.toFixed(2)} cap</span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={spendPct >= 100 ? "h-full bg-rose-500" : "h-full bg-indigo-500"}
              style={{ width: `${spendPct}%` }}
            />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm font-medium text-slate-700 dark:text-slate-200">Pipeline funnel</p>
        <div className="flex flex-col gap-3">
          {STATUS_ORDER.map((status) => {
            const count = data.funnelByStatus[status] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-medium text-slate-500">{status}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full ${STATUS_COLORS[status]}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
