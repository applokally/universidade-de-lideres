import { supabaseBrowser } from "@/lib/supabase/browser";
import { CatalogItem, getItemTitle } from "./assessmentHelpers";

type SupabaseClient = ReturnType<typeof supabaseBrowser>;

async function loadFromCandidates(supabase: SupabaseClient, tables: string[]) {
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(500);

    if (!error && Array.isArray(data)) {
      return data
        .map((row) => {
          const item = row as Record<string, unknown>;
          if (typeof item.id !== "string") return null;
          return { id: item.id, title: getItemTitle(item) } satisfies CatalogItem;
        })
        .filter((item): item is CatalogItem => Boolean(item))
        .sort((a, b) => a.title.localeCompare(b.title));
    }
  }
  return [];
}

export function loadCourseCatalog(supabase: SupabaseClient) {
  return loadFromCandidates(supabase, ["courses", "ead_courses", "student_courses", "course"]);
}

export function loadTrailCatalog(supabase: SupabaseClient) {
  return loadFromCandidates(supabase, ["trails", "learning_tracks", "course_trails", "tracks"]);
}

export function loadLessonCatalog(supabase: SupabaseClient) {
  return loadFromCandidates(supabase, ["lessons", "course_lessons", "modules_lessons", "ead_lessons"]);
}
