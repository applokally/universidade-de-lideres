"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ClipboardCheck, Loader2, Plus, Search } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AssessmentsAdminNav } from "./_components/AssessmentsAdminNav";
import { Assessment, formatDate, getConditionLabel, getScopeLabel, getStatusClass, getStatusLabel } from "./_components/assessmentHelpers";

export default function AdminAssessmentsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [message, setMessage] = useState("");

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("assessments").select("*").order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setAssessments((data ?? []) as Assessment[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadAssessments(); }, [loadAssessments]);

  const filteredAssessments = useMemo(() => {
    const clean = search.trim().toLowerCase();
    return assessments.filter((a) => {
      if (status === "active" && a.status === "archived") return false;
      if (status !== "active" && status !== "all" && a.status !== status) return false;
      if (!clean) return true;
      return `${a.title} ${a.description ?? ""}`.toLowerCase().includes(clean);
    });
  }, [assessments, search, status]);

  return (
    <>
      <AssessmentsAdminNav />

      <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Avaliações</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em] text-[#1f2230]">Avaliações e aprovação</h1>
          <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[#667085]">
            Configure provas por curso, aula ou trilha, defina aproveitamento mínimo e controle a liberação para certificado.
          </p>
        </div>

        <Link href="/admin/avaliacoes/nova" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105">
          <Plus className="h-4 w-4" /> Nova avaliação
        </Link>
      </header>

      <section className="mb-4 rounded-[20px] border border-[#e7e9f0] bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px]">
          <label className="flex h-11 items-center gap-3 rounded-[12px] border border-[#e0e4ec] bg-[#f7f8fc] px-4">
            <Search className="h-4 w-4 text-[#7b8191]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar avaliação..." className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[#1f2230] outline-none placeholder:text-[#8b90a2]" />
          </label>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-[12px] border border-[#e0e4ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none">
            <option value="active">Ativas</option>
            <option value="all">Todas</option>
            <option value="draft">Rascunhos</option>
            <option value="published">Publicadas</option>
            <option value="paused">Pausadas</option>
            <option value="archived">Arquivadas</option>
          </select>
        </div>
      </section>

      {message ? <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">{message}</div> : null}

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" /> Carregando avaliações...
          </div>
        ) : filteredAssessments.length > 0 ? (
          <div className="divide-y divide-[#edf0f5]">
            {filteredAssessments.map((a) => (
              <article key={a.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-[#fafbfe] lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(a.status)}`}>{getStatusLabel(a.status)}</span>
                    <span className="rounded-full border border-[#e8e0d1] bg-[#fbf7ee] px-2.5 py-1 text-[11px] font-semibold text-[#7c5d2f]">{getScopeLabel(a.scope_type)}</span>
                    <span className="text-[12px] text-[#8b90a2]">{a.min_correct_percentage}% mínimo • {a.attempts_allowed} tentativa(s)</span>
                  </div>
                  <h2 className="mt-3 truncate text-[18px] font-semibold tracking-[-0.02em] text-[#1f2230]">{a.title}</h2>
                  <p className="mt-1 line-clamp-1 text-[13px] leading-5 text-[#667085]">
                    {getConditionLabel(a.access_condition)} • atualizado em {formatDate(a.updated_at)}
                  </p>
                </div>

                <Link href={`/admin/avaliacoes/${a.id}`} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[#e1e5ee] bg-white px-4 text-[13px] font-semibold text-[#4f5568] transition hover:border-[#d8bb80] hover:text-[#1f2230]">
                  Gerenciar <ChevronRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <ClipboardCheck className="mx-auto h-9 w-9 text-[#9b7539]" />
            <p className="mt-3 text-[18px] font-semibold text-[#1f2230]">Nenhuma avaliação encontrada</p>
            <p className="mt-2 text-[14px] text-[#667085]">Crie a primeira avaliação para cursos, aulas ou trilhas.</p>
          </div>
        )}
      </section>
    </>
  );
}
