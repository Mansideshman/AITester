import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { LoadingBlock, ErrorState } from "../components/ui/Spinner";

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: job, isLoading, error } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.getJob(id!),
    enabled: Boolean(id),
  });

  const [markedResumeId, setMarkedResumeId] = useState<string | undefined>();

  const tailorMutation = useMutation({
    mutationFn: () => api.tailorResume(id!),
    onSuccess: (result) => {
      setMarkedResumeId(result.id);
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    },
  });

  const draftMutation = useMutation({
    mutationFn: (type: "coverLetter" | "coldEmail") => api.generateDraft(id!, type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job", id] }),
  });

  const markAppliedMutation = useMutation({
    mutationFn: () =>
      api.markApplied(id!, {
        resumeVersionId: markedResumeId ?? job?.resumeVersions.at(-1)?.id,
        coverLetterSent: (job?.drafts.length ?? 0) > 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    },
  });

  if (isLoading) return <LoadingBlock label="Loading job..." />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!job) return null;

  const latestResume = job.resumeVersions.at(-1);
  const coverLetter = [...job.drafts].reverse().find((d) => d.type === "coverLetter");
  const coldEmail = [...job.drafts].reverse().find((d) => d.type === "coldEmail");

  return (
    <div className="flex flex-col gap-6">
      <Link to="/jobs" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Back to Jobs
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{job.title}</h1>
          <Badge tone="indigo">{job.fitScore}% fit</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {job.company} · {job.location} {job.workType ? `· ${job.workType}` : ""} {job.estPay ? `· ${job.estPay}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.fitReasons.map((r) => (
            <Badge key={r} tone="slate">{r}</Badge>
          ))}
        </div>
        {job.applyUrl && (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
          >
            Open original posting to apply <ExternalLink size={14} />
          </a>
        )}
      </div>

      <Card className="p-5">
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Job description</p>
        <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{job.jdText}</p>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Tailor Resume</p>
          <Button size="sm" onClick={() => tailorMutation.mutate()} disabled={tailorMutation.isPending}>
            {tailorMutation.isPending ? "Tailoring..." : latestResume ? "Re-tailor" : "Tailor for this job"}
          </Button>
        </div>
        {tailorMutation.isError && <ErrorState message={(tailorMutation.error as Error).message} />}
        {latestResume && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Summary</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{latestResume.summary}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Skills</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {latestResume.skills.map((s) => (
                  <Badge key={s} tone="slate">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Top bullets</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                {latestResume.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">What changed</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-500">
                {latestResume.diff.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 pt-1">
              <a href={api.downloadResumeUrl(latestResume.id, "docx")}>
                <Button size="sm" variant="secondary">
                  <Download size={14} /> .docx
                </Button>
              </a>
              <a href={api.downloadResumeUrl(latestResume.id, "txt")}>
                <Button size="sm" variant="secondary">
                  <Download size={14} /> .txt
                </Button>
              </a>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Cover Letter</p>
            <Button size="sm" onClick={() => draftMutation.mutate("coverLetter")} disabled={draftMutation.isPending}>
              Generate
            </Button>
          </div>
          {coverLetter && (
            <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{coverLetter.body}</p>
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Cold Email</p>
            <Button size="sm" onClick={() => draftMutation.mutate("coldEmail")} disabled={draftMutation.isPending}>
              Generate
            </Button>
          </div>
          {coldEmail && (
            <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{coldEmail.body}</p>
          )}
        </Card>
      </div>

      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Mark as Applied</p>
          <p className="text-xs text-slate-400">
            Opens nothing automatically — you apply yourself via the original posting, then record it here.
          </p>
        </div>
        <Button onClick={() => markAppliedMutation.mutate()} disabled={markAppliedMutation.isPending}>
          {markAppliedMutation.isSuccess ? "Marked applied" : markAppliedMutation.isPending ? "Saving..." : "Mark Applied"}
        </Button>
      </Card>
    </div>
  );
}
