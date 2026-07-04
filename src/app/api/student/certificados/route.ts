import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  "";

const CERTIFICATE_TEMPLATE_BUCKET = "certificate-templates";
const CERTIFICATE_WIDTH = 1200;
const CERTIFICATE_HEIGHT = 900;

type LessonRow = {
  id: string;
  module_id: string | null;
  title: string | null;
  duration_sec: number | null;
  sort_order: number | null;
  status: string | null;
};

type ProgressRow = {
  id?: string;
  lesson_id?: string | null;
  student_id?: string | null;
  user_id?: string | null;
  progress_seconds?: number | null;
  progress?: number | null;
  progress_percent?: number | null;
  percentage?: number | null;
  completed_at?: string | null;
  finished_at?: string | null;
  last_watched_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  state?: string | null;
  is_completed?: boolean | null;
  completed?: boolean | null;
  done?: boolean | null;
};

type AssessmentRow = {
  id: string;
  title?: string | null;
  course_id?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  min_correct_percentage?: number | null;
  passing_percentage?: number | null;
  pass_percentage?: number | null;
  minimum_score?: number | null;
};

type AttemptRow = {
  id?: string;
  assessment_id?: string | null;
  user_id?: string | null;
  student_id?: string | null;
  status?: string | null;
  passed?: boolean | null;
  approved?: boolean | null;
  correct_percentage?: number | null;
  score_percent?: number | null;
  percentage?: number | null;
  correct_percent?: number | null;
  score?: number | null;
  created_at?: string | null;
};

type IssuedCertificate = {
  id: string;
  template_id: string | null;
  student_id: string;
  course_id: string | null;
  trail_id: string | null;
  student_name: string;
  course_title: string;
  period_start: string | null;
  completed_at: string | null;
  workload_hours: number | null;
  score_percent: number | null;
  certificate_path: string | null;
  certificate_url: string | null;
  status: "issued" | "revoked" | "deleted_by_student" | string;
  created_at: string;
  updated_at: string;
};

type CertificateTemplate = {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  scope_type: "general" | "course" | "trail" | string;
  course_id: string | null;
  trail_id: string | null;
  workload_hours: number | null;
  is_active: boolean;
  position_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PositionConfig = {
  x: number;
  y: number;
  fontSize: number;
  align: "left" | "center" | "right";
  color: string;
  fontWeight: number;
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

function formatDateOnly(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function formatDateBR(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getMinDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => {
      if (!value) return null;

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return null;

      return date.getTime();
    })
    .filter((value): value is number => typeof value === "number");

  if (timestamps.length === 0) return null;

  return new Date(Math.min(...timestamps)).toISOString();
}

function getMaxDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => {
      if (!value) return null;

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return null;

      return date.getTime();
    })
    .filter((value): value is number => typeof value === "number");

  if (timestamps.length === 0) return null;

  return new Date(Math.max(...timestamps)).toISOString();
}

function getNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getProgressDate(progress: ProgressRow | null | undefined) {
  return (
    progress?.last_watched_at ||
    progress?.completed_at ||
    progress?.finished_at ||
    progress?.updated_at ||
    null
  );
}

function rowLooksCompleted(
  progress: ProgressRow | null | undefined,
  lesson?: LessonRow,
) {
  if (!progress) return false;

  const status = String(progress.status ?? progress.state ?? "").toLowerCase();
  const completedAt = progress.completed_at ?? progress.finished_at;
  const progressPercent = getNumber(
    progress.progress ?? progress.progress_percent ?? progress.percentage,
  );
  const progressSeconds = getNumber(progress.progress_seconds);
  const durationSeconds = getNumber(lesson?.duration_sec);

  return (
    status === "completed" ||
    status === "concluido" ||
    status === "concluído" ||
    status === "finished" ||
    Boolean(completedAt) ||
    progress.is_completed === true ||
    progress.completed === true ||
    progress.done === true ||
    progressPercent >= 100 ||
    (durationSeconds > 0 && progressSeconds >= durationSeconds)
  );
}

function getAttemptScore(attempt: AttemptRow) {
  return getNumber(
    attempt.correct_percentage ??
      attempt.score_percent ??
      attempt.percentage ??
      attempt.correct_percent ??
      attempt.score,
  );
}

