import { Link } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CHAPTERS } from "@/lib/journey";

export function ChapterBanner({ chapterKey, sectionKey }: { chapterKey: string; sectionKey?: string }) {
  const chapter = CHAPTERS.find((c) => c.key === chapterKey);
  // sectionKey is what's stored in plan_progress; falls back to chapterKey when they match
  const progressKey = sectionKey ?? chapterKey;

  const { data: progress } = useQuery({
    queryKey: ["plan_progress", progressKey],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("plan_progress")
        .select("is_complete")
        .eq("user_id", user.id)
        .eq("section", progressKey)
        .maybeSingle();
      return data;
    },
    staleTime: 60 * 1000,
  });

  // Hide banner once the chapter is marked complete
  if (!chapter || progress?.is_complete) return null;

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
