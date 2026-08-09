import { useDroppable } from "@dnd-kit/core";
import { cn } from "../lib/cn";
import { TrackerCard } from "./TrackerCard";
import type { Application, ApplicationStatus } from "../lib/types";

export function TrackerColumn({
  status,
  apps,
  onSave,
}: {
  status: ApplicationStatus;
  apps: Application[];
  onSave: (id: string, data: Partial<Application>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50",
        isOver && "ring-2 ring-indigo-400"
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{status}</p>
        <span className="text-xs text-slate-400">{apps.length}</span>
      </div>
      <div className="flex min-h-[80px] flex-col gap-2">
        {apps.map((app) => (
          <TrackerCard key={app.id} app={app} onSave={(data) => onSave(app.id, data)} />
        ))}
      </div>
    </div>
  );
}
