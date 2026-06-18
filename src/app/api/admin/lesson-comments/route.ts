import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  "";

type LessonCommentStatus = "pending" | "approved" | "rejected" | "all";

type LessonCommentAction = "approve" | "reject" | "respond";

type LessonCommentPatchBody = {
  id?: string;
  action?: LessonCommentAction;
  admin_note?: string | null;
};

type LessonCommentRow = {
  id: string;
  lesson_id: string;
  student_id: string | null;
  student_name: string;
  student_avatar_url: string | null;
  comment: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type LessonRow = {
  id: string;
  module_id: string | null;
  title: string | null;
  sort_order: number | null;
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
};

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

function createAdminSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: string | null): LessonCommentStatus {
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  if (value === "all") return "all";

  return "pending";
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createStudentSupabaseClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Sessão administrativa não encontrada." },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,role,full_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      role: string | null;
      full_name: string | null;
      avatar_url: string | null;
    }>();

  const role = String(profile?.role ?? "").toLowerCase();
  const isAdmin =
    role === "admin" ||
    role === "administrator" ||
    role === "super_admin" ||
    role === "owner";

  if (profileError || !isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Usuário sem permissão administrativa." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    user,
    profile,
  };
}

async function countCommentsByStatus(
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
  status: "pending" | "approved" | "rejected",
) {
  const { count } = await adminSupabase
    .from("lesson_comments")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  return count ?? 0;
}

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { searchParams } = new URL(request.url);
  const status = normalizeStatus(searchParams.get("status"));

  try {
    const adminSupabase = createAdminSupabaseClient();

    let commentsQuery = adminSupabase
      .from("lesson_comments")
      .select(
        "id,lesson_id,student_id,student_name,student_avatar_url,comment,status,admin_note,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (status !== "all") {
      commentsQuery = commentsQuery.eq("status", status);
    }

    const { data: commentsData, error: commentsError } = await commentsQuery;

    if (commentsError) {
      return NextResponse.json(
        {
          error:
            commentsError.message ||
            "Não foi possível carregar os comentários das aulas.",
        },
        { status: 500 },
      );
    }

    const comments = (commentsData ?? []) as LessonCommentRow[];
    const lessonIds = Array.from(
      new Set(comments.map((item) => item.lesson_id).filter(Boolean)),
    );

    let lessons: LessonRow[] = [];
    let modules: ModuleRow[] = [];
    let courses: CourseRow[] = [];

    if (lessonIds.length > 0) {
      const { data: lessonsData } = await adminSupabase
        .from("lessons")
        .select("id,module_id,title,sort_order")
        .in("id", lessonIds);

      lessons = (lessonsData ?? []) as LessonRow[];

      const moduleIds = Array.from(
        new Set(lessons.map((lesson) => lesson.module_id).filter(Boolean)),
      ) as string[];

      if (moduleIds.length > 0) {
        const { data: modulesData } = await adminSupabase
          .from("course_modules")
          .select("id,course_id,title,sort_order")
          .in("id", moduleIds);

        modules = (modulesData ?? []) as ModuleRow[];

        const courseIds = Array.from(
          new Set(modules.map((module) => module.course_id).filter(Boolean)),
        ) as string[];

        if (courseIds.length > 0) {
          const { data: coursesData } = await adminSupabase
            .from("courses")
            .select("id,slug,title")
            .in("id", courseIds);

          courses = (coursesData ?? []) as CourseRow[];
        }
      }
    }

    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const moduleById = new Map(modules.map((module) => [module.id, module]));
    const courseById = new Map(courses.map((course) => [course.id, course]));

    const items = comments.map((comment) => {
      const lesson = lessonById.get(comment.lesson_id) ?? null;
      const module = lesson?.module_id
        ? moduleById.get(lesson.module_id) ?? null
        : null;
      const course = module?.course_id
        ? courseById.get(module.course_id) ?? null
        : null;

      return {
        ...comment,
        lesson,
        module,
        course,
      };
    });

    const [pending, approved, rejected] = await Promise.all([
      countCommentsByStatus(adminSupabase, "pending"),
      countCommentsByStatus(adminSupabase, "approved"),
      countCommentsByStatus(adminSupabase, "rejected"),
    ]);

    return NextResponse.json({
      items,
      counts: {
        pending,
        approved,
        rejected,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar comentários das aulas:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os comentários das aulas." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json().catch(() => null)) as
    | LessonCommentPatchBody
    | null;

  const commentId = cleanText(body?.id);
  const action = body?.action;
  const adminNote = cleanText(body?.admin_note);

  if (!commentId) {
    return NextResponse.json(
      { error: "ID do comentário é obrigatório." },
      { status: 400 },
    );
  }

  if (action !== "approve" && action !== "reject" && action !== "respond") {
    return NextResponse.json(
      { error: "Ação inválida para o comentário." },
      { status: 400 },
    );
  }

  try {
    const adminSupabase = createAdminSupabaseClient();

    const updatePayload: {
      status?: string;
      admin_note?: string | null;
    } = {};

    if (action === "approve") {
      updatePayload.status = "approved";
      updatePayload.admin_note = adminNote || null;
    }

    if (action === "reject") {
      updatePayload.status = "rejected";
      updatePayload.admin_note = adminNote || null;
    }

    if (action === "respond") {
      updatePayload.admin_note = adminNote || null;
    }

    const { data, error } = await adminSupabase
      .from("lesson_comments")
      .update(updatePayload)
      .eq("id", commentId)
      .select(
        "id,lesson_id,student_id,student_name,student_avatar_url,comment,status,admin_note,created_at",
      )
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Não foi possível atualizar o comentário da aula.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
      message:
        action === "approve"
          ? "Comentário aprovado."
          : action === "reject"
            ? "Comentário reprovado."
            : "Resposta salva.",
    });
  } catch (error) {
    console.error("Erro ao atualizar comentário da aula:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o comentário da aula." },
      { status: 500 },
    );
  }
}