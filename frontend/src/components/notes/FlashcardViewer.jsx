import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function FlashcardViewer({ open, onOpenChange, flashcards = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownMap, setKnownMap] = useState({});

  const activeCard = useMemo(() => flashcards[activeIndex] || null, [activeIndex, flashcards]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        setActiveIndex((current) => Math.min(flashcards.length - 1, current + 1));
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => Math.max(0, current - 1));
      }

      if (event.key === " ") {
        event.preventDefault();
        setIsFlipped((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flashcards.length, open]);

  useEffect(() => {
    setActiveIndex(0);
    setIsFlipped(false);
  }, [flashcards, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Flashcard Viewer</DialogTitle>
          <DialogDescription>
            Review one card at a time. Use the arrow keys to navigate and space to flip.
          </DialogDescription>
        </DialogHeader>

        {activeCard ? (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="accent">
                Card {activeIndex + 1} of {flashcards.length}
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsFlipped(false)}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button variant="secondary" size="sm" disabled>
                  <Download className="h-4 w-4" />
                  Export as Anki
                </Button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFlipped((current) => !current)}
              className="group relative h-[420px] w-full [perspective:1200px]"
            >
              <div
                className={cn(
                  "relative h-full w-full rounded-[32px] border border-white/10 bg-black/20 shadow-[0_20px_80px_rgba(0,0,0,0.35)] transition duration-500 [transform-style:preserve-3d]",
                  isFlipped ? "[transform:rotateY(180deg)]" : "",
                )}
              >
                <div className="absolute inset-0 flex [backface-visibility:hidden] flex-col justify-between rounded-[32px] p-8 text-left">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-text-muted">Front</p>
                    <p className="mt-6 text-3xl font-semibold leading-tight text-text-primary">
                      {activeCard.front}
                    </p>
                  </div>
                  <p className="text-sm text-text-muted">
                    Click the card or press space to reveal the answer.
                  </p>
                </div>

                <div className="absolute inset-0 flex [backface-visibility:hidden] [transform:rotateY(180deg)] flex-col justify-between rounded-[32px] bg-accent/10 p-8 text-left">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-accent">Back</p>
                    <p className="mt-6 text-xl leading-8 text-text-primary">{activeCard.back}</p>
                  </div>
                  <p className="text-sm text-text-muted">Mark how well you know this card below.</p>
                </div>
              </div>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                  disabled={activeIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setActiveIndex((current) => Math.min(flashcards.length - 1, current + 1))
                  }
                  disabled={activeIndex === flashcards.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setKnownMap((current) => ({
                      ...current,
                      [activeIndex]: "learning",
                    }))
                  }
                >
                  Still learning
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setKnownMap((current) => ({
                      ...current,
                      [activeIndex]: "known",
                    }))
                  }
                >
                  Mark as known
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {flashcards.map((card, index) => (
                <button
                  key={`${card.front}-${index}`}
                  type="button"
                  onClick={() => {
                    setActiveIndex(index);
                    setIsFlipped(false);
                  }}
                  className={cn(
                    "h-2 w-10 rounded-full transition",
                    index === activeIndex ? "bg-accent" : "bg-white/10",
                    knownMap[index] === "known" ? "ring-2 ring-chatgpt/60" : "",
                    knownMap[index] === "learning" ? "ring-2 ring-warning/60" : "",
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-6 py-14 text-center text-sm text-text-muted">
            No flashcards were generated yet.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FlashcardViewer;
