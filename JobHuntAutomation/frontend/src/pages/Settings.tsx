import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label, Textarea } from "../components/ui/Field";
import { LoadingBlock, ErrorState } from "../components/ui/Spinner";

export function Settings() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, error } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });

  const [form, setForm] = useState<{ name: string; base: string; targetTitles: string; resumeText: string } | null>(null);
  const active = form ?? (profile
    ? { name: profile.name, base: profile.base, targetTitles: profile.targetTitles.join(", "), resumeText: profile.resumeText }
    : null);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateProfile({
        name: active!.name,
        base: active!.base,
        targetTitles: active!.targetTitles.split(",").map((s) => s.trim()).filter(Boolean),
        resumeText: active!.resumeText,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (isLoading) return <LoadingBlock label="Loading settings..." />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!active) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Settings</h1>
        <p className="text-sm text-slate-500">Profile, resume, and integration status.</p>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Integrations</p>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            {settings?.jsearch.configured ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <XCircle size={16} className="text-slate-300" />
            )}
            <span className="text-slate-600 dark:text-slate-300">
              JSearch (JSEARCH_API_KEY, free tier): {settings?.jsearch.status ?? "checking..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {settings?.apify.configured ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <XCircle size={16} className="text-slate-300" />
            )}
            <span className="text-slate-600 dark:text-slate-300">
              Apify (APIFY_TOKEN): {settings?.apify.status ?? "checking..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {settings?.anthropic.configured ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <XCircle size={16} className="text-slate-300" />
            )}
            <span className="text-slate-600 dark:text-slate-300">
              Anthropic (ANTHROPIC_API_KEY): {settings?.anthropic.status ?? "checking..."} · model {settings?.anthropic.model}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Keys are set as server-only environment variables in <code>backend/.env</code> — never entered here, never sent to the browser.
        </p>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Profile</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={active.name} onChange={(e) => setForm({ ...active, name: e.target.value })} />
          </div>
          <div>
            <Label>Base location</Label>
            <Input value={active.base} onChange={(e) => setForm({ ...active, base: e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <Label>Target titles (comma-separated)</Label>
          <Input value={active.targetTitles} onChange={(e) => setForm({ ...active, targetTitles: e.target.value })} />
        </div>
        <div className="mt-4">
          <Label>Resume text (used for scoring, tailoring, and drafts)</Label>
          <Textarea rows={10} value={active.resumeText} onChange={(e) => setForm({ ...active, resumeText: e.target.value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
