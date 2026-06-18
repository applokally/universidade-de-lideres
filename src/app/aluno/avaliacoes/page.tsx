"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  LockKeyhole,
  Loader2,
  Search,
} from "lucide-react";
import { StudentHeader } from "@/app/aluno/_components/StudentHeader";
import { supabaseBrowser } from "@/lib/supabase/browser";

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
  status: "draft" | "published" | "paused" | "archived";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Attempt = {
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
  lastAttempt?: Attempt | null;
  isMock?: boolean;
};

type ProgressRow = Record<string, unknown>;

const mockAssessments: StudentAssessment[] = [
  {
    id: "mock-course-final",
    title: "Avaliação final do curso",
    description:
      "Questionário liberado após a conclusão das aulas. Use este modelo para visualizar a experiência do aluno.",
    instructions:
      "Leia cada pergunta com atenção. A aprovação mínima para certificado é de 70%.",
    scope_type: "course",
    course_id: null,
    trail_id: null,
    lesson_id: null,
    trail_evaluation_mode: "per_course",
    access_condition: "after_all_lessons",
    min_correct_percentage: 70,
    certificate_required: true,
    attempts_allowed: 3,
    time_limit_minutes: 30,
    question_order: "fixed",
    status: "published",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    available: true,
    availabilityReason: "Mock liberado para visualização.",
    isMock: true,
  },
  {
    id: "mock-trail-final",
    title: "Avaliação geral da trilha",
    description:
      "Exemplo bloqueado para mostrar o comportamento antes da conclusão da trilha.",
    instructions: "Conclua todos os cursos da trilha para responder.",
    scope_type: "trail",
    course_id: null,
    trail_id: null,
    lesson_id: null,
    trail_evaluation_mode: "general",
    access_condition: "after_trail_completion",
    min_correct_percentage: 75,
    certificate_required: true,
    attempts_allowed: 2,
    time_limit_minutes: 45,
    question_order: "random",
    status: "published",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    available: false,
    availabilityReason: "Conclua a trilha para liberar esta avaliação.",
    isMock: true,
  },
];

function formatScope(scope: Assessment["scope_type"]) {
  if (scope === "course") return "Curso";
  if (scope === "trail") return "Trilha";
  return "Aula";
}

function formatCondition(condition: Assessment["access_condition"]) {
  if (condition === "after_all_lessons") return "Após concluir todas as aulas";
  if (condition === "after_course_completion") return "Após concluir o curso";
  if (condition === "after_trail_completion") return "Após concluir a trilha";
  if (condition === "after_lesson_completion") return "Após concluir a aula";
  return "Liberação manual";
}

function rowHasId(row: ProgressRow, id: string | null) {
  if (!id) return false;

  return Object.entries(row).some(([key, value]) => {
    const normalizedKey = key.toLowerCase();

    if (!normalizedKey.includes("course") && !normalizedKey.includes("trail") && !normalizedKey.includes("lesson")) {
      return false;
    }

    return String(value) === id;
  });
}

function rowLooksCompleted(row: ProgressRow) {
  const status = String(row.status ?? row.state ?? "").toLowerCase();
  const completedAt = row.completed_at ?? row.finished_at ?? row.completedAt;
  const progress = Number(row.progress ?? row.progress_percent ?? row.percentage ?? 0);
  const isCompleted = row.is_completed ?? row.completed ?? row.done;

  return (
    status === "completed" ||
    status === "concluido" ||
    status === "concluído" ||
    status === "finished" ||
    Boolean(completedAt) ||
    isCompleted === true ||
    progress >= 100
  );
}

async function readProgressTables(
  supabase: ReturnType<typeof supabaseBrowser>,
  userId: string,
  tableNames: string[],
) {
  for (const tableName of tableNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("user_id", userId)
      .limit(500);

    if (!error && Array.isArray(data)) {
      return data as ProgressRow[];
    }
  }

  return [];
}

async function hasManualRelease(
  supabase: ReturnType<typeof supabaseBrowser>,
  assessmentId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("assessment_manual_releases")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data?.id);
}

async function evaluateAvailability(
  supabase: ReturnType<typeof supabaseBrowser>,
  assessment: Assessment,
  userId: string,
) {
  if (!userId) {
    return {
      available: false,
      reason: "Faça login para responder.",
    };
  }

  if (assessment.access_condition === "manual_release") {
    const released = await hasManualRelease(supabase, assessment.id, userId);

    return {
      available: released,
      reason: released
        ? "Liberada pela administração."
        : "Aguardando liberação da administração.",
    };
  }

  if (
    assessment.access_condition === "after_all_lessons" ||
    assessment.access_condition === "after_course_completion"
  ) {
    if (!assessment.course_id) {
      return {
        available: true,
        reason: "Avaliação sem curso vinculado.",
      };
    }

    const rows = await readProgressTables(supabase, userId, [
      "course_progress",
      "student_course_progress",
      "user_course_progress",
      "course_completions",
      "student_courses_progress",
    ]);

    const completed = rows.some(
      (row) => rowHasId(row, assessment.course_id) && rowLooksCompleted(row),
    );

    return {
      available: completed,
      reason: completed
        ? "Curso concluído."
        : "Conclua todas as aulas do curso para liberar.",
    };
  }

  if (assessment.access_condition === "after_trail_completion") {
    if (!assessment.trail_id) {
      return {
        available: true,
        reason: "Avaliação sem trilha vinculada.",
      };
    }

    const rows = await readProgressTables(supabase, userId, [
      "trail_progress",
      "student_trail_progress",
      "user_trail_progress",
      "trail_completions",
      "track_progress",
    ]);

    const completed = rows.some(
      (row) => rowHasId(row, assessment.trail_id) && rowLooksCompleted(row),
    );

    return {
      available: completed,
      reason: completed ? "Trilha concluída." : "Conclua a trilha para liberar.",
    };
  }

  if (assessment.access_condition === "after_lesson_completion") {
    if (!assessment.lesson_id) {
      return {
        available: true,
        reason: "Avaliação sem aula vinculada.",
      };
    }

    const rows = await readProgressTables(supabase, userId, [
      "lesson_progress",
      "student_lesson_progress",
      "user_lesson_progress",
      "lesson_completions",
      "student_lessons_progress",
    ]);

    const completed = rows.some(
      (row) => rowHasId(row, assessment.lesson_id) && rowLooksCompleted(row),
    );

    return {
      available: completed,
      reason: completed ? "Aula concluída." : "Conclua a aula para liberar.",
    };
  }

  return {
    available: false,
    reason: "Condição de liberação não reconhecida.",
  };
}

