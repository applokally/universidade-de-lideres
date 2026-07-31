"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, Search } from "lucide-react";
import { AssessmentsAdminNav } from "../_components/AssessmentsAdminNav";
import {
  AssessmentAttempt,
  formatDate,
  getStatusClass,
  getStatusLabel,
} from "../_components/assessmentHelpers";

type AttemptRow = AssessmentAttempt & {
  assessment_title: string;
  student_name: string;
  student_email: string;
};

export default function AdminAssessmentResultsPage() {
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [assessment, setAssessment] = useState("all");
  const [status, setStatus] = useState("all");

  async function loadAttempts() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/assessment-results", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        attempts?: AttemptRow[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message);
      setAttempts(payload.attempts ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os resultados.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAttempts();
  }, []);

  const assessmentOptions = useMemo(
    () => [...new Set(attempts.map((item) => item.assessment_title))].sort(),
    [attempts],
  );
  const filteredAttempts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return attempts.filter((attempt) => {
      if (assessment !== "all" && attempt.assessment_title !== assessment) return false;
      if (status !== "all" && attempt.status !== status) return false;
      return (
        !term ||
        `${attempt.student_name} ${attempt.student_email}`
          .toLowerCase()
          .includes(term)
      );
    });
  }, [assessment, attempts, query, status]);

  const submitted = attempts.filter((item) => item.status !== "in_progress");
  const passed = attempts.filter((item) => item.status === "passed").length;
  const average =
    submitted.length > 0
      ? submitted.reduce(
          (sum, item) => sum + Number(item.correct_percentage ?? 0),
          0,
        ) / submitted.length
      : 0;

  return (
    <>
      <AssessmentsAdminNav />
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
          Avaliações
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Resultados por aluno
        </h1>
        <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">
          Consulte quem realizou cada avaliação, pontuação, aprovação e data.
        </p>
      </header>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          ["Tentativas", attempts.length],
          ["Aprovações", passed],
          ["Média geral", `${average.toFixed(0)}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[18px] border border-[#e7e9f0] bg-white p-5">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-sm text-[#667085]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-3 rounded-[18px] border border-[#e7e9f0] bg-white p-4 lg:grid-cols-[1fr_280px_200px]">
        <label className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b90a2]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar aluno por nome ou e-mail"
            className="h-11 w-full rounded-[12px] border border-[#dfe3ec] pl-11 pr-4 text-sm outline-none focus:border-[#DBC094]"
          />
        </label>
        <select value={assessment} onChange={(event) => setAssessment(event.target.value)} className="h-11 rounded-[12px] border border-[#dfe3ec] px-4 text-sm">
          <option value="all">Todas as avaliações</option>
          {assessmentOptions.map((title) => <option key={title} value={title}>{title}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-[12px] border border-[#dfe3ec] px-4 text-sm">
          <option value="all">Todos os status</option>
          <option value="passed">Aprovado</option>
          <option value="failed">Reprovado</option>
          <option value="submitted">Enviado</option>
          <option value="in_progress">Em andamento</option>
        </select>
      </div>

      {message ? (
        <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {message}{" "}
          <button onClick={loadAttempts} className="font-semibold underline">Tentar novamente</button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" /> Carregando resultados...
          </div>
        ) : filteredAttempts.length > 0 ? (
          <div className="divide-y divide-[#edf0f5]">
            {filteredAttempts.map((attempt) => (
              <article key={attempt.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.1fr_1fr_190px] lg:items-center">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#1f2230]">{attempt.student_name}</h2>
                  <p className="mt-1 text-[13px] text-[#667085]">{attempt.student_email}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#1f2230]">{attempt.assessment_title}</p>
                  <p className="mt-1 text-[12px] text-[#8b90a2]">{formatDate(attempt.submitted_at ?? attempt.started_at)}</p>
                </div>
                <div className="lg:text-right">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(attempt.status)}`}>{getStatusLabel(attempt.status)}</span>
                  <p className="mt-3 text-[13px] text-[#667085]">
                    {Number(attempt.correct_percentage ?? 0).toFixed(0)}% · {Number(attempt.score_points ?? 0).toFixed(0)}/{Number(attempt.max_points ?? 0).toFixed(0)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <BarChart3 className="mx-auto h-9 w-9 text-[#9b7539]" />
            <p className="mt-3 text-[18px] font-semibold text-[#1f2230]">
              Nenhum resultado encontrado
            </p>
            <p className="mt-2 text-[14px] text-[#667085]">
              Ajuste os filtros ou aguarde novas tentativas.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
