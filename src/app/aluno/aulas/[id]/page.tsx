"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  ImageIcon,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Play,
  Presentation,
  Send,
  Star,
  Video,
  XCircle,
} from "lucide-react";
import { StudentHeader } from "../../_components/StudentHeader";

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
  video_provider: string | null;
  video_url: string | null;
  duration_sec: number | null;
  is_preview: boolean;
  source_mode: string | null;
  content_body: string | null;
  primary_asset_path: string | null;
  primary_asset_name: string | null;
  primary_asset_mime_type: string | null;
  primary_asset_size_bytes: number | null;
  primary_asset_signed_url?: string | null;
  external_url: string | null;
  live_provider: string | null;
  meeting_sdk: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  zoom_join_url: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  zoom_recording_url: string | null;
};

type LessonAssetRow = {
  id: string;
  lesson_id: string;
  asset_type: string;
  title: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
  file_name: string | null;
  signed_url?: string | null;
};

type ProgressRow = {
  id: string;
  lesson_id: string;
  student_id: string;
  progress_seconds: number;
  completed_at: string | null;
  last_watched_at: string;
};

type CompletionFlow = {
  kind:
    | "none"
    | "course_completed_next_course"
    | "track_completed_certificate"
    | "track_completed_quiz_required";
  message: string;
  redirect_url: string | null;
  redirect_delay_ms: number;
};

type CommentRow = {
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

type RatingRow = {
  id: string;
  lesson_id: string;
  student_id: string | null;
  student_name: string;
  student_avatar_url: string | null;
  rating: number;
  review: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type LessonBundle = {
  lesson: LessonRow;
  currentModule: ModuleRow;
  course: CourseRow;
  modules: ModuleRow[];
  lessons: LessonRow[];
  assets: LessonAssetRow[];
  comments: CommentRow[];
  ratings: RatingRow[];
};

type Assessment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  scope_type: "course" | "trail" | "lesson";
  course_id: string | null;
  trail_id: string | null;
  lesson_id: string | null;
  trail_evaluation_mode: "per_course" | "general";
  access_condition:
    | "after_all_lessons"
    | "after_course_completion"
    | "after_trail_completion"
    | "after_lesson_completion"
    | "manual_release";
  min_correct_percentage: number;
  certificate_required: boolean;
  attempts_allowed: number;
  time_limit_minutes: number | null;
  question_order: "fixed" | "random";
  status: "draft" | "published" | "paused" | "archived" | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AssessmentAttempt = {
  id: string;
  assessment_id: string;
  user_id: string;
  status: string;
  correct_percentage: number;
  created_at: string;
};

type StudentAssessment = Assessment & {
  available: boolean;
  availabilityReason: string;
  lastAttempt?: AssessmentAttempt | null;
  questions?: AssessmentQuestion[];
  options?: AssessmentOption[];
};

type AssessmentQuestion = {
  id: string;
  assessment_id: string;
  question_type:
    | "single_choice"
    | "multiple_choice"
    | "short_text"
    | "long_text"
    | "true_false"
    | "scale";
  prompt: string;
  help_text: string | null;
  points: number;
  required: boolean;
  sort_order: number;
};

type AssessmentOption = {
  id: string;
  question_id: string;
  label: string;
  sort_order: number;
};

type AssessmentAnswerState = {
  selectedOptionIds: string[];
  textAnswer: string;
  numericAnswer: string;
};

type AssessmentSubmitResult = {
  attempt_id: string;
  status: string;
  score_points: number;
  max_points: number;
  correct_percentage: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

function normalizeStoragePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^public\//, "")
    .replace(/^materials\//, "");
}

function buildSupabasePublicUrl(bucket: string, path: string) {
  if (!supabaseUrl || !path) return undefined;

  const normalizedPath = normalizeStoragePath(path);

  if (!normalizedPath) return undefined;

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURI(
    normalizedPath,
  ).replace(/%2F/g, "/")}`;
}

function resolveLessonContentUrl(path: string | null | undefined) {
  if (!path) return undefined;

  const cleanPath = path.trim();

  if (!cleanPath) return undefined;

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }

  const withoutSlash = cleanPath.replace(/^\/+/, "");

  return buildSupabasePublicUrl("lesson-content", withoutSlash);
}

function resolveLessonMaterialUrl(path: string | null | undefined) {
  if (!path) return undefined;

  const cleanPath = path.trim();

  if (!cleanPath) return undefined;

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }

  const withoutSlash = cleanPath.replace(/^\/+/, "");

  return buildSupabasePublicUrl("lesson-materials", withoutSlash);
}

function resolveAssetUrl(path: string | null | undefined) {
  if (!path) return undefined;

  const cleanPath = path.trim();

  if (!cleanPath) return undefined;

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }

  const withoutSlash = cleanPath.replace(/^\/+/, "");

  if (
    withoutSlash.startsWith("materials/") ||
    withoutSlash.startsWith("lesson-assets/") ||
    withoutSlash.startsWith("uploads/")
  ) {
    return buildSupabasePublicUrl("materials", withoutSlash);
  }

  if (
    withoutSlash.startsWith("courses/") ||
    withoutSlash.startsWith("trilhas/") ||
    withoutSlash.startsWith("covers/") ||
    withoutSlash.startsWith("course-covers/")
  ) {
    return buildSupabasePublicUrl("covers", withoutSlash);
  }

  if (withoutSlash.startsWith("public/")) {
    return `/${withoutSlash.replace(/^public\//, "")}`;
  }

  return (
    buildSupabasePublicUrl("materials", withoutSlash) ?? `/${withoutSlash}`
  );
}

function withVideoPreviewFrame(url: string) {
  if (!url) return url;

  if (url.includes("#t=")) return url;

  return `${url}#t=2`;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "Aula";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}min`;
}

function formatFileSize(size: number | null | undefined) {
  if (!size || size <= 0) return "Arquivo";

  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getContentLabel(type: string | null | undefined) {
  const normalizedType = (type ?? "").toLowerCase();

  if (normalizedType.includes("video")) return "Vídeo";
  if (normalizedType.includes("audio")) return "Áudio";
  if (normalizedType.includes("texto") || normalizedType.includes("text"))
    return "Texto";
  if (normalizedType.includes("power") || normalizedType.includes("ppt"))
    return "PowerPoint";
  if (normalizedType.includes("pdf")) return "PDF";
  if (normalizedType.includes("image") || normalizedType.includes("imagem"))
    return "Imagem";
  if (normalizedType.includes("live") || normalizedType.includes("ao_vivo"))
    return "Ao vivo";
  if (normalizedType.includes("external") || normalizedType.includes("link"))
    return "Link externo";

  return "Aula";
}

function getLessonDisplayLabel(lesson: LessonRow) {
  const normalizedType = (lesson.content_type ?? "").toLowerCase();
  const normalizedSource = (lesson.source_mode ?? "").toLowerCase();
  const normalizedProvider = (lesson.video_provider ?? "").toLowerCase();

  if (
    normalizedSource === "zoom_recording" ||
    normalizedProvider === "zoom" ||
    normalizedType.includes("video")
  ) {
    return "Vídeo Aula";
  }

  if (normalizedType.includes("audio")) {
    return "Aula em Áudio";
  }

  if (normalizedType.includes("power") || normalizedType.includes("ppt")) {
    return "Aula em Slides";
  }

  if (normalizedType.includes("pdf")) {
    return "Material PDF";
  }

  if (normalizedType.includes("image") || normalizedType.includes("imagem")) {
    return "Aula em Imagem";
  }

  if (normalizedType.includes("live") || normalizedType.includes("ao_vivo")) {
    return "Aula ao Vivo";
  }

  if (normalizedType.includes("texto") || normalizedType.includes("text")) {
    return "Aula em Texto";
  }

  return "Aula";
}

function getContentIcon(type: string | null | undefined) {
  const normalizedType = (type ?? "").toLowerCase();

  if (normalizedType.includes("video")) return Video;
  if (normalizedType.includes("audio")) return Headphones;
  if (normalizedType.includes("power") || normalizedType.includes("ppt"))
    return Presentation;
  if (normalizedType.includes("image") || normalizedType.includes("imagem"))
    return ImageIcon;
  if (normalizedType.includes("live") || normalizedType.includes("ao_vivo"))
    return Play;
  return FileText;
}

function isVideoType(lesson: LessonRow) {
  const value =
    `${lesson.content_type ?? ""} ${lesson.primary_asset_mime_type ?? ""}`.toLowerCase();
  return value.includes("video");
}

function isAudioType(lesson: LessonRow) {
  const value =
    `${lesson.content_type ?? ""} ${lesson.primary_asset_mime_type ?? ""}`.toLowerCase();
  return value.includes("audio");
}

function isImageType(lesson: LessonRow) {
  const value =
    `${lesson.content_type ?? ""} ${lesson.primary_asset_mime_type ?? ""}`.toLowerCase();
  return value.includes("image") || value.includes("imagem");
}

function isPdfType(lesson: LessonRow) {
  const value =
    `${lesson.content_type ?? ""} ${lesson.primary_asset_mime_type ?? ""} ${lesson.primary_asset_name ?? ""}`.toLowerCase();
  return value.includes("pdf");
}

function isPowerPointType(lesson: LessonRow) {
  const value =
    `${lesson.content_type ?? ""} ${lesson.primary_asset_mime_type ?? ""} ${lesson.primary_asset_name ?? ""}`.toLowerCase();
  return (
    value.includes("power") ||
    value.includes("presentation") ||
    value.includes("ppt")
  );
}

function isZoomUrl(url: string | null | undefined) {
  if (!url) return false;

  const normalizedUrl = url.toLowerCase();

  return (
    normalizedUrl.includes("zoom.us") ||
    normalizedUrl.includes("zoom.com") ||
    normalizedUrl.includes("zoomgov.com")
  );
}

function isDirectVideoUrl(url: string | null | undefined) {
  if (!url) return false;

  const normalizedUrl = url.toLowerCase().split("?")[0];

  return (
    normalizedUrl.endsWith(".mp4") ||
    normalizedUrl.endsWith(".webm") ||
    normalizedUrl.endsWith(".ogg") ||
    normalizedUrl.endsWith(".mov") ||
    normalizedUrl.endsWith(".m4v")
  );
}

function isZoomRecordingLesson(lesson: LessonRow) {
  const sourceMode = (lesson.source_mode ?? "").toLowerCase();
  const videoProvider = (lesson.video_provider ?? "").toLowerCase();
  const zoomRecordingUrl =
    lesson.zoom_recording_url || lesson.video_url || lesson.external_url;

  return (
    sourceMode === "zoom_recording" ||
    videoProvider === "zoom" ||
    Boolean(
      zoomRecordingUrl &&
      isZoomUrl(zoomRecordingUrl) &&
      zoomRecordingUrl.includes("/rec/share/"),
    )
  );
}

function getZoomRecordingUrl(lesson: LessonRow) {
  return (
    resolveAssetUrl(lesson.zoom_recording_url) ||
    resolveAssetUrl(lesson.video_url) ||
    resolveAssetUrl(lesson.external_url)
  );
}

function getStudentName(user: User | null, profile: ProfileRow | null) {
  return (
    profile?.full_name?.trim() ||
    String(user?.user_metadata?.full_name ?? "").trim() ||
    user?.email ||
    "Aluno"
  );
}

async function loadStudentProgressContext(
  lessonId: string,
  lessonIds: string[] = [],
) {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set("lessonId", lessonId);

    if (lessonIds.length > 0) {
      searchParams.set("lessonIds", lessonIds.join(","));
    }

    const response = await fetch(
      `/api/student/lesson-progress?${searchParams.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        user: null as User | null,
        profile: null as ProfileRow | null,
        progress: null as ProgressRow | null,
        progresses: [] as ProgressRow[],
      };
    }

    const data = (await response.json()) as {
      user?: User | null;
      profile?: ProfileRow | null;
      progress?: ProgressRow | null;
      progresses?: ProgressRow[] | null;
    };

    return {
      user: data.user ?? null,
      profile: data.profile ?? null,
      progress: data.progress ?? null,
      progresses: data.progresses ?? [],
    };
  } catch {
    return {
      user: null as User | null,
      profile: null as ProfileRow | null,
      progress: null as ProgressRow | null,
      progresses: [] as ProgressRow[],
    };
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "A";

  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

async function createSignedStorageUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn = 60 * 60 * 6,
) {
  if (!path) return null;

  const cleanPath = path.trim().replace(/^\/+/, "");

  if (!cleanPath) return null;

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }

  try {
    const response = await fetch("/api/student/storage-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket,
        path: cleanPath,
        expiresIn,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      signedUrl?: string;
    };

    return data.signedUrl ?? null;
  } catch {
    return null;
  }
}

