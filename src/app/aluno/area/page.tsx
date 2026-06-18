"use client";

import {
  ArrowUpRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Target,
} from "lucide-react";
import { StudentAreaShell } from "../_components/StudentAreaShell";

export default function StudentAreaPage() {
  return (
    <StudentAreaShell
      title="Dashboard"
      description="Acompanhe sua evolução, atividades recentes e próximos passos dentro da plataforma."
    >
      {/* SEÇÃO PRINCIPAL: JORNADA */}
      <section className="rounded-2xl border border-white/5 bg-[#0a0b10] p-6 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
              Sua jornada
            </p>

            <h2 className="mt-3 max-w-[680px] text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              Continue sua evolução na plataforma.
            </h2>

            <p className="mt-3 max-w-[680px] text-sm leading-relaxed text-white/60">
              Veja o andamento dos seus cursos, trilhas, aulas concluídas e certificados liberados.
            </p>

            {/* Progresso Geral */}
            <div className="mt-8 max-w-[820px] rounded-xl bg-white/[0.02] p-5 border border-white/5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-white/50">
                    Progresso geral
                  </p>
                  <strong className="mt-1 block text-3xl font-bold leading-none tracking-tight text-white">
                    0%
                  </strong>
                </div>

                <p className="text-xs font-medium text-white/40">
                  Nenhuma aula concluída ainda
                </p>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/40 shadow-inner">
                <div className="h-full w-0 rounded-full bg-[#DBC094] transition-all duration-500" />
              </div>
            </div>

            {/* Resumo de Métricas */}
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">
                <BookOpen className="h-4 w-4 text-[#DBC094]" />
                <span><strong className="font-semibold text-white">0</strong> cursos</span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">
                <GraduationCap className="h-4 w-4 text-[#DBC094]" />
                <span><strong className="font-semibold text-white">0</strong> trilhas</span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">
                <CheckCircle2 className="h-4 w-4 text-[#DBC094]" />
                <span><strong className="font-semibold text-white">0</strong> aulas concluídas</span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">
                <Award className="h-4 w-4 text-[#DBC094]" />
                <span><strong className="font-semibold text-white">0</strong> certificados</span>
              </div>
            </div>
          </div>

          {/* ASIDE: PRÓXIMO PASSO */}
          <aside className="rounded-2xl border border-[#DBC094]/20 bg-gradient-to-br from-[#DBC094]/10 to-transparent p-6 shadow-lg">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
              Próximo passo
            </p>

            <h3 className="mt-3 text-xl font-semibold leading-tight tracking-tight text-white">
              Iniciar sua primeira aula
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Comece pelos conteúdos disponíveis e acompanhe sua evolução aqui.
            </p>

            <a
              href="/aluno"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#DBC094] px-5 text-sm font-semibold text-black transition-all hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
            >
              Ver conteúdos
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </aside>
        </div>
      </section>

      {/* SEÇÃO INFERIOR: HISTÓRICO E METAS */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        
        {/* Atividade Recente */}
        <div className="rounded-2xl border border-white/5 bg-[#0a0b10] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
                Atividade recente
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Histórico da evolução
              </h2>
            </div>
            <div className="rounded-full bg-white/5 p-2.5">
              <Clock3 className="h-5 w-5 text-[#DBC094]" />
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white/[0.02] border border-white/5 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  Nenhuma atividade registrada
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/50">
                  Suas aulas, cursos, trilhas e certificados aparecerão aqui.
                </p>
              </div>

              <span className="inline-flex w-fit items-center rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60">
                Aguardando
              </span>
            </div>
          </div>
        </div>

        {/* Meta Atual */}
        <div className="rounded-2xl border border-white/5 bg-[#0a0b10] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-[#DBC094]" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
              Meta atual
            </p>
          </div>

          <h2 className="text-xl font-semibold leading-tight tracking-tight text-white">
            Concluir a primeira etapa.
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-white/60">
            A meta será atualizada conforme você avançar nas trilhas.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-white/60">Aulas concluídas</span>
                <span className="font-semibold text-white">0 de 0</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/40 shadow-inner">
                <div className="h-full w-0 rounded-full bg-[#DBC094]" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-white/60">Certificado</span>
                <span className="font-semibold text-white/40">Pendente</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/40 shadow-inner">
                <div className="h-full w-0 rounded-full bg-[#DBC094]" />
              </div>
            </div>
          </div>
        </div>

      </section>
    </StudentAreaShell>
  );
}