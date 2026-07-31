"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CommunityAdminNav } from "../_components/CommunityAdminNav";
import {
  CommentRow,
  ProfileRow,
  formatDate,
  getStatusClass,
  getStatusLabel,
} from "../_components/communityAdminHelpers";

type AdminComment = CommentRow & {
  authorName: string;
};

export default function AdminCommunityCommentsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const loadComments = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("community_comments")
        .select("id,post_id,author_id,body,status,created_at")
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(120);

      if (error) throw error;

      const loadedComments = (data ?? []) as CommentRow[];
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
      setMessage(error instanceof Error ? error.message : "Erro ao carregar comentários.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("community_comments")
      .update({ status })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (status === "deleted") {
      setComments((current) => current.filter((comment) => comment.id !== id));
      setMessage("Comentário excluído.");
      return;
    }

    await loadComments();
  }

  const filteredComments = comments.filter((comment) =>
    `${comment.authorName} ${comment.body}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <>
      <CommunityAdminNav />

      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
          Comunidade
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Comentários
        </h1>
        <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-[#667085]">
          Modere respostas publicadas pelos alunos e pela administração.
        </p>
      </header>

      <label className="mb-4 flex h-11 items-center gap-3 rounded-[12px] border border-[#e0e4ec] bg-white px-4">
        <Search className="h-4 w-4 text-[#7b8191]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar comentário..."
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[#1f2230] outline-none"
        />
      </label>

      {message ? (
        <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" />
            Carregando comentários...
          </div>
        ) : filteredComments.length > 0 ? (
          <div className="divide-y divide-[#edf0f5]">
            {filteredComments.map((comment) => (
              <article key={comment.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(comment.status)}`}>
                        {getStatusLabel(comment.status)}
                      </span>
                      <span className="text-[12px] text-[#8b90a2]">
                        {comment.authorName} • {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-3 text-[14px] leading-6 text-[#1f2230]">
                      {comment.body}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus(comment.id, "published")}
                      className="rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[12px] font-semibold text-[#4f5568]"
                    >
                      Publicar
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(comment.id, "hidden")}
                      className="rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[12px] font-semibold text-[#4f5568]"
                    >
                      Ocultar
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(comment.id, "deleted")}
                      className="rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center text-[14px] text-[#667085]">
            Nenhum comentário encontrado.
          </div>
        )}
      </section>
    </>
  );
}
