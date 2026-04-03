import { Bot, FileJson, Sparkles, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import useMemoryStore from "@/store/useMemoryStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categories = ["Goals", "Study", "Personal", "Ideas", "Plans"];

const importCards = [
  {
    key: "chatgpt",
    title: "ChatGPT Import",
    description: "Download your ChatGPT export from Settings → Data Controls → Export.",
    icon: Bot,
    iconClassName: "bg-chatgpt/12 text-chatgpt",
  },
  {
    key: "claude",
    title: "Claude Import",
    description: "Upload your Claude export JSON file to preserve prior conversations.",
    icon: Sparkles,
    iconClassName: "bg-claude/12 text-claude",
  },
];

function ImportPanel() {
  const importFile = useMemoryStore((state) => state.importFile);
  const isImporting = useMemoryStore((state) => state.isImporting);
  const importProgress = useMemoryStore((state) => state.importProgress);
  const [manualText, setManualText] = useState("");
  const [manualCategory, setManualCategory] = useState("Personal");
  const [activeImport, setActiveImport] = useState(null);
  const [statuses, setStatuses] = useState({});
  const fileRefs = useRef({});

  const statusMap = useMemo(() => statuses, [statuses]);

  const updateStatus = (key, status) => {
    setStatuses((current) => ({
      ...current,
      [key]: status,
    }));
  };

  const handleFileImport = async (type, file) => {
    if (!file) {
      return;
    }

    setActiveImport(type);
    updateStatus(type, null);

    try {
      const result = await importFile(type, { file });
      updateStatus(type, {
        type: "success",
        message: `✓ ${result.imported} memories imported`,
      });
      toast.success(`${result.imported} memories imported from ${type}.`);
    } catch (error) {
      updateStatus(type, {
        type: "error",
        message: error?.response?.data?.message || "Import failed.",
      });
      toast.error(error?.response?.data?.message || "Import failed.");
    } finally {
      setActiveImport(null);
      if (fileRefs.current[type]) {
        fileRefs.current[type].value = "";
      }
    }
  };

  const handleManualImport = async () => {
    if (!manualText.trim()) {
      toast.error("Paste some text before importing.");
      return;
    }

    setActiveImport("manual");
    updateStatus("manual", null);

    try {
      const result = await importFile("manual", {
        text: manualText,
        category: manualCategory,
      });

      updateStatus("manual", {
        type: "success",
        message: `✓ ${result.memories?.length || 0} manual memories saved`,
      });
      setManualText("");
      toast.success("Manual memories saved.");
    } catch (error) {
      updateStatus("manual", {
        type: "error",
        message: error?.response?.data?.message || "Manual import failed.",
      });
      toast.error(error?.response?.data?.message || "Manual import failed.");
    } finally {
      setActiveImport(null);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Import your memory sources</h2>
        <p className="mt-1 text-sm text-text-muted">
          Bring in exported conversations or paste important context manually.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {importCards.map((card) => {
          const Icon = card.icon;
          const status = statusMap[card.key];
          const showProgress = isImporting && activeImport === card.key;

          return (
            <Card key={card.key}>
              <CardHeader>
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconClassName}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center transition hover:border-accent/40 hover:bg-accent/5">
                  <UploadCloud className="mb-3 h-6 w-6 text-text-muted" />
                  <p className="text-sm font-medium text-text-primary">
                    Drop a JSON file here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-text-muted">Accepts `.json` exports only</p>
                  <input
                    ref={(element) => {
                      fileRefs.current[card.key] = element;
                    }}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(event) =>
                      handleFileImport(card.key, event.target.files?.[0] || null)
                    }
                  />
                </label>

                {showProgress ? <Progress value={importProgress} /> : null}

                {status ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      status.type === "success"
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-error/30 bg-error/10 text-error"
                    }`}
                  >
                    <p>{status.message}</p>
                    {status.type === "error" ? (
                      <Button
                        variant="ghost"
                        className="mt-2 h-auto px-0 py-0 text-error hover:bg-transparent"
                        onClick={() => fileRefs.current[card.key]?.click()}
                      >
                        Retry
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-manual/12 text-manual">
              <FileJson className="h-5 w-5" />
            </div>
            <CardTitle>Manual Import</CardTitle>
            <CardDescription>
              Paste any text, conversation, or notes and save them directly into the vault.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={manualText}
              onChange={(event) => setManualText(event.target.value)}
              placeholder="Paste any text, conversation, or notes..."
              className="min-h-[160px]"
            />
            <Select
              value={manualCategory}
              onChange={(event) => setManualCategory(event.target.value)}
            >
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </Select>
            {isImporting && activeImport === "manual" ? (
              <Progress value={importProgress} />
            ) : null}
            {statusMap.manual ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  statusMap.manual.type === "success"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-error/30 bg-error/10 text-error"
                }`}
              >
                {statusMap.manual.message}
              </div>
            ) : null}
            <Button onClick={handleManualImport} disabled={!manualText.trim()}>
              Save Manual Memory
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default ImportPanel;
