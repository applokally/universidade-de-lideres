"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const statCards = [
  {
    title: "Cadastros pendentes",
    value: "14",
    badge: "+4",
    badgeLabel: "Nesta semana",
    bg: "from-[#f6edf1] to-[#f9f3f5]",
    iconBg: "bg-[#f7d9e7]",
    icon: "📝",
  },
  {
    title: "Alunos ativos",
    value: "126",
    badge: "+12",
    badgeLabel: "Neste mês",
    bg: "from-[#f1ecfa] to-[#f7f4fc]",
    iconBg: "bg-[#e4dbfa]",
    icon: "👥",
  },
  {
    title: "Cursos ativos",
    value: "08",
    badge: "+2",
    badgeLabel: "Neste mês",
    bg: "from-[#eef5fb] to-[#f5f9fd]",
    iconBg: "bg-[#dbeaf8]",
    icon: "📚",
  },
  {
    title: "Materiais publicados",
    value: "57",
    badge: "+9",
    badgeLabel: "Atualizados",
    bg: "from-[#f6f1e7] to-[#faf7f1]",
    iconBg: "bg-[#ecdfc5]",
    icon: "📎",
  },
];

const moduleCards = [
  {
    title: "Alunos",
    subtitle: "Gestão e aprovação",
    description:
      "Acompanhe solicitações de cadastro, visualize alunos ativos e organize níveis de acesso da plataforma.",
    links: [
      { label: "Cadastros pendentes", href: "/admin/cadastros" },
      { label: "Alunos ativos", href: "/admin/alunos" },
    ],
  },
  {
    title: "Cursos",
    subtitle: "Conteúdo estruturado",
    description:
      "Gerencie trilhas, cursos, módulos, aulas e materiais didáticos da Universidade de Líderes.",
    links: [
      { label: "Trilhas e cursos", href: "/admin/cursos" },
      { label: "Módulos e aulas", href: "/admin/aulas" },
      { label: "Materiais", href: "/admin/materiais" },
    ],
  },
];

const progressRows = [
  {
    title: "Trilha Liderança Essencial",
    description: "Curso com maior número de acessos nesta semana",
    value: "83%",
  },
  {
    title: "Trilha Construção de Equipe",
    description: "Conteúdo com maior taxa de conclusão",
    value: "64%",
  },
  {
    title: "Trilha Mentalidade e Crescimento",
    description: "Módulo com mais materiais baixados",
    value: "41%",
  },
];

