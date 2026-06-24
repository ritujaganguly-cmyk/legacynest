import { Link } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { CHAPTERS } from "@/lib/journey";

/**
 * Slim contextual banner shown at the top of each section page.
 * Tells the user which chapter they're on in the journey.
 * Clicking it takes them back to the dashboard journey map.
 */
export function ChapterBanner({ chapterKey }: { chapterKey: string }) {
  const chapter = CHAPTERS.find((c) => c.key === chapterKey);
  if (!chapter) return null;

  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/10 transition-colors group"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Map className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-primary">
          Chapter {chapter.num} of {CHAPTERS.length} · Your Journey
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {chapter.why}
        </div>
      </div>
      <span className="text-xs text-primary/60 group-hover:text-primary transition-colors whitespace-nowrap">
        View map →
      </span>
    </Link>
  );
}
