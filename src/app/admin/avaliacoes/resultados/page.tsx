"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AssessmentsAdminNav } from "../_components/AssessmentsAdminNav";
import { Assessment, AssessmentAttempt, formatDate, getStatusClass, getStatusLabel } from "../_components/assessmentHelpers";

type AttemptRow = AssessmentAttempt & { assessmentTitle: string };

export default function AdminAssessmentResultsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAttempts() {
      setLoading(true);
      const [attemptsResponse, assessmentsResponse] = await Promise.all([
        supabase.from("assessment_attempts").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("assessments").select("*"),
      ]);

      if (attemptsResponse.error) {
        setMessage(attemptsResponse.error.message);
        setLoading(false);
        return;
      }

      const assessments = ((assessmentsResponse.data ?? []) as Assessment[]).reduce((acc, a) => acc.set(a.id, a.title), new Map<string, string>());
      setAttempts(((attemptsResponse.data ?? []) as AssessmentAttempt[]).map((attempt) => ({ ...attempt, assessmentTitle: assessments.get(attempt.assessment_id) ?? "Avaliação" })));
      setLoading(false);
    }

    void loadAttempts();
  }, [supabase]);

  return (
    <>
      <AssessmentsAdminNav />
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Avaliações</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">Resultados</h1>
        <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">Acompanhe tentativas, aprovação e pontuação dos alunos.</p>
      </header>

      {message ? <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">{message}</div> : null}

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" /> Carregando resultados...
          </div>
        ) : attempts.length > 0 ? (
          <div className="divide-y divide-[#edf0f5]">
            {attempts.map((attempt) => (
              <article key={attempt.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(attempt.status)}`}>{getStatusLabel(attempt.status)}</span>
                    <span className="text-[12px] text-[#8b90a2]">{formatDate(attempt.submitted_at ?? attempt.started_at)}</span>
                  </div>
                  <h2 className="mt-3 text-[16px] font-semibold text-[#1f2230]">{attempt.assessmentTitle}</h2>
                  <p className="mt-1 text-[13px] text-[#667085]">{Number(attempt.correct_percentage ?? 0).toFixed(0)}% • {Number(attempt.score_points ?? 0).toFixed(0)} de {Number(attempt.max_points ?? 0).toFixed(0)} pontos</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <BarChart3 className="mx-auto h-9 w-9 text-[#9b7539]" />
            <p className="mt-3 text-[18px] font-semibold text-[#1f2230]">Nenhuma tentativa registrada</p>
            <p className="mt-2 text-[14px] text-[#667085]">Os resultados aparecerão após os alunos realizarem as avaliações.</p>
          </div>
        )}
      </section>
    </>
  );
}
