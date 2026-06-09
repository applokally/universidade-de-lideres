"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  ImageIcon,
  Loader2,
  MessageCircle,
  Play,
  Presentation,
  Send,
  Star,
  Video,
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
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

function LessonContentShell({
  lesson,
  children,
}: {
  lesson: LessonRow;
  children: React.ReactNode;
}) {
  const Icon = getContentIcon(lesson.content_type);

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black">
      <div className="flex items-center gap-3 border-b border-white/10 bg-[#101116] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DBC094] text-black">
          <Icon className="h-4 w-4" />
        </div>

        <p className="text-[14px] font-black text-white">
          {getLessonDisplayLabel(lesson)}
        </p>
      </div>

      <div className="bg-black">{children}</div>
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
          <h2 className="mt-4 text-[22px] font-black tracking-[-0.04em]">
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
          <Video className="h-12 w-12 text-[#DBC094]" />

          <h2 className="mt-4 text-[26px] font-black tracking-[-0.045em]">
            Vídeo ainda não enviado
          </h2>

          <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-white/58">
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
          <Video className="h-12 w-12 text-[#DBC094]" />

          <h2 className="mt-4 text-[26px] font-black tracking-[-0.045em]">
            Vídeo externo
          </h2>

          <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-white/58">
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
          <Headphones className="h-12 w-12 text-[#DBC094]" />
          <h2 className="mt-4 text-[26px] font-black tracking-[-0.045em]">
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
          <Headphones className="h-12 w-12 text-[#DBC094]" />
          <h2 className="mt-4 text-[26px] font-black tracking-[-0.045em]">
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
          <Presentation className="h-12 w-12 text-[#DBC094]" />
          <h2 className="mt-4 text-[26px] font-black tracking-[-0.045em]">
            Aula em Slides
          </h2>
          <a
            href={uploadedContentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[14px] font-black text-black transition hover:bg-[#DBC094]"
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
          <Presentation className="h-12 w-12 text-[#DBC094]" />
          <h2 className="mt-4 text-[26px] font-black tracking-[-0.045em]">
            Aula em Slides
          </h2>
          <a
            href={primaryUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[14px] font-black text-black transition hover:bg-[#DBC094]"
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
          <ExternalLink className="h-12 w-12 text-[#DBC094]" />
          <h2 className="mt-4 text-[26px] font-black tracking-[-0.045em]">
            Conteúdo externo
          </h2>
          <a
            href={lesson.external_url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[14px] font-black text-black transition hover:bg-[#DBC094]"
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
        <FileText className="h-12 w-12 text-[#DBC094]" />

        <h2 className="mt-4 text-[26px] font-black tracking-[-0.045em]">
          Conteúdo da aula
        </h2>

        <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-white/58">
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

      if (!mounted) return;

      setUser(currentUser ?? null);
      setProfile(loadedProfile);
      setProgress(loadedProgress);
      setProgressByLessonId(progressMap);
      setBundle(loadedBundle);
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

  async function refreshBundle() {
    if (!lessonId) return;

    const loadedBundle = await loadLessonBundle(supabase, lessonId);
    setBundle(loadedBundle);
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

    const finalQuizApproved = await hasApprovedFinalQuizForCurrentCourse();

    if (!finalQuizApproved) {
      return {
        kind: "track_completed_quiz_required",
        message:
          "Você concluiu as aulas desta trilha. Para liberar a conclusão final e o certificado, realize a prova final e atinja no mínimo 80% de acertos.",
        redirect_url: null,
        redirect_delay_ms: 0,
      };
    }

    return {
      kind: "track_completed_certificate",
      message:
        "Você concluiu com sucesso esta trilha, parabéns. Você está sendo direcionado para a área do aluno, para acessar o seu certificado de conclusão.",
      redirect_url: "/aluno",
      redirect_delay_ms: 3600,
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

      if (data.user) {
        setUser(data.user);
      }

      if (data.profile) {
        setProfile(data.profile);
      }

      const completion =
        await resolveCompletionFlowAfterProgressSave(updatedProgressMap);

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

    const studentName = getStudentName(user, profile);

    const { error } = await supabase.from("lesson_comments").insert({
      lesson_id: bundle.lesson.id,
      student_id: user?.id ?? null,
      student_name: studentName,
      student_avatar_url: profile?.avatar_url ?? null,
      comment: comment.trim(),
      status: "pending",
      updated_at: new Date().toISOString(),
    });

    setSendingComment(false);

    if (error) {
      setFeedback("Não foi possível enviar o comentário.");
      return;
    }

    setComment("");
    setFeedback("Comentário enviado.");
  }

  async function submitRating(rating: number) {
    if (!bundle || rating <= 0) return;

    setSelectedRating(rating);
    setSendingRating(true);
    setFeedback("");

    const studentName = getStudentName(user, profile);

    const { error } = await supabase.from("lesson_ratings").insert({
      lesson_id: bundle.lesson.id,
      student_id: user?.id ?? null,
      student_name: studentName,
      student_avatar_url: profile?.avatar_url ?? null,
      rating,
      review: null,
      status: "pending",
      updated_at: new Date().toISOString(),
    });

    setSendingRating(false);

    if (error) {
      setFeedback("Não foi possível enviar a avaliação.");
      return;
    }

    setFeedback("Avaliação enviada.");
    await refreshBundle();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050609] text-white">
        <StudentHeader />
        <section className="flex min-h-screen items-center justify-center px-6 pt-[90px]">
          <div className="flex items-center gap-3 text-white/70">
            <Loader2 className="h-5 w-5 animate-spin text-[#DBC094]" />
            Carregando aula...
          </div>
        </section>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="min-h-screen bg-[#050609] text-white">
        <StudentHeader />
        <section className="flex min-h-screen items-center justify-center px-6 pt-[90px] text-center">
          <div className="max-w-[560px]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#DBC094]">
              Aula não encontrada
            </p>
            <h1 className="mt-4 text-[36px] font-black tracking-[-0.05em] text-white sm:text-[46px]">
              Este conteúdo não está disponível.
            </h1>
            <Link
              href="/aluno"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[14px] font-black text-black transition hover:bg-white/86"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const ContentIcon = getContentIcon(bundle.lesson.content_type);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <section className="px-5 pb-16 pt-[92px] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/aluno"
              className="inline-flex items-center gap-2 text-[13px] font-black text-white/58 transition hover:text-[#DBC094]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a home
            </Link>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/42">
              <span>{bundle.course.title}</span>
              <span className="text-[#DBC094]">/</span>
              <span>{bundle.currentModule.title}</span>
            </div>
          </div>

          <div className="grid items-start gap-6 xl:block xl:pl-[390px]">
            <aside className="xl:fixed xl:left-10 xl:top-[148px] xl:z-20 xl:w-[360px] xl:max-h-[calc(100vh-168px)] xl:overflow-y-auto xl:pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#101116]">
                <div className="border-b border-white/10 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                    Curso
                  </p>
                  <h2 className="mt-2 text-[22px] font-black leading-tight tracking-[-0.045em]">
                    {bundle.course.title}
                  </h2>
                  <p className="mt-2 text-[13px] leading-5 text-white/45">
                    {orderedLessons.length} aula(s)
                  </p>
                </div>

                <div className="p-3">
                  {bundle.modules.map((module) => {
                    const moduleLessons = lessonsByModule.get(module.id) ?? [];

                    return (
                      <div key={module.id} className="mb-4 last:mb-0">
                        <h3 className="mb-2 px-2 text-[13px] font-black tracking-[-0.02em] text-white">
                          {module.title}
                        </h3>

                        <div className="grid gap-2">
                          {moduleLessons.map((lesson) => {
                            const Icon = getContentIcon(lesson.content_type);
                            const isActive = lesson.id === bundle.lesson.id;

                            return (
                              <Link
                                key={lesson.id}
                                href={`/aluno/aulas/${lesson.id}`}
                                className={
                                  isActive
                                    ? "flex items-center gap-3 rounded-[14px] border border-[#DBC094]/40 bg-[#DBC094]/12 p-3"
                                    : "flex items-center gap-3 rounded-[14px] border border-white/8 bg-white/[0.025] p-3 transition hover:border-[#DBC094]/35 hover:bg-white/[0.055]"
                                }
                              >
                                <div
                                  className={
                                    isActive
                                      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DBC094] text-black"
                                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70"
                                  }
                                >
                                  <Icon className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="line-clamp-2 text-[13px] font-black leading-5 text-white">
                                    {lesson.title}
                                  </p>
                                  <p className="mt-0.5 text-[11px] font-bold text-white/36">
                                    {getLessonDisplayLabel(lesson)} •{" "}
                                    {formatDuration(lesson.duration_sec)}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <div>
                <LessonPlayer
                  lesson={bundle.lesson}
                  onLessonCompleted={() =>
                    void markAsCompleted({ silent: true })
                  }
                />
              </div>

              <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#DBC094] px-3 py-1.5 text-[12px] font-black text-black">
                    <ContentIcon className="h-3.5 w-3.5" />
                    {getLessonDisplayLabel(bundle.lesson)}
                  </span>

                  <span className="rounded-full bg-white/12 px-3 py-1.5 text-[12px] font-bold text-white/68">
                    {formatDuration(bundle.lesson.duration_sec)}
                  </span>

                  {averageRating > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[12px] font-bold text-white/68">
                      <Star className="h-3.5 w-3.5 fill-[#DBC094] text-[#DBC094]" />
                      {averageRating.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <h1 className="max-w-[900px] text-[26px] font-black leading-[1.06] tracking-[-0.045em] text-white sm:text-[34px] lg:text-[40px]">
                  {bundle.lesson.title}
                </h1>

                {bundle.lesson.description ? (
                  <p className="mt-3 max-w-[820px] text-[15px] leading-7 text-white/58">
                    {bundle.lesson.description}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#DBC094]">
                      Progresso
                    </p>
                    <p className="mt-1 text-[13px] text-white/52">
                      {currentLessonCompleted
                        ? `Aula concluída • ${completedLessonsCount} de ${totalLessonsCount} aulas concluídas`
                        : `${completedLessonsCount} de ${totalLessonsCount} aulas concluídas • ${progressPercent}% do curso`}
                    </p>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#DBC094] transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto lg:justify-end [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {previousLesson ? (
                      <Link
                        href={`/aluno/aulas/${previousLesson.id}`}
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.04] px-4 text-[13px] font-black text-white transition hover:border-[#DBC094]/45 hover:text-[#DBC094]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void markAsCompleted()}
                      disabled={savingProgress}
                      className={
                        currentLessonCompleted
                          ? "inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-[#16a34a] px-4 text-[13px] font-black text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-55"
                          : "inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-white px-4 text-[13px] font-black text-black transition hover:bg-[#DBC094] disabled:cursor-not-allowed disabled:opacity-55"
                      }
                    >
                      {savingProgress ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {currentLessonCompleted ? "Concluída" : "Concluir"}
                    </button>

                    {nextLesson ? (
                      <Link
                        href={`/aluno/aulas/${nextLesson.id}`}
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-white px-4 text-[13px] font-black text-black transition hover:bg-[#DBC094]"
                      >
                        Próxima aula
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              {bundle.assets.length > 0 ? (
                <div className="mt-5 rounded-[20px] border border-white/10 bg-[#101116] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-[22px] font-black tracking-[-0.045em]">
                      Materiais da aula
                    </h2>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold text-white/56">
                      {bundle.assets.length} arquivo(s)
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2">
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
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.035] p-3 transition hover:border-[#DBC094]/45 hover:bg-white/[0.065]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DBC094] text-black">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-black text-white">
                                {asset.title ||
                                  asset.file_name ||
                                  "Material da aula"}
                              </p>
                              <p className="mt-0.5 text-[12px] text-white/42">
                                {asset.asset_type} •{" "}
                                {formatFileSize(asset.size_bytes)}
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3 text-[12px] font-black text-black">
                            Acessar
                            <Download className="h-3.5 w-3.5" />
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-[20px] border border-white/10 bg-[#101116] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[22px] font-black tracking-[-0.045em]">
                      Avaliação e comentários
                    </h2>

                    <div className="mt-3 flex items-center gap-1.5">
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
                                ? "h-7 w-7 fill-[#DBC094] text-[#DBC094]"
                                : "h-7 w-7 text-white/24"
                            }
                          />
                        </button>
                      ))}

                      {sendingRating ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin text-[#DBC094]" />
                      ) : null}
                    </div>
                  </div>

                  {averageRating > 0 ? (
                    <div className="rounded-[14px] bg-white/[0.045] px-4 py-3 text-right">
                      <p className="text-[22px] font-black text-white">
                        {averageRating.toFixed(1)}
                      </p>
                      <p className="text-[12px] font-bold text-white/42">
                        média da aula
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBC094] text-[13px] font-black text-black">
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
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Escreva seu comentário ou dúvida..."
                      className="min-h-[96px] w-full resize-none rounded-[16px] border border-white/10 bg-black/24 px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/34 focus:border-[#DBC094]/60"
                    />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={submitComment}
                        disabled={sendingComment || !comment.trim()}
                        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[13px] font-black text-black transition hover:bg-[#DBC094] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {sendingComment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Enviar
                      </button>

                      {feedback ? (
                        <p className="text-[13px] font-bold text-[#DBC094]">
                          {feedback}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {bundle.comments.length > 0 ? (
                  <div className="mt-6 grid gap-3">
                    {bundle.comments.map((item) => {
                      const itemRating = item.student_id
                        ? ratingByStudentId.get(item.student_id)
                        : null;
                      const studentAvatar = item.student_avatar_url;
                      const studentName = item.student_name || "Aluno";

                      return (
                        <article
                          key={item.id}
                          className="rounded-[16px] border border-white/10 bg-white/[0.035] p-4"
                        >
                          <div className="flex gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBC094] text-[13px] font-black text-black">
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
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[14px] font-black text-white">
                                    {studentName}
                                  </p>

                                  {itemRating ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#DBC094]/14 px-2 py-1 text-[11px] font-black text-[#DBC094]">
                                      <Star className="h-3 w-3 fill-[#DBC094]" />
                                      {itemRating.rating}/5
                                    </span>
                                  ) : null}
                                </div>

                                <p className="text-[11px] font-bold text-white/32">
                                  {new Date(item.created_at).toLocaleDateString(
                                    "pt-BR",
                                  )}
                                </p>
                              </div>

                              <p className="mt-2 text-[14px] leading-6 text-white/68">
                                {item.comment}
                              </p>

                              {item.admin_note ? (
                                <details className="mt-3 rounded-[12px] border border-[#DBC094]/20 bg-[#DBC094]/10 px-3 py-2">
                                  <summary className="cursor-pointer text-[12px] font-black uppercase tracking-[0.16em] text-[#DBC094]">
                                    Resposta do ADM
                                  </summary>
                                  <p className="mt-2 text-[13px] leading-6 text-white/72">
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
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {completionFlow ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/72 px-5 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[28px] border border-[#DBC094]/35 bg-[#101116] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#16a34a] text-white">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-[26px] font-black leading-tight tracking-[-0.045em] text-white">
              Conclusão registrada
            </h2>

            <p className="mt-3 text-[15px] leading-7 text-white/68">
              {completionFlow.message}
            </p>

            {completionFlow.redirect_url ? (
              <div className="mt-6 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.18em] text-[#DBC094]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecionando automaticamente
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCompletionFlow(null)}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-[10px] bg-white px-5 text-[13px] font-black text-black transition hover:bg-[#DBC094]"
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
