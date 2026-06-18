"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Reply,
  Search,
  Send,
  User,
  XCircle,
} from "lucide-react";

type CommentStatus = "pending" | "approved" | "rejected" | "all";

type LessonCommentItem = {
  id: string;
  lesson_id: string;
  student_id: string | null;
  student_name: string;
  student_avatar_url: string | null;
  comment: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  lesson: {
    id: string;
    module_id: string | null;
    title: string | null;
    sort_order: number | null;
  } | null;
  module: {
    id: string;
    course_id: string | null;
    title: string | null;
    sort_order: number | null;
  } | null;
  course: {
    id: string;
    slug: string | null;
    title: string | null;
  } | null;
};

type Counts = {
  pending: number;
  approved: number;
  rejected: number;
};

type Pagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

const statusOptions: Array<{
  label: string;
  value: CommentStatus;
}> = [
  {
    label: "Pendentes",
    value: "pending",
  },
  {
    label: "Aprovados",
    value: "approved",
  },
  {
    label: "Reprovados",
    value: "rejected",
  },
  {
    label: "Todos",
    value: "all",
  },
];

const perPageOptions = [10, 25, 50, 100];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status: string) {
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Reprovado";

  return "Pendente";
}

function getStatusStyle(status: string) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#e7d9bd] bg-[#f9f1e2] text-[#9b7539]";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "A";

  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function AdminLessonCommentsPage() {
  const [items, setItems] = useState<LessonCommentItem[]>([]);
  const [counts, setCounts] = useState<Counts>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    perPage: 25,
    total: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<CommentStatus>("pending");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const loadComments = useCallback(async () => {
    setLoading(true);
    setFeedback("");

    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      params.set("page", String(pagination.page));
      params.set("perPage", String(pagination.perPage));

      const response = await fetch(`/api/admin/lesson-comments?${params}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as {
        items?: LessonCommentItem[];
        counts?: Counts;
        pagination?: Pagination;
        error?: string;
      } | null;

      if (!response.ok) {
        setItems([]);
        setFeedback(
          data?.error || "Não foi possível carregar os comentários das aulas.",
        );
        return;
      }

      const loadedItems = data?.items ?? [];

      setItems(loadedItems);
      setCounts(
        data?.counts ?? {
          pending: 0,
          approved: 0,
          rejected: 0,
        },
      );

      setPagination(
        data?.pagination ?? {
          page: pagination.page,
          perPage: pagination.perPage,
          total: loadedItems.length,
          totalPages: 1,
        },
      );

      const drafts = loadedItems.reduce<Record<string, string>>((map, item) => {
        map[item.id] = item.admin_note ?? "";
        return map;
      }, {});

      setReplyDrafts(drafts);
    } catch (error) {
      console.error("Erro ao carregar comentários das aulas:", error);
      setItems([]);
      setFeedback("Não foi possível carregar os comentários das aulas.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, statusFilter]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  function changeStatusFilter(value: CommentStatus) {
    setExpandedId(null);
    setStatusFilter(value);
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function changePerPage(value: number) {
    setExpandedId(null);
    setPagination((current) => ({
      ...current,
      page: 1,
      perPage: value,
    }));
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) => {
      const values = [
        item.student_name,
        item.comment,
        item.admin_note ?? "",
        item.lesson?.title ?? "",
        item.module?.title ?? "",
        item.course?.title ?? "",
      ];

      return values.some((value) => value.toLowerCase().includes(term));
    });
  }, [items, search]);

  async function updateComment(
    commentId: string,
    action: "approve" | "reject" | "respond",
  ) {
    setUpdatingId(commentId);
    setFeedback("");

    try {
      const response = await fetch("/api/admin/lesson-comments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: commentId,
          action,
          admin_note: replyDrafts[commentId] ?? "",
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        setFeedback(data?.error || "Não foi possível atualizar o comentário.");
        return;
      }

      setExpandedId(null);
      setFeedback(data?.message || "Comentário atualizado.");
      await loadComments();
    } catch (error) {
      console.error("Erro ao atualizar comentário da aula:", error);
      setFeedback("Não foi possível atualizar o comentário.");
    } finally {
      setUpdatingId(null);
    }
  }

  const pageStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.perPage + 1;

  const pageEnd = Math.min(
    pagination.page * pagination.perPage,
    pagination.total,
  );

  return (
    <div className="mx-auto grid w-full max-w-[1480px] gap-6">
      <section>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.32em] text-[#8b90a2]">
              Módulo experiência
            </p>

            <h1 className="mt-3 text-[46px] font-semibold leading-none tracking-[-0.055em] text-[#11131a]">
              Comentários das aulas
            </h1>

            <p className="mt-5 text-[18px] leading-7 text-[#555c70]">
              Analise comentários enviados nas aulas, aprove, responda ou
              reprove mensagens indevidas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadComments()}
            disabled={loading}
            className="inline-flex h-[60px] shrink-0 items-center justify-center gap-3 rounded-[14px] bg-[#DFC491] px-7 text-[16px] font-semibold text-black transition hover:bg-[#d3b77f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCcw className="h-5 w-5" />
            )}
            Atualizar lista
          </button>
        </div>

        <div className="mt-9 border-t border-[#d9dde7]" />

        <div className="mt-9 overflow-hidden rounded-[22px] border border-[#dfe3ec] bg-white">
          <div className="grid md:grid-cols-3">
            <div className="border-b border-[#e5e8ef] p-7 md:border-b-0 md:border-r">
              <p className="text-[16px] font-medium text-[#555c70]">
                Total em análise
              </p>
              <p className="mt-5 text-[45px] font-semibold leading-none tracking-[-0.055em] text-[#11131a]">
                {counts.pending}
              </p>
            </div>

            <div className="border-b border-[#e5e8ef] p-7 md:border-b-0 md:border-r">
              <p className="text-[16px] font-medium text-[#555c70]">
                Exibindo agora
              </p>
              <p className="mt-5 text-[45px] font-semibold leading-none tracking-[-0.055em] text-[#11131a]">
                {filteredItems.length}
              </p>
            </div>

            <div className="p-7">
              <p className="text-[16px] font-medium text-[#555c70]">Status</p>

              <div className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#f3ede3] px-4 py-2 text-[15px] font-semibold text-[#9b7539]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#DFC491]" />
                {statusFilter === "pending"
                  ? "Aguardando aprovação"
                  : statusFilter === "approved"
                    ? "Comentários aprovados"
                    : statusFilter === "rejected"
                      ? "Comentários reprovados"
                      : "Todos os comentários"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e8ebf2] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changeStatusFilter(option.value)}
                className={cn(
                  "inline-flex h-10 items-center rounded-[12px] px-4 text-[14px] font-semibold transition",
                  statusFilter === option.value
                    ? "bg-[#DBC094] text-black"
                    : "border border-[#e2e5ee] bg-[#f7f8fc] text-[#5b6172] hover:border-[#DBC094]/60 hover:bg-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[420px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b90a2]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar nesta página..."
                className="h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] pl-11 pr-4 text-[15px] text-[#1f2230] outline-none transition placeholder:text-[#8d92a4] focus:border-[#DBC094]/60 focus:bg-white"
              />
            </div>

            <select
              value={pagination.perPage}
              onChange={(event) => changePerPage(Number(event.target.value))}
              className="h-11 rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] px-3 text-[14px] font-semibold text-[#4f5568] outline-none transition focus:border-[#DBC094]/60 focus:bg-white"
            >
              {perPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option} por página
                </option>
              ))}
            </select>
          </div>
        </div>

        {feedback ? (
          <div className="mt-4 rounded-[14px] border border-[#e7d9bd] bg-[#f9f1e2] px-4 py-3 text-[14px] font-medium text-[#7b5d2e]">
            {feedback}
          </div>
        ) : null}

        <div className="mt-5">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-[20px] border border-dashed border-[#dfe3ec] bg-[#fafbfe]">
              <div className="flex items-center gap-3 text-[15px] font-medium text-[#656b7a]">
                <Loader2 className="h-5 w-5 animate-spin text-[#9b7539]" />
                Carregando comentários...
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#dfe3ec] bg-[#fafbfe] px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#f7f0e2] text-[#9b7539]">
                <MessageCircle className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-[20px] font-semibold tracking-tight text-[#1f2230]">
                Nenhum comentário encontrado
              </h2>
              <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#656b7a]">
                Quando os alunos enviarem comentários nas aulas, eles aparecerão
                aqui para análise.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[20px] border border-[#e8ebf2] bg-white">
              <div className="hidden border-b border-[#e8ebf2] bg-[#fafbfe] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8b90a2] lg:grid lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)_160px_38px] lg:gap-4">
                <span>Aluno</span>
                <span>Aula / comentário</span>
                <span>Status</span>
                <span />
              </div>

              {filteredItems.map((item, index) => {
                const updating = updatingId === item.id;
                const open = expandedId === item.id;
                const lessonTitle =
                  item.lesson?.title || "Aula não localizada";
                const moduleTitle =
                  item.module?.title || "Módulo não localizado";
                const courseTitle =
                  item.course?.title || "Curso não localizado";

                return (
                  <article
                    key={item.id}
                    className={cn(
                      index !== filteredItems.length - 1
                        ? "border-b border-[#e8ebf2]"
                        : "",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : item.id)}
                      className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[#fafbfe] lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)_160px_38px] lg:items-center lg:gap-4 lg:px-5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBC094] text-[13px] font-semibold text-black">
                          {item.student_avatar_url ? (
                            <img
                              src={item.student_avatar_url}
                              alt={item.student_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(item.student_name || "Aluno")
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-[#1f2230]">
                            {item.student_name || "Aluno"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[#8b90a2]">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2 text-[13px] text-[#656b7a]">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#9b7539]" />
                          <span className="truncate font-semibold text-[#1f2230]">
                            {courseTitle}
                          </span>
                          <span className="hidden shrink-0 text-[#b0b5c1] sm:inline">
                            /
                          </span>
                          <span className="hidden truncate sm:inline">
                            {lessonTitle}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-1 text-[14px] text-[#656b7a]">
                          {item.comment}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]",
                            getStatusStyle(item.status),
                          )}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </div>

                      <ChevronRight
                        className={cn(
                          "h-5 w-5 text-[#9aa0af] transition",
                          open ? "rotate-90 text-[#9b7539]" : "",
                        )}
                        strokeWidth={1.8}
                      />
                    </button>

                    {open ? (
                      <div className="border-t border-[#eef0f5] bg-[#fbfcff] px-4 py-5 lg:px-5">
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#8b90a2]">
                                  Aula relacionada
                                </p>
                                <p className="mt-1 text-[15px] font-semibold text-[#1f2230]">
                                  {courseTitle}
                                </p>
                                <p className="mt-1 text-[14px] leading-6 text-[#656b7a]">
                                  {moduleTitle} / {lessonTitle}
                                </p>
                              </div>

                              <Link
                                href={`/aluno/aulas/${item.lesson_id}`}
                                target="_blank"
                                className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[13px] font-semibold text-[#9b7539] transition hover:border-[#DBC094]/60 hover:text-[#1f2230]"
                              >
                                Abrir aula
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </div>

                            <div className="mt-5 border-t border-[#e8ebf2] pt-5">
                              <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#8b90a2]">
                                <User className="h-4 w-4" />
                                Comentário do aluno
                              </div>

                              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[#3f4554]">
                                {item.comment}
                              </p>
                            </div>

                            <div className="mt-5 border-t border-[#e8ebf2] pt-5">
                              <label
                                htmlFor={`reply-${item.id}`}
                                className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#8b90a2]"
                              >
                                <Reply className="h-4 w-4" />
                                Resposta do ADM
                              </label>

                              <textarea
                                id={`reply-${item.id}`}
                                value={replyDrafts[item.id] ?? ""}
                                onChange={(event) =>
                                  setReplyDrafts((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                placeholder="Escreva uma resposta para o aluno. Ao responder, o comentário será aprovado e sairá da fila de pendentes."
                                className="mt-3 min-h-[90px] w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-4 py-3 text-[15px] leading-7 text-[#1f2230] outline-none transition placeholder:text-[#9aa0af] focus:border-[#DBC094]/60"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 border-t border-[#e8ebf2] pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                            <button
                              type="button"
                              onClick={() =>
                                void updateComment(item.id, "respond")
                              }
                              disabled={updating}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-4 text-[14px] font-semibold text-black transition hover:bg-[#c9ad7b] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {updating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Responder
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void updateComment(item.id, "approve")
                              }
                              disabled={updating}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-emerald-600 px-4 text-[14px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {updating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Aprovar sem resposta
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void updateComment(item.id, "reject")
                              }
                              disabled={updating}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-red-600 px-4 text-[14px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {updating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              Reprovar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {!loading && pagination.total > 0 ? (
            <div className="mt-5 flex flex-col gap-3 border-t border-[#eef0f5] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px] text-[#656b7a]">
                Exibindo {pageStart}–{pageEnd} de {pagination.total} comentário(s)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(null);
                    setPagination((current) => ({
                      ...current,
                      page: Math.max(1, current.page - 1),
                    }));
                  }}
                  disabled={pagination.page <= 1}
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] font-semibold text-[#4f5568] transition hover:border-[#DBC094]/60 hover:text-[#1f2230] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>

                <span className="inline-flex h-10 items-center rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] px-3 text-[14px] font-semibold text-[#4f5568]">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(null);
                    setPagination((current) => ({
                      ...current,
                      page: Math.min(current.totalPages, current.page + 1),
                    }));
                  }}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] font-semibold text-[#4f5568] transition hover:border-[#DBC094]/60 hover:text-[#1f2230] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}