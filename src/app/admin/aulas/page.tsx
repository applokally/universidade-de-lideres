"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Clock3,
  GraduationCap,
  Layers3,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";

type StatusCurso = "draft" | "published" | "archived" | string;

type Curso = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  status: StatusCurso;
  required_rank: number;
  is_featured: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type FiltroId = "todos" | "publicados" | "rascunhos" | "destaques";

const filtros: Array<{ id: FiltroId; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "publicados", label: "Publicados" },
  { id: "rascunhos", label: "Rascunhos" },
  { id: "destaques", label: "Destaques" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

function traduzirStatus(status: StatusCurso) {
  switch (status) {
    case "published":
      return "Publicado";
    case "draft":
      return "Rascunho";
    case "archived":
      return "Arquivado";
    default:
      return status || "Sem status";
  }
}

function statusClasses(status: StatusCurso) {
  switch (status) {
    case "published":
      return "bg-[#f3eee5] text-[#8a6836]";
    case "draft":
      return "bg-[#fff7ed] text-[#9a3412]";
    case "archived":
      return "bg-[#f4f4f5] text-[#52525b]";
    default:
      return "bg-[#f4f4f5] text-[#52525b]";
  }
}

function statusDotClasses(status: StatusCurso) {
  switch (status) {
    case "published":
      return "bg-[#DBC094]";
    case "draft":
      return "bg-[#f97316]";
    case "archived":
      return "bg-[#a1a1aa]";
    default:
      return "bg-[#a1a1aa]";
  }
}

function formatarData(data: string | null) {
  if (!data) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data));
  } catch {
    return "—";
  }
}

function formatarNumero(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  });
}

function resumoCurso(curso: Curso) {
  return (
    curso.short_description?.trim() ||
    curso.description?.trim() ||
    "Sem descrição cadastrada."
  );
}

function StatusBadge({ status }: { status: StatusCurso }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold",
        statusClasses(status),
      )}
    >
      <span className={cx("h-2 w-2 rounded-full", statusDotClasses(status))} />
      {traduzirStatus(status)}
    </span>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-10 rounded-[10px] px-4 text-[13px] font-semibold transition",
        active
          ? "bg-[#DBC094] text-black"
          : "text-[#666b76] hover:bg-[#f7f7f7] hover:text-[#141414]",
      )}
    >
      {children}
    </button>
  );
}