const feedItems = [
  {
    title: "Novos cadastros aguardando aprovação",
    text: "14 solicitações recebidas para análise administrativa.",
    time: "Atualizado há 5 min",
  },
  {
    title: "Curso “Liderança Essencial” em destaque",
    text: "Maior volume de acessos entre os conteúdos da semana.",
    time: "Atualizado há 18 min",
  },
  {
    title: "Materiais de apoio mais acessados",
    text: "Apostilas e PDFs das trilhas principais com alta procura.",
    time: "Atualizado há 32 min",
  },
];

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-[#e8ebf2] bg-white shadow-[0_8px_24px_rgba(31,34,48,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-[#8e93a5]">
            Painel administrativo
          </div>
          <h1 className="mt-2 text-[46px] font-semibold leading-none tracking-[-0.05em] text-[#111827]">
            Dashboard
          </h1>
        </div>

        <Link
          href="/admin/cadastros"
          className="inline-flex items-center gap-3 self-start rounded-[14px] bg-[#DBC094] px-5 py-3 text-[15px] font-medium text-black transition hover:brightness-105"
        >
          Abrir cadastros
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
            →
          </span>
        </Link>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, delay: 0.04 }}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <SectionCard key={card.title} className={`bg-gradient-to-br ${card.bg}`}>
              <div className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${card.iconBg} text-[22px]`}
                  >
                    {card.icon}
                  </div>

                  <div className="text-[15px] font-medium text-[#43495a]">
                    {card.title}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="text-[48px] font-semibold leading-none tracking-[-0.07em] text-[#1f2230]">
                    {card.value}
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-[10px] bg-[#b89256] px-3 py-1.5 text-sm font-semibold text-white">
                    {card.badge}
                  </div>

                  <div className="text-[15px] text-[#5f6576]">{card.badgeLabel}</div>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, delay: 0.08 }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard>
            <div className="border-b border-[#edf0f5] px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#131824]">
                    Módulos centrais
                  </h2>
                  <p className="mt-1 text-sm text-[#7f8597]">
                    Acesso rápido por área de gestão
                  </p>
                </div>

                <span className="text-sm font-medium text-[#7b5a28]">
                  Universidade de Líderes
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              {moduleCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-[18px] border border-[#e7ebf2] bg-[#fbfcff] p-5 transition hover:shadow-[0_10px_26px_rgba(31,34,48,0.06)]"
                >
                  <div className="text-[22px] font-semibold tracking-[-0.03em] text-[#151a26]">
                    {card.title}
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#7b5a28]">
                    {card.subtitle}
                  </div>
                  <p className="mt-3 text-[15px] leading-7 text-[#646b7d]">
                    {card.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {card.links.map((action) => (
                      <Link
                        key={action.label}
                        href={action.href}
                        className="inline-flex items-center rounded-[12px] bg-[#f7f0e2] px-4 py-2 text-sm font-medium text-[#7b5a28] transition hover:bg-[#f2e5ca]"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="border-b border-[#edf0f5] px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#131824]">
                    Destaques do dia
                  </h2>
                  <p className="mt-1 text-sm text-[#7f8597]">
                    Informações gerais do painel
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {feedItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[16px] border border-[#e8ebf2] bg-[#fbfcff] p-4"
                  >
                    <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#161b27]">
                      {item.title}
                    </div>
                    <div className="mt-2 text-[15px] leading-7 text-[#646b7d]">
                      {item.text}
                    </div>
                    <div className="mt-3 text-sm text-[#9aa0b1]">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, delay: 0.12 }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard>
            <div className="border-b border-[#edf0f5] px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#131824]">
                    Trilhas em evidência
                  </h2>
                  <p className="mt-1 text-sm text-[#7f8597]">
                    Conteúdos com maior movimentação
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {progressRows.map((row) => (
                  <div
                    key={row.title}
                    className="rounded-[16px] border border-[#e8ebf2] bg-[#fbfcff] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#161b27]">
                          {row.title}
                        </div>
                        <div className="mt-1 text-sm text-[#7a8092]">
                          {row.description}
                        </div>
                      </div>

                      <div className="inline-flex h-11 min-w-[62px] items-center justify-center rounded-full border border-[#e4d6bc] bg-[#fbf5ea] text-[15px] font-semibold text-[#7b5a28]">
                        {row.value}
                      </div>
                    </div>

                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e9edf5]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#DBC094] to-[#e6d3b2]"
                        style={{ width: row.value }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="border-b border-[#edf0f5] px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#131824]">
                    Distribuição administrativa
                  </h2>
                  <p className="mt-1 text-sm text-[#7f8597]">
                    Peso visual por módulo
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-center py-4">
                <div className="relative flex h-[260px] w-[260px] items-center justify-center rounded-full bg-[conic-gradient(#DBC094_0_40%,#e9ddc7_40%_70%,#f1f3f8_70%_100%)]">
                  <div className="flex h-[150px] w-[150px] items-center justify-center rounded-full bg-white text-center">
                    <div>
                      <div className="text-[13px] uppercase tracking-[0.18em] text-[#99a0b2]">
                        Núcleo
                      </div>
                      <div className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#111827]">
                        ADM
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-4">
                {[
                  { color: "bg-[#DBC094]", label: "Alunos", value: "40%" },
                  { color: "bg-[#e6d7bd]", label: "Cursos", value: "30%" },
                  { color: "bg-[#d9dde7]", label: "Acadêmico", value: "30%" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-[#4e5567]">
                      <span className={`inline-block h-3.5 w-3.5 rounded-full ${item.color}`} />
                      <span className="text-[15px]">{item.label}</span>
                    </div>
                    <div className="text-[15px] font-semibold text-[#131824]">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </motion.section>
    </div>
  );
}