import { supabaseServer } from "@/lib/supabase/server";

export type CourseCard = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  cover_path: string | null;
  required_rank: number;
};

export async function getPublishedCourses(): Promise<CourseCard[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("courses")
    .select("id,slug,title,short_description,cover_path,required_rank")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseCard[];
}
