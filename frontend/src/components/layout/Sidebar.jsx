import {
  Brain,
  CalendarRange,
  DatabaseZap,
  FileText,
  Flag,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: Brain, upcoming: false },
  { to: "/dashboard/memory", label: "Memory Vault", icon: DatabaseZap, upcoming: false },
  { to: "/dashboard/chat", label: "Chat", icon: MessageSquare, upcoming: false },
  { to: "/dashboard/goals", label: "Goals", icon: Flag, upcoming: false },
  { to: "/dashboard/notes", label: "Notes", icon: FileText, upcoming: false },
  { to: "/dashboard/planner", label: "Planner", icon: CalendarRange, upcoming: false },
  { to: "/dashboard/social", label: "Social Hub", icon: Users, upcoming: true },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, upcoming: true },
];

function Sidebar() {
  return (
    <TooltipProvider delayDuration={150}>
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-24 rounded-3xl border border-white/5 bg-surface/70 p-4 backdrop-blur-xl">
          <p className="mb-3 px-3 text-xs uppercase tracking-[0.24em] text-text-muted">
            Modules
          </p>
          <div className="space-y-1.5">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-2xl px-3 py-3 transition ${
                          isActive
                            ? "bg-accent/14 text-text-primary"
                            : "text-text-muted hover:bg-white/5 hover:text-text-primary"
                        }`
                      }
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-black/20">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium">{item.label}</span>
                      </span>
                      {item.upcoming ? <Badge>Coming soon</Badge> : null}
                    </NavLink>
                  </TooltipTrigger>
                  {item.upcoming ? (
                    <TooltipContent>
                      Planned for later weeks in the roadmap.
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              );
            })}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
