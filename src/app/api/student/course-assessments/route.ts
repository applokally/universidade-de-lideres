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

type AssessmentRow = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  scope_type: "course" | "trail" | "lesson" | string;
  course_id: string | null;
  trail_id: string | null;
  lesson_id: string | null;
  trail_evaluation_mode: "per_course" | "general" | string | null;
  access_condition:
    | "after_all_lessons"
    | "after_course_completion"
    | "after_trail_completion"
    | "after_lesson_completion"
    | "manual_release"
    | string;
  min_correct_percentage: number | null;
  certificate_required: boolean | null;
  attempts_allowed: number | null;
  time_limit_minutes: number | null;
  question_order: "fixed" | "random" | string | null;
  status: string;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

type AssessmentQuestionRow = {
  id: string;
  assessment_id: string;
  question_type:
    | "single_choice"
    | "multiple_choice"
    | "short_text"
    | "long_text"
    | "true_false"
    | "scale"
    | string;
  prompt: string;
  help_text: string | null;
  points: number | null;
  required: boolean | null;
  sort_order: number | null;
};

type AssessmentOptionRow = {
  id: string;
  question_id: string;
  label: string;
  sort_order: number | null;
};

type AttemptRow = {
  id: string;
  assessment_id: string;
  user_id: string;
  status: string;
  correct_percentage: number | null;
  created_at: string;
};

