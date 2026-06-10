import Link from "next/link";
import { Award, ChevronLeft, Flame, Star, Trophy } from "lucide-react";
import { StudentHeader } from "../_components/StudentHeader";

export default function GamificacaoPage() {
  return (
    <main className="min-h-screen bg-[#050609] text-white">
      <StudentHeader />

      <section className="px-5 pb-20 pt-[112px] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Link
            href="/aluno/area"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-white/58 transition hover:text-[#DBC094]"
          >
            <ChevronLeft size={18} />
            Voltar para a área do aluno
          </Link>

          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06] backdrop-blur-[32px] sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#DBC094]/22 bg-[#DBC094]/10 px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.18em] text-[#DBC094]">
                  <Trophy size={15} />
                  Gamificação
                </div>

                <h1 className="text-[42px] font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-[56px] lg:text-[72px]">
                  Sua evolução como líder
                </h1>

                <p className="mt-5 max-w-xl text-base font-medium leading-7 text-white/58 sm:text-lg">
                  Acompanhe sua jornada, conquistas, níveis e evolução dentro da Universidade de Líderes.
                </p>
              </div>

              <div className="grid w-full max-w-md grid-cols-3 gap-3">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center backdrop-blur-[24px]">
                  <Star className="mx-auto text-[#DBC094]" size={30} />
                  <p className="mt-3 text-2xl font-black">0</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Pontos
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center backdrop-blur-[24px]">
                  <Flame className="mx-auto text-[#DBC094]" size={30} />
                  <p className="mt-3 text-2xl font-black">0</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Sequência
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center backdrop-blur-[24px]">
                  <Award className="mx-auto text-[#DBC094]" size={30} />
                  <p className="mt-3 text-2xl font-black">0</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">
                    Conquistas
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-6 text-white/58 backdrop-blur-[28px] sm:p-8">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-white">
              Em desenvolvimento
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 sm:text-base">
              Esta área já está disponível no menu e será conectada aos dados reais de progresso,
              certificados, aulas concluídas e conquistas do aluno na próxima etapa.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}