import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  Radio,
  Video,
} from "lucide-react";
import { StudentHeader } from "../_components/StudentHeader";
import { supabaseServer } from "@/lib/supabase/server";

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  content_type: string | null;
  source_mode: string | null;
  video_provider: string | null;
  external_url: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  status: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
};

type CourseRow = {
  id: string;
  title: string;
  slug: string | null;
};

function isLiveLesson(lesson: LessonRow) {
  const contentType = String(lesson.content_type ?? "").toLowerCase();
  const sourceMode = String(lesson.source_mode ?? "").toLowerCase();
  const provider = String(lesson.video_provider ?? "").toLowerCase();

  return (
    contentType.includes("live") ||
    contentType.includes("ao_vivo") ||
    contentType.includes("ao-vivo") ||
    sourceMode.includes("live") ||
    sourceMode.includes("ao_vivo") ||
    sourceMode.includes("ao-vivo") ||
    provider.includes("zoom_live") ||
    Boolean(lesson.scheduled_start_at)
  );
}

function formatLiveDate(value: string | null | undefined) {
  if (!value) return "Data a definir";

  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Data a definir";
  }
}

function formatLiveTime(value: string | null | undefined) {
  if (!value) return "Horário a definir";

  try {
    return new Date(value).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Horário a definir";
  }
}

function getLiveStatus(lesson: LessonRow) {
  if (!lesson.scheduled_start_at) {
    return {
      label: "Agendada",
      tone: "neutral",
    };
  }

  const now = Date.now();
  const start = new Date(lesson.scheduled_start_at).getTime();
  const end = lesson.scheduled_end_at
    ? new Date(lesson.scheduled_end_at).getTime()
    : start + 90 * 60 * 1000;

  if (now >= start && now <= end) {
    return {
      label: "Ao vivo agora",
      tone: "live",
    };
  }

  if (now > end) {
    return {
      label: "Encerrada",
      tone: "done",
    };
  }

  return {
    label: "Em breve",
    tone: "soon",
  };
}

