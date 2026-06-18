"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CommunityAdminNav } from "../../_components/CommunityAdminNav";
import { CommunityChannel } from "../../_components/communityAdminHelpers";

export default function AdminCommunityNewPostPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [status, setStatus] = useState("published");
  const [allowComments, setAllowComments] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadChannels() {
      const { data } = await supabase
        .from("community_channels")
        .select("id,name,slug,description,is_locked,is_active,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const loadedChannels = (data ?? []) as CommunityChannel[];

      setChannels(loadedChannels);
      setChannelId((current) => current || loadedChannels[0]?.id || "");
    }

    void loadChannels();
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanBody = body.trim();

    if (!channelId || !cleanBody) {
      setMessage("Selecione um canal e escreva a publicação.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Sessão expirada. Faça login novamente.");
        return;
      }

      const { data: postData, error } = await supabase
        .from("community_posts")
        .insert({
          channel_id: channelId,
          author_id: user.id,
          title: title.trim() || null,
          body: cleanBody,
          image_path: imagePath.trim() || null,
          status,
          allow_comments: allowComments,
          is_pinned: isPinned,
          is_featured: isFeatured,
          published_at: status === "published" ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (sendNotification) {
        await supabase.from("community_notifications").insert({
          title: title.trim() || "Nova publicação na Comunidade UNL",
          body: cleanBody.length > 160 ? `${cleanBody.slice(0, 160)}...` : cleanBody,
          target_type: "channel",
          channel_id: channelId,
          status: "sent",
          sent_at: new Date().toISOString(),
          created_by: user.id,
        });
      }

      window.location.href = `/admin/comunidade/publicacoes/${postData?.id}`;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a publicação.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <CommunityAdminNav />

      <header className="mb-5">
        <Link
          href="/admin/comunidade/publicacoes"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#667085] transition hover:text-[#1f2230]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para publicações
        </Link>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
          Comunidade
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Nova publicação oficial
        </h1>
        <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">
          Publique avisos, desafios, materiais, chamadas de mentoria ou comunicados oficiais.
        </p>
      </header>

      {message ? (
        <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {message}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 rounded-[22px] border border-[#e7e9f0] bg-white p-5 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section className="space-y-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">
              Canal
            </span>
            <select
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">
              Título opcional
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Live de hoje às 20h"
              className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">
              Texto da publicação
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              placeholder="Escreva o conteúdo que será exibido na comunidade..."
              className="mt-2 w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">
              Imagem opcional
            </span>
            <input
              value={imagePath}
              onChange={(event) => setImagePath(event.target.value)}
              placeholder="URL ou caminho no storage"
              className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
            />
          </label>
        </section>

        <aside className="space-y-4 rounded-[18px] border border-[#edf0f5] bg-[#fafbfe] p-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">
              Status
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
            >
              <option value="published">Publicado</option>
              <option value="pending">Pendente</option>
              <option value="hidden">Oculto</option>
            </select>
          </label>

          {[
            {
              checked: allowComments,
              onChange: setAllowComments,
              label: "Permitir comentários",
            },
            {
              checked: isPinned,
              onChange: setIsPinned,
              label: "Fixar no topo",
            },
            {
              checked: isFeatured,
              onChange: setIsFeatured,
              label: "Marcar como destaque",
            },
            {
              checked: sendNotification,
              onChange: setSendNotification,
              label: "Enviar notificação",
            },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-[14px] border border-[#e6eaf1] bg-white px-4 py-3"
            >
              <span className="text-[13px] font-semibold text-[#3f4658]">
                {item.label}
              </span>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(event) => item.onChange(event.target.checked)}
                className="h-4 w-4 accent-[#DBC094]"
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:opacity-55"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar
          </button>
        </aside>
      </form>
    </>
  );
}
