import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function createStudentSupabaseClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
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
        "id,lesson_id,student_id,progress_seconds,completed_at,last_watched_at",
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
        "id,lesson_id,student_id,progress_seconds,completed_at,last_watched_at",
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("lessonId") ?? "";
  const lessonIds = (searchParams.get("lessonIds") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!lessonId) {
    return NextResponse.json(
      { error: "lessonId é obrigatório." },
      { status: 400 },
    );
  }

  const context = await getStudentContext(lessonId, lessonIds);

  if (!context.user?.id) {
    return NextResponse.json(
      {
        user: null,
        profile: null,
        progress: null,
        progresses: [],
      },
      { status: 200 },
    );
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
    completed_at?: string;
  } | null;

  const lessonId = body?.lesson_id?.trim() ?? "";

  if (!lessonId) {
    return NextResponse.json(
      { error: "lesson_id é obrigatório." },
      { status: 400 },
    );
  }

  const context = await getStudentContext(lessonId);

  if (!context.user?.id) {
    return NextResponse.json(
      { error: "student_session_not_found" },
      { status: 401 },
    );
  }

  const now = new Date().toISOString();
  const progressSeconds = Number.isFinite(body?.progress_seconds)
    ? Math.max(0, Number(body?.progress_seconds))
    : 0;

  const completedAt = body?.completed_at || now;

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
      },
    )
    .select(
      "id,lesson_id,student_id,progress_seconds,completed_at,last_watched_at",
    )
    .maybeSingle();

  if (error || !progress) {
    return NextResponse.json(
      { error: "progress_save_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    user: context.user,
    profile: context.profile,
    progress,
  });
}