export default async function StudentLivePage() {
  const supabase = await supabaseServer();

  const { data: lessonsData } = await supabase
    .from("lessons")
    .select(
      "id,module_id,title,description,content_type,source_mode,video_provider,external_url,scheduled_start_at,scheduled_end_at,status"
    )
    .eq("status", "published")
    .order("scheduled_start_at", { ascending: true, nullsFirst: false })
    .limit(120);

  const liveLessons = ((lessonsData ?? []) as LessonRow[]).filter(isLiveLesson);
  const moduleIds = Array.from(
    new Set(liveLessons.map((lesson) => lesson.module_id).filter(Boolean))
  );

  const { data: modulesData } =
    moduleIds.length > 0
      ? await supabase
          .from("course_modules")
          .select("id,course_id,title")
          .in("id", moduleIds)
      : { data: [] };

  const modules = (modulesData ?? []) as ModuleRow[];
  const courseIds = Array.from(new Set(modules.map((module) => module.course_id)));

  const { data: coursesData } =
    courseIds.length > 0
      ? await supabase.from("courses").select("id,title,slug").in("id", courseIds)
      : { data: [] };

  const courses = (coursesData ?? []) as CourseRow[];
  const modulesMap = new Map(modules.map((module) => [module.id, module]));
  const coursesMap = new Map(courses.map((course) => [course.id, course]));

  const upcomingLives = liveLessons.filter((lesson) => {
    if (!lesson.scheduled_start_at) return true;

    const status = getLiveStatus(lesson);

    return status.tone !== "done";
  });

  const pastLives = liveLessons.filter((lesson) => {
    if (!lesson.scheduled_start_at) return false;

    const status = getLiveStatus(lesson);

    return status.tone === "done";
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <section className="px-5 pb-16 pt-[116px] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#DBC094]">
                Transmissões
              </p>

              <h1 className="mt-3 text-[36px] font-black leading-none tracking-[-0.06em] text-white sm:text-[52px]">
                Ao vivo
              </h1>

              <p className="mt-4 max-w-[760px] text-[15px] leading-7 text-white/56">
                Acompanhe as lives, aulas ao vivo e transmissões online com data e horário de exibição.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-black text-white/58">
              {liveLessons.length} live(s)
            </div>
          </div>

          {liveLessons.length === 0 ? (
            <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#101116] p-8 text-center">
              <Radio className="h-12 w-12 text-[#DBC094]" />

              <h2 className="mt-5 text-[28px] font-black tracking-[-0.05em]">
                Nenhuma live publicada
              </h2>

              <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-white/48">
                Aguarde, em breve novos conteúdos ao vivo estarão disponíveis.
              </p>
            </section>
          ) : (
            <div className="grid gap-8">
              <section>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-[24px] font-black tracking-[-0.045em]">
                    Próximas transmissões
                  </h2>

                  <span className="rounded-full bg-[#DBC094]/12 px-3 py-1.5 text-[12px] font-black text-[#DBC094]">
                    {upcomingLives.length} agenda(s)
                  </span>
                </div>

                {upcomingLives.length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-[#101116] p-6 text-[14px] font-bold text-white/44">
                    Não há transmissões futuras no momento.
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {upcomingLives.map((lesson) => {
                      const status = getLiveStatus(lesson);
                      const module = modulesMap.get(lesson.module_id);
                      const course = module ? coursesMap.get(module.course_id) : null;

                      return (
                        <Link
                          key={lesson.id}
                          href={`/aluno/aulas/${lesson.id}`}
                          className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#101116] transition hover:-translate-y-1 hover:border-[#DBC094]/42 hover:bg-white/[0.055] hover:shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
                        >
                          <div className="relative min-h-[230px] p-5 sm:p-6">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(219,192,148,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)]" />

                            <div className="relative z-10">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DBC094] text-black">
                                  <Video className="h-5 w-5" />
                                </span>

                                <span
                                  className={
                                    status.tone === "live"
                                      ? "rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white"
                                      : "rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-black"
                                  }
                                >
                                  {status.label}
                                </span>
                              </div>

                              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                                Aula ao vivo
                              </p>

                              <h3 className="mt-2 text-[26px] font-black leading-[1.04] tracking-[-0.055em] text-white group-hover:text-[#DBC094]">
                                {lesson.title}
                              </h3>

                              <p className="mt-3 line-clamp-2 text-[14px] leading-6 text-white/52">
                                {lesson.description ||
                                  "Transmissão publicada na área do aluno."}
                              </p>

                              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                <div className="flex items-center gap-2 rounded-[14px] border border-white/8 bg-black/24 px-3 py-3">
                                  <CalendarDays className="h-4 w-4 text-[#DBC094]" />
                                  <span className="text-[12px] font-black text-white/64">
                                    {formatLiveDate(lesson.scheduled_start_at)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 rounded-[14px] border border-white/8 bg-black/24 px-3 py-3">
                                  <Clock3 className="h-4 w-4 text-[#DBC094]" />
                                  <span className="text-[12px] font-black text-white/64">
                                    {formatLiveTime(lesson.scheduled_start_at)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] font-bold text-white/40">
                                {course?.title ? <span>{course.title}</span> : null}
                                {course?.title && module?.title ? <span>•</span> : null}
                                {module?.title ? <span>{module.title}</span> : null}
                              </div>

                              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-black text-[#DBC094]">
                                Acessar live
                                <ExternalLink className="h-4 w-4 transition group-hover:translate-x-1" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              {pastLives.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-[24px] font-black tracking-[-0.045em]">
                      Transmissões encerradas
                    </h2>

                    <span className="rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-black text-white/46">
                      {pastLives.length} encerrada(s)
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {pastLives.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={`/aluno/aulas/${lesson.id}`}
                        className="group grid gap-4 rounded-[22px] border border-white/10 bg-[#101116] p-4 transition hover:border-[#DBC094]/42 hover:bg-white/[0.055] sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/62 transition group-hover:bg-[#DBC094] group-hover:text-black">
                          <Radio className="h-5 w-5" />
                        </span>

                        <span className="min-w-0">
                          <span className="block text-[17px] font-black tracking-[-0.03em] text-white group-hover:text-[#DBC094]">
                            {lesson.title}
                          </span>

                          <span className="mt-1 block text-[13px] leading-5 text-white/42">
                            {formatLiveDate(lesson.scheduled_start_at)} • {formatLiveTime(lesson.scheduled_start_at)}
                          </span>
                        </span>

                        <span className="rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-black text-white/48">
                          Encerrada
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