function getAssessmentMinimumScore(assessment: AssessmentRow) {
  const score = getNumber(
    assessment.min_correct_percentage ??
      assessment.passing_percentage ??
      assessment.pass_percentage ??
      assessment.minimum_score,
  );

  return score > 0 ? score : 80;
}

function attemptLooksApproved(attempt: AttemptRow, assessment: AssessmentRow) {
  const status = String(attempt.status ?? "").toLowerCase();
  const score = getAttemptScore(attempt);
  const minScore = getAssessmentMinimumScore(assessment);

  return (
    status === "passed" ||
    status === "approved" ||
    status === "aprovado" ||
    attempt.passed === true ||
    attempt.approved === true ||
    score >= minScore
  );
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formatWorkloadLong(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const number = Number(value);
  const formatted = Number.isInteger(number)
    ? String(number)
    : number.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

  return `${formatted} ${number === 1 ? "hora" : "horas"}`;
}

function getPosition(
  positionConfig: CertificateTemplate["position_config"],
  key: string,
  fallback: PositionConfig,
): PositionConfig {
  const raw = positionConfig?.[key];

  if (!raw || typeof raw !== "object") return fallback;

  const item = raw as Record<string, unknown>;
  const x = Number(item.x);
  const y = Number(item.y);
  const fontSize = Number(item.fontSize);
  const align = String(item.align ?? fallback.align).toLowerCase();
  const fontWeight = Number(item.fontWeight);
  const color = typeof item.color === "string" ? item.color : fallback.color;

  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
    fontSize: Number.isFinite(fontSize) ? fontSize : fallback.fontSize,
    align:
      align === "left" || align === "right" || align === "center"
        ? align
        : fallback.align,
    color,
    fontWeight: Number.isFinite(fontWeight) ? fontWeight : fallback.fontWeight,
  };
}

function textAnchorForAlign(align: PositionConfig["align"]) {
  if (align === "left") return "start";
  if (align === "right") return "end";
  return "middle";
}

function positionX(position: PositionConfig) {
  return (position.x / 100) * CERTIFICATE_WIDTH;
}

function positionY(position: PositionConfig) {
  return (position.y / 100) * CERTIFICATE_HEIGHT;
}

function renderText(
  label: string,
  value: string,
  position: PositionConfig,
  extraClass = "certificate-text",
) {
  return `<text class="${extraClass}" x="${positionX(position)}" y="${positionY(
    position,
  )}" text-anchor="${textAnchorForAlign(
    position.align,
  )}" dominant-baseline="middle" font-size="${position.fontSize}" font-weight="${
    position.fontWeight
  }" fill="${escapeXml(position.color)}">${escapeXml(value)}</text>`;
}

function buildCertificateRenderUrl(request: Request, certificateId: string) {
  const url = new URL(request.url);
  return `${url.origin}/api/student/certificados?certificateId=${certificateId}`;
}

function withCertificateUrl(request: Request, certificate: IssuedCertificate) {
  if (certificate.status !== "issued") return certificate;

  return {
    ...certificate,
    certificate_path:
      certificate.certificate_path || `dynamic/${certificate.id}.svg`,
    certificate_url:
      certificate.certificate_url || buildCertificateRenderUrl(request, certificate.id),
  };
}

function getBearerAccessToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() ?? "";

  return token || null;
}

