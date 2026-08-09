import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, ExternalLink } from "lucide-react";
import { Card } from "./ui/Card";
import { Input, Label, Textarea } from "./ui/Field";
import { Button } from "./ui/Button";
import type { Application } from "../lib/types";

export function TrackerCard({
  app,
  onSave,
}: {
  app: Application;
  onSave: (data: Partial<Application>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    recruiter: app.recruiter ?? "",
    nextAction: app.nextAction ?? "",
    nextActionDate: app.nextActionDate ? app.nextActionDate.slice(0, 10) : "",
    notes: app.notes ?? "",
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <Card ref={setNodeRef} style={style} className="p-3">
      <div className="flex items-start justify-between gap-2" {...attributes} {...listeners}>
        <div className="min-w-0 cursor-grab">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{app.title}</p>
          <p className="truncate text-xs text-slate-500">{app.company}</p>
        </div>
        {app.fitScore !== undefined && (
          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
            {app.fitScore}%
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
        {app.applyUrl && (
          <a href={app.applyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-indigo-600">
            posting <ExternalLink size={11} />
          </a>
        )}
        <button onClick={() => setEditing((e) => !e)} className="ml-auto flex items-center gap-0.5 hover:text-indigo-600">
          <Pencil size={11} /> edit
        </button>
      </div>

      {editing && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
          <div>
            <Label>Recruiter</Label>
            <Input value={draft.recruiter} onChange={(e) => setDraft({ ...draft, recruiter: e.target.value })} className="py-1 text-xs" />
          </div>
          <div>
            <Label>Next action</Label>
            <Input value={draft.nextAction} onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })} className="py-1 text-xs" />
          </div>
          <div>
            <Label>Next action date</Label>
            <Input type="date" value={draft.nextActionDate} onChange={(e) => setDraft({ ...draft, nextActionDate: e.target.value })} className="py-1 text-xs" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="text-xs" />
          </div>
          <Button
            size="sm"
            className="mt-1"
            onClick={() => {
              onSave({
                recruiter: draft.recruiter || null,
                nextAction: draft.nextAction || null,
                nextActionDate: draft.nextActionDate || null,
                notes: draft.notes || null,
              });
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      )}
    </Card>
  );
}
