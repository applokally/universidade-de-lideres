import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Play,
} from "lucide-react";
import { StudentHeader } from "../../_components/StudentHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type TrailRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  status: string | null;
};

type CourseMapRow = {
  course_id: string;
  category_id: string;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  status: string;
};

type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: string;
};

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: string;
  content_type: string;
  duration_sec: number | null;
  is_preview: boolean;
  primary_asset_path: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

function normalizeStoragePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^public\//, "")
    .replace(/^covers\//, "")
    .replace(/^course-covers\//, "");
}

function buildSupabasePublicUrl(bucket: string, path: string) {
  if (!supabaseUrl || !path) return undefined;

  const normalizedPath = normalizeStoragePath(path);

  if (!normalizedPath) return undefined;

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURI(
    normalizedPath
  ).replace(/%2F/g, "/")}`;
}

function resolvePublicAssetUrl(path: string | null) {
  if (!path) return undefined;

  const cleanPath = path.trim();

  if (!cleanPath) return undefined;

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }

  const withoutSlash = cleanPath.replace(/^\/+/, "");

  if (
    withoutSlash.startsWith("courses/") ||
    withoutSlash.startsWith("trilhas/") ||
    withoutSlash.startsWith("covers/") ||
    withoutSlash.startsWith("course-covers/")
  ) {
    return buildSupabasePublicUrl("covers", withoutSlash);
  }

  if (withoutSlash.startsWith("materials/")) {
    return buildSupabasePublicUrl("materials", withoutSlash);
  }

  if (withoutSlash.startsWith("public/")) {
    return `/${withoutSlash.replace(/^public\//, "")}`;
  }

  return `/${withoutSlash}`;
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "Aula";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}min`;
}

function getTrailCover(trail: TrailRow) {
  return (
    trail.cover_horizontal_path ||
    trail.cover_featured_path ||
    trail.cover_path ||
    trail.cover_vertical_path
  );
}

function getCourseVerticalCover(course: CourseRow) {
  return (
    course.cover_vertical_path ||
    course.cover_featured_path ||
    course.cover_path ||
    course.cover_horizontal_path
  );
}

function getCourseHorizontalCover(course: CourseRow) {
  return (
    course.cover_horizontal_path ||
    course.cover_featured_path ||
    course.cover_path ||
    course.cover_vertical_path
  );
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const supabase = getSupabaseClient();

  const { data: trailData } = await supabase
    .from("course_categories")
    .select(
      "id,title,slug,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,status"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const trail = trailData as TrailRow | null;

  if (!trail) {
    return (
      <main className="min-h-screen bg-[#050609] text-white">
        <StudentHeader />

        <section className="flex min-h-screen items-center justify-center px-6 pt-[110px] text-center">
          <div className="max-w-[620px]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#DBC094]">
              Trilha não encontrada
            </p>

            <h1 className="mt-4 text-[42px] font-black tracking-[-0.06em] text-white sm:text-[58px]">
              Este conteúdo não está disponível.
            </h1>

            <p className="mt-5 text-[17px] leading-7 text-white/68">
              A trilha pode estar indisponível, arquivada ou ainda não publicada.
            </p>

            <Link
              href="/aluno"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-[10px] bg-white px-5 text-[15px] font-black text-black transition hover:bg-white/86"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { data: mapData } = await supabase
    .from("course_category_map")
    .select("course_id,category_id")
    .eq("category_id", trail.id);

  const courseMaps = (mapData ?? []) as CourseMapRow[];
  const courseIds = courseMaps.map((item) => item.course_id);

  const { data: coursesData } =
    courseIds.length > 0
      ? await supabase
          .from("courses")
          .select(
            "id,slug,title,short_description,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,status"
          )
          .in("id", courseIds)
          .eq("status", "published")
      : { data: [] };

  const unsortedCourses = (coursesData ?? []) as CourseRow[];
  const courseOrder = new Map(
    courseIds.map((courseId, index) => [courseId, index])
  );
  const courses = [...unsortedCourses].sort(
    (a, b) =>
      (courseOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (courseOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
  const publishedCourseIds = courses.map((course) => course.id);

  const { data: modulesData } =
    publishedCourseIds.length > 0
      ? await supabase
          .from("course_modules")
          .select("id,course_id,title,description,sort_order,status")
          .in("course_id", publishedCourseIds)
          .eq("status", "published")
          .order("sort_order", { ascending: true })
      : { data: [] };

  const modules = (modulesData ?? []) as ModuleRow[];
  const moduleIds = modules.map((module) => module.id);

  const { data: lessonsData } =
    moduleIds.length > 0
      ? await supabase
          .from("lessons")
          .select(
            "id,module_id,title,description,sort_order,status,content_type,duration_sec,is_preview,primary_asset_path"
          )
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

  const firstLessonByCourse = new Map<string, LessonRow>();
  const lessonCountByCourse = new Map<string, number>();
  const durationByCourse = new Map<string, number>();

  courses.forEach((course) => {
    const courseModules = modulesByCourse.get(course.id) ?? [];
    const courseLessons = courseModules.flatMap(
      (module) => lessonsByModule.get(module.id) ?? []
    );

    if (courseLessons.length > 0) {
      firstLessonByCourse.set(course.id, courseLessons[0]);
    }

    lessonCountByCourse.set(course.id, courseLessons.length);
    durationByCourse.set(
      course.id,
      courseLessons.reduce(
        (total, lesson) => total + (lesson.duration_sec ?? 0),
        0
      )
    );
  });

  const firstCourseWithLesson = courses.find((course) =>
    firstLessonByCourse.has(course.id)
  );
  const firstLesson = firstCourseWithLesson
    ? firstLessonByCourse.get(firstCourseWithLesson.id) ?? null
    : null;

  const trailCoverUrl = resolvePublicAssetUrl(getTrailCover(trail));

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <section className="relative min-h-[620px] overflow-hidden pt-[74px]">
        {trailCoverUrl ? (
          <img
            src={trailCoverUrl}
            alt={trail.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1d1510] via-[#10131d] to-[#050609]" />
        )}

        <div className="absolute inset-0 bg-[linear-gradient(90deg,#050609_0%,rgba(5,6,9,0.94)_26%,rgba(5,6,9,0.62)_52%,rgba(5,6,9,0.18)_78%,rgba(5,6,9,0.84)_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-[260px] bg-gradient-to-t from-[#050609] via-[#050609]/90 to-transparent" />

        <div className="relative z-10 flex min-h-[546px] items-center px-5 sm:px-8 lg:px-10">
          <div className="max-w-[760px] pt-16">
            <div className="mb-7 flex flex-wrap items-center gap-4">
              <Link
                href="/aluno"
                className="inline-flex items-center gap-2 text-[14px] font-black text-white/70 transition hover:text-[#DBC094]"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para a home
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-[#DBC094]/30 bg-[#DBC094]/12 px-4 py-2 text-[14px] font-bold text-[#f1d7a5] backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#DBC094]" />
                Trilha
              </div>
            </div>

            <h1 className="max-w-[720px] text-[50px] font-black leading-[0.94] tracking-[-0.06em] text-white sm:text-[66px] lg:text-[78px]">
              {trail.title}
            </h1>

            {trail.description ? (
              <p className="mt-7 max-w-[620px] text-[18px] font-medium leading-[1.55] text-white/78 sm:text-[20px]">
                {trail.description}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap items-center gap-3 text-[14px] font-bold text-white/82">
              <span className="rounded-full bg-white/14 px-3 py-1.5">
                {courses.length} curso(s)
              </span>

              <span className="rounded-full bg-white/14 px-3 py-1.5">
                {lessons.length} aula(s)
              </span>

              <span className="rounded-full bg-[#DBC094] px-3 py-1.5 text-black">
                Disponível para você
              </span>
            </div>

            {firstLesson ? (
              <Link
                href={`/aluno/aulas/${firstLesson.id}`}
                className="mt-9 inline-flex h-14 items-center gap-3 rounded-[10px] bg-white px-6 text-[17px] font-black text-black transition hover:bg-white/86"
              >
                <Play size={24} fill="currentColor" strokeWidth={2.4} />
                Começar trilha
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="relative z-20 px-5 pb-28 sm:px-8 lg:px-10">
        {courses.length === 0 ? (
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-8 text-center">
            <h2 className="text-[28px] font-black tracking-[-0.04em]">
              Nenhum conteúdo publicado nesta trilha.
            </h2>

            <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-7 text-white/62">
              Assim que os cursos, módulos e aulas forem publicados no ADM, eles
              aparecerão automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.28em] text-[#DBC094]">
                  Cursos da trilha
                </p>

                <h2 className="mt-2 text-[32px] font-black tracking-[-0.055em] text-white sm:text-[42px]">
                  Continue pela jornada
                </h2>
              </div>

            </div>

            <div className="-mx-5 overflow-x-auto px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
              <div className="flex w-max gap-5">
                {courses.map((course) => {
                  const courseCoverUrl = resolvePublicAssetUrl(
                    getCourseVerticalCover(course)
                  );
                  const courseHoverUrl = resolvePublicAssetUrl(
                    getCourseHorizontalCover(course)
                  );
                  const courseModules = modulesByCourse.get(course.id) ?? [];
                  const courseLessonCount = lessonCountByCourse.get(course.id) ?? 0;
                  const courseDuration = durationByCourse.get(course.id) ?? 0;
                  const firstCourseLesson = firstLessonByCourse.get(course.id);
                  const href = firstCourseLesson
                    ? `/aluno/aulas/${firstCourseLesson.id}`
                    : "#";

                  return (
                    <Link
                      key={course.id}
                      href={href}
                      aria-disabled={!firstCourseLesson}
                      className="group relative h-[520px] w-[280px] shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-[#101116] shadow-[0_22px_70px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-1 hover:border-[#DBC094]/50 sm:w-[310px]"
                    >
                      {courseCoverUrl ? (
                        <img
                          src={courseCoverUrl}
                          alt={course.title}
                          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#4d3e26] via-[#18191f] to-black" />
                      )}

                      {courseHoverUrl ? (
                        <img
                          src={courseHoverUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 group-hover:scale-[1.05] group-hover:opacity-100"
                        />
                      ) : null}

                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.2)_34%,rgba(0,0,0,0.92)_100%)]" />
                      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />

                      <div className="absolute right-4 top-4 rounded-[8px] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[-0.02em] text-black">
                        Curso
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DBC094] px-3 py-1 text-[12px] font-black text-black">
                            <BookOpen className="h-3.5 w-3.5" />
                            {courseModules.length} módulo(s)
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-3 py-1 text-[12px] font-bold text-white">
                            <Clock3 className="h-3.5 w-3.5" />
                            {courseDuration > 0
                              ? formatDuration(courseDuration)
                              : `${courseLessonCount} aula(s)`}
                          </span>
                        </div>

                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#DBC094]">
                          Curso / Trilha
                        </p>

                        <h3 className="mt-2 text-[27px] font-black leading-[0.98] tracking-[-0.055em] text-white">
                          {course.title}
                        </h3>

                        <p className="mt-3 line-clamp-3 text-[14px] font-medium leading-6 text-white/68">
                          {course.short_description ||
                            course.description ||
                            "Conteúdo disponível dentro desta trilha."}
                        </p>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <span className="text-[13px] font-black text-white/78">
                            {courseLessonCount} aula(s)
                          </span>

                          <span
                            className={
                              firstCourseLesson
                                ? "inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-black text-black transition group-hover:bg-[#DBC094]"
                                : "inline-flex h-11 items-center gap-2 rounded-[10px] bg-white/12 px-4 text-[14px] font-black text-white/45"
                            }
                          >
                            {firstCourseLesson ? "Assistir" : "Em breve"}
                            {firstCourseLesson ? (
                              <Play className="h-4 w-4" fill="currentColor" />
                            ) : null}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
