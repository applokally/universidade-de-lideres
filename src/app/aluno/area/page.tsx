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
      <section className="rounded-[26px] border border-white/10 bg-[#101116] px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
              Sua jornada
            </p>

            <h2 className="mt-3 max-w-[680px] text-[28px] font-black leading-tight tracking-[-0.045em] text-white sm:text-[34px]">
              Continue sua evolução na plataforma.
            </h2>

            <p className="mt-3 max-w-[680px] text-[14px] leading-6 text-white/52">
              Veja o andamento dos seus cursos, trilhas, aulas concluídas e certificados liberados.
            </p>

            <div className="mt-6 max-w-[820px]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-bold text-white/44">
                    Progresso geral
                  </p>

                  <strong className="mt-1 block text-[30px] font-black leading-none tracking-[-0.045em] text-white">
                    0%
                  </strong>
                </div>

                <p className="text-[12px] font-bold text-white/40">
                  Nenhuma aula concluída ainda
                </p>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-0 rounded-full bg-[#DBC094]" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-[13px] text-white/56">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#DBC094]" />
                <span>
                  <strong className="text-white">0</strong> cursos
                </span>
              </div>

              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#DBC094]" />
                <span>
                  <strong className="text-white">0</strong> trilhas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#DBC094]" />
                <span>
                  <strong className="text-white">0</strong> aulas concluídas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-[#DBC094]" />
                <span>
                  <strong className="text-white">0</strong> certificados
                </span>
              </div>
            </div>
          </div>

          <aside className="rounded-[20px] border border-[#DBC094]/16 bg-[#DBC094]/8 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DBC094]">
              Próximo passo
            </p>

            <h3 className="mt-2 text-[19px] font-black leading-tight tracking-[-0.035em] text-white">
              Iniciar sua primeira aula
            </h3>

            <p className="mt-2 text-[13px] leading-5 text-white/50">
              Comece pelos conteúdos disponíveis e acompanhe sua evolução aqui.
            </p>

            <a
              href="/aluno"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#DBC094] px-4 text-[12px] font-black text-black transition hover:bg-white"
            >
              Ver conteúdos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </aside>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[26px] border border-white/10 bg-[#101116] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                Atividade recente
              </p>

              <h2 className="mt-2 text-[23px] font-black tracking-[-0.04em] text-white">
                Histórico da evolução
              </h2>
            </div>

            <Clock3 className="h-5 w-5 text-[#DBC094]" />
          </div>

          <div className="mt-5 border-t border-white/10">
            <div className="flex items-center justify-between gap-4 py-5">
              <div>
                <p className="text-[14px] font-black text-white">
                  Nenhuma atividade registrada
                </p>

                <p className="mt-1 text-[13px] leading-5 text-white/42">
                  Suas aulas, cursos, trilhas e certificados aparecerão aqui conforme sua evolução.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/34">
                aguardando
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-[#101116] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#DBC094]" />

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DBC094]">
              Meta atual
            </p>
          </div>

          <h2 className="mt-3 text-[22px] font-black leading-tight tracking-[-0.04em] text-white">
            Concluir a primeira etapa.
          </h2>

          <p className="mt-2 text-[13px] leading-5 text-white/46">
            A meta será atualizada conforme o aluno iniciar cursos e avançar nas trilhas.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-4 text-[12px] font-bold">
                <span className="text-white/48">Aulas concluídas</span>
                <span className="text-white/70">0 de 0</span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-0 rounded-full bg-[#DBC094]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 text-[12px] font-bold">
                <span className="text-white/48">Certificado</span>
                <span className="text-white/70">pendente</span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-0 rounded-full bg-[#DBC094]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </StudentAreaShell>
  );
}
