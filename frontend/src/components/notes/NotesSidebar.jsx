import { Plus, Search, StickyNote } from "lucide-react";
import useNoteStore from "@/store/useNoteStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

function NotesSidebar({ goals = [], onNewNote }) {
  const notes = useNoteStore((state) => state.notes);
  const activeNote = useNoteStore((state) => state.activeNote);
  const tags = useNoteStore((state) => state.tags);
  const filters = useNoteStore((state) => state.filters);
  const setFilter = useNoteStore((state) => state.setFilter);
  const setActiveNote = useNoteStore((state) => state.setActiveNote);

  const pinnedNotes = notes.filter((note) => note.isPinned).slice(0, 6);

  return (
    <aside className="glass-panel h-fit space-y-5 p-4">
      <Button className="w-full" onClick={onNewNote}>
        <Plus className="h-4 w-4" />
        New Note
      </Button>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Search</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={filters.search}
            onChange={(event) =>
              setFilter({
                search: event.target.value,
                page: 1,
              })
            }
            className="pl-10"
            placeholder="Search notes"
          />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Pinned</p>
          <Badge>{pinnedNotes.length}</Badge>
        </div>

        {pinnedNotes.length ? (
          <div className="space-y-2">
            {pinnedNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setActiveNote(note)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                  activeNote?.id === note.id
                    ? "border-accent/30 bg-accent/10"
                    : "border-white/8 bg-black/20 hover:border-white/12 hover:bg-white/5"
                }`}
              >
                <p className="truncate text-sm font-medium text-text-primary">{note.title}</p>
                <p className="mt-1 text-xs text-text-muted">{formatRelativeTime(note.updatedAt)}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-text-muted">
            Pin important notes to keep them close.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Tags</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() =>
              setFilter({
                tag: "",
                page: 1,
              })
            }
            className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
              !filters.tag
                ? "bg-accent/10 text-text-primary"
                : "bg-black/20 text-text-muted hover:bg-white/5 hover:text-text-primary"
            }`}
          >
            <span>All tags</span>
            <Badge>{tags.reduce((sum, item) => sum + item.count, 0)}</Badge>
          </button>

          {tags.map((tag) => (
            <button
              key={tag.tag}
              type="button"
              onClick={() =>
                setFilter({
                  tag: tag.tag,
                  page: 1,
                })
              }
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
                filters.tag === tag.tag
                  ? "bg-accent/10 text-text-primary"
                  : "bg-black/20 text-text-muted hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <span className="truncate">{tag.tag}</span>
              <Badge>{tag.count}</Badge>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Linked Goals</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() =>
              setFilter({
                goalId: "",
                page: 1,
              })
            }
            className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
              !filters.goalId
                ? "bg-accent/10 text-text-primary"
                : "bg-black/20 text-text-muted hover:bg-white/5 hover:text-text-primary"
            }`}
          >
            <span>All goals</span>
          </button>

          {goals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() =>
                setFilter({
                  goalId: goal.id,
                  page: 1,
                })
              }
              className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                filters.goalId === goal.id
                  ? "bg-accent/10 text-text-primary"
                  : "bg-black/20 text-text-muted hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                <span className="truncate text-sm font-medium">{goal.title}</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">{goal.category}</p>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default NotesSidebar;
