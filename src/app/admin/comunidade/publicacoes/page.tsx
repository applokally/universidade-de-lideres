"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Eye,
  Loader2,
  MessageCircle,
  Pin,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CommunityAdminNav } from "../_components/CommunityAdminNav";
import {
  CommunityChannel,
  CommunityComment,
  CommunityPost,
  ProfileRow,
  ReactionRow,
  formatDate,
  getInitials,
  getStatusClass,
  getStatusLabel,
} from "../_components/communityAdminHelpers";

type AdminPost = CommunityPost & {
  channelName: string;
  authorName: string;
  comments: number;
  likes: number;
};

const statuses = [
  { value: "active", label: "Ativos" },
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicado" },
  { value: "pending", label: "Pendente" },
  { value: "hidden", label: "Oculto" },
  { value: "archived", label: "Arquivado" },
  { value: "deleted", label: "Excluído" },
];

export default function AdminCommunityPostsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [channelId, setChannelId] = useState("all");
  const [message, setMessage] = useState("");

  const autoArchiveOldPosts = useCallback(async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await supabase
      .from("community_posts")
      .update({
        status: "archived",
      })
      .lt("created_at", sevenDaysAgo.toISOString())
      .not("status", "in", "(archived,deleted)")
      .neq("is_pinned", true)
      .neq("is_featured", true);
  }, [supabase]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      await autoArchiveOldPosts();

      const [channelsResponse, postsResponse] = await Promise.all([
        supabase
          .from("community_channels")
          .select("id,name,slug,description,is_locked,is_active,sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("community_posts")
          .select("id,channel_id,author_id,title,body,image_path,status,is_pinned,is_featured,allow_comments,published_at,created_at,updated_at")
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

      if (channelsResponse.error) throw channelsResponse.error;
      if (postsResponse.error) throw postsResponse.error;

      const loadedChannels = (channelsResponse.data ?? []) as CommunityChannel[];
      const loadedPosts = (postsResponse.data ?? []) as CommunityPost[];

      setChannels(loadedChannels);

      const postIds = loadedPosts.map((post) => post.id);
      const authorIds = Array.from(new Set(loadedPosts.map((post) => post.author_id)));

      const [profilesResponse, commentsResponse, reactionsResponse] =
        await Promise.all([
          authorIds.length
            ? supabase
                .from("profiles")
                .select("id,full_name,avatar_url,role")
                .in("id", authorIds)
            : Promise.resolve({ data: [], error: null }),
          postIds.length
            ? supabase
                .from("community_comments")
                .select("id,post_id,status")
                .in("post_id", postIds)
            : Promise.resolve({ data: [], error: null }),
          postIds.length
            ? supabase
                .from("community_reactions")
                .select("id,post_id,user_id,reaction_type")
                .in("post_id", postIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      const profiles = ((profilesResponse.data ?? []) as ProfileRow[]).reduce(
        (acc, profile) => acc.set(profile.id, profile),
        new Map<string, ProfileRow>(),
      );
      const comments = (commentsResponse.data ?? []) as CommunityComment[];
      const reactions = (reactionsResponse.data ?? []) as ReactionRow[];

      const channelMap = loadedChannels.reduce(
        (acc, channel) => acc.set(channel.id, channel),
        new Map<string, CommunityChannel>(),
      );

      const commentsMap = comments.reduce((acc, comment) => {
        acc.set(comment.post_id, (acc.get(comment.post_id) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());

      const likesMap = reactions.reduce((acc, reaction) => {
        if (!reaction.post_id) return acc;
        acc.set(reaction.post_id, (acc.get(reaction.post_id) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());

      setPosts(
        loadedPosts.map((post) => {
          const profile = profiles.get(post.author_id);
          return {
            ...post,
            channelName: channelMap.get(post.channel_id)?.name ?? "Sem canal",
            authorName: profile?.full_name || "Administrador",
            comments: commentsMap.get(post.id) ?? 0,
            likes: likesMap.get(post.id) ?? 0,
          };
        }),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as publicações.",
      );
    } finally {
      setLoading(false);
    }
  }, [autoArchiveOldPosts, supabase]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const filteredPosts = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return posts.filter((post) => {
      if (status === "active" && ["archived", "deleted"].includes(post.status ?? "")) {
        return false;
      }

      if (status !== "all" && status !== "active" && post.status !== status) return false;
      if (channelId !== "all" && post.channel_id !== channelId) return false;

      if (!cleanSearch) return true;

      return `${post.title ?? ""} ${post.body} ${post.channelName} ${post.authorName}`
        .toLowerCase()
        .includes(cleanSearch);
    });
  }, [channelId, posts, search, status]);

  async function updatePost(postId: string, values: Partial<CommunityPost>) {
    const { error } = await supabase
      .from("community_posts")
      .update(values)
      .eq("id", postId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadPosts();
  }

  return (
    <>
      <CommunityAdminNav />

      <header className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
            Comunidade
          </p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
            Publicações
          </h1>
          <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-[#667085]">
            Gerencie publicações de alunos e comunicados oficiais da Universidade.
          </p>
        </div>

        <Link
          href="/admin/comunidade/publicacoes/nova"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
        >
          <Plus className="h-4 w-4" />
          Nova publicação
        </Link>
      </header>

      <section className="mb-4 rounded-[20px] border border-[#e7e9f0] bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_220px]">
          <label className="flex h-11 items-center gap-3 rounded-[12px] border border-[#e0e4ec] bg-[#f7f8fc] px-4">
            <Search className="h-4 w-4 text-[#7b8191]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por texto, autor ou canal..."
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[#1f2230] outline-none placeholder:text-[#8b90a2]"
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-[12px] border border-[#e0e4ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={channelId}
            onChange={(event) => setChannelId(event.target.value)}
            className="h-11 rounded-[12px] border border-[#e0e4ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none"
          >
            <option value="all">Todos os canais</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-3 text-[12px] leading-5 text-[#7b8191]">
          Arquivamento automático: publicações com mais de 7 dias são arquivadas ao abrir esta tela, exceto posts fixados ou destacados.
        </p>
      </section>

      {message ? (
        <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" />
            Carregando publicações...
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="divide-y divide-[#edf0f5]">
            {filteredPosts.map((post) => {
              const title = post.title?.trim();
              const textPreview = post.body.length > 180 ? `${post.body.slice(0, 180)}...` : post.body;

              return (
                <article key={post.id} className="px-5 py-4 transition hover:bg-[#fafbfe]">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(post.status)}`}>
                          {getStatusLabel(post.status)}
                        </span>

                        <span className="inline-flex items-center gap-2 text-[12px] text-[#697386]">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f2f4f8] text-[10px] font-semibold text-[#596174]">
                            {getInitials(post.authorName)}
                          </span>
                          {post.authorName}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[12px] text-[#697386]">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {post.comments} comentários
                        </span>

                        <span className="text-[12px] text-[#697386]">
                          {post.likes} curtidas
                        </span>

                        <span className="text-[12px] text-[#8b90a2]">
                          {post.channelName} • {formatDate(post.published_at ?? post.created_at)}
                        </span>

                        {post.is_pinned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f7f0e2] px-2.5 py-1 text-[11px] font-semibold text-[#7c5d2f]">
                            <Pin className="h-3 w-3" />
                            Fixado
                          </span>
                        ) : null}

                        {post.is_featured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f7f0e2] px-2.5 py-1 text-[11px] font-semibold text-[#7c5d2f]">
                            <Star className="h-3 w-3" />
                            Destaque
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        {title ? (
                          <h2 className="truncate text-[16px] font-semibold tracking-[-0.02em] text-[#1f2230]">
                            {title}
                          </h2>
                        ) : null}

                        <p className="mt-1 line-clamp-1 text-[14px] leading-6 text-[#667085]">
                          {textPreview}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Link
                        href={`/admin/comunidade/publicacoes/${post.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e1e5ee] bg-white px-3 text-[12px] font-semibold text-[#4f5568] transition hover:border-[#d8bb80] hover:text-[#1f2230]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Gerenciar
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          updatePost(post.id, { is_pinned: !post.is_pinned } as Partial<CommunityPost>)
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e1e5ee] bg-white px-3 text-[12px] font-semibold text-[#4f5568] transition hover:border-[#d8bb80] hover:text-[#1f2230]"
                      >
                        <Pin className="h-3.5 w-3.5" />
                        {post.is_pinned ? "Desfixar" : "Fixar"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updatePost(post.id, { is_featured: !post.is_featured } as Partial<CommunityPost>)
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e1e5ee] bg-white px-3 text-[12px] font-semibold text-[#4f5568] transition hover:border-[#d8bb80] hover:text-[#1f2230]"
                      >
                        <Star className="h-3.5 w-3.5" />
                        {post.is_featured ? "Remover destaque" : "Destacar"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updatePost(post.id, {
                            status: post.status === "archived" ? "published" : "archived",
                          } as Partial<CommunityPost>)
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e1e5ee] bg-white px-3 text-[12px] font-semibold text-[#4f5568] transition hover:border-[#d8bb80] hover:text-[#1f2230]"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        {post.status === "archived" ? "Restaurar" : "Arquivar"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updatePost(post.id, {
                            status: post.status === "hidden" ? "published" : "hidden",
                          } as Partial<CommunityPost>)
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e1e5ee] bg-white px-3 text-[12px] font-semibold text-[#4f5568] transition hover:border-[#d8bb80] hover:text-[#1f2230]"
                      >
                        {post.status === "hidden" ? "Reexibir" : "Ocultar"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <p className="text-[18px] font-semibold text-[#1f2230]">
              Nenhuma publicação encontrada
            </p>
            <p className="mt-2 text-[14px] text-[#667085]">
              Ajuste os filtros ou crie a primeira publicação oficial.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