export default function AdminAulasPage() {
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroId>("todos");
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarCursos() {
    setCarregando(true);
    setErro(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "As variáveis públicas do Supabase não foram encontradas.",
        );
      }

      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, slug, title, short_description, description, cover_path, status, required_rank, is_featured, published_at, created_by, created_at, updated_at",
        )
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      setCursos((data as Curso[]) || []);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os cursos.";

      setErro(mensagem);
      setCursos([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarCursos();
  }, []);

  const cursosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return cursos.filter((curso) => {
      const textoBusca = [
        curso.title,
        curso.slug,
        curso.short_description ?? "",
        curso.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const correspondeBusca = !termo || textoBusca.includes(termo);

      const correspondeFiltro =
        filtroAtivo === "todos" ||
        (filtroAtivo === "publicados" && curso.status === "published") ||
        (filtroAtivo === "rascunhos" && curso.status === "draft") ||
        (filtroAtivo === "destaques" && curso.is_featured);

      return correspondeBusca && correspondeFiltro;
    });
  }, [busca, cursos, filtroAtivo]);

  const totalCursos = cursos.length;
  const totalPublicados = cursos.filter(
    (curso) => curso.status === "published",
  ).length;
  const totalRascunhos = cursos.filter((curso) => curso.status === "draft").length;
  const totalDestaques = cursos.filter((curso) => curso.is_featured).length;

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
            Módulo cursos
          </p>

          <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
            Cursos, módulos e aulas
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
            Selecione um curso real para abrir a gestão operacional de módulos e aulas vinculados ao banco.
          </p>
        </div>

        <Link
          href="/admin/cursos"
          className="inline-flex h-12 items-center justify-center gap-3 self-start rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 lg:self-auto"
        >
          Ir para cursos
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
        <div className="grid divide-y divide-[#e5e5e5] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          <div className="p-5">
            <p className="text-[13px] font-medium text-[#666b76]">
              Cursos disponíveis
            </p>

            <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
              {formatarNumero(totalCursos)}
            </strong>
          </div>

          <div className="p-5">
            <p className="text-[13px] font-medium text-[#666b76]">
              Publicados
            </p>

            <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
              {formatarNumero(totalPublicados)}
            </strong>
          </div>

          <div className="p-5">
            <p className="text-[13px] font-medium text-[#666b76]">
              Rascunhos
            </p>

            <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
              {formatarNumero(totalRascunhos)}
            </strong>
          </div>

          <div className="p-5">
            <p className="text-[13px] font-medium text-[#666b76]">
              Destaques
            </p>

            <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
              {formatarNumero(totalDestaques)}
            </strong>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-[#e5e5e5] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#e5e5e5] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
              Seleção do curso
            </h2>

            <p className="mt-1 text-[13px] text-[#767b87]">
              Escolha o curso que terá seus módulos e aulas gerenciados.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <button
              type="button"
              onClick={() => void carregarCursos()}
              disabled={carregando}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={cx("h-4 w-4", carregando && "animate-spin")}
              />
              Atualizar
            </button>

            <div className="relative w-[360px] max-w-full">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8f9d]" />

              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar curso"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-white pl-11 pr-4 text-[14px] font-medium text-[#27272a] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#e5e5e5] px-5 py-4">
          {filtros.map((filtro) => (
            <FilterButton
              key={filtro.id}
              active={filtroAtivo === filtro.id}
              onClick={() => setFiltroAtivo(filtro.id)}
            >
              {filtro.label}
            </FilterButton>
          ))}
        </div>

        <div className="px-5 py-5">
          {erro ? (
            <div className="mb-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-4 text-[14px] font-medium text-red-700">
              <strong className="block">Erro ao carregar cursos</strong>
              <span className="mt-1 block font-normal">{erro}</span>
            </div>
          ) : null}

          {carregando ? (
            <div className="divide-y divide-[#ededed]">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_140px_120px_190px_150px]"
                >
                  <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                  <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                  <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                  <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                  <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                </div>
              ))}
            </div>
          ) : cursosFiltrados.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-[#e5e5e5] px-6 text-center">
              <Layers3 className="h-8 w-8 text-[#DBC094]" />

              <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                Nenhum curso encontrado
              </h3>

              <p className="mt-2 max-w-[520px] text-[14px] leading-6 text-[#666b76]">
                Não há cursos compatíveis com os filtros atuais.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden xl:block">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-[#e5e5e5]">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                        Curso
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                        Status
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                        Nível
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                        Atualizado
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                        Ação
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {cursosFiltrados.map((curso) => (
                      <tr
                        key={curso.id}
                        className="border-b border-[#ededed] last:border-b-0"
                      >
                        <td className="px-4 py-5">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3eee5] text-[#8a6836]">
                              <BookOpen className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-[15px] font-semibold text-[#18181b]">
                                  {curso.title}
                                </h3>

                                {curso.is_featured ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f3eee5] px-2.5 py-1 text-[11px] font-semibold text-[#8a6836]">
                                    <Star className="h-3 w-3" />
                                    Destaque
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-1 line-clamp-2 max-w-[580px] text-[14px] leading-6 text-[#666b76]">
                                {resumoCurso(curso)}
                              </p>

                              <p className="mt-1 text-[12px] font-medium text-[#8a8f9d]">
                                Slug: {curso.slug}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5">
                          <StatusBadge status={curso.status} />
                        </td>

                        <td className="px-4 py-5 text-[14px] font-medium text-[#52525b]">
                          {curso.required_rank}
                        </td>

                        <td className="px-4 py-5 text-[14px] text-[#666b76]">
                          <span className="inline-flex items-center gap-2">
                            <Clock3 className="h-3.5 w-3.5 text-[#b89a65]" />
                            {formatarData(curso.updated_at)}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <div className="flex justify-end">
                            <Link
                              href={`/admin/cursos/${curso.id}/modulos`}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e2d2b6] px-4 text-[13px] font-semibold text-[#7a5a27] transition hover:bg-[#DBC094] hover:text-black"
                            >
                              Abrir gestão
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-[#ededed] xl:hidden">
                {cursosFiltrados.map((curso) => (
                  <article key={curso.id} className="py-5">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3eee5] text-[#8a6836]">
                        <GraduationCap className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-[#18181b]">
                            {curso.title}
                          </h3>

                          {curso.is_featured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#f3eee5] px-2.5 py-1 text-[11px] font-semibold text-[#8a6836]">
                              <Star className="h-3 w-3" />
                              Destaque
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-[14px] leading-6 text-[#666b76]">
                          {resumoCurso(curso)}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <StatusBadge status={curso.status} />

                          <span className="text-[13px] font-medium text-[#8a8f9d]">
                            Nível {curso.required_rank}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex items-center gap-2 text-[13px] text-[#666b76]">
                        <Clock3 className="h-3.5 w-3.5 text-[#b89a65]" />
                        {formatarData(curso.updated_at)}
                      </span>

                      <Link
                        href={`/admin/cursos/${curso.id}/modulos`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e2d2b6] px-4 text-[13px] font-semibold text-[#7a5a27] transition hover:bg-[#DBC094] hover:text-black"
                      >
                        Abrir gestão
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