async function getAuthenticatedStudent(request: Request) {
  const accessToken = getBearerAccessToken(request);

  // O app Flutter envia a sessão Supabase no header Authorization. A validação
  // é feita pelo Auth do Supabase com a chave anônima; a service role continua
  // restrita às consultas administrativas realizadas no servidor.
  if (accessToken && supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (!error && user?.id) {
      return {
        ok: true as const,
        user,
      };
    }
  }

  // Mantém a autenticação por cookies da área web sem qualquer mudança no
  // comportamento atual do navegador.
  const cookieStore = await cookies();
  const supabase = createStudentSupabaseClient(cookieStore);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Sessão do aluno não encontrada." },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

async function loadAttempts(
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
  assessmentIds: string[],
  studentId: string,
) {
  if (assessmentIds.length === 0) return [] as AttemptRow[];

  const byUserId = await adminSupabase
    .from("assessment_attempts")
    .select("*")
    .eq("user_id", studentId)
    .in("assessment_id", assessmentIds)
    .order("created_at", { ascending: false });

  if (!byUserId.error) {
    return (byUserId.data ?? []) as AttemptRow[];
  }

  const byStudentId = await adminSupabase
    .from("assessment_attempts")
    .select("*")
    .eq("student_id", studentId)
    .in("assessment_id", assessmentIds)
    .order("created_at", { ascending: false });

  if (!byStudentId.error) {
    return (byStudentId.data ?? []) as AttemptRow[];
  }

  return [] as AttemptRow[];
}

async function imageToDataUrl(imageUrl: string) {
  try {
    const response = await fetch(imageUrl, {
      cache: "no-store",
    });

    if (!response.ok) return imageUrl;

    const contentType =
      response.headers.get("content-type")?.split(";")[0] || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Erro ao incorporar imagem do certificado:", error);
    return imageUrl;
  }
}

async function renderCertificateSvgResponse(
  request: Request,
  studentId: string,
  certificateId: string,
) {
  const adminSupabase = createAdminSupabaseClient();

  const { data: certificate, error: certificateError } = await adminSupabase
    .from("issued_certificates")
    .select("*")
    .eq("id", certificateId)
    .eq("student_id", studentId)
    .eq("status", "issued")
    .is("deleted_at", null)
    .maybeSingle<IssuedCertificate>();

  if (certificateError || !certificate?.id) {
    return NextResponse.json(
      { error: "Certificado não encontrado para este aluno." },
      { status: 404 },
    );
  }

  if (!certificate.template_id) {
    return NextResponse.json(
      { error: "Este certificado não possui modelo vinculado." },
      { status: 400 },
    );
  }

  const { data: template, error: templateError } = await adminSupabase
    .from("certificate_templates")
    .select("*")
    .eq("id", certificate.template_id)
    .is("deleted_at", null)
    .maybeSingle<CertificateTemplate>();

  if (templateError || !template?.id) {
    return NextResponse.json(
      { error: "Modelo de certificado não encontrado." },
      { status: 404 },
    );
  }

  const templateImageUrl =
    template.image_url ||
    (template.image_path
      ? adminSupabase.storage
          .from(CERTIFICATE_TEMPLATE_BUCKET)
          .getPublicUrl(template.image_path).data.publicUrl
      : "");

  if (!templateImageUrl) {
    return NextResponse.json(
      { error: "Imagem do modelo de certificado não encontrada." },
      { status: 400 },
    );
  }

  const embeddedImageUrl = await imageToDataUrl(templateImageUrl);
  const positionConfig = template.position_config;

  const studentNamePosition = getPosition(positionConfig, "student_name", {
    x: 50,
    y: 34,
    fontSize: 34,
    align: "center",
    color: "#111827",
    fontWeight: 600,
  });

  const courseNamePosition = getPosition(positionConfig, "course_name", {
    x: 50,
    y: 48,
    fontSize: 24,
    align: "center",
    color: "#111827",
    fontWeight: 500,
  });

  const periodStartPosition = getPosition(positionConfig, "period_start", {
    x: 44,
    y: 57,
    fontSize: 15,
    align: "center",
    color: "#111827",
    fontWeight: 500,
  });

  const periodEndPosition = getPosition(positionConfig, "period_end", {
    x: 62,
    y: 57,
    fontSize: 15,
    align: "center",
    color: "#111827",
    fontWeight: 500,
  });

  const workloadTextPosition = getPosition(positionConfig, "workload_text", {
    x: 55,
    y: 61,
    fontSize: 15,
    align: "center",
    color: "#111827",
    fontWeight: 500,
  });

  const footerWorkloadPosition = getPosition(positionConfig, "footer_workload", {
    x: 39,
    y: 70,
    fontSize: 12,
    align: "center",
    color: "#111827",
    fontWeight: 600,
  });

  const footerStartDatePosition = getPosition(positionConfig, "footer_start_date", {
    x: 50,
    y: 70,
    fontSize: 12,
    align: "center",
    color: "#111827",
    fontWeight: 600,
  });

  const footerEndDatePosition = getPosition(positionConfig, "footer_end_date", {
    x: 62,
    y: 70,
    fontSize: 12,
    align: "center",
    color: "#111827",
    fontWeight: 600,
  });

  const periodStart = formatDateBR(certificate.period_start);
  const periodEnd = formatDateBR(certificate.completed_at);
  const workload = formatWorkloadLong(certificate.workload_hours);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" viewBox="0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}">
  <title>Certificado - ${escapeXml(certificate.course_title)}</title>
  <style>
    .certificate-text {
      font-family: Arial, Helvetica, sans-serif;
      paint-order: stroke;
      stroke: rgba(255,255,255,0.35);
      stroke-width: 0.35px;
      stroke-linejoin: round;
    }
    .student-name {
      font-family: Georgia, 'Times New Roman', serif;
      letter-spacing: 0.02em;
    }
  </style>
  <rect width="100%" height="100%" fill="#ffffff" />
  <image href="${embeddedImageUrl}" x="0" y="0" width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" preserveAspectRatio="xMidYMid meet" />
  ${renderText(
    "student_name",
    certificate.student_name,
    studentNamePosition,
    "certificate-text student-name",
  )}
  ${renderText("course_name", certificate.course_title, courseNamePosition)}
  ${renderText("period_start", periodStart, periodStartPosition)}
  ${renderText("period_end", periodEnd, periodEndPosition)}
  ${renderText("workload_text", workload, workloadTextPosition)}
  ${renderText("footer_workload", workload, footerWorkloadPosition)}
  ${renderText("footer_start_date", periodStart, footerStartDatePosition)}
  ${renderText("footer_end_date", periodEnd, footerEndDatePosition)}
</svg>`;

  const params = new URL(request.url).searchParams;
  const shouldDownload = params.get("download") === "1";
  const fileName = `certificado-${sanitizeFileName(
    certificate.course_title || certificate.id,
  )}.svg`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${fileName}"`,
    },
  });
}

