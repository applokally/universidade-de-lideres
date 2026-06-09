"use client";

import {
  Award,
  BadgeCheck,
  Clock3,
  Download,
  FileCheck2,
  LockKeyhole,
  Medal,
} from "lucide-react";
import { StudentAreaShell } from "../../_components/StudentAreaShell";

const certificateStats = [
  {
    label: "Certificados emitidos",
    value: "0",
    icon: Award,
  },
  {
    label: "Em andamento",
    value: "0",
    icon: Clock3,
  },
  {
    label: "Elegíveis",
    value: "0",
    icon: BadgeCheck,
  },
];

export default function StudentCertificatesPage() {
  return (
    <StudentAreaShell
      eyebrow="Certificados"
      title="Meus certificados"
      description="Acompanhe seus certificados emitidos, cursos elegíveis e formações concluídas dentro da Universidade de Líderes."
    >
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          {certificateStats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-[24px] border border-white/10 bg-[#101116] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DBC094] text-black">
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="text-[32px] font-black leading-none tracking-[-0.06em] text-white">
                    {item.value}
                  </span>
                </div>

                <p className="mt-4 text-[13px] font-black text-white/58">
                  {item.label}
                </p>
              </div>
            );
          })}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#101116] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                Histórico
              </p>

              <h2 className="mt-2 text-[26px] font-black leading-tight tracking-[-0.05em] text-white">
                Certificados disponíveis
              </h2>

              <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-white/48">
                Quando o aluno concluir os cursos e trilhas com certificado liberado pelo ADM,
                os documentos aparecerão nesta área para visualização e download.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-black text-white/52">
              <FileCheck2 className="h-4 w-4 text-[#DBC094]" />
              Nenhum emitido
            </div>
          </div>

          <div className="flex min-h-[340px] flex-col items-center justify-center px-4 py-10 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#DBC094]/20 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#DBC094]/30 bg-[#DBC094]/12 text-[#DBC094]">
                <Medal className="h-10 w-10" />
              </div>
            </div>

            <h3 className="mt-6 text-[28px] font-black leading-tight tracking-[-0.05em] text-white">
              Nenhum certificado liberado ainda
            </h3>

            <p className="mt-3 max-w-[620px] text-[14px] leading-7 text-white/48">
              Continue avançando nas trilhas e cursos. Assim que um certificado for liberado,
              ele será exibido aqui automaticamente.
            </p>

            <div className="mt-7 grid w-full max-w-[760px] gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-white/10 bg-black/22 p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/64">
                    <LockKeyhole className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[13px] font-black text-white">
                      Conclusão necessária
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-white/38">
                      Certificados são liberados após cumprir os requisitos definidos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-black/22 p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/64">
                    <Download className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[13px] font-black text-white">
                      Download futuro
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-white/38">
                      Quando emitido, o certificado poderá ser baixado nesta tela.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StudentAreaShell>
  );
}
