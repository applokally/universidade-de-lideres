"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { GamificationAdminNav } from "../_components/GamificationAdminNav";
import { ProfileRow, Redemption, Reward, formatDate, formatPoints, getStatusClass, getStatusLabel } from "../_components/gamificationHelpers";

type Row = Redemption & { rewardTitle: string; userName: string };

export default function AdminGamificationRedemptionsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadRows() {
    setLoading(true);
    const { data, error } = await supabase.from("gamification_reward_redemptions").select("id,reward_id,user_id,points_spent,status,admin_note,redeemed_at,reviewed_at").order("redeemed_at", { ascending: false }).limit(200);
    if (error) { setMessage(error.message); setLoading(false); return; }
    const redemptions = (data ?? []) as Redemption[];
    const rewardIds = Array.from(new Set(redemptions.map((row) => row.reward_id)));
    const userIds = Array.from(new Set(redemptions.map((row) => row.user_id)));
    const [rewardsResponse, profilesResponse] = await Promise.all([
      rewardIds.length ? supabase.from("gamification_rewards").select("id,title,description,points_required,reward_type,image_path,stock,is_active,created_at").in("id", rewardIds) : Promise.resolve({ data: [] }),
      userIds.length ? supabase.from("profiles").select("id,full_name,avatar_url,role").in("id", userIds) : Promise.resolve({ data: [] }),
    ]);
    const rewards = ((rewardsResponse.data ?? []) as Reward[]).reduce((acc, reward) => acc.set(reward.id, reward), new Map<string, Reward>());
    const profiles = ((profilesResponse.data ?? []) as ProfileRow[]).reduce((acc, profile) => acc.set(profile.id, profile), new Map<string, ProfileRow>());
    setRows(redemptions.map((row) => ({ ...row, rewardTitle: rewards.get(row.reward_id)?.title || "Recompensa", userName: profiles.get(row.user_id)?.full_name || "Aluno" })));
    setLoading(false);
  }
  useEffect(() => { void loadRows(); }, []);

  async function updateStatus(id: string, status: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("gamification_reward_redemptions").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null }).eq("id", id);
    if (error) { setMessage(error.message); return; }
    await loadRows();
  }

  return <>
    <GamificationAdminNav />
    <header className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Gamificação</p><h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">Resgates</h1><p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">Aprove, entregue ou rejeite recompensas solicitadas pelos alunos.</p></header>
    {message ? <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">{message}</div> : null}
    <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
      {loading ? <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]"><Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" />Carregando resgates...</div> : rows.length ? <div className="divide-y divide-[#edf0f5]">{rows.map((row) => <article key={row.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(row.status)}`}>{getStatusLabel(row.status)}</span><span className="text-[12px] text-[#8b90a2]">{formatDate(row.redeemed_at)}</span></div><h2 className="mt-3 text-[16px] font-semibold text-[#1f2230]">{row.rewardTitle}</h2><p className="mt-1 text-[13px] text-[#667085]">{row.userName} • {formatPoints(row.points_spent)} pontos</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => updateStatus(row.id, "approved")} className="rounded-[10px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">Aprovar</button><button type="button" onClick={() => updateStatus(row.id, "delivered")} className="rounded-[10px] border border-[#d8bb80] bg-[#f7f0e2] px-3 py-2 text-[12px] font-semibold text-[#6f5124]">Entregar</button><button type="button" onClick={() => updateStatus(row.id, "rejected")} className="rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">Rejeitar</button></div></article>)}</div> : <div className="px-5 py-14 text-center text-[14px] text-[#667085]">Nenhum resgate solicitado ainda.</div>}
    </section>
  </>;
}
