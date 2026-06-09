import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { StudentHeader } from "../_components/StudentHeader";
import { supabaseServer } from "@/lib/supabase/server";

type CourseRow = {
  id: string;
  slug: string | null;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  status: string | null;
  is_featured: boolean | null;
  required_rank: number | null;
};

type CourseMapRow = {
  course_id: string;
  category_id: string;
};

type ModuleRow = {
  id: string;
  course_id: string;
  sort_order: number | null;
  status: string | null;
};

type LessonRow = {
  id: string;
  module_id: string;
  duration_sec: number | null;
  sort_order: number | null;
  status: string | null;
};

function resolvePublicAssetUrl(path: string | null | undefined) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!supabaseUrl) return "";

  const cleanPath = path.replace(/^\/+/, "");

  return `${supabaseUrl}/storage/v1/object/public/covers/${cleanPath}`;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "Conteúdo liberado";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}min`;
}

function getFallbackDescription(value: string | null | undefined, fallback: string) {
  const text = value?.trim();

  return text && text.length > 0 ? text : fallback;
}

function getCourseCover(course: CourseRow) {
  return (
    course.cover_vertical_path ||
    course.cover_featured_path ||
    course.cover_horizontal_path ||
    course.cover_path
  );
}

export default async function StudentCoursesPage() {
  const supabase = await supabaseServer();

  const [{ data: coursesData }, { data: courseMapData }] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id,slug,title,short_description,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,status,is_featured,required_rank"
      )
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false }),
    supabase
      .from("course_category_map")
      .select("course_id,category_id"),
  ]);

  const allCourses = (coursesData ?? []) as CourseRow[];
  const mappedCourseIds = new Set(
    ((courseMapData ?? []) as CourseMapRow[]).map((item) => item.course_id)
  );

  const courses = allCourses.filter((course) => !mappedCourseIds.has(course.id));
  const courseIds = courses.map((course) => course.id);

  const { data: modulesData } =
    courseIds.length > 0
      ? await supabase
          .from("course_modules")
          .select("id,course_id,sort_order,status")
          .in("course_id", courseIds)
          .eq("status", "published")
          .order("sort_order", { ascending: true })
      : { data: [] };

  const modules = (modulesData ?? []) as ModuleRow[];
  const moduleIds = modules.map((module) => module.id);

  const { data: lessonsData } =
    moduleIds.length > 0
      ? await supabase
          .from("lessons")
          .select("id,module_id,duration_sec,sort_order,status")
          .in("module_id", moduleIds)
          .eq("status", "published")
          .order("sort_order", { ascending: true })
      : { data: [] };

  const lessons = (lessonsData ?? []) as LessonRow[];

  const modulesByCourse = new Map<string, ModuleRow[]>();
  const lessonsByModule = new Map<string, LessonRow[]>();

  modules.forEach((module) => {
    const currentModules = modulesByCourse.get(module.course_id) ?? [];
    currentModules.push(module);
    modulesByCourse.set(module.course_id, currentModules);
  });

  lessons.forEach((lesson) => {
    const currentLessons = lessonsByModule.get(lesson.module_id) ?? [];
    currentLessons.push(lesson);
    lessonsByModule.set(lesson.module_id, currentLessons);
  });

  function getCourseLessons(courseId: string) {
    const courseModules = modulesByCourse.get(courseId) ?? [];

    return courseModules.flatMap((module) => lessonsByModule.get(module.id) ?? []);
  }

  function getCourseTargetUrl(courseId: string) {
    const courseLessons = getCourseLessons(courseId);

    if (courseLessons.length > 0) {
      return `/aluno/aulas/${courseLessons[0].id}`;
    }

    return "/aluno/cursos";
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <section className="px-5 pb-16 pt-[116px] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#DBC094]">
                Biblioteca
              </p>

              <h1 className="mt-3 text-[36px] font-black leading-none tracking-[-0.06em] text-white sm:text-[52px]">
                Cursos
              </h1>

              <p className="mt-4 max-w-[720px] text-[15px] leading-7 text-white/56">
                Cursos independentes publicados pelo ADM, sem vínculo com uma trilha.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-black text-white/58">
              {courses.length} curso(s)
            </div>
          </div>

          {courses.length === 0 ? (
            <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#101116] p-8 text-center">
              <BookOpen className="h-12 w-12 text-[#DBC094]" />

              <h2 className="mt-5 text-[28px] font-black tracking-[-0.05em]">
                Nenhum curso independente publicado
              </h2>

              <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-white/48">
                Cursos vinculados a trilhas aparecem dentro de suas respectivas trilhas. Aqui serão exibidos apenas cursos publicados que não pertencem a nenhuma trilha.
              </p>
            </section>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {courses.map((course) => {
                const imageUrl = resolvePublicAssetUrl(getCourseCover(course));
                const courseLessons = getCourseLessons(course.id);
                const duration = courseLessons.reduce(
                  (total, lesson) => total + (lesson.duration_sec ?? 0),
                  0
                );

                return (
                  <Link
                    key={course.id}
                    href={getCourseTargetUrl(course.id)}
                    className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#101116] transition duration-300 hover:-translate-y-1 hover:border-[#DBC094]/45 hover:shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[linear-gradient(135deg,#2d2414,#050609)]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={course.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      ) : null}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                      {course.is_featured ? (
                        <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                          Destaque
                        </span>
                      ) : null}

                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                          Curso
                        </p>

                        <h2 className="mt-2 text-[24px] font-black leading-[1.02] tracking-[-0.05em]">
                          {course.title}
                        </h2>

                        <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-white/58">
                          {getFallbackDescription(
                            course.short_description ?? course.description,
                            "Acesse os módulos e aulas deste curso."
                          )}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/64">
                            {courseLessons.length} aula(s)
                          </span>

                          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/64">
                            {formatDuration(duration)}
                          </span>
                        </div>

                        <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-black text-[#DBC094]">
                          Abrir curso
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
