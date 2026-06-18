"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CommunityAdminNav } from "../_components/CommunityAdminNav";
import { CommunityChannel, formatDate } from "../_components/communityAdminHelpers";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  target_type: string | null;
  status: string | null;
  created_at: string | null;
  sent_at: string | null;
};

export default function AdminCommunityNotificationsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [channelId, setChannelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [channelsResponse, notificationsResponse] = await Promise.all([
      supabase
        .from("community_channels")
        .select("id,name,slug,description,is_locked,is_active,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("community_notifications")
        .select("id,title,body,target_type,status,created_at,sent_at")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const loadedChannels = (channelsResponse.data ?? []) as CommunityChannel[];

    setChannels(loadedChannels);
    setChannelId((current) => current || loadedChannels[0]?.id || "");
    setNotifications((notificationsResponse.data ?? []) as NotificationRow[]);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function sendNotification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !body.trim()) {
      setMessage("Preencha título e mensagem.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("community_notifications").insert({
        title: title.trim(),
        body: body.trim(),
        target_type: targetType,
        channel_id: targetType === "channel" ? channelId : null,
        status: "sent",
        sent_at: new Date().toISOString(),
        created_by: user?.id ?? null,
      });

      if (error) throw error;

      setTitle("");
      setBody("");
      await loadData();
      setMessage("Notificação enviada.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a notificação.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <CommunityAdminNav />

      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
          Comunidade
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Notificações
        </h1>
        <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-[#667085]">
          Envie comunicados para todos os alunos ou para canais específicos.
        </p>
      </header>

      {message ? (
        <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form
          onSubmit={sendNotification}
          className="rounded-[22px] border border-[#e7e9f0] bg-white p-5"
        >
          <div className="grid gap-4">
            <label>
              <span className="text-[13px] font-semibold text-[#3f4658]">
                Título
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
              />
            </label>

            <label>
              <span className="text-[13px] font-semibold text-[#3f4658]">
                Mensagem
              </span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={6}
                className="mt-2 w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]"
              />
            </label>

            <label>
              <span className="text-[13px] font-semibold text-[#3f4658]">
                Destino
              </span>
              <select
                value={targetType}
                onChange={(event) => setTargetType(event.target.value)}
                className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
              >
                <option value="all">Todos os alunos</option>
                <option value="channel">Canal específico</option>
              </select>
            </label>

            {targetType === "channel" ? (
              <label>
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
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:opacity-55"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar notificação
            </button>
          </div>
        </form>

        <aside className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
          <h2 className="text-[18px] font-semibold text-[#1f2230]">
            Histórico
          </h2>

          <div className="mt-4 divide-y divide-[#edf0f5]">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.id} className="py-4">
                  <p className="text-[14px] font-semibold text-[#1f2230]">
                    {notification.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#667085]">
                    {notification.body}
                  </p>
                  <p className="mt-2 text-[11px] text-[#9aa1b2]">
                    {notification.status} • {formatDate(notification.sent_at ?? notification.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-4 text-[13px] text-[#667085]">
                Nenhuma notificação enviada.
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
