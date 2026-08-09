import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label, Select } from "../components/ui/Field";
import { LoadingBlock, ErrorState } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";

export function SearchFetch() {
  const queryClient = useQueryClient();
  const { data: config, isLoading, error } = useQuery({ queryKey: ["search-config"], queryFn: api.getSearchConfig });
  const { data: runLogs } = useQuery({ queryKey: ["run-logs"], queryFn: api.getRunLogs });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });

  const [form, setForm] = useState<{
    keywords: string;
    locations: string;
    workType: string[];
    datePosted: string;
    spendCapUsd: number;
  } | null>(null);

  const active = form ?? (config
    ? {
        keywords: config.keywords.join(", "),
        locations: config.locations.join(", "),
        workType: config.workType,
        datePosted: config.datePosted,
        spendCapUsd: config.spendCapUsd,
      }
    : null);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateSearchConfig({
        keywords: active!.keywords.split(",").map((s) => s.trim()).filter(Boolean),
        locations: active!.locations.split(",").map((s) => s.trim()).filter(Boolean),
        workType: active!.workType,
        datePosted: active!.datePosted,
        spendCapUsd: Number(active!.spendCapUsd),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["search-config"] }),
  });

  const fetchMutation = useMutation({
    mutationFn: (source: "linkedin" | "indeed" | "all") => api.runFetch(source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run-logs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs-sources"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  if (isLoading) return <LoadingBlock label="Loading search config..." />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!active) return null;

  const toggleWorkType = (wt: string) => {
    const next = active.workType.includes(wt)
      ? active.workType.filter((w) => w !== wt)
      : [...active.workType, wt];
    setForm({ ...active, workType: next });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Search & Fetch</h1>
          <p className="text-sm text-slate-500">
            {settings?.jsearch.configured
              ? "Live fetch via JSearch (free tier) is configured."
              : settings?.apify.configured
                ? "Live fetch via Apify (paid) is configured."
                : "No live source configured — runs will use realistic mock data."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => fetchMutation.mutate("linkedin")}
            disabled={fetchMutation.isPending}
          >
            Fetch LinkedIn
          </Button>
          <Button
            variant="secondary"
            onClick={() => fetchMutation.mutate("indeed")}
            disabled={fetchMutation.isPending}
          >
            Fetch Indeed
          </Button>
          <Button onClick={() => fetchMutation.mutate("all")} disabled={fetchMutation.isPending}>
            {fetchMutation.isPending ? "Running..." : "Fetch All Sources"}
          </Button>
        </div>
      </div>

      {fetchMutation.isError && <ErrorState message={(fetchMutation.error as Error).message} />}
      {fetchMutation.isSuccess && (
        <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          Fetched {fetchMutation.data.itemsFetched} items ({fetchMutation.data.newJobs} new matches, $
          {fetchMutation.data.costUsd.toFixed(2)} spent).
        </div>
      )}

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Keywords (comma-separated)</Label>
            <Input value={active.keywords} onChange={(e) => setForm({ ...active, keywords: e.target.value })} />
          </div>
          <div>
            <Label>Locations (comma-separated)</Label>
            <Input value={active.locations} onChange={(e) => setForm({ ...active, locations: e.target.value })} />
          </div>
          <div>
            <Label>Work type</Label>
            <div className="flex gap-2">
              {["remote", "hybrid", "onsite"].map((wt) => (
                <button
                  key={wt}
                  type="button"
                  onClick={() => toggleWorkType(wt)}
                  className={
                    active.workType.includes(wt)
                      ? "rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white"
                      : "rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
                  }
                >
                  {wt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Date window</Label>
            <Select value={active.datePosted} onChange={(e) => setForm({ ...active, datePosted: e.target.value })}>
              <option value="r86400">Last 24 hours</option>
              <option value="r604800">Last 7 days</option>
            </Select>
          </div>
          <div>
            <Label>Spend cap (USD / month)</Label>
            <Input
              type="number"
              step="0.05"
              value={active.spendCapUsd}
              onChange={(e) => setForm({ ...active, spendCapUsd: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save config"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Run history</p>
        {!runLogs?.length ? (
          <p className="text-sm text-slate-400">No runs yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-400 dark:border-slate-700">
                <th className="py-2 font-medium">When</th>
                <th className="font-medium">Source</th>
                <th className="font-medium">Mode</th>
                <th className="font-medium">Items</th>
                <th className="font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {runLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="py-2 text-slate-600 dark:text-slate-300">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="capitalize text-slate-600 dark:text-slate-300">{log.source}</td>
                  <td>
                    <Badge tone={log.mode === "live" ? "indigo" : "grey"}>{log.mode}</Badge>
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{log.itemsFetched}</td>
                  <td className="text-slate-600 dark:text-slate-300">${log.costUsd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
