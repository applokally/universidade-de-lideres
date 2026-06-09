import { Clock3 } from "lucide-react";
import { StudentHeader } from "../_components/StudentHeader";

export default function StudentContinueWatchingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <section className="px-5 pb-16 pt-[116px] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1720px]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#DBC094]">
            Progresso
          </p>

          <h1 className="mt-3 text-[36px] font-black leading-none tracking-[-0.06em] text-white sm:text-[52px]">
            Continue assistindo
          </h1>

          <section className="mt-8 flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#101116] p-8 text-center">
            <Clock3 className="h-12 w-12 text-[#DBC094]" />

            <h2 className="mt-5 text-[28px] font-black tracking-[-0.05em]">
              Nenhuma aula em andamento
            </h2>

            <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-white/48">
              Quando o aluno iniciar aulas e trilhas, os conteúdos em andamento aparecerão aqui.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
