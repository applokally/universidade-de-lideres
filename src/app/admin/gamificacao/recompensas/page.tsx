"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, Loader2, Plus } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { GamificationAdminNav } from "../_components/GamificationAdminNav";
import { Reward, formatPoints } from "../_components/gamificationHelpers";

export default function AdminGamificationRewardsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointsRequired, setPointsRequired] = useState(100);
  const [stock, setStock] = useState("");

  async function loadRewards() {
    setLoading(true);
    const { data, error } = await supabase.from("gamification_rewards").select("id,title,description,points_required,reward_type,image_path,stock,is_active,created_at").order("created_at", { ascending: false });
    if (error) setMessage(error.message); else setRewards((data ?? []) as Reward[]);
    setLoading(false);
  }
  useEffect(() => { void loadRewards(); }, []);

  async function createReward(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) { setMessage("Informe o título da recompensa."); return; }
    const { error } = await supabase.from("gamification_rewards").insert({ title: title.trim(), description: description.trim() || null, points_required: pointsRequired, reward_type: "benefit", stock: stock ? Number(stock) : null, is_active: true });
    if (error) { setMessage(error.message); return; }
    setTitle(""); setDescription(""); setPointsRequired(100); setStock(""); await loadRewards();
  }

  async function toggleReward(reward: Reward) {
    const { error } = await supabase.from("gamification_rewards").update({ is_active: !reward.is_active, updated_at: new Date().toISOString() }).eq("id", reward.id);
    if (error) setMessage(error.message); await loadRewards();
  }

  return <>
    <GamificationAdminNav />
    <header className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Gamificação</p><h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">Recompensas</h1><p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">Cadastre benefícios que incentivem o aluno a estudar, comentar e participar.</p></header>
    {message ? <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">{message}</div> : null}
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={createReward} className="rounded-[22px] border border-[#e7e9f0] bg-white p-5"><h2 className="text-[18px] font-semibold text-[#1f2230]">Nova recompensa</h2><div className="mt-4 grid gap-4"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] outline-none focus:border-[#DBC094]" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" rows={4} className="resize-none rounded-[12px] border border-[#dfe3ec] px-3 py-3 text-[14px] outline-none focus:border-[#DBC094]" /><input type="number" value={pointsRequired} onChange={(e) => setPointsRequired(Number(e.target.value))} placeholder="Pontos necessários" className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] outline-none focus:border-[#DBC094]" /><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Estoque opcional" className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] outline-none focus:border-[#DBC094]" /><button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black"><Plus className="h-4 w-4" />Criar recompensa</button></div></form>
      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">{loading ? <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]"><Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" />Carregando recompensas...</div> : rewards.length ? <div className="divide-y divide-[#edf0f5]">{rewards.map((reward) => <article key={reward.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f7f0e2] text-[#7c5d2f]"><Gift className="h-4 w-4" /></span><div><p className="text-[15px] font-semibold text-[#1f2230]">{reward.title}</p><p className="text-[12px] text-[#8b90a2]">{formatPoints(reward.points_required)} pontos • estoque {reward.stock ?? "ilimitado"}</p></div></div>{reward.description ? <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[#667085]">{reward.description}</p> : null}</div><button type="button" onClick={() => toggleReward(reward)} className={["inline-flex h-10 items-center justify-center rounded-[12px] border px-4 text-[13px] font-semibold", reward.is_active ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"].join(" ")}>{reward.is_active ? "Ativa" : "Inativa"}</button></article>)}</div> : <div className="px-5 py-14 text-center text-[14px] text-[#667085]">Nenhuma recompensa cadastrada.</div>}</section>
    </div>
  </>;
}