async function attachSignedLessonUrls(
  lesson: LessonRow,
  assets: LessonAssetRow[],
) {
  const primaryAssetSignedUrl = await createSignedStorageUrl(
    "lesson-content",
    lesson.primary_asset_path,
  );

  const assetsWithSignedUrls = await Promise.all(
    assets.map(async (asset) => ({
      ...asset,
      signed_url: await createSignedStorageUrl(
        "lesson-materials",
        asset.storage_path,
      ),
    })),
  );

  return {
    lesson: {
      ...lesson,
      primary_asset_signed_url: primaryAssetSignedUrl,
    },
    assets: assetsWithSignedUrls,
  };
}

async function loadLessonBundle(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<LessonBundle | null> {
  const { data: lessonData, error: lessonError } = await supabase
    .from("lessons")
    .select(
      "id,module_id,title,description,sort_order,status,content_type,video_provider,video_url,duration_sec,is_preview,source_mode,content_body,primary_asset_path,primary_asset_name,primary_asset_mime_type,primary_asset_size_bytes,external_url,live_provider,meeting_sdk,zoom_meeting_id,zoom_passcode,zoom_join_url,scheduled_start_at,scheduled_end_at,zoom_recording_url",
    )
    .eq("id", lessonId)
    .eq("status", "published")
    .maybeSingle<LessonRow>();

  if (lessonError || !lessonData) return null;

  const { data: moduleData, error: moduleError } = await supabase
    .from("course_modules")
    .select("id,course_id,title,description,sort_order,status")
    .eq("id", lessonData.module_id)
    .eq("status", "published")
    .maybeSingle<ModuleRow>();

  if (moduleError || !moduleData) return null;

  const { data: courseData, error: courseError } = await supabase
    .from("courses")
    .select(
      "id,slug,title,short_description,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,status",
    )
    .eq("id", moduleData.course_id)
    .eq("status", "published")
    .maybeSingle<CourseRow>();

  if (courseError || !courseData) return null;

  const { data: modulesData } = await supabase
    .from("course_modules")
    .select("id,course_id,title,description,sort_order,status")
    .eq("course_id", courseData.id)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  const modules = (modulesData ?? []) as ModuleRow[];
  const moduleIds = modules.map((item) => item.id);

  const { data: lessonsData } =
    moduleIds.length > 0
      ? await supabase
          .from("lessons")
          .select(
            "id,module_id,title,description,sort_order,status,content_type,video_provider,video_url,duration_sec,is_preview,source_mode,content_body,primary_asset_path,primary_asset_name,primary_asset_mime_type,primary_asset_size_bytes,external_url,live_provider,meeting_sdk,zoom_meeting_id,zoom_passcode,zoom_join_url,scheduled_start_at,scheduled_end_at,zoom_recording_url",
          )
          .in("module_id", moduleIds)
          .eq("status", "published")
          .order("sort_order", { ascending: true })
      : { data: [] };

  const { data: assetsData } = await supabase
    .from("lesson_assets")
    .select(
      "id,lesson_id,asset_type,title,storage_path,mime_type,size_bytes,sort_order,file_name",
    )
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: true });

  const { data: commentsData } = await supabase
    .from("lesson_comments")
    .select(
      "id,lesson_id,student_id,student_name,student_avatar_url,comment,status,admin_note,created_at",
    )
    .eq("lesson_id", lessonId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const { data: ratingsData } = await supabase
    .from("lesson_ratings")
    .select(
      "id,lesson_id,student_id,student_name,student_avatar_url,rating,review,status,admin_note,created_at",
    )
    .eq("lesson_id", lessonId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const signed = await attachSignedLessonUrls(
    lessonData,
    (assetsData ?? []) as LessonAssetRow[],
  );

  return {
    lesson: signed.lesson,
    currentModule: moduleData,
    course: courseData,
    modules,
    lessons: (lessonsData ?? []) as LessonRow[],
    assets: signed.assets,
    comments: (commentsData ?? []) as CommentRow[],
    ratings: (ratingsData ?? []) as RatingRow[],
  };
}

function formatQuestionType(type: AssessmentQuestion["question_type"]) {
  if (type === "single_choice") return "Escolha única";
  if (type === "multiple_choice") return "Múltipla escolha";
  if (type === "short_text") return "Resposta curta";
  if (type === "long_text") return "Resposta aberta";
  if (type === "true_false") return "Verdadeiro/Falso";
  return "Escala";
}

function getAnswerCompletion(
  question: AssessmentQuestion,
  answer: AssessmentAnswerState | undefined,
) {
  if (!answer) return false;

  if (
    question.question_type === "single_choice" ||
    question.question_type === "multiple_choice" ||
    question.question_type === "true_false"
  ) {
    return answer.selectedOptionIds.length > 0;
  }

  if (question.question_type === "scale") {
    return answer.numericAnswer.trim().length > 0;
  }

  return answer.textAnswer.trim().length > 0;
}

function getAssessmentAvailability(
  assessment: Assessment,
  bundle: LessonBundle,
  progressMap: Record<string, ProgressRow>,
) {
  const allLessonsCompleted = bundle.lessons.every((lesson) =>
    Boolean(progressMap[lesson.id]?.completed_at),
  );

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
      ? Boolean(progressMap[assessment.lesson_id]?.completed_at)
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
    available: false,
    reason: "Aguardando liberação da administração.",
  };
}

