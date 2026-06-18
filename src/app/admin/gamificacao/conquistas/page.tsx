"use client";

import { useEffect, useMemo, useState } from "react";
import { Medal, Plus } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { GamificationAdminNav } from "../_components/GamificationAdminNav";
import { Badge, formatPoints } from "../_components/gamificationHelpers";

export default function AdminGamificationBadgesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirementValue, setRequirementValue] = useState(100);

  async function loadBadges() {
    const { data } = await supabase.from("gamification_badges").select("id,title,description,icon,requirement_type,requirement_value,is_active,sort_order").order("sort_order", { ascending: true });
    setBadges((data ?? []) as Badge[]);
  }
  useEffect(() => { void loadBadges(); }, []);

  async function createBadge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    await supabase.from("gamification_badges").insert({ title: title.trim(), description: description.trim() || null, icon: "medal", requirement_type: "points", requirement_value: requirementValue, is_active: true, sort_order: badges.length + 1 });
    setTitle(""); setDescription(""); setRequirementValue(100); await loadBadges();
  }

  return <>
    <GamificationAdminNav />
    <header className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Gamificação</p><h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">Conquistas</h1><p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">Cadastre selos e marcos visuais para estimular evolução contínua.</p></header>
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={createBadge} className="rounded-[22px] border border-[#e7e9f0] bg-white p-5"><h2 className="text-[18px] font-semibold text-[#1f2230]">Nova conquista</h2><div className="mt-4 grid gap-4"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] outline-none focus:border-[#DBC094]" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" rows={4} className="resize-none rounded-[12px] border border-[#dfe3ec] px-3 py-3 text-[14px] outline-none focus:border-[#DBC094]" /><input type="number" value={requirementValue} onChange={(e) => setRequirementValue(Number(e.target.value))} placeholder="Pontos necessários" className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] outline-none focus:border-[#DBC094]" /><button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black"><Plus className="h-4 w-4" />Criar conquista</button></div></form>
      <section className="grid gap-4 md:grid-cols-2">{badges.map((badge) => <article key={badge.id} className="rounded-[22px] border border-[#e7e9f0] bg-white p-5"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f7f0e2] text-[#7c5d2f]"><Medal className="h-5 w-5" /></span><h2 className="mt-4 text-[17px] font-semibold text-[#1f2230]">{badge.title}</h2><p className="mt-2 text-[13px] leading-5 text-[#667085]">{badge.description || "Conquista da plataforma."}</p><p className="mt-4 text-[12px] font-semibold text-[#9b7539]">{formatPoints(badge.requirement_value)} pontos</p></article>)}</section>
    </div>
  </>;
}
