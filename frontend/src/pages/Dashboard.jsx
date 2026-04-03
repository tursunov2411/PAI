import useUserStore from "@/store/useUserStore";
import MemoryVault from "@/components/memory/MemoryVault";
import { Badge } from "@/components/ui/badge";

function Dashboard() {
  const user = useUserStore((state) => state.user);

  return (
    <div className="space-y-8">
      <section className="glass-panel overflow-hidden p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="accent">Week 3 Live</Badge>
            <h1 className="mt-4 text-3xl font-semibold text-text-primary">
              Welcome back{user?.name ? `, ${user.name}` : ""}.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-text-muted">
              Your personal intelligence stack now includes the Memory Vault, AI Clone chat,
              the goals dashboard, rich notes, and a drag-and-drop study planner. Import knowledge,
              talk to your assistant with memory-backed context, and turn goals into concrete study plans.
            </p>
          </div>
          <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary">
            Assistant profile:{" "}
            <span className="font-medium">{user?.assistantName || "Sunnatilla AI"}</span>
          </div>
        </div>
      </section>

      <MemoryVault />
    </div>
  );
}

export default Dashboard;
