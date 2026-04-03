import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Code2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Save,
  Sparkles,
  Strikethrough,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  WandSparkles,
  BookOpenText,
  Layers2,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import useGoalStore from "@/store/useGoalStore";
import useNoteStore from "@/store/useNoteStore";
import FlashcardViewer from "@/components/notes/FlashcardViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDisplayDate } from "@/lib/utils";

const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Highlight,
  Underline,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  CharacterCount,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: "text-accent underline underline-offset-4",
    },
  }),
];

function ToolbarButton({ onClick, isActive, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition",
        isActive
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-white/8 bg-black/20 text-text-muted hover:bg-white/5 hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function NoteEditor() {
  const goals = useGoalStore((state) => state.goals);
  const activeNote = useNoteStore((state) => state.activeNote);
  const setActiveNote = useNoteStore((state) => state.setActiveNote);
  const updateNote = useNoteStore((state) => state.updateNote);
  const deleteNote = useNoteStore((state) => state.deleteNote);
  const applyAI = useNoteStore((state) => state.applyAI);
  const isSaving = useNoteStore((state) => state.isSaving);
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [source, setSource] = useState("manual");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryResult, setSummaryResult] = useState("");
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [pendingReplacement, setPendingReplacement] = useState(null);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [isMetaOpen, setIsMetaOpen] = useState(true);
  const [isRunningAction, setIsRunningAction] = useState("");

  const linkedGoal = useMemo(
    () => goals.find((goal) => goal.id === goalId) || null,
    [goalId, goals],
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: "<p></p>",
    editorProps: {
      attributes: {
        class: "note-editor-content focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!activeNote) {
      setTitle("");
      setGoalId("");
      setTags([]);
      setSource("manual");
      editor?.commands.setContent("<p></p>", false);
      return;
    }

    setTitle(activeNote.title || "");
    setGoalId(activeNote.goal?.id || activeNote.goalId || "");
    setTags(activeNote.tags || []);
    setSource(activeNote.source || "manual");
    editor?.commands.setContent(activeNote.content || "<p></p>", false);
  }, [activeNote, editor]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (activeNote) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleSave = async () => {
    if (!activeNote || !editor) {
      return;
    }

    try {
      const response = await updateNote(activeNote.id, {
        title: title.trim() || "Untitled",
        content: editor.getHTML(),
        plainText: editor.getText(),
        tags,
        goalId: goalId || null,
        source,
      });

      if (response.warning) {
        toast.success(response.warning);
      } else {
        toast.success("Note saved.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save note.");
    }
  };

  const handleDelete = async () => {
    if (!activeNote) {
      return;
    }

    if (!window.confirm("Delete this note?")) {
      return;
    }

    try {
      const response = await deleteNote(activeNote.id);
      setActiveNote(null);
      toast.success(response?.warning || "Note deleted.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not delete note.");
    }
  };

  const handleAddTag = () => {
    const normalized = tagDraft.trim();
    if (!normalized || tags.includes(normalized)) {
      setTagDraft("");
      return;
    }

    setTags((current) => [...current, normalized]);
    setTagDraft("");
  };

  const handleAiAction = async (action) => {
    if (!activeNote) {
      return;
    }

    setIsRunningAction(action);

    try {
      const result = await applyAI(activeNote.id, action);

      if (action === "summarize") {
        setSummaryResult(result);
        setSummaryOpen(true);
      }

      if (action === "flashcards") {
        setFlashcards(Array.isArray(result) ? result : []);
        setFlashcardsOpen(true);
      }

      if (action === "expand" || action === "improve") {
        setPendingReplacement({
          action,
          result,
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "AI action failed.");
    } finally {
      setIsRunningAction("");
    }
  };

  const applyReplacement = () => {
    if (!pendingReplacement || !editor) {
      return;
    }

    setLastSnapshot({
      content: editor.getHTML(),
      title,
      tags,
      goalId,
      source,
    });
    editor.commands.setContent(pendingReplacement.result || "<p></p>", false);
    setPendingReplacement(null);
    toast.success("AI changes applied to the editor. Save when you're ready.");
  };

  if (!activeNote) {
    return (
      <section className="glass-panel flex min-h-[720px] items-center justify-center p-6">
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Editor</p>
          <h3 className="text-2xl font-semibold text-text-primary">Open a note to start writing</h3>
          <p className="text-sm text-text-muted">
            Your Tiptap editor, AI actions, and linked-goal metadata will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="glass-panel min-h-[720px] overflow-hidden">
        <div className="border-b border-white/5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Editor</p>
              <p className="mt-1 text-sm text-text-muted">
                Linked to {linkedGoal?.title || "no goal"} · Updated {formatDisplayDate(activeNote.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lastSnapshot ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    editor?.commands.setContent(lastSnapshot.content || "<p></p>", false);
                    setLastSnapshot(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Undo AI edit
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid min-h-[640px] xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="border-b border-white/5 xl:border-b-0 xl:border-r xl:border-white/5">
            <div className="sticky top-20 z-10 border-b border-white/5 bg-surface/95 px-5 py-4 backdrop-blur">
              <div className="flex flex-wrap gap-2">
                <ToolbarButton
                  label="Bold"
                  isActive={editor?.isActive("bold")}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Italic"
                  isActive={editor?.isActive("italic")}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Underline"
                  isActive={editor?.isActive("underline")}
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Strikethrough"
                  isActive={editor?.isActive("strike")}
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="H1"
                  isActive={editor?.isActive("heading", { level: 1 })}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                  <Type className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="H2"
                  isActive={editor?.isActive("heading", { level: 2 })}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                  <span className="text-xs font-semibold">H2</span>
                </ToolbarButton>
                <ToolbarButton
                  label="H3"
                  isActive={editor?.isActive("heading", { level: 3 })}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                  <span className="text-xs font-semibold">H3</span>
                </ToolbarButton>
                <ToolbarButton
                  label="Bullet list"
                  isActive={editor?.isActive("bulletList")}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                >
                  <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Numbered list"
                  isActive={editor?.isActive("orderedList")}
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Task list"
                  isActive={editor?.isActive("taskList")}
                  onClick={() => editor?.chain().focus().toggleTaskList().run()}
                >
                  <ListChecks className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Code block"
                  isActive={editor?.isActive("codeBlock")}
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                >
                  <Code2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Quote"
                  isActive={editor?.isActive("blockquote")}
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                >
                  <Quote className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Highlight"
                  isActive={editor?.isActive("highlight")}
                  onClick={() => editor?.chain().focus().toggleHighlight().run()}
                >
                  <Highlighter className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Link"
                  isActive={editor?.isActive("link")}
                  onClick={() => {
                    const previousUrl = editor?.getAttributes("link").href || "";
                    const url = window.prompt("Enter URL", previousUrl);

                    if (url === null) {
                      return;
                    }

                    if (!url) {
                      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                      return;
                    }

                    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                  }}
                >
                  <Link2 className="h-4 w-4" />
                </ToolbarButton>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="border-0 bg-transparent px-0 text-3xl font-semibold focus:ring-0"
                placeholder="Untitled"
              />

              <div className="min-h-[420px] rounded-3xl border border-white/8 bg-black/10 p-5">
                <EditorContent editor={editor} />
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{editor?.storage.characterCount.characters() || 0} characters</span>
                <span>{editor?.storage.characterCount.words() || 0} words</span>
              </div>

              <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-text-muted">AI Actions</p>
                    <p className="mt-1 text-sm text-text-muted">
                      Summarize, expand, turn into flashcards, or clean up the writing.
                    </p>
                  </div>
                  <Badge variant="accent">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Memory-aware
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleAiAction("summarize")}
                    disabled={Boolean(isRunningAction)}
                  >
                    <Layers2 className="h-4 w-4" />
                    {isRunningAction === "summarize" ? "Summarizing..." : "Summarize"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleAiAction("expand")}
                    disabled={Boolean(isRunningAction)}
                  >
                    <BookOpenText className="h-4 w-4" />
                    {isRunningAction === "expand" ? "Expanding..." : "Expand"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleAiAction("flashcards")}
                    disabled={Boolean(isRunningAction)}
                  >
                    <WandSparkles className="h-4 w-4" />
                    {isRunningAction === "flashcards" ? "Generating..." : "Flashcards"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleAiAction("improve")}
                    disabled={Boolean(isRunningAction)}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isRunningAction === "improve" ? "Improving..." : "Improve"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4 bg-black/10 p-5">
            <button
              type="button"
              onClick={() => setIsMetaOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-left"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Meta</p>
                <p className="mt-1 text-sm text-text-primary">Goal link, tags, source, timestamps</p>
              </div>
              <ChevronRight
                className={cn("h-4 w-4 text-text-muted transition", isMetaOpen ? "rotate-90" : "")}
              />
            </button>

            {isMetaOpen ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-text-muted">
                    Linked Goal
                  </label>
                  <Select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
                    <SelectItem value="">No linked goal</SelectItem>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Tags</label>
                  <div className="flex gap-2">
                    <Input
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      placeholder="Type tag and hit Enter"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button variant="secondary" size="sm" onClick={handleAddTag}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.length ? (
                      tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-text-primary"
                        >
                          #{tag} ×
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-text-muted">No tags yet.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Source</label>
                  <Select value={source} onChange={(event) => setSource(event.target.value)}>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="reddit">Reddit</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </Select>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm">
                  <p className="text-text-primary">
                    Created <span className="text-text-muted">{formatDisplayDate(activeNote.createdAt)}</span>
                  </p>
                  <p className="text-text-primary">
                    Updated <span className="text-text-muted">{formatDisplayDate(activeNote.updatedAt)}</span>
                  </p>
                </div>

                <Textarea
                  value={editor?.getText() || ""}
                  readOnly
                  className="min-h-[160px] resize-none text-xs"
                />
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>3-Bullet Summary</DialogTitle>
            <DialogDescription>
              Quick recap of the note, ready to copy or share.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 whitespace-pre-wrap text-sm leading-6 text-text-primary">
            {summaryResult}
          </div>
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(summaryResult);
              toast.success("Summary copied.");
            }}
          >
            Copy summary
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingReplacement)} onOpenChange={(open) => !open && setPendingReplacement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply AI rewrite?</DialogTitle>
            <DialogDescription>
              This will replace the current editor content. You can still undo the last AI edit once.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-text-muted">
            Action: <span className="font-medium text-text-primary">{pendingReplacement?.action}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingReplacement(null)}>
              Cancel
            </Button>
            <Button onClick={applyReplacement}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      <FlashcardViewer open={flashcardsOpen} onOpenChange={setFlashcardsOpen} flashcards={flashcards} />
    </>
  );
}

export default NoteEditor;
