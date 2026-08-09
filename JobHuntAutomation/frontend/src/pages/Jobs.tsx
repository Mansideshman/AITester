import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Field";
import { LoadingBlock, ErrorState, EmptyState } from "../components/ui/Spinner";
import { FitRing } from "../components/FitRing";
import type { TzOverlap } from "../lib/types";

const TZ_TONE: Record<TzOverlap, "green" | "amber" | "grey"> = { full: "green", partial: "amber", none: "grey" };
const TZ_LABEL: Record<TzOverlap, string> = { full: "Full TZ overlap", partial: "Partial TZ overlap", none: "No TZ overlap" };
const FLAG_LABEL: Record<string, string> = {
  workAuth: "Work auth required",
  skillGap: "Skill gap",
  salaryUnknown: "Salary unclear",
};

export function Jobs() {
  const queryClient = useQueryClient();
  const [tz, setTz] = useState("");
  const [source, setSource] = useState("");
  const [flag, setFlag] = useState("");
  const [minFit, setMinFit] = useState("");

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["jobs", { tz, source, flag, minFit }],
    queryFn: () => api.getJobs({ tz: tz || undefined, source: source || undefined, flag: flag || undefined, minFit: minFit ? Number(minFit) : undefined }),
  });
  const { data: sources } = useQuery({ queryKey: ["jobs-sources"], queryFn: api.getJobSources });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "saved" | "dismissed" }) => api.setJobStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Jobs</h1>
        <p className="text-sm text-slate-500">Ranked and scored matches from your last fetch runs.</p>
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <Select value={tz} onChange={(e) => setTz(e.target.value)} className="w-auto">
          <option value="">All timezones</option>
          <option value="full">Full overlap</option>
          <option value="partial">Partial overlap</option>
          <option value="none">No overlap</option>
        </Select>
        <Select value={source} onChange={(e) => setSource(e.target.value)} className="w-auto">
          <option value="">All sources</option>
          {sources?.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <Select value={flag} onChange={(e) => setFlag(e.target.value)} className="w-auto">
          <option value="">All flags</option>
          <option value="workAuth">Work auth</option>
          <option value="skillGap">Skill gap</option>
          <option value="salaryUnknown">Salary unclear</option>
        </Select>
        <Select value={minFit} onChange={(e) => setMinFit(e.target.value)} className="w-auto">
          <option value="">Any fit score</option>
          <option value="80">80%+</option>
          <option value="60">60%+</option>
        </Select>
      </Card>

      {isLoading && <LoadingBlock label="Loading jobs..." />}
      {error && <ErrorState message={(error as Error).message} />}
      {jobs && jobs.length === 0 && (
        <EmptyState title="No jobs yet" hint="Go to Search & Fetch and click Run now to pull matches." />
      )}

      <div className="flex flex-col gap-3">
        {jobs?.map((job) => (
          <Card key={job.id} className="flex items-start gap-4 p-4">
            <FitRing score={job.fitScore} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:underline dark:text-slate-50">
                  {job.title}
                </Link>
                <Badge tone="slate" className="capitalize">{job.source}</Badge>
                <Badge tone={TZ_TONE[job.tzOverlap]}>{TZ_LABEL[job.tzOverlap]}</Badge>
                {job.flags.map((f) => (
                  <Badge key={f} tone="amber">{FLAG_LABEL[f] ?? f}</Badge>
                ))}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {job.company} · {job.location} {job.workType ? `· ${job.workType}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {job.postedTime && !isNaN(Date.parse(job.postedTime))
                  ? `Posted ${formatDistanceToNow(new Date(job.postedTime))} ago`
                  : job.postedTime}
                {job.estPay ? ` · ${job.estPay}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Link to={`/jobs/${job.id}`}>
                <Button size="sm" variant="secondary">Open detail</Button>
              </Link>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => statusMutation.mutate({ id: job.id, status: "saved" })}
                  disabled={job.status === "saved"}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => statusMutation.mutate({ id: job.id, status: "dismissed" })}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
