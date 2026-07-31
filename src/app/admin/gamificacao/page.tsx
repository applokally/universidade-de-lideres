"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ChevronRight,
  Gift,
  ListChecks,
  Medal,
  Trophy,
  Target,
  Users,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { GamificationAdminNav } from "./_components/GamificationAdminNav";
import { formatPoints } from "./_components/gamificationHelpers";

type Metrics = {
  rules: number;
  totalPoints: number;
  activeUsers: number;
  rewards: number;
  pendingRedemptions: number;
  badges: number;
  challenges: number;
};

const modules = [
  {
    title: "Desafios",
    description: "Criar metas por período com progresso e bônus de pontos.",
    href: "/admin/gamificacao/desafios",
    icon: Target,
  },
  {
    title: "Regras de pontos",
    description: "Configurar pontuação por aula, curso, live, comunidade e avaliação.",
    href: "/admin/gamificacao/regras",
    icon: ListChecks,
  },
  {
    title: "Ranking",
    description: "Acompanhar os alunos mais ativos e engajados.",
    href: "/admin/gamificacao/ranking",
    icon: Trophy,
  },
  {
    title: "Recompensas",
    description: "Cadastrar benefícios trocados por pontos.",
    href: "/admin/gamificacao/recompensas",
    icon: Gift,
  },
  {
    title: "Resgates",
    description: "Aprovar, entregar ou rejeitar solicitações dos alunos.",
    href: "/admin/gamificacao/resgates",
    icon: Award,
  },
  {
    title: "Conquistas",
    description: "Criar selos e marcos de evolução.",
    href: "/admin/gamificacao/conquistas",
    icon: Medal,
  },
];

export default function AdminGamificationPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [metrics, setMetrics] = useState<Metrics>({
    rules: 0,
    totalPoints: 0,
    activeUsers: 0,
    rewards: 0,
    pendingRedemptions: 0,
    badges: 0,
    challenges: 0,
  });

  useEffect(() => {
    async function loadMetrics() {
      const [rules, ranking, rewards, pendingRedemptions, badges, challenges] = await Promise.all([
        supabase.from("gamification_point_rules").select("id", { count: "exact", head: true }),
        supabase.from("gamification_public_ranking").select("user_id,earned_points"),
        supabase
          .from("gamification_rewards")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("gamification_reward_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("gamification_badges")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("gamification_challenges")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      const rankingRows = (ranking.data ?? []) as Array<{
        user_id: string;
        earned_points: number;
      }>;

      setMetrics({
        rules: rules.count ?? 0,
        totalPoints: rankingRows.reduce((sum, row) => sum + Number(row.earned_points ?? 0), 0),
        activeUsers: rankingRows.length,
        rewards: rewards.count ?? 0,
        pendingRedemptions: pendingRedemptions.count ?? 0,
        badges: badges.count ?? 0,
        challenges: challenges.count ?? 0,
      });
    }

    void loadMetrics();
  }, [supabase]);

  return (
    <>
      <GamificationAdminNav />

      <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
            Gamificação
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em] text-[#1f2230]">
            Engajamento dos alunos
          </h1>
          <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[#667085]">
            Controle pontos, ranking, recompensas e conquistas sem poluir a área administrativa.
          </p>
        </div>
      </header>

      <section className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        {[
          ["Regras", metrics.rules],
          ["Pontos gerados", formatPoints(metrics.totalPoints)],
          ["Alunos pontuando", metrics.activeUsers],
          ["Recompensas", metrics.rewards],
          ["Resgates pendentes", metrics.pendingRedemptions],
          ["Conquistas", metrics.badges],
          ["Desafios", metrics.challenges],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[16px] border border-[#e7e9f0] bg-white px-4 py-3"
          >
            <p className="text-[12px] font-medium text-[#697386]">{label}</p>
            <strong className="mt-1 block text-[24px] font-semibold tracking-[-0.04em] text-[#1f2230]">
              {value}
            </strong>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {modules.map((module, index) => {
          const Icon = module.icon;

          return (
            <details
              key={module.href}
              className="group border-b border-[#edf0f5] last:border-b-0"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition hover:bg-[#fafbfe] [&::-webkit-details-marker]:hidden">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f7f0e2] text-[#7c5d2f]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[16px] font-semibold text-[#1f2230]">
                    {module.title}
                  </strong>
                  <span className="mt-1 block text-[13px] leading-5 text-[#667085]">
                    {module.description}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#9aa1b2] transition group-open:rotate-90" />
              </summary>

              <div className="border-t border-[#edf0f5] bg-[#fafbfe] px-5 py-4">
                <Link
                  href={module.href}
                  className="inline-flex h-10 items-center justify-center rounded-[12px] bg-[#DBC094] px-4 text-[13px] font-semibold text-black transition hover:brightness-105"
                >
                  Abrir {module.title.toLowerCase()}
                </Link>
              </div>
            </details>
          );
        })}
      </section>
    </>
  );
}
