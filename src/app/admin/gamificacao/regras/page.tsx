"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2, Plus, Save } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { GamificationAdminNav } from "../_components/GamificationAdminNav";
import { GamificationRule } from "../_components/gamificationHelpers";

export default function AdminGamificationRulesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [rules, setRules] = useState<GamificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRule, setNewRule] = useState({
    event_type: "lesson_completed",
    title: "Aula concluída",
    description: "Pontos concedidos ao concluir uma aula.",
    points: 10,
  });

  async function loadRules() {
    setLoading(true);

    const { data, error } = await supabase
      .from("gamification_point_rules")
      .select("id,event_type,title,description,points,daily_limit,monthly_limit,is_active,sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      setMessage(error.message);
    } else {
      setRules((data ?? []) as GamificationRule[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRules();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateLocalRule(id: string, values: Partial<GamificationRule>) {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, ...values } : rule)),
    );
  }

  async function saveRule(rule: GamificationRule) {
    setSavingId(rule.id);
    setMessage("");

    const { error } = await supabase
      .from("gamification_point_rules")
      .update({
        title: rule.title,
        description: rule.description,
        points: rule.points,
        daily_limit: rule.daily_limit,
        monthly_limit: rule.monthly_limit,
        is_active: rule.is_active,
        sort_order: rule.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rule.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Regra salva.");
    }

    setSavingId("");
  }

  async function createRule() {
    setCreating(true);
    setMessage("");
    const { error } = await supabase.from("gamification_point_rules").insert({
      event_type: newRule.event_type.trim(),
      title: newRule.title.trim(),
      description: newRule.description.trim() || null,
      points: Number(newRule.points),
      is_active: true,
      sort_order: rules.length,
    });
    if (error) {
      setMessage(
        error.code === "23505"
          ? "Já existe uma regra para este evento. Edite a regra abaixo."
          : "Não foi possível criar a regra. Tente novamente.",
      );
    } else {
      setMessage("Nova regra criada.");
      await loadRules();
    }
    setCreating(false);
  }

  return (
    <>
      <GamificationAdminNav />

      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
          Gamificação
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Regras de pontos
        </h1>
        <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">
          Ajuste os pontos sem ocupar a tela inteira. Abra somente a regra que deseja editar.
        </p>
      </header>

      <section className="mb-5 rounded-[20px] border border-[#e7e9f0] bg-white p-5">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-[#9b7539]" />
          <h2 className="text-[17px] font-semibold text-[#1f2230]">Criar regra de pontos</h2>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr_1fr_120px_auto]">
          <select
            value={newRule.event_type}
            onChange={(event) =>
              setNewRule((current) => ({ ...current, event_type: event.target.value }))
            }
            className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-sm"
          >
            <option value="lesson_completed">Aula concluída</option>
            <option value="course_completed">Curso concluído</option>
            <option value="trail_completed">Trilha concluída</option>
            <option value="assessment_passed">Avaliação aprovada</option>
            <option value="live_attended">Participação em live</option>
            <option value="community_post_created">Publicação na comunidade</option>
            <option value="community_comment_created">Comentário na comunidade</option>
            <option value="community_like_received">Curtida recebida</option>
            <option value="daily_streak">Sequência diária</option>
          </select>
          <input
            value={newRule.title}
            onChange={(event) =>
              setNewRule((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Nome exibido"
            className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-sm"
          />
          <input
            value={newRule.description}
            onChange={(event) =>
              setNewRule((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Descrição"
            className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-sm"
          />
          <input
            type="number"
            min={0}
            value={newRule.points}
            onChange={(event) =>
              setNewRule((current) => ({ ...current, points: Number(event.target.value) }))
            }
            className="h-11 rounded-[12px] border border-[#dfe3ec] px-3 text-sm"
          />
          <button
            type="button"
            onClick={createRule}
            disabled={creating || !newRule.title.trim()}
            className="h-11 rounded-[12px] bg-[#DBC094] px-5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {creating ? "Criando..." : "Criar regra"}
          </button>
        </div>
      </section>

      {message ? (
        <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {message}{" "}
          {message.includes("carregar") || message.includes("fetch") ? (
            <button type="button" onClick={loadRules} className="font-semibold underline">
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" />
            Carregando regras...
          </div>
        ) : (
          rules.map((rule, index) => (
            <details
              key={rule.id}
              className="group border-b border-[#edf0f5] last:border-b-0"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition hover:bg-[#fafbfe] [&::-webkit-details-marker]:hidden">
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    rule.is_active ? "bg-emerald-500" : "bg-slate-300",
                  ].join(" ")}
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[16px] font-semibold text-[#1f2230]">
                    {rule.title}
                  </strong>
                  <span className="mt-1 block line-clamp-1 text-[13px] text-[#667085]">
                    {rule.description || "Regra de pontuação da plataforma."}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[#f7f0e2] px-3 py-1 text-[12px] font-semibold text-[#7c5d2f]">
                  {rule.points} pts
                </span>
                <ChevronRight className="h-4 w-4 text-[#9aa1b2] transition group-open:rotate-90" />
              </summary>

              <div className="grid gap-4 border-t border-[#edf0f5] bg-[#fafbfe] px-5 py-5 xl:grid-cols-[minmax(0,1fr)_130px_130px_130px_150px] xl:items-end">
                <div>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-[#667085]">
                      Nome exibido
                    </span>
                    <input
                      value={rule.title}
                      onChange={(event) =>
                        updateLocalRule(rule.id, { title: event.target.value })
                      }
                      className="mt-2 h-10 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] font-semibold text-[#1f2230] outline-none focus:border-[#DBC094]"
                    />
                  </label>

                  <label className="mt-3 block">
                    <span className="text-[12px] font-semibold text-[#667085]">
                      Descrição para o ADM
                    </span>
                    <textarea
                      value={rule.description ?? ""}
                      onChange={(event) =>
                        updateLocalRule(rule.id, { description: event.target.value })
                      }
                      rows={2}
                      className="mt-2 w-full resize-none rounded-[12px] border border-[#dfe3ec] px-3 py-2 text-[13px] leading-5 text-[#667085] outline-none focus:border-[#DBC094]"
                    />
                  </label>
                </div>

                <label>
                  <span className="text-[12px] font-semibold text-[#667085]">
                    Pontos
                  </span>
                  <input
                    type="number"
                    value={rule.points}
                    onChange={(event) =>
                      updateLocalRule(rule.id, { points: Number(event.target.value) })
                    }
                    className="mt-2 h-10 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
                  />
                </label>

                <label>
                  <span className="text-[12px] font-semibold text-[#667085]">
                    Limite/dia
                  </span>
                  <input
                    type="number"
                    value={rule.daily_limit ?? ""}
                    onChange={(event) =>
                      updateLocalRule(rule.id, {
                        daily_limit: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    className="mt-2 h-10 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
                  />
                </label>

                <label>
                  <span className="text-[12px] font-semibold text-[#667085]">
                    Limite/mês
                  </span>
                  <input
                    type="number"
                    value={rule.monthly_limit ?? ""}
                    onChange={(event) =>
                      updateLocalRule(rule.id, {
                        monthly_limit: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    className="mt-2 h-10 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateLocalRule(rule.id, { is_active: !rule.is_active })
                    }
                    className={[
                      "h-10 flex-1 rounded-[12px] border px-3 text-[12px] font-semibold",
                      rule.is_active
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {rule.is_active ? "Ativa" : "Inativa"}
                  </button>

                  <button
                    type="button"
                    onClick={() => saveRule(rule)}
                    disabled={savingId === rule.id}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#DBC094] text-black disabled:opacity-60"
                    title="Salvar regra"
                  >
                    {savingId === rule.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </details>
          ))
        )}
      </section>
    </>
  );
}
