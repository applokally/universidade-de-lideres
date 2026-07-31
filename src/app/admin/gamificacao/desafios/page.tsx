"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { GamificationAdminNav } from "../_components/GamificationAdminNav";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  target_count: number;
  points_reward: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

const eventLabels: Record<string, string> = {
  lesson_completed: "Concluir aulas",
  course_completed: "Concluir cursos",
  trail_completed: "Concluir trilhas",
  assessment_passed: "Ser aprovado em avaliações",
  live_attended: "Participar de lives",
  community_post_created: "Criar publicações",
  community_comment_created: "Comentar na comunidade",
};

export default function AdminChallengesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "lesson_completed",
    target_count: 3,
    points_reward: 50,
    starts_at: "",
    ends_at: "",
  });

  async function loadChallenges() {
    setLoading(true);
    const { data, error } = await supabase
      .from("gamification_challenges")
      .select("*")
      .order("is_active", { ascending: false })
      .order("starts_at", { ascending: false });
    if (error) setMessage("Não foi possível carregar os desafios.");
    else setChallenges((data ?? []) as Challenge[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadChallenges();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("gamification_challenges").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_type: form.event_type,
      target_count: Number(form.target_count),
      points_reward: Number(form.points_reward),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: true,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("Desafio criado e disponibilizado.");
      setForm((current) => ({ ...current, title: "", description: "" }));
      await loadChallenges();
    }
    setSaving(false);
  }

  async function toggleChallenge(challenge: Challenge) {
    const { error } = await supabase
      .from("gamification_challenges")
      .update({ is_active: !challenge.is_active })
      .eq("id", challenge.id);
    if (error) setMessage("Não foi possível alterar o desafio.");
    else await loadChallenges();
  }

  async function deleteChallenge(id: string) {
    if (!window.confirm("Excluir este desafio?")) return;
    const { error } = await supabase.from("gamification_challenges").delete().eq("id", id);
    if (error) setMessage("Não foi possível excluir o desafio.");
    else await loadChallenges();
  }

  const inputClass =
    "h-11 rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#DBC094]";

  return (
    <>
      <GamificationAdminNav />
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Gamificação</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em]">Desafios configuráveis</h1>
        <p className="mt-2 text-sm text-[#667085]">
          Defina uma meta, período e recompensa. O progresso usa os eventos já registrados na pontuação.
        </p>
      </header>

      <form onSubmit={createChallenge} className="mt-6 rounded-[22px] border border-[#e7e9f0] bg-white p-5">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-[#9b7539]" />
          <h2 className="font-semibold">Novo desafio</h2>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Título do desafio" className={inputClass} />
          <select value={form.event_type} onChange={(event) => setForm({ ...form, event_type: event.target.value })} className={inputClass}>
            {Object.entries(eventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descrição para o aluno" className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-[#667085]">Meta
              <input type="number" min={1} required value={form.target_count} onChange={(event) => setForm({ ...form, target_count: Number(event.target.value) })} className={`${inputClass} mt-1 w-full`} />
            </label>
            <label className="text-xs text-[#667085]">Bônus em pontos
              <input type="number" min={0} required value={form.points_reward} onChange={(event) => setForm({ ...form, points_reward: Number(event.target.value) })} className={`${inputClass} mt-1 w-full`} />
            </label>
          </div>
          <label className="text-xs text-[#667085]">Início (opcional)
            <input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} className={`${inputClass} mt-1 w-full`} />
          </label>
          <label className="text-xs text-[#667085]">Fim (opcional)
            <input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} className={`${inputClass} mt-1 w-full`} />
          </label>
        </div>
        <button disabled={saving} className="mt-4 h-11 rounded-[12px] bg-[#DBC094] px-6 text-sm font-semibold text-black disabled:opacity-50">
          {saving ? "Salvando..." : "Criar desafio"}
        </button>
      </form>

      {message ? <p className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{message}</p> : null}

      <section className="mt-5 overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-14 text-sm text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando desafios...
          </div>
        ) : challenges.length === 0 ? (
          <div className="py-14 text-center text-[#667085]">
            <Target className="mx-auto h-9 w-9 text-[#9b7539]" />
            <p className="mt-3 font-semibold text-[#1f2230]">Nenhum desafio configurado</p>
          </div>
        ) : (
          <div className="divide-y divide-[#edf0f5]">
            {challenges.map((challenge) => (
              <article key={challenge.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <Target className="h-6 w-6 shrink-0 text-[#9b7539]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{challenge.title}</h2>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${challenge.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {challenge.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#667085]">
                    {eventLabels[challenge.event_type] ?? challenge.event_type} · Meta {challenge.target_count} · Bônus {challenge.points_reward} pts
                  </p>
                </div>
                <button onClick={() => toggleChallenge(challenge)} className="h-10 rounded-[11px] border border-[#dfe3ec] px-4 text-sm font-semibold">
                  {challenge.is_active ? "Desativar" : "Ativar"}
                </button>
                <button onClick={() => deleteChallenge(challenge.id)} aria-label="Excluir desafio" className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] border border-red-100 text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