export default function AlunoAvaliacoesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [assessmentsResponse, attemptsResponse] = await Promise.all([
        supabase
          .from("assessments")
          .select("*")
          .eq("status", "published")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        user
          ? supabase
              .from("assessment_attempts")
              .select("*")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      const loadedAssessments = (assessmentsResponse.data ?? []) as Assessment[];
      const attempts = (attemptsResponse.data ?? []) as Attempt[];

      if (!loadedAssessments.length) {
        setAssessments(mockAssessments);
        setLoading(false);
        return;
      }

      const mapped = await Promise.all(
        loadedAssessments.map(async (assessment) => {
          const availability = user
            ? await evaluateAvailability(supabase, assessment, user.id)
            : {
                available: false,
                reason: "Faça login para responder.",
              };

          return {
            ...assessment,
            available: availability.available,
            availabilityReason: availability.reason,
            lastAttempt:
              attempts.find((attempt) => attempt.assessment_id === assessment.id) ?? null,
          };
        }),
      );

      setAssessments(mapped);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as avaliações.",
      );
      setAssessments(mockAssessments);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  const filteredAssessments = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    if (!cleanSearch) return assessments;

    return assessments.filter((assessment) =>
      `${assessment.title} ${assessment.description ?? ""}`
        .toLowerCase()
        .includes(cleanSearch),
    );
  }, [assessments, search]);

  return (
    <main className="min-h-screen bg-[#050609] pb-16 text-white">
      <StudentHeader />

      <section className="mx-auto max-w-[1120px] px-5 pt-[112px] sm:px-8 lg:px-10">
        <header className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#DBC094]">
            Avaliações
          </p>

          <h1 className="mt-3 max-w-[760px] text-[42px] font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[58px]">
            Responda quando sua jornada estiver completa.
          </h1>

          <p className="mt-5 max-w-[760px] text-[15px] leading-7 text-white/52">
            As avaliações ficam disponíveis somente após a conclusão exigida pelo curso, aula ou trilha.
          </p>
        </header>

        <label className="mb-5 flex h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-5 text-white/44 transition focus-within:border-[#DBC094]/60">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar avaliação"
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/34"
          />
        </label>

        {message ? (
          <div className="mb-5 rounded-[18px] border border-[#DBC094]/20 bg-[#DBC094]/8 px-4 py-3 text-[13px] text-[#DBC094]">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-3 border-y border-white/10 py-16 text-[14px] text-white/52">
            <Loader2 className="h-4 w-4 animate-spin text-[#DBC094]" />
            Carregando avaliações...
          </div>
        ) : (
          <div className="divide-y divide-white/10 border-y border-white/10">
            {filteredAssessments.map((assessment) => {
              const passed = assessment.lastAttempt?.status === "passed";

              return (
                <article
                  key={assessment.id}
                  className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_230px] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#DBC094]/22 bg-[#DBC094]/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#DBC094]">
                        {formatScope(assessment.scope_type)}
                      </span>

                      <span className="text-[12px] text-white/38">
                        {assessment.min_correct_percentage}% mínimo • {assessment.attempts_allowed} tentativa(s)
                      </span>

                      {passed ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprovado
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-[21px] font-black tracking-[-0.04em] text-white">
                      {assessment.title}
                    </h2>

                    {assessment.description ? (
                      <p className="mt-2 line-clamp-2 max-w-[760px] text-[14px] leading-6 text-white/50">
                        {assessment.description}
                      </p>
                    ) : null}

                    <p className="mt-3 text-[12px] text-white/34">
                      {formatCondition(assessment.access_condition)} • {assessment.availabilityReason}
                    </p>
                  </div>

                  {assessment.available ? (
                    <Link
                      href={`/aluno/avaliacoes/${assessment.id}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#DBC094] px-6 text-[13px] font-black text-black transition hover:brightness-105"
                    >
                      {assessment.lastAttempt ? "Ver / refazer" : "Responder"}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-6 text-[13px] font-black text-white/32"
                    >
                      <LockKeyhole className="h-4 w-4" />
                      Bloqueada
                    </button>
                  )}
                </article>
              );
            })}

            {!filteredAssessments.length ? (
              <div className="py-16 text-center">
                <ClipboardCheck className="mx-auto h-9 w-9 text-[#DBC094]" />
                <p className="mt-3 text-[18px] font-black text-white">
                  Nenhuma avaliação encontrada
                </p>
                <p className="mt-2 text-[14px] text-white/44">
                  As avaliações publicadas pelo ADM aparecerão aqui.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