async function loadCourseAssessments(
  _supabase: SupabaseClient,
  bundle: LessonBundle,
  _userId: string | null,
  _progressMap: Record<string, ProgressRow>,
) {
  const lessonIds = bundle.lessons.map((lesson) => lesson.id);
  const params = new URLSearchParams();
  params.set("courseId", bundle.course.id);

  if (lessonIds.length > 0) {
    params.set("lessonIds", lessonIds.join(","));
  }

  const response = await fetch(`/api/student/course-assessments?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as {
    items?: StudentAssessment[];
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      data?.error || "Não foi possível carregar as avaliações deste curso.",
    );
  }

  return data?.items ?? [];
}

async function loadAssessmentQuestionsAndOptions(
  _supabase: SupabaseClient,
  assessment: StudentAssessment,
) {
  const questions = [...(assessment.questions ?? [])].sort(
    (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
  );
  const questionIds = new Set(questions.map((question) => question.id));
  const options = [...(assessment.options ?? [])]
    .filter((option) => questionIds.has(option.question_id))
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

  return {
    questions,
    options,
  };
}

function LessonContentShell({
  lesson,
  children,
}: {
  lesson: LessonRow;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#6f5b2f] bg-black">
      {children}
    </div>
  );
}

function seekVideoToTwoSeconds(event: React.SyntheticEvent<HTMLVideoElement>) {
  const video = event.currentTarget;

  if (video.dataset.previewSeekDone === "true") return;

  try {
    if (Number.isFinite(video.duration) && video.duration > 2) {
      video.currentTime = 2;
      video.dataset.previewSeekDone = "true";
    }
  } catch {
    video.dataset.previewSeekDone = "true";
  }
}

function LessonPlayer({
  lesson,
  onLessonCompleted,
}: {
  lesson: LessonRow;
  onLessonCompleted?: () => void;
}) {
  const uploadedContentUrl =
    lesson.primary_asset_signed_url ||
    resolveLessonContentUrl(lesson.primary_asset_path);
  const directVideoUrl = resolveAssetUrl(lesson.video_url);
  const externalUrl = resolveAssetUrl(lesson.external_url);
  const primaryUrl = uploadedContentUrl || directVideoUrl || externalUrl;

  if (isVideoType(lesson) && uploadedContentUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <video
          src={withVideoPreviewFrame(uploadedContentUrl)}
          onLoadedMetadata={seekVideoToTwoSeconds}
          onEnded={onLessonCompleted}
          controls
          playsInline
          preload="auto"
          className="aspect-video w-full bg-black object-contain"
        >
          Seu navegador não conseguiu carregar este vídeo.
        </video>
      </LessonContentShell>
    );
  }

  if (isVideoType(lesson) && primaryUrl && isDirectVideoUrl(primaryUrl)) {
    return (
      <LessonContentShell lesson={lesson}>
        <video
          src={withVideoPreviewFrame(primaryUrl)}
          onLoadedMetadata={seekVideoToTwoSeconds}
          onEnded={onLessonCompleted}
          controls
          playsInline
          preload="auto"
          className="aspect-video w-full bg-black object-contain"
        >
          Seu navegador não conseguiu carregar este vídeo.
        </video>
      </LessonContentShell>
    );
  }

  if (isVideoType(lesson) && lesson.primary_asset_path && !uploadedContentUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#DBC094]" />
          <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
            Carregando vídeo...
          </h2>
          <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-white/50">
            A plataforma está preparando o acesso seguro ao arquivo enviado no
            ADM.
          </p>
        </div>
      </LessonContentShell>
    );
  }

  if (isVideoType(lesson) && isZoomRecordingLesson(lesson)) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
          <Video className="h-7 w-7 text-[#DBC094]/75" />

          <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
            Vídeo ainda não enviado
          </h2>

          <p className="mt-2 max-w-[560px] text-xs leading-6 text-white/50">
            Esta aula ainda está cadastrada como gravação do Zoom. Para usar o
            player interno da plataforma, edite a aula no ADM, selecione Upload
            de vídeo e envie o arquivo da aula.
          </p>
        </div>
      </LessonContentShell>
    );
  }

  if (isVideoType(lesson) && primaryUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
          <Video className="h-7 w-7 text-[#DBC094]/75" />

          <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
            Vídeo externo
          </h2>

          <p className="mt-2 max-w-[560px] text-xs leading-6 text-white/50">
            O link cadastrado não é um arquivo de vídeo direto. Para usar o
            player interno, envie o vídeo por upload no ADM.
          </p>
        </div>
      </LessonContentShell>
    );
  }

  if (isAudioType(lesson) && uploadedContentUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
          <Headphones className="h-7 w-7 text-[#DBC094]/75" />
          <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
            Aula em Áudio
          </h2>
          <audio
            src={uploadedContentUrl}
            controls
            onEnded={onLessonCompleted}
            className="mt-6 w-full max-w-[760px]"
          />
        </div>
      </LessonContentShell>
    );
  }

  if (isAudioType(lesson) && primaryUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
          <Headphones className="h-7 w-7 text-[#DBC094]/75" />
          <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
            Aula em Áudio
          </h2>
          <audio
            src={primaryUrl}
            controls
            onEnded={onLessonCompleted}
            className="mt-6 w-full max-w-[760px]"
          />
        </div>
      </LessonContentShell>
    );
  }

  if (isImageType(lesson) && uploadedContentUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video items-center justify-center p-4">
          <img
            src={uploadedContentUrl}
            alt={lesson.title}
            className="max-h-full max-w-full rounded-[14px] object-contain"
          />
        </div>
      </LessonContentShell>
    );
  }

  if (isImageType(lesson) && primaryUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video items-center justify-center p-4">
          <img
            src={primaryUrl}
            alt={lesson.title}
            className="max-h-full max-w-full rounded-[14px] object-contain"
          />
        </div>
      </LessonContentShell>
    );
  }

  if (isPdfType(lesson) && uploadedContentUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <iframe
          src={uploadedContentUrl}
          title={lesson.title}
          className="aspect-video w-full border-0 bg-white"
        />
      </LessonContentShell>
    );
  }

  if (isPdfType(lesson) && primaryUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <iframe
          src={primaryUrl}
          title={lesson.title}
          className="aspect-video w-full border-0 bg-white"
        />
      </LessonContentShell>
    );
  }

  if (isPowerPointType(lesson) && uploadedContentUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
          <Presentation className="h-7 w-7 text-[#DBC094]/75" />
          <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
            Aula em Slides
          </h2>
          <a
            href={uploadedContentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-xs font-semibold text-black transition hover:bg-[#DBC094]"
          >
            Abrir slides
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </LessonContentShell>
    );
  }

  if (isPowerPointType(lesson) && primaryUrl) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
          <Presentation className="h-7 w-7 text-[#DBC094]/75" />
          <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
            Aula em Slides
          </h2>
          <a
            href={primaryUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-xs font-semibold text-black transition hover:bg-[#DBC094]"
          >
            Abrir slides
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </LessonContentShell>
    );
  }

  if (lesson.external_url) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
          <ExternalLink className="h-7 w-7 text-[#DBC094]/75" />
          <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
            Conteúdo externo
          </h2>
          <a
            href={lesson.external_url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-xs font-semibold text-black transition hover:bg-[#DBC094]"
          >
            Acessar conteúdo
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </LessonContentShell>
    );
  }

  if ((lesson.content_type ?? "").toLowerCase().includes("text")) {
    return (
      <LessonContentShell lesson={lesson}>
        <div className="aspect-video overflow-y-auto bg-black px-6 py-6 md:px-8 md:py-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {lesson.content_body ? (
            <div className="max-w-[980px] whitespace-pre-wrap break-words text-left text-[16px] leading-8 text-white/78 md:text-[17px] md:leading-9">
              {lesson.content_body}
            </div>
          ) : (
            <p className="max-w-[620px] text-left text-[15px] leading-7 text-white/56">
              Esta aula ainda não possui conteúdo textual publicado.
            </p>
          )}
        </div>
      </LessonContentShell>
    );
  }

  return (
    <LessonContentShell lesson={lesson}>
      <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
        <FileText className="h-7 w-7 text-[#DBC094]/75" />

        <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white">
          Conteúdo da aula
        </h2>

        <p className="mt-2 max-w-[560px] text-xs leading-6 text-white/50">
          Esta aula ainda não possui conteúdo principal publicado.
        </p>
      </div>
    </LessonContentShell>
  );
}

export default function Page() {
  const [supabase] = useState(() => getSupabaseClient());
  const [lessonId, setLessonId] = useState("");
  const [bundle, setBundle] = useState<LessonBundle | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [progressByLessonId, setProgressByLessonId] = useState<
    Record<string, ProgressRow>
  >({});
  const [comment, setComment] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [sendingRating, setSendingRating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [completionFlow, setCompletionFlow] = useState<CompletionFlow | null>(
    null,
  );

  const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    string | null
  >(null);
  const [assessmentQuestions, setAssessmentQuestions] = useState<
    AssessmentQuestion[]
  >([]);
  const [assessmentOptions, setAssessmentOptions] = useState<
    AssessmentOption[]
  >([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState<
    Record<string, AssessmentAnswerState>
  >({});
  const [assessmentQuestionIndex, setAssessmentQuestionIndex] = useState(0);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const [assessmentMessage, setAssessmentMessage] = useState("");
  const [assessmentResult, setAssessmentResult] =
    useState<AssessmentSubmitResult | null>(null);
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [certificateMessage, setCertificateMessage] = useState("");

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1] ?? "";
    setLessonId(id);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!lessonId) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setFeedback("");

      const loadedBundle = await loadLessonBundle(supabase, lessonId);
      const courseLessonIds =
        loadedBundle?.lessons.map((item) => item.id) ?? [];
      const studentContext = await loadStudentProgressContext(
        lessonId,
        courseLessonIds,
      );

      const currentUser = studentContext.user;
      const loadedProfile = studentContext.profile;
      const progressMap = studentContext.progresses.reduce<
        Record<string, ProgressRow>
      >((map, item) => {
        map[item.lesson_id] = item;
        return map;
      }, {});
      const loadedProgress = progressMap[lessonId] ?? studentContext.progress;
      let loadedAssessments: StudentAssessment[] = [];

      if (loadedBundle) {
        try {
          loadedAssessments = await loadCourseAssessments(
            supabase,
            loadedBundle,
            currentUser?.id ?? null,
            progressMap,
          );
        } catch (assessmentError) {
          console.error(
            "Erro ao carregar avaliações reais do curso:",
            assessmentError,
          );
          loadedAssessments = [];
        }
      }

      if (!mounted) return;

      setUser(currentUser ?? null);
      setProfile(loadedProfile);
      setProgress(loadedProgress);
      setProgressByLessonId(progressMap);
      setBundle(loadedBundle);
      setAssessments(loadedAssessments);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [lessonId, supabase]);

  useEffect(() => {
    if (!completionFlow?.redirect_url) return;

    const timer = window.setTimeout(() => {
      window.location.href = completionFlow.redirect_url || "/aluno";
    }, completionFlow.redirect_delay_ms);

    return () => {
      window.clearTimeout(timer);
    };
  }, [completionFlow]);

  const orderedLessons = useMemo(() => {
    if (!bundle) return [];

    const moduleOrder = new Map(
      bundle.modules.map((module, index) => [module.id, index]),
    );

    return [...bundle.lessons].sort((a, b) => {
      const moduleA = moduleOrder.get(a.module_id) ?? 0;
      const moduleB = moduleOrder.get(b.module_id) ?? 0;

      if (moduleA !== moduleB) return moduleA - moduleB;

      return a.sort_order - b.sort_order;
    });
  }, [bundle]);

  const currentLessonIndex = orderedLessons.findIndex(
    (item) => item.id === lessonId,
  );
  const previousLesson =
    currentLessonIndex > 0 ? orderedLessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < orderedLessons.length - 1
      ? orderedLessons[currentLessonIndex + 1]
      : null;

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, LessonRow[]>();

    orderedLessons.forEach((lesson) => {
      const current = map.get(lesson.module_id) ?? [];
      current.push(lesson);
      map.set(lesson.module_id, current);
    });

    return map;
  }, [orderedLessons]);

  const approvedRatings = bundle?.ratings ?? [];
  const ratingByStudentId = useMemo(() => {
    const map = new Map<string, RatingRow>();

    approvedRatings.forEach((rating) => {
      if (rating.student_id && !map.has(rating.student_id)) {
        map.set(rating.student_id, rating);
      }
    });

    return map;
  }, [approvedRatings]);

  const averageRating =
    approvedRatings.length > 0
      ? approvedRatings.reduce((total, item) => total + item.rating, 0) /
        approvedRatings.length
      : 0;

  const currentLessonProgress = bundle
    ? (progressByLessonId[bundle.lesson.id] ?? progress)
    : progress;
  const currentLessonCompleted = Boolean(currentLessonProgress?.completed_at);
  const completedLessonsCount = orderedLessons.filter((lesson) =>
    Boolean(progressByLessonId[lesson.id]?.completed_at),
  ).length;
  const totalLessonsCount = orderedLessons.length;
  const progressPercent =
    totalLessonsCount > 0
      ? Math.min(
          100,
          Math.round((completedLessonsCount / totalLessonsCount) * 100),
        )
      : 0;
  const currentAssessment = selectedAssessmentId
    ? (assessments.find(
        (assessment) => assessment.id === selectedAssessmentId,
      ) ?? null)
    : null;
  const currentAssessmentQuestion =
    assessmentQuestions[assessmentQuestionIndex] ?? null;
  const assessmentOptionsByQuestion = useMemo(() => {
    return assessmentOptions.reduce((map, option) => {
      const current = map.get(option.question_id) ?? [];
      current.push(option);
      map.set(option.question_id, current);
      return map;
    }, new Map<string, AssessmentOption[]>());
  }, [assessmentOptions]);
  const completedAssessmentRequired = assessmentQuestions.filter((question) =>
    question.required
      ? getAnswerCompletion(question, assessmentAnswers[question.id])
      : true,
  ).length;
  const assessmentProgress = assessmentQuestions.length
    ? Math.round(
        (completedAssessmentRequired / assessmentQuestions.length) * 100,
      )
    : 0;
  const canSubmitAssessment =
    assessmentQuestions.length > 0 &&
    assessmentQuestions.every((question) =>
      question.required
        ? getAnswerCompletion(question, assessmentAnswers[question.id])
        : true,
    );

  async function refreshBundle() {
    if (!lessonId) return;

    const loadedBundle = await loadLessonBundle(supabase, lessonId);
    setBundle(loadedBundle);
  }

  function closeAssessment() {
    setSelectedAssessmentId(null);
    setAssessmentQuestions([]);
    setAssessmentOptions([]);
    setAssessmentAnswers({});
    setAssessmentQuestionIndex(0);
    setAssessmentMessage("");
    setAssessmentResult(null);

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  async function loadSelectedAssessmentContent(assessment: StudentAssessment) {
    setLoadingAssessment(true);
    setAssessmentMessage("");
    setAssessmentQuestions([]);
    setAssessmentOptions([]);
    setAssessmentAnswers({});
    setAssessmentQuestionIndex(0);
    setAssessmentResult(null);

    try {
      const content = await loadAssessmentQuestionsAndOptions(
        supabase,
        assessment,
      );

      setAssessmentQuestions(content.questions);
      setAssessmentOptions(content.options);
    } catch (error) {
      setAssessmentMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar esta avaliação.",
      );
    } finally {
      setLoadingAssessment(false);
    }
  }

  async function openAssessment(assessment: StudentAssessment) {
    setSelectedAssessmentId(assessment.id);
    setAssessmentMessage("");
    setAssessmentResult(null);

    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?avaliacao=${assessment.id}`,
      );
    }

    if (!assessment.available) {
      setAssessmentQuestions([]);
      setAssessmentOptions([]);
      setAssessmentAnswers({});
      setAssessmentQuestionIndex(0);
      setAssessmentMessage(assessment.availabilityReason);
      return;
    }

    await loadSelectedAssessmentContent(assessment);
  }

  function updateAssessmentAnswer(
    questionId: string,
    values: Partial<AssessmentAnswerState>,
  ) {
    setAssessmentAnswers((current) => ({
      ...current,
      [questionId]: {
        selectedOptionIds: current[questionId]?.selectedOptionIds ?? [],
        textAnswer: current[questionId]?.textAnswer ?? "",
        numericAnswer: current[questionId]?.numericAnswer ?? "",
        ...values,
      },
    }));
  }

  function toggleAssessmentOption(
    question: AssessmentQuestion,
    optionId: string,
  ) {
    const current = assessmentAnswers[question.id]?.selectedOptionIds ?? [];

    if (question.question_type === "multiple_choice") {
      updateAssessmentAnswer(question.id, {
        selectedOptionIds: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      });
      return;
    }

    updateAssessmentAnswer(question.id, {
      selectedOptionIds: [optionId],
    });
  }

  function renderAssessmentAnswer(question: AssessmentQuestion) {
    const answer = assessmentAnswers[question.id];
    const questionOptions = assessmentOptionsByQuestion.get(question.id) ?? [];

    if (
      question.question_type === "single_choice" ||
      question.question_type === "multiple_choice" ||
      question.question_type === "true_false"
    ) {
      return (
        <div className="mt-7 space-y-2.5">
          {questionOptions.map((option) => {
            const selected = answer?.selectedOptionIds.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleAssessmentOption(question, option.id)}
                className={
                  selected
                    ? "flex w-full items-center gap-3 rounded-md border border-[#DBC094] bg-[#DBC094]/12 px-4 py-3.5 text-left text-[15px] leading-6 text-white transition"
                    : "flex w-full items-center gap-3 rounded-md border border-white/10 bg-white/[0.025] px-4 py-3.5 text-left text-[15px] leading-6 text-white/62 transition hover:border-[#DBC094]/42 hover:text-white"
                }
              >
                <span
                  className={
                    selected
                      ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#DBC094] bg-[#DBC094]"
                      : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20"
                  }
                >
                  {selected ? (
                    <span className="h-2 w-2 rounded-full bg-black" />
                  ) : null}
                </span>
                {option.label}
              </button>
            );
          })}

          {!questionOptions.length ? (
            <p className="text-[14px] leading-6 text-[#DBC094]">
              Esta questão ainda não possui alternativas cadastradas no ADM.
            </p>
          ) : null}
        </div>
      );
    }

    if (question.question_type === "scale") {
      return (
        <div className="mt-7 flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = answer?.numericAnswer === String(value);

            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  updateAssessmentAnswer(question.id, {
                    numericAnswer: String(value),
                  })
                }
                className={
                  selected
                    ? "flex h-12 w-12 items-center justify-center rounded-full border border-[#DBC094] bg-[#DBC094] text-[15px] font-semibold text-black transition"
                    : "flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.025] text-[15px] font-semibold text-white/52 transition hover:border-[#DBC094]/42 hover:text-white"
                }
              >
                {value}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <textarea
        value={answer?.textAnswer ?? ""}
        onChange={(event) =>
          updateAssessmentAnswer(question.id, {
            textAnswer: event.target.value,
          })
        }
        rows={question.question_type === "short_text" ? 4 : 7}
        placeholder="Digite sua resposta..."
        className="mt-7 w-full resize-none rounded-md border border-white/10 bg-white/[0.025] px-5 py-4 text-[15px] leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#DBC094]/60"
      />
    );
  }

  async function submitAssessment() {
    if (!currentAssessment || submittingAssessment || !canSubmitAssessment) {
      return;
    }

    setSubmittingAssessment(true);
    setAssessmentMessage("");
    setCertificateMessage("");

    const payload = assessmentQuestions.map((question) => {
      const answer = assessmentAnswers[question.id] ?? {
        selectedOptionIds: [],
        textAnswer: "",
        numericAnswer: "",
      };

      return {
        question_id: question.id,
        selected_option_ids: answer.selectedOptionIds,
        text_answer: answer.textAnswer,
        numeric_answer: answer.numericAnswer,
      };
    });

    const { data, error } = await supabase.rpc("assessment_submit_attempt", {
      p_assessment_id: currentAssessment.id,
      p_answers: payload,
    });

    setSubmittingAssessment(false);

    if (error) {
      setAssessmentMessage(error.message);
      return;
    }

    const firstResult = Array.isArray(data)
      ? (data[0] as AssessmentSubmitResult | undefined)
      : null;

    if (firstResult) {
      setAssessmentResult(firstResult);

      if (user?.id) {
        setAssessments((current) =>
          current.map((assessment) =>
            assessment.id === currentAssessment.id
              ? {
                  ...assessment,
                  lastAttempt: {
                    id: firstResult.attempt_id,
                    assessment_id: currentAssessment.id,
                    user_id: user.id,
                    status: firstResult.status,
                    correct_percentage: firstResult.correct_percentage,
                    created_at: new Date().toISOString(),
                  },
                }
              : assessment,
          ),
        );
      }
    }
  }

  async function issueCertificateAfterApproval() {
    if (!bundle?.course?.id || issuingCertificate) {
      return;
    }

    setIssuingCertificate(true);
    setCertificateMessage("");

    try {
      const response = await fetch(
        `/api/student/certificados?courseId=${bundle.course.id}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = (await response.json().catch(() => null)) as {
        eligible?: boolean;
        reason?: string;
        error?: string;
        certificate?: { id?: string; certificate_url?: string | null } | null;
      } | null;

      if (!response.ok) {
        setCertificateMessage(
          data?.error || "Não foi possível emitir o certificado.",
        );
        return;
      }

      if (!data?.eligible) {
        setCertificateMessage(
          data?.reason ||
            "O certificado ainda não está liberado para este curso.",
        );
        return;
      }

      setCertificateMessage(data.reason || "Certificado emitido com sucesso.");
      window.location.href = "/aluno/area/certificados";
    } catch (error) {
      console.error("Erro ao emitir certificado:", error);
      setCertificateMessage("Não foi possível emitir o certificado.");
    } finally {
      setIssuingCertificate(false);
    }
  }

  function renderAssessmentContent() {
    if (!currentAssessment || !bundle) return null;

    if (!currentAssessment.available) {
      return (
        <div className="overflow-hidden rounded-[12px] border border-[#6f5b2f] bg-black">
          <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
            <LockKeyhole className="h-8 w-8 text-[#DBC094]" />
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#DBC094]">
              Avaliação bloqueada
            </p>
            <h2 className="mt-3 max-w-[620px] text-[25px] font-semibold leading-tight text-white">
              {currentAssessment.title}
            </h2>
            <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-white/52">
              {assessmentMessage || currentAssessment.availabilityReason}
            </p>
            <button
              type="button"
              onClick={closeAssessment}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-white/10 px-5 text-[14px] font-semibold text-white/62 transition hover:border-[#DBC094]/40 hover:text-[#DBC094]"
            >
              Voltar para a aula
            </button>
          </div>
        </div>
      );
    }

    if (loadingAssessment) {
      return (
        <div className="overflow-hidden rounded-[12px] border border-[#6f5b2f] bg-black">
          <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#DBC094]" />
            <p className="mt-4 text-[14px] font-semibold uppercase tracking-[0.14em] text-white/55">
              Carregando avaliação
            </p>
          </div>
        </div>
      );
    }

    if (assessmentResult) {
      const passed = assessmentResult.status === "passed";

      return (
        <div className="overflow-hidden rounded-[12px] border border-[#6f5b2f] bg-black">
          <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
            {passed ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-300" />
            ) : (
              <XCircle className="h-12 w-12 text-red-300" />
            )}
            <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#DBC094]">
              Resultado da avaliação
            </p>
            <h2 className="mt-3 text-[32px] font-semibold tracking-tight text-white">
              {passed ? "Aprovado" : "Tente novamente"}
            </h2>
            <p className="mt-3 max-w-[620px] text-[16px] leading-7 text-white/58">
              Você alcançou{" "}
              {Number(assessmentResult.correct_percentage).toFixed(0)}%. O
              mínimo desta avaliação é{" "}
              {currentAssessment.min_correct_percentage}%.
            </p>
            <div className="mt-6 h-2 w-full max-w-[420px] overflow-hidden rounded-full bg-white/10">
              <div
                className={
                  passed ? "h-full bg-emerald-300" : "h-full bg-[#DBC094]"
                }
                style={{
                  width: `${Math.min(
                    100,
                    Number(assessmentResult.correct_percentage),
                  )}%`,
                }}
              />
            </div>
            {certificateMessage ? (
              <div className="mt-5 max-w-[520px] rounded-md border border-[#6f5b2f] bg-[#17130d] px-4 py-3 text-[14px] font-semibold text-[#DBC094]">
                {certificateMessage}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {passed ? (
                <button
                  type="button"
                  onClick={() => void issueCertificateAfterApproval()}
                  disabled={issuingCertificate}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {issuingCertificate ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Emitir certificado
                </button>
              ) : null}

              <button
                type="button"
                onClick={closeAssessment}
                className={
                  passed
                    ? "inline-flex h-10 items-center justify-center rounded-md border border-white/10 px-5 text-[14px] font-semibold text-white/62 transition hover:border-[#DBC094]/40 hover:text-[#DBC094]"
                    : "inline-flex h-10 items-center justify-center rounded-md bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:bg-white"
                }
              >
                Voltar para o curso
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!currentAssessmentQuestion) {
      return (
        <div className="overflow-hidden rounded-[12px] border border-[#6f5b2f] bg-black">
          <div className="flex aspect-video flex-col items-center justify-center p-6 text-center">
            <ClipboardCheck className="h-8 w-8 text-[#DBC094]" />
            <h2 className="mt-4 text-[24px] font-semibold text-white">
              Avaliação indisponível
            </h2>
            <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-white/52">
              Esta avaliação ainda não possui questões cadastradas no ADM.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-[12px] border border-[#6f5b2f] bg-black">
        <div className="min-h-[610px] px-5 py-6 sm:px-8 sm:py-8">
          <header className="border-b border-white/10 pb-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#DBC094]">
                  Avaliação Final
                </p>
                <h2 className="mt-2 line-clamp-2 text-[24px] font-semibold leading-tight tracking-tight text-white md:text-[29px]">
                  {currentAssessment.title}
                </h2>
              </div>

              <div className="shrink-0 text-left md:text-right">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38">
                  Progresso da prova
                </p>
                <p className="mt-1 text-[15px] font-semibold text-[#DBC094]">
                  {assessmentProgress}% • {completedAssessmentRequired}/
                  {assessmentQuestions.length} respondidas
                </p>
              </div>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#DBC094] transition-all"
                style={{ width: `${assessmentProgress}%` }}
              />
            </div>
          </header>

          {assessmentMessage ? (
            <div className="mt-5 rounded-md border border-[#DBC094]/20 bg-[#DBC094]/8 px-4 py-3 text-[14px] text-[#DBC094]">
              {assessmentMessage}
            </div>
          ) : null}

          <article className="mx-auto max-w-[880px] pt-8">
            <h3 className="text-[29px] font-semibold leading-tight tracking-tight text-white md:text-[34px]">
              {currentAssessmentQuestion.prompt}
            </h3>

            {renderAssessmentAnswer(currentAssessmentQuestion)}

            <footer className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  setAssessmentQuestionIndex((current) =>
                    Math.max(0, current - 1),
                  )
                }
                disabled={assessmentQuestionIndex === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 px-5 text-[14px] font-semibold text-white/58 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              {assessmentQuestionIndex < assessmentQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setAssessmentQuestionIndex((current) =>
                      Math.min(assessmentQuestions.length - 1, current + 1),
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:bg-white"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitAssessment}
                  disabled={!canSubmitAssessment || submittingAssessment}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submittingAssessment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Finalizar avaliação
                </button>
              )}
            </footer>
          </article>
        </div>
      </div>
    );
  }

  async function hasApprovedFinalQuizForCurrentCourse() {
    if (!bundle || !user?.id) return true;

    try {
      const { data: quizzes, error: quizzesError } = await supabase
        .from("course_quizzes")
        .select("id,status")
        .eq("course_id", bundle.course.id)
        .in("status", ["published", "active"]);

      if (quizzesError || !quizzes || quizzes.length === 0) {
        return true;
      }

      const quizIds = quizzes.map((quiz) => String(quiz.id));

      const { data: attempts, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select(
          "id,quiz_id,score_percent,score,percentage,correct_percent,passed,status",
        )
        .eq("student_id", user.id)
        .in("quiz_id", quizIds);

      if (attemptsError || !attempts || attempts.length === 0) {
        return false;
      }

      return attempts.some((attempt) => {
        const numericScore = Number(
          attempt.score_percent ??
            attempt.percentage ??
            attempt.correct_percent ??
            attempt.score ??
            0,
        );

        return attempt.passed === true || numericScore >= 80;
      });
    } catch {
      return true;
    }
  }

  async function findNextCourseInCurrentTrack() {
    if (!bundle) return null;

    try {
      const { data: currentMaps, error: currentMapsError } = await supabase
        .from("course_category_map")
        .select("course_id,category_id,sort_order")
        .eq("course_id", bundle.course.id)
        .order("sort_order", { ascending: true });

      if (currentMapsError || !currentMaps || currentMaps.length === 0) {
        return null;
      }

      for (const currentMap of currentMaps) {
        const { data: trackMaps, error: trackMapsError } = await supabase
          .from("course_category_map")
          .select("course_id,category_id,sort_order")
          .eq("category_id", currentMap.category_id)
          .order("sort_order", { ascending: true });

        if (trackMapsError || !trackMaps || trackMaps.length === 0) continue;

        const currentIndex = trackMaps.findIndex(
          (item) => item.course_id === bundle.course.id,
        );
        const nextMap = currentIndex >= 0 ? trackMaps[currentIndex + 1] : null;

        if (!nextMap?.course_id) continue;

        const { data: nextCourse, error: nextCourseError } = await supabase
          .from("courses")
          .select("id,slug,title,status")
          .eq("id", nextMap.course_id)
          .eq("status", "published")
          .maybeSingle<{
            id: string;
            slug: string;
            title: string;
            status: string;
          }>();

        if (!nextCourseError && nextCourse?.slug) {
          return nextCourse;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async function resolveCompletionFlowAfterProgressSave(
    updatedProgressMap: Record<string, ProgressRow>,
    currentAssessments: StudentAssessment[] = assessments,
  ): Promise<CompletionFlow | null> {
    if (!bundle) return null;

    const isLastLessonOfCurrentCourse = !nextLesson;

    if (!isLastLessonOfCurrentCourse || orderedLessons.length === 0) {
      return null;
    }

    const courseIsFullyCompleted = orderedLessons.every((lesson) =>
      Boolean(updatedProgressMap[lesson.id]?.completed_at),
    );

    if (!courseIsFullyCompleted) {
      return null;
    }

    const courseAssessments = currentAssessments;

    if (courseAssessments.length === 0) {
      return {
        kind: "track_completed_quiz_required",
        message:
          "Você concluiu as aulas deste curso. A avaliação final ainda não foi localizada no ADM para este curso, por isso a plataforma não vai redirecionar para a home.",
        redirect_url: null,
        redirect_delay_ms: 0,
      };
    }

    const pendingAssessment = courseAssessments.find((assessment) => {
      const availability = getAssessmentAvailability(
        assessment,
        bundle,
        updatedProgressMap,
      );

      return (
        availability.available && assessment.lastAttempt?.status !== "passed"
      );
    });

    if (pendingAssessment) {
      return {
        kind: "track_completed_quiz_required",
        message:
          "Você concluiu as aulas deste curso. A avaliação final foi liberada no menu do curso para concluir esta etapa.",
        redirect_url: null,
        redirect_delay_ms: 0,
      };
    }

    const hasUnreleasedAssessment = courseAssessments.some((assessment) => {
      const availability = getAssessmentAvailability(
        assessment,
        bundle,
        updatedProgressMap,
      );

      return (
        !availability.available && assessment.lastAttempt?.status !== "passed"
      );
    });

    if (hasUnreleasedAssessment) {
      return {
        kind: "track_completed_quiz_required",
        message:
          "Você concluiu as aulas deste curso. A avaliação final permanece aguardando a regra de liberação configurada no ADM.",
        redirect_url: null,
        redirect_delay_ms: 0,
      };
    }

    const nextCourse = await findNextCourseInCurrentTrack();

    if (nextCourse?.slug) {
      return {
        kind: "course_completed_next_course",
        message:
          "Você concluiu com sucesso este curso, parabéns. Você está sendo direcionado para o próximo curso desta trilha.",
        redirect_url: `/aluno/trilhas/${nextCourse.slug}`,
        redirect_delay_ms: 3200,
      };
    }

    return {
      kind: "track_completed_certificate",
      message:
        "Você concluiu com sucesso esta etapa, parabéns. A avaliação final já foi concluída e a etapa está liberada para emissão de certificado quando aplicável.",
      redirect_url: null,
      redirect_delay_ms: 0,
    };
  }

  async function markAsCompleted(options: { silent?: boolean } = {}) {
    if (!bundle || savingProgress) return;

    const shouldShowFeedback = !options.silent;

    setSavingProgress(true);

    if (shouldShowFeedback) {
      setFeedback("");
    }

    const now = new Date().toISOString();
    const progressSeconds = bundle.lesson.duration_sec ?? 0;

    try {
      const response = await fetch("/api/student/lesson-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson_id: bundle.lesson.id,
          course_id: bundle.course.id,
          course_slug: bundle.course.slug,
          lesson_ids: orderedLessons.map((lesson) => lesson.id),
          is_last_lesson: !nextLesson,
          progress_seconds: progressSeconds,
          completed_at: now,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        progress?: ProgressRow | null;
        user?: User | null;
        profile?: ProfileRow | null;
        error?: string;
      } | null;

      if (!response.ok || !data?.progress) {
        if (shouldShowFeedback) {
          setFeedback("Não foi possível registrar o progresso desta aula.");
        }

        return;
      }

      const updatedProgressMap = {
        ...progressByLessonId,
        [data.progress.lesson_id]: data.progress,
      };

      setProgress(data.progress);
      setProgressByLessonId(updatedProgressMap);

      const effectiveUserId = data.user?.id ?? user?.id ?? null;
      let updatedAssessments = assessments.map((assessment) => {
        const availability = getAssessmentAvailability(
          assessment,
          bundle,
          updatedProgressMap,
        );

        return {
          ...assessment,
          available: availability.available,
          availabilityReason: availability.reason,
        };
      });

      try {
        updatedAssessments = await loadCourseAssessments(
          supabase,
          bundle,
          effectiveUserId,
          updatedProgressMap,
        );
      } catch (assessmentError) {
        console.error(
          "Erro ao recarregar avaliações do curso:",
          assessmentError,
        );
      }

      setAssessments(updatedAssessments);

      if (data.user) {
        setUser(data.user);
      }

      if (data.profile) {
        setProfile(data.profile);
      }

      const completion = await resolveCompletionFlowAfterProgressSave(
        updatedProgressMap,
        updatedAssessments,
      );

      if (completion && completion.kind !== "none") {
        setCompletionFlow(completion);
      }

      if (shouldShowFeedback) {
        setFeedback(
          completion && completion.kind !== "none" ? "" : "Progresso salvo.",
        );
      }
    } catch {
      if (shouldShowFeedback) {
        setFeedback("Não foi possível registrar o progresso desta aula.");
      }
    } finally {
      setSavingProgress(false);
    }
  }

  async function submitComment() {
    if (!bundle || !comment.trim()) return;

    setSendingComment(true);
    setFeedback("");

    try {
      const response = await fetch("/api/student/lesson-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "comment",
          lesson_id: bundle.lesson.id,
          comment: comment.trim(),
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        setFeedback(data?.error || "Não foi possível enviar o comentário.");
        return;
      }

      setComment("");
      setFeedback(data?.message || "Comentário enviado para análise.");
    } catch (error) {
      console.error("Erro inesperado ao enviar comentário da aula:", error);
      setFeedback("Não foi possível enviar o comentário.");
    } finally {
      setSendingComment(false);
    }
  }

  async function submitRating(rating: number) {
    if (!bundle || rating <= 0) return;

    setSelectedRating(rating);
    setSendingRating(true);
    setFeedback("");

    try {
      const response = await fetch("/api/student/lesson-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "rating",
          lesson_id: bundle.lesson.id,
          rating,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        setFeedback(data?.error || "Não foi possível enviar a avaliação.");
        return;
      }

      setFeedback(data?.message || "Avaliação enviada para análise.");
      await refreshBundle();
    } catch (error) {
      console.error("Erro inesperado ao enviar avaliação da aula:", error);
      setFeedback("Não foi possível enviar a avaliação.");
    } finally {
      setSendingRating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020304] text-white">
        <StudentHeader />
        <section className="flex min-h-screen items-center justify-center px-6 pt-[78px]">
          <div className="flex items-center gap-3 text-[15px] font-medium uppercase tracking-[0.14em] text-white/55">
            <Loader2 className="h-4 w-4 animate-spin text-[#DBC094]" />
            Carregando aula
          </div>
        </section>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="min-h-screen bg-[#020304] text-white">
        <StudentHeader />
        <section className="flex min-h-screen items-center justify-center px-6 pt-[78px] text-center">
          <div className="max-w-[460px]">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#DBC094]">
              Aula não encontrada
            </p>
            <h1 className="mt-3 text-[27px] font-semibold tracking-tight text-white">
              Este conteúdo não está disponível.
            </h1>
            <Link
              href="/aluno"
              className="mt-7 inline-flex h-9 items-center gap-2 rounded-md bg-white px-5 text-[15px] font-semibold text-black transition hover:bg-[#DBC094]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020304] text-white">
      <StudentHeader />

      <section className="pt-[56px]">
        <aside className="fixed bottom-0 left-0 top-[56px] z-30 hidden w-[300px] border-r border-white/10 bg-[#030406] lg:block">
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link
                href="/aluno"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/55 transition hover:text-[#DBC094]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Link>

              <div className="mt-7 border-b border-white/10 pb-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#DBC094]">
                  Curso
                </p>
                <h2 className="mt-1 line-clamp-2 text-[17px] font-semibold leading-5 text-white">
                  {bundle.course.title}
                </h2>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.1em] text-white/45">
                    <span>Progresso</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#DBC094]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                {bundle.modules.map((module, moduleIndex) => {
                  const moduleLessons = lessonsByModule.get(module.id) ?? [];
                  const isCurrentModule = module.id === bundle.currentModule.id;

                  return (
                    <details
                      key={module.id}
                      open={isCurrentModule}
                      className="group border-b border-white/10 py-3.5"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-white/45">
                            Módulo {String(moduleIndex + 1).padStart(2, "0")}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[16px] font-semibold leading-4 text-white">
                            {module.title}
                          </p>
                        </div>
                        <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-white/45 transition group-open:rotate-90 group-open:text-[#DBC094]" />
                      </summary>

                      <div className="mt-3 space-y-1">
                        {moduleLessons.map((lesson, lessonIndex) => {
                          const isActive = lesson.id === bundle.lesson.id;
                          const isCompleted = Boolean(
                            progressByLessonId[lesson.id]?.completed_at,
                          );

                          return (
                            <Link
                              key={lesson.id}
                              href={`/aluno/aulas/${lesson.id}`}
                              className={
                                isActive
                                  ? "flex items-center justify-between gap-2 border-t border-[#DBC094]/40 bg-[#DBC094]/10 px-3 py-2.5 text-[#DBC094]"
                                  : "flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 text-white/75 transition hover:bg-white/[0.03] hover:text-white"
                              }
                            >
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-white/40">
                                  Aula{" "}
                                  {String(lessonIndex + 1).padStart(2, "0")}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[15px] font-medium leading-4">
                                  {lesson.title}
                                </p>
                              </div>

                              {isCompleted ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#DBC094]" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/40" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}

                {assessments.length > 0 ? (
                  <details
                    open={Boolean(selectedAssessmentId)}
                    className="group border-b border-white/10 py-3.5"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-white/45">
                          Avaliações
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[16px] font-semibold leading-4 text-white">
                          Avaliação Final
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-white/45 transition group-open:rotate-90 group-open:text-[#DBC094]" />
                    </summary>

                    <div className="mt-3 space-y-1">
                      {assessments.slice(0, 1).map((assessment) => {
                        const questionsForMenu =
                          assessment.id === selectedAssessmentId &&
                          assessmentQuestions.length > 0
                            ? assessmentQuestions
                            : (assessment.questions ?? []);
                        const isPassed =
                          assessment.lastAttempt?.status === "passed";

                        if (questionsForMenu.length === 0) {
                          return (
                            <button
                              key={assessment.id}
                              type="button"
                              onClick={() => void openAssessment(assessment)}
                              className="flex w-full items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 text-left text-white/75 transition hover:bg-white/[0.03] hover:text-white"
                            >
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-white/40">
                                  Avaliação final
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[15px] font-medium leading-4">
                                  {assessment.available
                                    ? "Iniciar avaliação"
                                    : "Avaliação bloqueada"}
                                </p>
                              </div>

                              {assessment.available ? (
                                <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-[#DBC094]" />
                              ) : (
                                <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-white/35" />
                              )}
                            </button>
                          );
                        }

                        return questionsForMenu.map(
                          (question, questionIndex) => {
                            const isActive =
                              assessment.id === selectedAssessmentId &&
                              questionIndex === assessmentQuestionIndex;
                            const answered = getAnswerCompletion(
                              question,
                              assessmentAnswers[question.id],
                            );

                            return (
                              <button
                                key={`${assessment.id}-${question.id}`}
                                type="button"
                                onClick={async () => {
                                  if (assessment.id !== selectedAssessmentId) {
                                    await openAssessment(assessment);
                                  }

                                  setAssessmentQuestionIndex(questionIndex);
                                }}
                                className={
                                  isActive
                                    ? "flex w-full items-center justify-between gap-2 border-t border-[#DBC094]/40 bg-[#DBC094]/10 px-3 py-2.5 text-left text-[#DBC094]"
                                    : "flex w-full items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 text-left text-white/75 transition hover:bg-white/[0.03] hover:text-white"
                                }
                              >
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-white/40">
                                    Questão{" "}
                                    {String(questionIndex + 1).padStart(2, "0")}
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-[15px] font-medium leading-4">
                                    Questão{" "}
                                    {String(questionIndex + 1).padStart(2, "0")}
                                  </p>
                                </div>

                                {isPassed || answered ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#DBC094]" />
                                ) : assessment.available ? (
                                  <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-[#DBC094]" />
                                ) : (
                                  <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-white/35" />
                                )}
                              </button>
                            );
                          },
                        );
                      })}
                    </div>
                  </details>
                ) : null}
              </div>
            </div>

            <div className="border-t border-white/10 px-5 py-4 text-[12px] leading-5 text-white/35">
              <p className="font-semibold text-[#DBC094]">UNL</p>
              <p>Universidade de Líderes.</p>
            </div>
          </div>
        </aside>

        <div className="lg:pl-[300px]">
          <div className="border-b border-white/10 bg-[#020304] px-4 py-3 lg:hidden">
            <Link
              href="/aluno"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-white/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>
            <h2 className="mt-2 line-clamp-2 text-[17px] font-semibold text-white">
              {bundle.course.title}
            </h2>
          </div>

          <div className="min-h-[calc(100vh-56px)] px-4 pb-14 pt-7 sm:px-6 lg:px-8 lg:pt-8 xl:px-10">
            <div className="mx-auto w-full max-w-[1088px]">
              <div className="mb-5 flex items-start justify-end text-right">
                <div className="max-w-[680px] text-[12px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  <span>{bundle.course.title}</span>
                  <span className="mx-2 text-[#DBC094]">/</span>
                  <span>{bundle.currentModule.title}</span>
                  <span className="mx-2 text-[#DBC094]">/</span>
                  <span>
                    {currentAssessment
                      ? currentAssessment.title
                      : bundle.lesson.title}
                  </span>
                </div>
              </div>

              {currentAssessment ? (
                renderAssessmentContent()
              ) : (
                <>
                  <LessonPlayer
                    lesson={bundle.lesson}
                    onLessonCompleted={() =>
                      void markAsCompleted({ silent: true })
                    }
                  />

                  <div className="mt-5 border-b border-white/10 pb-5">
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                      {previousLesson ? (
                        <Link
                          href={`/aluno/aulas/${previousLesson.id}`}
                          className="inline-flex h-11 items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-5 text-[15px] font-semibold text-white transition hover:border-[#DBC094]/40 hover:text-[#DBC094]"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Voltar
                        </Link>
                      ) : (
                        <span className="inline-flex h-11 items-center gap-2 rounded-md border border-white/5 bg-white/[0.015] px-5 text-[15px] font-semibold text-white/25">
                          <ChevronLeft className="h-4 w-4" />
                          Voltar
                        </span>
                      )}

                      {nextLesson ? (
                        <Link
                          href={`/aluno/aulas/${nextLesson.id}`}
                          className="inline-flex h-11 items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-5 text-[15px] font-semibold text-white transition hover:border-[#DBC094]/40 hover:text-[#DBC094]"
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span className="inline-flex h-11 items-center gap-2 rounded-md border border-white/5 bg-white/[0.015] px-5 text-[15px] font-semibold text-white/25">
                          Próxima
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => void markAsCompleted()}
                        disabled={savingProgress}
                        className={
                          currentLessonCompleted
                            ? "inline-flex h-11 items-center gap-2 rounded-md border border-[#DBC094]/25 bg-[#DBC094]/10 px-5 text-[15px] font-semibold text-[#DBC094] transition hover:bg-[#DBC094]/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            : "inline-flex h-11 items-center gap-2 rounded-md bg-[#DBC094] px-5 text-[15px] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        {savingProgress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {currentLessonCompleted ? "Concluída" : "Concluir"}
                      </button>
                    </div>

                    {feedback ? (
                      <p className="mt-3 text-center text-[14px] font-medium text-[#DBC094]">
                        {feedback}
                      </p>
                    ) : null}
                  </div>

                  {bundle.assets.length > 0 ? (
                    <section className="mt-7 border-b border-white/10 pb-6">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#DBC094]">
                            Materiais
                          </p>
                          <h2 className="mt-1 text-[17px] font-semibold text-white">
                            Arquivos da aula
                          </h2>
                        </div>
                        <span className="text-[13px] font-medium text-white/40">
                          {bundle.assets.length} arquivo(s)
                        </span>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        {bundle.assets.map((asset) => {
                          const assetUrl =
                            asset.signed_url ||
                            resolveLessonMaterialUrl(asset.storage_path);

                          return (
                            <a
                              key={asset.id}
                              href={assetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.015] px-3 py-2.5 transition hover:border-[#DBC094]/40 hover:bg-white/[0.03]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-medium text-white/85">
                                  {asset.title ||
                                    asset.file_name ||
                                    "Material da aula"}
                                </p>
                                <p className="mt-0.5 text-[13px] text-white/35">
                                  {asset.asset_type} •{" "}
                                  {formatFileSize(asset.size_bytes)}
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#DBC094]">
                                Acessar
                                <Download className="h-3 w-3" />
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <section className="mt-7">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#DBC094]">
                          Comunidade da aula
                        </p>
                        <h2 className="mt-1 text-[17px] font-semibold text-white">
                          Compartilhe sua dúvida ou experiência
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => submitRating(star)}
                              disabled={sendingRating}
                              className="transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Avaliar com ${star} estrela(s)`}
                            >
                              <Star
                                className={
                                  star <= selectedRating
                                    ? "h-4 w-4 fill-[#DBC094] text-[#DBC094]"
                                    : "h-4 w-4 text-white/25"
                                }
                              />
                            </button>
                          ))}
                          {sendingRating ? (
                            <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-[#DBC094]" />
                          ) : null}
                        </div>

                        {averageRating > 0 ? (
                          <span className="text-[13px] font-medium text-white/45">
                            média {averageRating.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="min-w-0">
                        <div className="flex gap-3 border-b border-white/10 pb-5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBC094] text-[14px] font-semibold text-black">
                            {profile?.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={getStudentName(user, profile)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(getStudentName(user, profile))
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <textarea
                              value={comment}
                              onChange={(event) =>
                                setComment(event.target.value)
                              }
                              placeholder="Compartilhe uma dúvida ou experiência"
                              className="min-h-[86px] w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-white outline-none placeholder:text-white/32"
                            />

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                              <p className="text-[13px] leading-5 text-white/35">
                                Seu comentário será enviado para análise antes
                                de aparecer na comunidade.
                              </p>

                              <button
                                type="button"
                                onClick={submitComment}
                                disabled={sendingComment || !comment.trim()}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#DBC094] px-3 text-[14px] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {sendingComment ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                Enviar
                              </button>
                            </div>
                          </div>
                        </div>

                        {bundle.comments.length > 0 ? (
                          <div className="divide-y divide-white/10">
                            {bundle.comments.map((item) => {
                              const itemRating = item.student_id
                                ? ratingByStudentId.get(item.student_id)
                                : null;
                              const studentAvatar = item.student_avatar_url;
                              const studentName = item.student_name || "Aluno";

                              return (
                                <article key={item.id} className="py-4">
                                  <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBC094] text-[14px] font-semibold text-black">
                                      {studentAvatar ? (
                                        <img
                                          src={studentAvatar}
                                          alt={studentName}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        getInitials(studentName)
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[15px] font-semibold text-white">
                                          {studentName}
                                        </p>
                                        <p className="text-[13px] text-white/35">
                                          {new Date(
                                            item.created_at,
                                          ).toLocaleDateString("pt-BR")}
                                        </p>
                                        {itemRating ? (
                                          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#DBC094]">
                                            <Star className="h-3 w-3 fill-[#DBC094]" />
                                            {itemRating.rating}/5
                                          </span>
                                        ) : null}
                                      </div>

                                      <p className="mt-2 text-[15px] leading-6 text-white/65">
                                        {item.comment}
                                      </p>

                                      {item.admin_note ? (
                                        <details className="mt-3 border-l border-[#DBC094]/40 pl-3">
                                          <summary className="cursor-pointer text-[13px] font-semibold uppercase tracking-[0.12em] text-[#DBC094]">
                                            Resposta do ADM
                                          </summary>
                                          <p className="mt-2 text-[15px] leading-6 text-white/65">
                                            {item.admin_note}
                                          </p>
                                        </details>
                                      ) : null}
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <MessageCircle className="mx-auto h-6 w-6 text-[#DBC094]/80" />
                            <p className="mt-3 text-[15px] font-semibold text-white">
                              Nenhum comentário publicado ainda
                            </p>
                            <p className="mt-1 text-[15px] leading-6 text-white/40">
                              Seja o primeiro a comentar esta aula.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {completionFlow ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm">
          <div className="w-full max-w-[440px] border border-[#DBC094]/35 bg-[#050608] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#16a34a] text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-[21px] font-semibold leading-tight text-white">
              Conclusão registrada
            </h2>

            <p className="mt-3 text-[17px] leading-7 text-white/65">
              {completionFlow.message}
            </p>

            {completionFlow.redirect_url ? (
              <div className="mt-5 flex items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#DBC094]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Redirecionando automaticamente
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCompletionFlow(null)}
                className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-white px-5 text-[15px] font-semibold text-black transition hover:bg-[#DBC094]"
              >
                Entendi
              </button>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
