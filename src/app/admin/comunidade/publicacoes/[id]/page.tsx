"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CommunityAdminNav } from "../../_components/CommunityAdminNav";
import { AdminAuthorSelect } from "../../_components/AdminAuthorSelect";
import {
  CommunityChannel,
  CommunityComment,
  CommunityPost,
  ProfileRow,
  formatDate,
  getInitials,
  getStatusClass,
  getStatusLabel,
} from "../../_components/communityAdminHelpers";

type CommentWithAuthor = CommunityComment & {
  authorName: string;
};

export default function AdminCommunityPostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [status, setStatus] = useState("published");
  const [allowComments, setAllowComments] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [adminReply, setAdminReply] = useState("");
  const [replyAuthorId, setReplyAuthorId] = useState("");
  const [replying, setReplying] = useState(false);
  const [message, setMessage] = useState("");

  const loadPost = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const [channelsResponse, postResponse, commentsResponse] = await Promise.all([
        supabase
          .from("community_channels")
          .select("id,name,slug,description,is_locked,is_active,sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("community_posts")
          .select("id,channel_id,author_id,title,body,image_path,status,is_pinned,is_featured,allow_comments,published_at,created_at,updated_at")
          .eq("id", postId)
          .single(),
        supabase
          .from("community_comments")
          .select("id,post_id,author_id,body,status,created_at")
          .eq("post_id", postId)
          .neq("status", "deleted")
          .order("created_at", { ascending: true }),
      ]);

      if (channelsResponse.error) throw channelsResponse.error;
      if (postResponse.error) throw postResponse.error;
      if (commentsResponse.error) throw commentsResponse.error;

      const loadedChannels = (channelsResponse.data ?? []) as CommunityChannel[];
      const loadedPost = postResponse.data as CommunityPost;
      const loadedComments = (commentsResponse.data ?? []) as CommunityComment[];

      setChannels(loadedChannels);
      setPost(loadedPost);
      setChannelId(loadedPost.channel_id);
      setTitle(loadedPost.title ?? "");
      setBody(loadedPost.body ?? "");
      setImagePath(loadedPost.image_path ?? "");
      setStatus(loadedPost.status ?? "published");
      setAllowComments(loadedPost.allow_comments ?? true);
      setIsPinned(Boolean(loadedPost.is_pinned));
      setIsFeatured(Boolean(loadedPost.is_featured));

      const authorIds = Array.from(new Set(loadedComments.map((comment) => comment.author_id)));

      const profilesResponse = authorIds.length
        ? await supabase
            .from("profiles")
            .select("id,full_name,avatar_url,role")
            .in("id", authorIds)
        : { data: [], error: null };

      const profiles = ((profilesResponse.data ?? []) as ProfileRow[]).reduce(
        (acc, profile) => acc.set(profile.id, profile),
        new Map<string, ProfileRow>(),
      );

      setComments(
        loadedComments.map((comment) => ({
          ...comment,
          authorName: profiles.get(comment.author_id)?.full_name || "Aluno",
        })),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a publicação.",
      );
    } finally {
      setLoading(false);
    }
  }, [postId, supabase]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  async function savePost() {
    if (!post) return;

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("community_posts")
        .update({
          channel_id: channelId,
          title: title.trim() || null,
          body: body.trim(),
          image_path: imagePath.trim() || null,
          status,
          allow_comments: allowComments,
          is_pinned: isPinned,
          is_featured: isFeatured,
          published_at:
            status === "published" && !post.published_at
              ? new Date().toISOString()
              : post.published_at,
        })
        .eq("id", post.id);

      if (error) throw error;

      await loadPost();
      setMessage("Publicação atualizada.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateComment(commentId: string, statusValue: string) {
    const { error } = await supabase
      .from("community_comments")
      .update({
        status: statusValue,
      })
      .eq("id", commentId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadPost();
  }

  async function sendAdminReply() {
    const cleanReply = adminReply.trim();

    if (!cleanReply || !post) return;

    if (!replyAuthorId) {
      setMessage("Selecione o administrador que aparecerá como autor.");
      return;
    }

    setReplying(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/community-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "comment",
          author_id: replyAuthorId,
          post_id: post.id,
          body: cleanReply,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message || "Não foi possível publicar o comentário.",
        );
      }

      setAdminReply("");
      await loadPost();
      setMessage("Comentário publicado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar o comentário.",
      );
    } finally {
      setReplying(false);
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
          Gerenciar publicação
        </h1>
      </header>

      {message ? (
        <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-[22px] border border-[#e7e9f0] bg-white py-16 text-[14px] text-[#667085]">
          <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" />
          Carregando publicação...
        </div>
      ) : post ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(post.status)}`}>
                {getStatusLabel(post.status)}
              </span>
              <span className="text-[12px] text-[#8b90a2]">
                Criado em {formatDate(post.created_at)}
              </span>
            </div>

            <div className="grid gap-4">
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
                  Texto
                </span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={10}
                  className="mt-2 w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]"
                />
              </label>

              <label>
                <span className="text-[13px] font-semibold text-[#3f4658]">
                  Imagem
                </span>
                <input
                  value={imagePath}
                  onChange={(event) => setImagePath(event.target.value)}
                  className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"
                />
              </label>

              <button
                type="button"
                onClick={savePost}
                disabled={saving}
                className="inline-flex h-11 w-fit items-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:opacity-55"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar alterações
              </button>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
              <h2 className="text-[18px] font-semibold text-[#1f2230]">
                Configurações
              </h2>

              <div className="mt-4 space-y-3">
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
                    <option value="archived">Arquivado</option>
                    <option value="deleted">Excluído</option>
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
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-[14px] border border-[#e6eaf1] bg-[#fafbfe] px-4 py-3"
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
              </div>
            </section>

            <section className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#9b7539]" />
                <h2 className="text-[18px] font-semibold text-[#1f2230]">
                  Comentários
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                <AdminAuthorSelect
                  value={replyAuthorId}
                  onChange={setReplyAuthorId}
                  disabled={replying}
                  label="Responder como"
                />

                <textarea
                  value={adminReply}
                  onChange={(event) => setAdminReply(event.target.value)}
                  rows={3}
                  disabled={replying}
                  placeholder="Escreva o comentário administrativo..."
                  className="w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094] disabled:cursor-not-allowed disabled:bg-[#f5f6f8]"
                />

                <button
                  type="button"
                  onClick={sendAdminReply}
                  disabled={
                    replying ||
                    !replyAuthorId ||
                    !adminReply.trim()
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#DBC094] px-4 text-[13px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {replying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {replying ? "Publicando..." : "Responder"}
                </button>

                <div className="mt-4 divide-y divide-[#edf0f5]">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="py-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f4f8] text-[11px] font-semibold text-[#596174]">
                            {getInitials(comment.authorName)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-[#1f2230]">
                              {comment.authorName}
                            </p>
                            <p className="mt-1 text-[13px] leading-5 text-[#667085]">
                              {comment.body}
                            </p>
                            <p className="mt-1 text-[11px] text-[#9aa1b2]">
                              {formatDate(comment.created_at)} • {getStatusLabel(comment.status)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateComment(comment.id, "hidden")}
                            className="rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[12px] font-semibold text-[#4f5568]"
                          >
                            Ocultar
                          </button>
                          <button
                            type="button"
                            onClick={() => updateComment(comment.id, "published")}
                            className="rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[12px] font-semibold text-[#4f5568]"
                          >
                            Publicar
                          </button>
                          <button
                            type="button"
                            onClick={() => updateComment(comment.id, "deleted")}
                            className="inline-flex items-center gap-1 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-[13px] text-[#667085]">
                      Nenhum comentário ainda.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </>
  );
}