export async function GET(request: Request) {
  const studentCheck = await getAuthenticatedStudent(request);

  if (!studentCheck.ok) {
    return studentCheck.response;
  }

  const { searchParams } = new URL(request.url);
  const certificateId = cleanText(searchParams.get("certificateId"));
  const courseId = cleanText(searchParams.get("courseId"));

  try {
    const adminSupabase = createAdminSupabaseClient();
    const studentId = studentCheck.user.id;

    if (certificateId) {
      return renderCertificateSvgResponse(request, studentId, certificateId);
    }

    if (!courseId) {
      const { data: certificates, error: certificatesError } =
        await adminSupabase
          .from("issued_certificates")
          .select("*")
          .eq("student_id", studentId)
          .eq("status", "issued")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

      if (certificatesError) {
        return NextResponse.json(
          {
            error:
              certificatesError.message ||
              "Não foi possível carregar os certificados do aluno.",
          },
          { status: 500 },
        );
      }

      const issuedCertificates = ((certificates ?? []) as IssuedCertificate[]).map(
        (certificate) => withCertificateUrl(request, certificate),
      );

      return NextResponse.json({
        certificates: issuedCertificates,
        totals: {
          issued: issuedCertificates.length,
        },
      });
    }

    const { data: course, error: courseError } = await adminSupabase
      .from("courses")
      .select("id,title,slug,status")
      .eq("id", courseId)
      .maybeSingle<{
        id: string;
        title: string | null;
        slug: string | null;
        status: string | null;
      }>();

    if (courseError || !course?.id) {
      return NextResponse.json(
        { error: "Curso não encontrado." },
        { status: 404 },
      );
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id,full_name,avatar_url")
      .eq("id", studentId)
      .maybeSingle<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      }>();

    const studentName =
      profile?.full_name?.trim() ||
      String(studentCheck.user.user_metadata?.full_name ?? "").trim() ||
      studentCheck.user.email ||
      "Aluno";

    const { data: modules } = await adminSupabase
      .from("course_modules")
      .select("id,course_id,title,status,sort_order")
      .eq("course_id", courseId)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    const moduleIds = ((modules ?? []) as Array<{ id: string }>).map(
      (module) => module.id,
    );

    if (moduleIds.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: "Este curso ainda não possui módulos publicados.",
        certificate: null,
        progress: {
          totalLessons: 0,
          completedLessons: 0,
        },
      });
    }

    const { data: lessons } = await adminSupabase
      .from("lessons")
      .select("id,module_id,title,status,duration_sec,sort_order")
      .in("module_id", moduleIds)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    const publishedLessons = ((lessons ?? []) as LessonRow[]).filter(
      (lesson) => lesson.id,
    );
    const lessonIds = publishedLessons.map((lesson) => lesson.id);

    if (lessonIds.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: "Este curso ainda não possui aulas publicadas.",
        certificate: null,
        progress: {
          totalLessons: 0,
          completedLessons: 0,
        },
      });
    }

    const { data: progressRows } = await adminSupabase
      .from("lesson_progress")
      .select("*")
      .eq("student_id", studentId)
      .in("lesson_id", lessonIds);

    const progressByLessonId = new Map(
      ((progressRows ?? []) as ProgressRow[])
        .filter((progress) => progress.lesson_id)
        .map((progress) => [String(progress.lesson_id), progress]),
    );

    const completedLessons = publishedLessons.filter((lesson) =>
      rowLooksCompleted(progressByLessonId.get(lesson.id), lesson),
    );

    const allLessonsCompleted =
      completedLessons.length === publishedLessons.length;

    if (!allLessonsCompleted) {
      return NextResponse.json({
        eligible: false,
        reason: "Conclua todas as aulas do curso para liberar o certificado.",
        certificate: null,
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
          pendingLessons: publishedLessons
            .filter(
              (lesson) =>
                !rowLooksCompleted(progressByLessonId.get(lesson.id), lesson),
            )
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
            })),
        },
      });
    }

    const { data: assessments, error: assessmentsError } = await adminSupabase
      .from("assessments")
      .select("*")
      .eq("course_id", courseId)
      .eq("status", "published")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (assessmentsError) {
      return NextResponse.json(
        {
          error:
            assessmentsError.message ||
            "Não foi possível verificar a avaliação final do curso.",
        },
        { status: 500 },
      );
    }

    const finalAssessments = ((assessments ?? []) as AssessmentRow[]).filter(
      (assessment) => assessment.id,
    );

    if (finalAssessments.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason:
          "Não existe avaliação final publicada e ativa para este curso no ADM.",
        certificate: null,
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
        },
      });
    }

    const assessmentIds = finalAssessments.map((assessment) => assessment.id);
    const attempts = await loadAttempts(
      adminSupabase,
      assessmentIds,
      studentId,
    );

    const approvedAttempt = attempts.find((attempt) => {
      const assessment = finalAssessments.find(
        (item) => item.id === attempt.assessment_id,
      );

      if (!assessment) return false;

      return attemptLooksApproved(attempt, assessment);
    });

    if (!approvedAttempt) {
      return NextResponse.json({
        eligible: false,
        reason:
          "A avaliação final deste curso ainda não foi aprovada pelo aluno.",
        certificate: null,
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
        },
        assessment: {
          required: true,
          total: finalAssessments.length,
          approved: false,
        },
      });
    }

    const scorePercent = getAttemptScore(approvedAttempt);

    const { data: existingCertificate } = await adminSupabase
      .from("issued_certificates")
      .select("*")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("status", "issued")
      .is("deleted_at", null)
      .maybeSingle<IssuedCertificate>();

    if (existingCertificate?.id) {
      const certificateUrl = buildCertificateRenderUrl(
        request,
        existingCertificate.id,
      );
      const certificatePath =
        existingCertificate.certificate_path ||
        `dynamic/${existingCertificate.id}.svg`;

      if (!existingCertificate.certificate_url || !existingCertificate.certificate_path) {
        await adminSupabase
          .from("issued_certificates")
          .update({
            certificate_path: certificatePath,
            certificate_url: certificateUrl,
          })
          .eq("id", existingCertificate.id);
      }

      return NextResponse.json({
        eligible: true,
        reason: "Certificado já emitido.",
        certificate: {
          ...existingCertificate,
          certificate_path: certificatePath,
          certificate_url: certificateUrl,
        },
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
        },
        assessment: {
          required: true,
          total: finalAssessments.length,
          approved: true,
          scorePercent,
        },
      });
    }

    const { data: courseTemplate } = await adminSupabase
      .from("certificate_templates")
      .select("*")
      .eq("scope_type", "course")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<CertificateTemplate>();

    let template = courseTemplate;

    if (!template?.id) {
      const { data: generalTemplate } = await adminSupabase
        .from("certificate_templates")
        .select("*")
        .eq("scope_type", "general")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<CertificateTemplate>();

      template = generalTemplate;
    }

    if (!template?.id) {
      return NextResponse.json({
        eligible: false,
        reason:
          "Não existe modelo de certificado ativo para este curso no ADM.",
        certificate: null,
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
        },
        assessment: {
          required: true,
          total: finalAssessments.length,
          approved: true,
          scorePercent,
        },
      });
    }

    const progressList = Array.from(progressByLessonId.values());
    const periodStartIso = getMinDate(progressList.map(getProgressDate));
    const completedAtIso = getMaxDate(
      progressList.map(
        (progress) =>
          progress.completed_at || progress.finished_at || progress.updated_at,
      ),
    );

    const fallbackCompletedAt = new Date().toISOString();
    const workloadHours = Number(template.workload_hours ?? 0) || null;

    const { data: createdCertificate, error: issuedError } = await adminSupabase
      .from("issued_certificates")
      .insert({
        template_id: template.id,
        student_id: studentId,
        course_id: courseId,
        trail_id: null,
        student_name: studentName,
        course_title: course.title || "Curso",
        period_start: formatDateOnly(periodStartIso),
        completed_at: completedAtIso || fallbackCompletedAt,
        workload_hours: workloadHours,
        score_percent: scorePercent,
        certificate_path: null,
        certificate_url: null,
        status: "issued",
      })
      .select("*")
      .maybeSingle<IssuedCertificate>();

    if (issuedError || !createdCertificate) {
      return NextResponse.json(
        {
          error:
            issuedError?.message || "Não foi possível emitir o certificado.",
        },
        { status: 500 },
      );
    }

    const certificateUrl = buildCertificateRenderUrl(request, createdCertificate.id);
    const certificatePath = `dynamic/${createdCertificate.id}.svg`;

    const { data: updatedCertificate } = await adminSupabase
      .from("issued_certificates")
      .update({
        certificate_path: certificatePath,
        certificate_url: certificateUrl,
      })
      .eq("id", createdCertificate.id)
      .select("*")
      .maybeSingle<IssuedCertificate>();

    const issuedCertificate = updatedCertificate ?? {
      ...createdCertificate,
      certificate_path: certificatePath,
      certificate_url: certificateUrl,
    };

    return NextResponse.json({
      eligible: true,
      reason: "Certificado emitido.",
      certificate: issuedCertificate,
      template,
      progress: {
        totalLessons: publishedLessons.length,
        completedLessons: completedLessons.length,
      },
      assessment: {
        required: true,
        total: finalAssessments.length,
        approved: true,
        scorePercent,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar certificado:", error);

    return NextResponse.json(
      { error: "Não foi possível verificar o certificado." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const studentCheck = await getAuthenticatedStudent(request);

  if (!studentCheck.ok) {
    return studentCheck.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        certificateId?: string;
      }
    | null;

  const certificateId = cleanText(body?.id || body?.certificateId);

  if (!certificateId) {
    return NextResponse.json(
      { error: "ID do certificado é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const adminSupabase = createAdminSupabaseClient();
    const studentId = studentCheck.user.id;

    const { data, error } = await adminSupabase
      .from("issued_certificates")
      .update({
        status: "deleted_by_student",
        deleted_at: new Date().toISOString(),
        deleted_by: studentId,
      })
      .eq("id", certificateId)
      .eq("student_id", studentId)
      .eq("status", "issued")
      .is("deleted_at", null)
      .select("id,status,deleted_at")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Não foi possível excluir este certificado ou ele não pertence ao aluno logado.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      deleted_id: data.id,
      message: "Certificado excluído da sua área.",
    });
  } catch (error) {
    console.error("Erro ao excluir certificado do aluno:", error);

    return NextResponse.json(
      { error: "Não foi possível excluir o certificado." },
      { status: 500 },
    );
  }
}

