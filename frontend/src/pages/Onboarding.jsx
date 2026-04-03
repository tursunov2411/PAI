import { ChevronLeft, ChevronRight, Languages, Sparkles, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useUserStore from "@/store/useUserStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const toneOptions = [
  {
    value: "formal",
    title: "Formal",
    description: "Clear, polished, and more executive in tone.",
  },
  {
    value: "balanced",
    title: "Balanced",
    description: "Professional but relaxed, ideal for everyday use.",
  },
  {
    value: "casual",
    title: "Casual",
    description: "Friendly, light, and more conversational.",
  },
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "uz", label: "Uzbek" },
];

function Onboarding() {
  const navigate = useNavigate();
  const storedUser = useUserStore((state) => state.user);
  const fetchUser = useUserStore((state) => state.fetchUser);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    aboutMe: "",
    tonePreference: "balanced",
    assistantName: "Sunnatilla AI",
    language: "en",
  });

  useEffect(() => {
    if (storedUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, storedUser]);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return form.name.trim().length > 1;
    }

    if (step === 3) {
      return form.assistantName.trim().length > 1;
    }

    return true;
  }, [form.assistantName, form.name, step]);

  const handleNext = () => {
    if (step < 4 && canContinue) {
      setStep((current) => current + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((current) => current - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      await api.post("/api/auth/sync", {
        ...form,
      });

      await fetchUser();
      toast.success("Your workspace is ready.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "We couldn't save your onboarding details.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-3xl overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-white/5 p-6 lg:border-b-0 lg:border-r">
            <Badge variant="accent">Onboarding</Badge>
            <CardHeader className="px-0 pb-0">
              <CardTitle className="text-3xl">Shape your personal AI workspace</CardTitle>
              <CardDescription>
                A few preferences now gives the assistant a stronger starting context.
              </CardDescription>
            </CardHeader>

            <div className="mt-6">
              <Progress value={step * 25} />
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-text-muted">
                Step {step} of 4
              </p>
            </div>

            <CardContent className="px-0 pb-0 pt-8">
              {step === 1 ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">
                      What's your name?
                    </label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Rayyan"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">
                      Tell the AI about yourself
                    </label>
                    <Textarea
                      value={form.aboutMe}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, aboutMe: event.target.value }))
                      }
                      placeholder="What should your assistant know about your goals, work style, or current priorities?"
                    />
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">
                    Choose the tone your assistant should default to.
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {toneOptions.map((tone) => (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            tonePreference: tone.value,
                          }))
                        }
                        className={`rounded-2xl border p-4 text-left transition ${
                          form.tonePreference === tone.value
                            ? "border-accent/50 bg-accent/10 shadow-glow"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <p className="text-base font-semibold text-text-primary">{tone.title}</p>
                        <p className="mt-2 text-sm text-text-muted">{tone.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">
                    Name your assistant
                  </label>
                  <Input
                    value={form.assistantName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        assistantName: event.target.value,
                      }))
                    }
                    placeholder="Sunnatilla AI"
                  />
                  <p className="text-sm text-text-muted">
                    This shows up in the dashboard header and future chat modules.
                  </p>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">
                    Pick the primary language for your workspace.
                  </p>
                  <div className="grid gap-3">
                    {languageOptions.map((language) => (
                      <button
                        key={language.value}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({ ...current, language: language.value }))
                        }
                        className={`rounded-2xl border p-4 text-left transition ${
                          form.language === language.value
                            ? "border-accent/50 bg-accent/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <p className="font-medium text-text-primary">{language.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>

            <div className="mt-10 flex items-center justify-between">
              <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {step < 4 ? (
                <Button onClick={handleNext} disabled={!canContinue}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Enter Dashboard"}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between bg-white/[0.02] p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
                Preview
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {form.name || "Your Name"}
                      </p>
                      <p className="text-sm text-text-muted">
                        {form.aboutMe || "A short summary about you appears here."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-chatgpt/12 text-chatgpt">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{form.assistantName}</p>
                      <p className="text-sm text-text-muted capitalize">
                        {form.tonePreference} tone
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gemini/12 text-gemini">
                      <Languages className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {languageOptions.find((option) => option.value === form.language)?.label}
                      </p>
                      <p className="text-sm text-text-muted">Primary workspace language</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Onboarding;
