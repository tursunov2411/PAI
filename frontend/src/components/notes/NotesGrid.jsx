import { useMemo, useState } from "react";
import { CopyPlus, LayoutGrid, List, Link2, Pin, PinOff, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import useNoteStore from "@/store/useNoteStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, getNoteSourceMeta, stripHtml } from "@/lib/utils";

function NotesGrid({ goals = [] }) {
  const notes = useNoteStore((state) => state.notes);
  const activeNote = useNoteStore((state) => state.activeNote);
  const filters = useNoteStore((state) => state.filters);
  const total = useNoteStore((state) => state.total);
  const isLoading = useNoteStore((state) => state.isLoading);
  const setFilter = useNoteStore((state) => state.setFilter);
  const setActiveNote = useNoteStore((state) => state.setActiveNote);
  const createNote = useNoteStore((state) => state.createNote);
  const deleteNote = useNoteStore((state) => state.deleteNote);
  const pinNote = useNoteStore((state) => state.pinNote);
  const [contextMenu, setContextMenu] = useState(null);

  const pageCount = Math.max(1, Math.ceil(total / (filters.limit || 20)));

  const emptyState = useMemo(() => {
    if (filters.search) {
      return "No notes matched your search yet. Try a broader phrase or semantic keyword.";
    }

    return "Create your first note to start building an AI-searchable knowledge base.";
  }, [filters.search]);

  const closeContextMenu = () => setContextMenu(null);

  const handleDuplicate = async (note) => {
    try {
      await createNote({
        title: `${note.title} (Copy)`,
        content: note.content,
        plainText: note.plainText,
        tags: note.tags,
        goalId: note.goal?.id || null,
        source: note.source,
      });
      toast.success("Note duplicated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not duplicate note.");
    }
  };

  return (
    <section className="glass-panel relative overflow-hidden p-4" onClick={closeContextMenu}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Week 3 Live</p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">Rich Notes</h2>
          <p className="mt-1 text-sm text-text-muted">
            Semantic notes, goal-linked capture, and AI-powered rewrites in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filters.view === "grid" ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter({ view: "grid" })}
          >
            <LayoutGrid className="h-4 w-4" />
            Grid
          </Button>
          <Button
            variant={filters.view === "list" ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter({ view: "list" })}
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-12 text-center text-sm text-text-muted">
          Loading notes...
        </div>
      ) : notes.length ? (
        <>
          {filters.view === "grid" ? (
            <div className="columns-1 gap-4 md:columns-2">
              {notes.map((note) => {
                const sourceMeta = getNoteSourceMeta(note.source);
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setActiveNote(note)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({
                        note,
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }}
                    className={`mb-4 inline-block w-full break-inside-avoid rounded-3xl border p-4 text-left transition ${
                      activeNote?.id === note.id
                        ? "border-accent/30 bg-accent/10"
                        : "border-white/8 bg-black/20 hover:border-white/12 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="line-clamp-2 text-lg font-semibold text-text-primary">
                          {note.title}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {formatRelativeTime(note.updatedAt)}
                        </p>
                      </div>
                      {note.isPinned ? <Pin className="h-4 w-4 text-accent" /> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className={sourceMeta.className}>{sourceMeta.label}</Badge>
                      {note.goalTitle ? <Badge>{note.goalTitle}</Badge> : null}
                      {note.semanticScore ? (
                        <Badge variant="accent">Match {Math.round(note.semanticScore * 100)}%</Badge>
                      ) : null}
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-text-muted">
                      {stripHtml(note.content || note.plainText)}
                    </p>

                    {note.tags?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {note.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-xs text-text-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => {
                const sourceMeta = getNoteSourceMeta(note.source);
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setActiveNote(note)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({
                        note,
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }}
                    className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
                      activeNote?.id === note.id
                        ? "border-accent/30 bg-accent/10"
                        : "border-white/8 bg-black/20 hover:border-white/12 hover:bg-white/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-text-primary">{note.title}</p>
                        <Badge className={sourceMeta.className}>{sourceMeta.label}</Badge>
                        {note.goalTitle ? <Badge>{note.goalTitle}</Badge> : null}
                      </div>
                      <p className="mt-1 truncate text-sm text-text-muted">
                        {stripHtml(note.content || note.plainText)}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-text-muted">
                      {formatRelativeTime(note.updatedAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <p className="text-sm text-text-muted">
              Page {filters.page} of {pageCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() =>
                  setFilter({
                    page: Math.max(1, filters.page - 1),
                  })
                }
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page >= pageCount}
                onClick={() =>
                  setFilter({
                    page: Math.min(pageCount, filters.page + 1),
                  })
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-5 py-14 text-center text-sm text-text-muted">
          {emptyState}
        </div>
      )}

      {contextMenu ? (
        <div
          className="fixed z-50 w-56 rounded-2xl border border-white/10 bg-surface p-2 shadow-2xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            type="button"
            onClick={async () => {
              closeContextMenu();
              await pinNote(contextMenu.note.id);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-text-primary transition hover:bg-white/5"
          >
            {contextMenu.note.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {contextMenu.note.isPinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              setActiveNote(contextMenu.note);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-text-primary transition hover:bg-white/5"
          >
            <Link2 className="h-4 w-4" />
            {contextMenu.note.goalTitle ? "Open linked goal note" : "Link to goal"}
          </button>
          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              handleDuplicate(contextMenu.note);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-text-primary transition hover:bg-white/5"
          >
            <CopyPlus className="h-4 w-4" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={async () => {
              closeContextMenu();
              if (window.confirm("Delete this note?")) {
                try {
                  await deleteNote(contextMenu.note.id);
                  toast.success("Note deleted.");
                } catch (error) {
                  toast.error(error?.response?.data?.message || "Could not delete note.");
                }
              }
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-error transition hover:bg-error/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default NotesGrid;
