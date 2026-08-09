import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Download } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { LoadingBlock, ErrorState, EmptyState } from "../components/ui/Spinner";
import { TrackerColumn } from "../components/TrackerColumn";
import type { Application, ApplicationStatus } from "../lib/types";

const COLUMNS: ApplicationStatus[] = ["Saved", "Applied", "Screening", "Interview", "Offer", "Rejected"];

export function Tracker() {
  const queryClient = useQueryClient();
  const { data: apps, isLoading, error } = useQuery({ queryKey: ["applications"], queryFn: api.getApplications });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) => api.updateApplication(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["applications"] });
      const previous = queryClient.getQueryData<Application[]>(["applications"]);
      queryClient.setQueryData<Application[]>(["applications"], (old) =>
        old?.map((a) => (a.id === id ? { ...a, ...data } : a))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["applications"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (isLoading) return <LoadingBlock label="Loading tracker..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as ApplicationStatus;
    const app = apps?.find((a) => a.id === active.id);
    if (app && app.status !== newStatus) {
      updateMutation.mutate({ id: app.id, data: { status: newStatus } });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Tracker</h1>
          <p className="text-sm text-slate-500">Drag cards across the pipeline. Deduped by Company + Role.</p>
        </div>
        <a href={api.exportCsvUrl()}>
          <Button variant="secondary">
            <Download size={14} /> Export CSV
          </Button>
        </a>
      </div>

      {!apps?.length ? (
        <EmptyState title="Nothing tracked yet" hint="Fetched jobs are logged here automatically as Saved." />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUMNS.map((status) => (
              <TrackerColumn
                key={status}
                status={status}
                apps={apps.filter((a) => a.status === status)}
                onSave={(id, data) => updateMutation.mutate({ id, data })}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
