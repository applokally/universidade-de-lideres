"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { GamificationAdminNav } from "../_components/GamificationAdminNav";
import { RankingRow, formatDate, formatPoints, getInitials } from "../_components/gamificationHelpers";

export default function AdminGamificationRankingPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRanking() {
      setLoading(true);

      const { data } = await supabase
        .from("gamification_public_ranking")
        .select("user_id,full_name,avatar_url,earned_points,entries_count,last_activity_at")
        .order("earned_points", { ascending: false })
        .limit(100);

      setRanking((data ?? []) as RankingRow[]);
      setLoading(false);
    }

    void loadRanking();
  }, [supabase]);

  return (
    <>
      <GamificationAdminNav />

      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
          Gamificação
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Ranking de alunos
        </h1>
        <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">
          Lista compacta dos alunos mais engajados.
        </p>
      </header>

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" />
            Carregando ranking...
          </div>
        ) : ranking.length > 0 ? (
          <div className="divide-y divide-[#edf0f5]">
            {ranking.map((item, index) => (
              <article key={item.user_id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7f0e2] text-[14px] font-semibold text-[#6f5124]">
                  {index < 3 ? <Trophy className="h-4 w-4" /> : index + 1}
                </span>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2f4f8] text-[12px] font-semibold text-[#596174]">
                  {getInitials(item.full_name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#1f2230]">
                    {item.full_name || "Aluno"}
                  </p>
                  <p className="mt-1 text-[12px] text-[#8b90a2]">
                    {item.entries_count} ações pontuadas • última atividade {formatDate(item.last_activity_at)}
                  </p>
                </div>

                <strong className="shrink-0 text-[18px] font-semibold text-[#1f2230]">
                  {formatPoints(item.earned_points)} pts
                </strong>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center text-[14px] text-[#667085]">
            Nenhum aluno pontuou ainda.
          </div>
        )}
      </section>
    </>
  );
}