type LessonProgressRow = {
  lesson_id: string;
  completed_at: string | null;
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

function getCompleted(progressMap: Map<string, LessonProgressRow>, lessonId: string | null) {
  if (!lessonId) return false;
  return Boolean(progressMap.get(lessonId)?.completed_at);
}

function getAssessmentAvailability({
  assessment,
  lessonIds,
  progressMap,
  manualReleased,
}: {
  assessment: AssessmentRow;
  lessonIds: string[];
  progressMap: Map<string, LessonProgressRow>;
  manualReleased: boolean;
}) {
  const allLessonsCompleted =
    lessonIds.length > 0 && lessonIds.every((lessonId) => getCompleted(progressMap, lessonId));

  if (assessment.access_condition === "manual_release") {
    return {
      available: manualReleased,
      reason: manualReleased
        ? "Liberada pela administração."
        : "Aguardando liberação da administração.",
    };
  }

  if (
    assessment.access_condition === "after_all_lessons" ||
    assessment.access_condition === "after_course_completion"
  ) {
    return {
      available: allLessonsCompleted,
      reason: allLessonsCompleted
        ? "Liberada após a conclusão das aulas."
        : "Conclua todas as aulas do curso para liberar esta avaliação.",
    };
  }

  if (assessment.access_condition === "after_lesson_completion") {
    const completed = assessment.lesson_id
      ? getCompleted(progressMap, assessment.lesson_id)
      : allLessonsCompleted;

    return {
      available: completed,
      reason: completed
        ? "Liberada após a conclusão da aula vinculada."
        : "Conclua a aula vinculada para liberar esta avaliação.",
    };
  }

  if (assessment.access_condition === "after_trail_completion") {
    return {
      available: allLessonsCompleted,
      reason: allLessonsCompleted
        ? "Liberada para esta etapa da trilha."
        : "Conclua as aulas desta etapa para liberar esta avaliação.",
    };
  }

  return {
    available: allLessonsCompleted,
    reason: allLessonsCompleted
      ? "Liberada após a conclusão das aulas."
      : "Conclua todas as aulas do curso para liberar esta avaliação.",
  };
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const studentSupabase = createStudentSupabaseClient(cookieStore);

    const {
      data: { user },
      error: userError,
    } = await studentSupabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json(
        { error: "Sessão do aluno não encontrada." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = (searchParams.get("courseId") ?? "").trim();
    const lessonIds = (searchParams.get("lessonIds") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId é obrigatório." },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminSupabaseClient();

    const { data: trackMapsData } = await adminSupabase
      .from("course_category_map")
      .select("course_id,category_id,sort_order")
      .eq("course_id", courseId);

    const trackIds = Array.from(
      new Set(
        ((trackMapsData ?? []) as Array<{ category_id: string | null }>)
          .map((item) => item.category_id)
          .filter(Boolean) as string[],
      ),
    );

    const { data: progressData } =
      lessonIds.length > 0
        ? await adminSupabase
            .from("lesson_progress")
            .select("lesson_id,completed_at")
            .eq("student_id", user.id)
            .in("lesson_id", lessonIds)
        : { data: [] };

    const progressMap = new Map(
      ((progressData ?? []) as LessonProgressRow[]).map((item) => [
        item.lesson_id,
        item,
      ]),
    );

    const { data: assessmentsData, error: assessmentsError } = await adminSupabase
      .from("assessments")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (assessmentsError) {
      return NextResponse.json(
        {
          error:
            assessmentsError.message ||
            "Não foi possível carregar as avaliações do curso.",
        },
        { status: 500 },
      );
    }

    const allAssessments = ((assessmentsData ?? []) as AssessmentRow[]).filter(
      (assessment) => assessment.is_active !== false,
    );

    const courseAssessments = allAssessments.filter((assessment) => {
      const assessmentCourseId = assessment.course_id ? String(assessment.course_id) : "";
      const assessmentLessonId = assessment.lesson_id ? String(assessment.lesson_id) : "";
      const assessmentTrailId = assessment.trail_id ? String(assessment.trail_id) : "";

      const courseMatches = assessmentCourseId === courseId;
      const lessonMatches = Boolean(assessmentLessonId && lessonIds.includes(assessmentLessonId));
      const trailMatches = Boolean(assessmentTrailId && trackIds.includes(assessmentTrailId));

      return courseMatches || lessonMatches || trailMatches;
    });

    const assessmentIds = courseAssessments.map((assessment) => assessment.id);

    if (assessmentIds.length === 0) {
      return NextResponse.json({
        items: [],
        debug: {
          courseId,
          lessonIds,
          trackIds,
          publishedAssessmentsFound: allAssessments.length,
        },
      });
    }

    const { data: attemptsData } = await adminSupabase
      .from("assessment_attempts")
      .select("id,assessment_id,user_id,status,correct_percentage,created_at")
      .eq("user_id", user.id)
      .in("assessment_id", assessmentIds)
      .order("created_at", { ascending: false });

    const attempts = (attemptsData ?? []) as AttemptRow[];

    const { data: manualReleasesData } = await adminSupabase
      .from("assessment_manual_releases")
      .select("assessment_id,user_id")
      .eq("user_id", user.id)
      .in("assessment_id", assessmentIds);

    const manualReleasedIds = new Set(
      ((manualReleasesData ?? []) as Array<{ assessment_id: string }>).map(
        (item) => item.assessment_id,
      ),
    );

    const { data: questionsData } = await adminSupabase
      .from("assessment_questions")
      .select("id,assessment_id,question_type,prompt,help_text,points,required,sort_order")
      .in("assessment_id", assessmentIds)
      .order("sort_order", { ascending: true });

    const questions = (questionsData ?? []) as AssessmentQuestionRow[];
    const questionIds = questions.map((question) => question.id);

    let options: AssessmentOptionRow[] = [];

    if (questionIds.length > 0) {
      const publicOptionsResponse = await adminSupabase
        .from("assessment_question_options_public")
        .select("id,question_id,label,sort_order")
        .in("question_id", questionIds)
        .order("sort_order", { ascending: true });

      if (!publicOptionsResponse.error) {
        options = (publicOptionsResponse.data ?? []) as AssessmentOptionRow[];
      } else {
        const fallbackOptionsResponse = await adminSupabase
          .from("assessment_question_options")
          .select("id,question_id,label,sort_order")
          .in("question_id", questionIds)
          .order("sort_order", { ascending: true });

        options = (fallbackOptionsResponse.data ?? []) as AssessmentOptionRow[];
      }
    }

    const questionsByAssessmentId = new Map<string, AssessmentQuestionRow[]>();
    questions.forEach((question) => {
      const current = questionsByAssessmentId.get(question.assessment_id) ?? [];
      current.push({
        ...question,
        points: Number(question.points ?? 1),
        required: question.required !== false,
        sort_order: Number(question.sort_order ?? 0),
      });
      questionsByAssessmentId.set(question.assessment_id, current);
    });

    const optionsByQuestionId = new Map<string, AssessmentOptionRow[]>();
    options.forEach((option) => {
      const current = optionsByQuestionId.get(option.question_id) ?? [];
      current.push({
        ...option,
        sort_order: Number(option.sort_order ?? 0),
      });
      optionsByQuestionId.set(option.question_id, current);
    });

    const items = courseAssessments.map((assessment) => {
      const availability = getAssessmentAvailability({
        assessment,
        lessonIds,
        progressMap,
        manualReleased: manualReleasedIds.has(assessment.id),
      });
      const assessmentQuestions = questionsByAssessmentId.get(assessment.id) ?? [];
      const assessmentOptions = assessmentQuestions.flatMap(
        (question) => optionsByQuestionId.get(question.id) ?? [],
      );

      return {
        ...assessment,
        min_correct_percentage: Number(assessment.min_correct_percentage ?? 70),
        certificate_required: assessment.certificate_required !== false,
        attempts_allowed: Number(assessment.attempts_allowed ?? 1),
        trail_evaluation_mode: assessment.trail_evaluation_mode ?? "per_course",
        question_order: assessment.question_order ?? "fixed",
        available: availability.available,
        availabilityReason: availability.reason,
        lastAttempt:
          attempts.find((attempt) => attempt.assessment_id === assessment.id) ??
          null,
        questions: assessmentQuestions,
        options: assessmentOptions,
      };
    });

    return NextResponse.json({
      items,
      debug: {
        courseId,
        lessonIds,
        trackIds,
        matchedAssessments: items.length,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar avaliações do curso:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar as avaliações do curso." },
      { status: 500 },
    );
  }
}
