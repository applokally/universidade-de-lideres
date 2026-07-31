"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { CommunityAdminNav } from "../_components/CommunityAdminNav";
import { supabaseBrowser } from "@/lib/supabase/browser";

type SettingsState = {
  allow_student_posts: boolean;
  require_post_approval: boolean;
  allow_student_comments: boolean;
  require_comment_approval: boolean;
  allow_media_uploads: boolean;
  allow_reports: boolean;
  community_rules: string;
};

const defaults: SettingsState = {
  allow_student_posts: true,
  require_post_approval: false,
  allow_student_comments: true,
  require_comment_approval: false,
  allow_media_uploads: true,
  allow_reports: true,
  community_rules:
    "Participe com respeito, mantenha as conversas relacionadas ao aprendizado e não publique dados pessoais ou conteúdo ofensivo.",
};

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-[16px] border border-[#e7e9f0] p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[#9b7539]"
      />
      <span>
        <strong className="block text-sm text-[#1f2230]">{label}</strong>
        <span className="mt-1 block text-xs leading-5 text-[#667085]">{description}</span>
      </span>
    </label>
  );
}

export default function AdminCommunitySettingsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from("community_settings")
        .select("key,value")
        .in("key", Object.keys(defaults));
      if (error) {
        setMessage("Não foi possível carregar as configurações.");
      } else {
        const next = { ...defaults };
        (data ?? []).forEach((row) => {
          if (!(row.key in next)) return;
          if (row.key === "community_rules") {
            next.community_rules = String(row.value ?? defaults.community_rules);
          } else {
            (next as Record<string, boolean | string>)[row.key] =
              row.value === true || row.value === "true";
          }
        });
        setSettings(next);
      }
      setLoading(false);
    }
    void loadSettings();
  }, [supabase]);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("community_settings")
      .upsert(rows, { onConflict: "key" });
    setMessage(
      error
        ? "Não foi possível salvar as regras e permissões."
        : "Regras e permissões salvas com sucesso.",
    );
    setSaving(false);
  }

  const toggles: Array<{
    key: Exclude<keyof SettingsState, "community_rules">;
    label: string;
    description: string;
  }> = [
    { key: "allow_student_posts", label: "Alunos podem publicar", description: "Exibe e habilita o campo de nova publicação." },
    { key: "require_post_approval", label: "Aprovar publicações antes de exibir", description: "Novos posts ficam pendentes até a moderação." },
    { key: "allow_student_comments", label: "Alunos podem comentar", description: "Permite respostas nas publicações que aceitam comentários." },
    { key: "require_comment_approval", label: "Aprovar comentários antes de exibir", description: "Novos comentários ficam ocultos até a moderação." },
    { key: "allow_media_uploads", label: "Permitir imagens", description: "Habilita imagens em publicações e comentários." },
    { key: "allow_reports", label: "Permitir denúncias", description: "Exibe a opção de denunciar conteúdo para moderação." },
  ];

  return (
    <>
      <CommunityAdminNav />
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Comunidade</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Regras e permissões
        </h1>
        <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-[#667085]">
          Controle o que os alunos podem publicar e quando a moderação é obrigatória.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center gap-3 rounded-[22px] border border-[#e7e9f0] bg-white text-sm text-[#667085]">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações...
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <section className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
            <div className="grid gap-3 md:grid-cols-2">
              {toggles.map((item) => (
                <Toggle
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={settings[item.key]}
                  onChange={(checked) =>
                    setSettings((current) => ({ ...current, [item.key]: checked }))
                  }
                />
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#9b7539]" />
              <h2 className="font-semibold">Regras visíveis aos alunos</h2>
            </div>
            <textarea
              value={settings.community_rules}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  community_rules: event.target.value,
                }))
              }
              rows={10}
              className="mt-4 w-full rounded-[14px] border border-[#dfe3ec] p-4 text-sm leading-6 outline-none focus:border-[#DBC094]"
            />
          </section>
        </div>
      )}

      {message ? <p className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{message}</p> : null}
      <button
        type="button"
        onClick={saveSettings}
        disabled={loading || saving}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#1f2230] px-6 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Salvando..." : "Salvar regras e permissões"}
      </button>
    </>
  );
}
