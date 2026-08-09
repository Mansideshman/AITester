import { NavLink } from "react-router-dom";
import { LayoutDashboard, Search, ListChecks, KanbanSquare, Settings, Sparkles } from "lucide-react";
import { cn } from "../lib/cn";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/search", label: "Search & Fetch", icon: Search },
  { to: "/jobs", label: "Jobs", icon: ListChecks },
  { to: "/tracker", label: "Tracker", icon: KanbanSquare },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Sparkles className="text-indigo-600" size={22} />
        <span className="text-base font-semibold text-slate-900 dark:text-slate-50">JobHunt Copilot</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-2 pt-4 text-[11px] text-slate-400">
        Apply is always manual — this app never auto-submits.
      </div>
    </aside>
  );
}
