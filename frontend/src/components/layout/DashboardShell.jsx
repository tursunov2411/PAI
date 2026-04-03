import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import useUserStore from "@/store/useUserStore";

function DashboardShell() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        await fetchUser();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error?.response?.status === 404) {
          navigate("/onboarding", { replace: true });
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [fetchUser, navigate]);

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="page-shell flex min-h-[calc(100vh-5rem)] items-center justify-center">
          <div className="glass-panel p-8 text-center">
            <p className="text-sm text-text-muted">Loading your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="page-shell flex gap-6 py-8">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardShell;
