import { useEffect } from "react";
import toast from "react-hot-toast";
import NotesSidebar from "@/components/notes/NotesSidebar";
import NotesGrid from "@/components/notes/NotesGrid";
import NoteEditor from "@/components/notes/NoteEditor";
import useGoalStore from "@/store/useGoalStore";
import useNoteStore from "@/store/useNoteStore";

function Notes() {
  const goals = useGoalStore((state) => state.goals);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);
  const filters = useNoteStore((state) => state.filters);
  const createNote = useNoteStore((state) => state.createNote);
  const fetchNotes = useNoteStore((state) => state.fetchNotes);
  const fetchTags = useNoteStore((state) => state.fetchTags);

  useEffect(() => {
    fetchGoals({
      status: "",
      category: "",
      priority: "",
    }).catch(() => {
      // Goals already have their own page-level messaging.
    });

    fetchTags().catch(() => {
      // Tag fetch failure is surfaced elsewhere if needed.
    });
  }, [fetchGoals, fetchTags]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchNotes().catch((error) => {
        toast.error(error?.response?.data?.message || "Could not load notes.");
      });
    }, filters.search ? 350 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    fetchNotes,
    filters.goalId,
    filters.isPinned,
    filters.limit,
    filters.page,
    filters.search,
    filters.tag,
  ]);

  const handleNewNote = async () => {
    try {
      const response = await createNote({
        title: "Untitled",
        content: "<p></p>",
        plainText: "Untitled",
        tags: [],
        source: "manual",
      });
      toast.success(response.warning || "New note created.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not create a note.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_360px]">
      <NotesSidebar goals={goals} onNewNote={handleNewNote} />
      <NotesGrid goals={goals} />
      <NoteEditor />
    </div>
  );
}

export default Notes;
