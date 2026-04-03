import { UserButton } from "@clerk/clerk-react";
import { Bell, Sparkles } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import useUserStore from "@/store/useUserStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";

const quickLinks = [
  { label: "Memory Vault", to: "/dashboard/memory" },
  { label: "Chat", to: "/dashboard/chat" },
  { label: "Goals", to: "/dashboard/goals" },
  { label: "Notes", to: "/dashboard/notes" },
  { label: "Planner", to: "/dashboard/planner" },
  { label: "Settings", to: "/dashboard/settings" },
];

function TopNav() {
  const user = useUserStore((state) => state.user);

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-2 md:flex">
            {quickLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-white/10 text-text-primary"
                      : "text-text-muted hover:bg-white/5 hover:text-text-primary"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 lg:flex">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
                Assistant
              </p>
              <p className="text-sm font-medium text-text-primary">
                {user?.assistantName || "Sunnatilla AI"}
              </p>
            </div>
            <Badge variant="accent" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Live
            </Badge>
          </div>

          <Button variant="ghost" size="icon" className="text-text-muted">
            <Bell className="h-4 w-4" />
          </Button>

          <Link to="/dashboard/settings" className="hidden md:block">
            <Badge>Workspace</Badge>
          </Link>

          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: "h-10 w-10",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}

export default TopNav;
