import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const COURSE_COVERS_BUCKET = "covers";

type LessonProgressRow = {
  id: string;
  lesson_id: string;
  student_id: string;
  progress_seconds: number | null;
  completed_at: string | null;
  last_watched_at: string | null;
  updated_at?: string | null;
};

type LessonRow = {
  id: string;
  module_id: string | null;
  title: string | null;
  description: string | null;
  duration_sec: number | null;
  sort_order: number | null;
  status: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string | null;
  title: string | null;
  sort_order: number | null;
};

type CourseRow = {
  id: string;
  slug: string | null;
  title: string | null;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  preferred_card_format: string | null;
};

function createStudentSupabaseClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

function getPublicCoverUrl(path: string | null) {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.replace(/^\/+/, "");

  if (cleanPath.startsWith("public/")) {
    return `/${cleanPath.replace(/^public\//, "")}`;
  }

  const cookieStorePromise = cookies();

  void cookieStorePromise;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });

  const { data } = supabase.storage
    .from(COURSE_COVERS_BUCKET)
    .getPublicUrl(cleanPath.replace(/^covers\//, ""));

  return data.publicUrl || null;
}

function calculateProgressPercent(progress: LessonProgressRow, lesson: LessonRow) {
  if (progress.completed_at) return 100;

  const duration = Number(lesson.duration_sec ?? 0);
  const watched = Number(progress.progress_seconds ?? 0);

  if (duration > 0 && watched > 0) {
    return Math.max(1, Math.min(99, Math.round((watched / duration) * 100)));
  }

  return watched > 0 ? 5 : 1;
}

function formatLessonLabel(lesson: LessonRow) {
  const order = Number(lesson.sort_order ?? 0);
  const aulaLabel =
    order > 0 ? `Aula ${String(order).padStart(2, "0")}` : "Aula";

  return `${aulaLabel} • ${lesson.title?.trim() || "Aula sem título"}`;
}

function selectCourseCover(course: CourseRow) {
  return (
    course.cover_featured_path ||
    course.cover_vertical_path ||
    course.cover_horizontal_path ||
    course.cover_path ||
    null
  );
}

async function getStudentContext(lessonId?: string, lessonIds: string[] = []) {
  const cookieStore = await cookies();
  const supabase = createStudentSupabaseClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      supabase,
      user: null,
      profile: null,
      progress: null,
      progresses: [],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,full_name,phone,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  let progress = null;
  let progresses: unknown[] = [];

  if (lessonId) {
    const { data: progressData } = await supabase
      .from("lesson_progress")
      .select(
        "id,lesson_id,student_id,progress_seconds,completed_at,last_watched_at,updated_at"
      )
      .eq("lesson_id", lessonId)
      .eq("student_id", user.id)
      .maybeSingle();

    progress = progressData ?? null;
  }

  if (lessonIds.length > 0) {
    const { data: progressesData } = await supabase
      .from("lesson_progress")
      .select(
        "id,lesson_id,student_id,progress_seconds,completed_at,last_watched_at,updated_at"
      )
      .eq("student_id", user.id)
      .in("lesson_id", lessonIds);

    progresses = progressesData ?? [];
  }

  return {
    supabase,
    user,
    profile: profile ?? null,
    progress,
    progresses,
  };
}

async function getContinueWatchingItems(
  supabase: Awaited<ReturnType<typeof getStudentContext>>["supabase"],
  studentId: string
) {
  const { data: progressData } = await supabase
    .from("lesson_progress")
    .select(
      "id,lesson_id,student_id,progress_seconds,completed_at,last_watched_at,updated_at"
    )
    .eq("student_id", studentId)
    .not("last_watched_at", "is", null)
    .order("last_watched_at", { ascending: false })
    .limit(80);

  const progresses = ((progressData ?? []) as unknown as LessonProgressRow[])
    .filter((item) => item.lesson_id)
    .sort((a, b) => {
      const dateA = new Date(a.last_watched_at || a.updated_at || 0).getTime();
      const dateB = new Date(b.last_watched_at || b.updated_at || 0).getTime();

      return dateB - dateA;
    });

  const lessonIds = Array.from(
    new Set(progresses.map((item) => item.lesson_id).filter(Boolean))
  );

  if (lessonIds.length === 0) return [];

  const { data: lessonsData } = await supabase
    .from("lessons")
    .select("id,module_id,title,description,duration_sec,sort_order,status")
    .in("id", lessonIds)
    .eq("status", "published");

  const lessons = ((lessonsData ?? []) as unknown as LessonRow[]).filter(
    (lesson) => lesson.id
  );
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

  const moduleIds = Array.from(
    new Set(lessons.map((lesson) => lesson.module_id).filter(Boolean))
  ) as string[];

  if (moduleIds.length === 0) return [];

  const { data: modulesData } = await supabase
    .from("course_modules")
    .select("id,course_id,title,sort_order")
    .in("id", moduleIds);

  const modules = ((modulesData ?? []) as unknown as ModuleRow[]).filter(
    (module) => module.id
  );
  const moduleById = new Map(modules.map((module) => [module.id, module]));

  const courseIds = Array.from(
    new Set(modules.map((module) => module.course_id).filter(Boolean))
  ) as string[];

  if (courseIds.length === 0) return [];

  const { data: coursesData } = await supabase
    .from("courses")
    .select(
      [
        "id",
        "slug",
        "title",
        "short_description",
        "description",
        "cover_path",
        "cover_vertical_path",
        "cover_horizontal_path",
        "cover_featured_path",
        "preferred_card_format",
      ].join(",")
    )
    .in("id", courseIds);

  const courses = ((coursesData ?? []) as unknown as CourseRow[]).filter(
    (course) => course.id
  );
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const seenCourseIds = new Set<string>();
  const continueWatching = [];

  for (const progress of progresses) {
    const lesson = lessonById.get(progress.lesson_id);

    if (!lesson?.module_id) continue;

    const module = moduleById.get(lesson.module_id);

    if (!module?.course_id) continue;

    const course = courseById.get(module.course_id);

    if (!course?.id) continue;

    if (seenCourseIds.has(course.id)) continue;

    seenCourseIds.add(course.id);

    continueWatching.push({
      id: `${course.id}-${lesson.id}`,
      lessonId: lesson.id,
      courseId: course.id,
      title: course.title?.trim() || "Curso sem título",
      lesson: formatLessonLabel(lesson),
      href: `/aluno/aulas/${lesson.id}`,
      progress: calculateProgressPercent(progress, lesson),
      imageUrl: getPublicCoverUrl(selectCourseCover(course)),
      lastWatchedAt: progress.last_watched_at || progress.updated_at || null,
    });

    if (continueWatching.length >= 12) break;
  }

  return continueWatching;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("lessonId") ?? "";
  const lessonIds = (searchParams.get("lessonIds") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const mode = searchParams.get("mode") ?? "";

  const context = await getStudentContext(lessonId, lessonIds);

  if (!context.user?.id) {
    return NextResponse.json(
      {
        user: null,
        profile: null,
        progress: null,
        progresses: [],
        continueWatching: [],
      },
      { status: 200 }
    );
  }

  if (mode === "continue-watching" || !lessonId) {
    const continueWatching = await getContinueWatchingItems(
      context.supabase,
      context.user.id
    );

    return NextResponse.json({
      user: context.user,
      profile: context.profile,
      continueWatching,
    });
  }

  return NextResponse.json({
    user: context.user,
    profile: context.profile,
    progress: context.progress,
    progresses: context.progresses,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    lesson_id?: string;
    progress_seconds?: number;
    completed?: boolean;
    completed_at?: string;
  } | null;

  const lessonId = body?.lesson_id?.trim() ?? "";

  if (!lessonId) {
    return NextResponse.json(
      { error: "lesson_id é obrigatório." },
      { status: 400 }
    );
  }

  const context = await getStudentContext(lessonId);

  if (!context.user?.id) {
    return NextResponse.json(
      { error: "student_session_not_found" },
      { status: 401 }
    );
  }

  const now = new Date().toISOString();
  const existingProgress = context.progress as LessonProgressRow | null;
  const requestedProgressSeconds = Number.isFinite(body?.progress_seconds)
    ? Math.max(0, Number(body?.progress_seconds))
    : 0;
  const progressSeconds = Math.max(
    Number(existingProgress?.progress_seconds ?? 0),
    requestedProgressSeconds
  );
  const shouldComplete = Boolean(body?.completed_at || body?.completed);
  const completedAt = shouldComplete
    ? body?.completed_at || now
    : existingProgress?.completed_at ?? null;

  const { data: progress, error } = await context.supabase
    .from("lesson_progress")
    .upsert(
      {
        lesson_id: lessonId,
        student_id: context.user.id,
        progress_seconds: progressSeconds,
        completed_at: completedAt,
        last_watched_at: now,
        updated_at: now,
      },
      {
        onConflict: "lesson_id,student_id",
      }
    )
    .select(
      "id,lesson_id,student_id,progress_seconds,completed_at,last_watched_at,updated_at"
    )
    .maybeSingle();

  if (error || !progress) {
    return NextResponse.json(
      { error: "progress_save_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    user: context.user,
    profile: context.profile,
    progress,
  });
}
