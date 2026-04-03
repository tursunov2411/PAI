import { ArrowRight, DatabaseZap, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useUserStore from "@/store/useUserStore";

const featureCards = [
  {
    icon: DatabaseZap,
    title: "AI Memory Vault",
    description: "Import and search your long-term AI knowledge across multiple model histories.",
  },
  {
    icon: ShieldCheck,
    title: "Private Owner Workspace",
    description: "Single-user owner mode with a durable profile in PostgreSQL and no public auth screen.",
  },
  {
    icon: Sparkles,
    title: "Personalized Assistant",
    description: "Tune your tone, language, and assistant identity during onboarding.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    const redirectUser = async () => {
      try {
        await fetchUser();
        navigate("/dashboard", { replace: true });
      } catch (error) {
        if (error?.response?.status === 404) {
          navigate("/onboarding", { replace: true });
        }
      }
    };

    redirectUser();
  }, [fetchUser, navigate]);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 grid-noise opacity-40" />
      <div className="page-shell relative flex min-h-screen flex-col justify-center py-16">
        <div className="mx-auto max-w-5xl text-center">
          <Badge variant="accent" className="mb-6">
            Week 1 Build: Auth + Memory Vault
          </Badge>
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-tight text-text-primary md:text-7xl">
            Your Personal <span className="text-gradient">AI Intelligence OS</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-text-muted md:text-lg">
            Rayyan AI turns your conversations, notes, and exports into a searchable
            long-term intelligence layer you can actually use.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="min-w-44" onClick={() => navigate("/dashboard")}>
              Open Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="min-w-44"
              onClick={() => navigate("/onboarding")}
            >
              Setup Profile
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="glass-panel relative overflow-hidden p-6 text-left"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">{card.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Landing;
