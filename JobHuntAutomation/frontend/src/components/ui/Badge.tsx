import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Tone = "green" | "amber" | "grey" | "red" | "indigo" | "slate";

const tones: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  grey: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export function Badge({
  tone = "slate",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
