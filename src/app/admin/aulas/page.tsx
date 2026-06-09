"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  FolderKanban,
  GraduationCap,
  Layers3,
  PlayCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
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
      return status;
  }
}

function statusClasses(status: StatusCurso) {
  switch (status) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "archived":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function formatarData(data: string | null) {
  if (!data) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(data));
  } catch {
    return "—";
  }
}

function resumoCurso(curso: Curso) {
  return (
    curso.short_description?.trim() ||
    curso.description?.trim() ||
    "Sem descrição cadastrada."
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconTone: "gold" | "violet" | "blue" | "goldSoft";
};

function MetricCard({ title, value, icon, iconTone }: MetricCardProps) {
  const tones = {
    gold: "bg-[#F8EFE0] text-[#B07A2A]",
    violet: "bg-[#EFE9FB] text-[#6F4AA7]",
    blue: "bg-[#EAF3FB] text-[#4C84B8]",
    goldSoft: "bg-[#F5EEDC] text-[#9F7A28]",
  };

  return (
    <article className="rounded-[24px] border border-[#E7EAF0] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#667085]">{title}</p>
          <p className="mt-4 text-5xl font-semibold tracking-tight text-[#111827]">
            {value}
          </p>
        </div>

        <div className={cx("rounded-full p-4", tones[iconTone])}>{icon}</div>
      </div>
    </article>
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
          "As variáveis públicas do Supabase não foram encontradas."
        );
      }

      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, slug, title, short_description, description, cover_path, status, required_rank, is_featured, published_at, created_by, created_at, updated_at"
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
    (curso) => curso.status === "published"
  ).length;
  const totalRascunhos = cursos.filter(
    (curso) => curso.status === "draft"
  ).length;
  const totalDestaques = cursos.filter((curso) => curso.is_featured).length;

  return (
    <div className="min-h-screen bg-transparent text-[#111827]">
      <div className="flex w-full flex-col gap-6">
        <section className="rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-6 p-6 md:p-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9B6B22]">
                <Sparkles className="h-3.5 w-3.5" />
                Módulos e aulas
              </div>

              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#8A94A6]">
                Painel administrativo
              </p>

              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#0F172A] md:text-5xl">
                Módulos e aulas
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#667085] md:text-base">
                Selecione um curso real para abrir a gestão operacional de módulos
                e aulas vinculados ao banco.
              </p>
            </div>

            <Link
              href="/admin/cursos"
              className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
            >
              <GraduationCap className="h-4 w-4" />
              Ir para cursos
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Cursos disponíveis"
            value={String(totalCursos).padStart(2, "0")}
            icon={<GraduationCap className="h-5 w-5" />}
            iconTone="gold"
          />
          <MetricCard
            title="Publicados"
            value={String(totalPublicados).padStart(2, "0")}
            icon={<BookOpen className="h-5 w-5" />}
            iconTone="blue"
          />
          <MetricCard
            title="Rascunhos"
            value={String(totalRascunhos).padStart(2, "0")}
            icon={<FolderKanban className="h-5 w-5" />}
            iconTone="violet"
          />
          <MetricCard
            title="Destaques"
            value={String(totalDestaques).padStart(2, "0")}
            icon={<Star className="h-5 w-5" />}
            iconTone="goldSoft"
          />
        </section>

        <section className="rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 border-b border-[#EEF1F5] p-5 md:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#101828]">
                Seleção do curso
              </h2>
              <p className="mt-2 text-sm text-[#667085]">
                Escolha o curso que terá seus módulos e aulas gerenciados.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={() => void carregarCursos()}
                className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>

              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar curso"
                  className="h-11 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] pl-10 pr-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 rounded-[16px] border border-[#E4E7EC] bg-[#F9FAFB] p-1">
                {filtros.map((filtro) => {
                  const ativo = filtroAtivo === filtro.id;

                  return (
                    <button
                      key={filtro.id}
                      type="button"
                      onClick={() => setFiltroAtivo(filtro.id)}
                      className={cx(
                        "rounded-[12px] px-4 py-2 text-sm font-medium transition",
                        ativo
                          ? "bg-[#D8BC8B] text-[#111111]"
                          : "text-[#667085] hover:bg-white hover:text-[#101828]"
                      )}
                    >
                      {filtro.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {erro ? (
            <div className="p-6">
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 p-5">
                <h3 className="text-sm font-semibold text-rose-700">
                  Erro ao carregar cursos
                </h3>
                <p className="mt-2 text-sm leading-6 text-rose-600">{erro}</p>
              </div>
            </div>
          ) : null}

          <div className="hidden grid-cols-[1.25fr_0.65fr_0.6fr_0.7fr_0.65fr] gap-4 border-b border-[#EEF1F5] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98A2B3] lg:grid">
            <div>Curso</div>
            <div>Status</div>
            <div>Rank</div>
            <div>Atualizado em</div>
            <div className="text-right">Ação</div>
          </div>

          <div className="divide-y divide-[#EEF1F5]">
            {carregando ? (
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-[20px] border border-[#EEF1F5] bg-[#FCFCFD] p-5"
                    >
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 w-40 rounded bg-[#E9EDF3]" />
                        <div className="h-3 w-64 rounded bg-[#EEF2F6]" />
                        <div className="h-3 w-52 rounded bg-[#EEF2F6]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : cursosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] p-4">
                  <Layers3 className="h-6 w-6 text-[#98A2B3]" />
                </div>
                <h3 className="text-base font-semibold text-[#101828]">
                  Nenhum curso encontrado
                </h3>
                <p className="mt-2 max-w-md text-sm text-[#667085]">
                  Não há cursos compatíveis com os filtros atuais.
                </p>
              </div>
            ) : (
              cursosFiltrados.map((curso) => (
                <article
                  key={curso.id}
                  className="px-5 py-5 transition hover:bg-[#FCFCFD] md:px-6"
                >
                  <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.25fr_0.65fr_0.6fr_0.7fr_0.65fr] lg:items-center lg:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {curso.is_featured ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-2.5 py-1 text-[11px] font-semibold text-[#9B6B22]">
                            <Star className="h-3 w-3" />
                            Destaque
                          </span>
                        ) : null}

                        <span className="inline-flex items-center gap-1 rounded-full border border-[#D9E6F5] bg-[#EEF5FB] px-2.5 py-1 text-[11px] font-medium text-[#476A8E]">
                          <PlayCircle className="h-3 w-3" />
                          Gestão de aulas
                        </span>
                      </div>

                      <h3 className="mt-3 truncate text-base font-semibold text-[#101828] md:text-[17px]">
                        {curso.title}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#667085]">
                        {resumoCurso(curso)}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#98A2B3] lg:hidden">
                        <span className="inline-flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Rank {curso.required_rank}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatarData(curso.updated_at)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={cx(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                          statusClasses(curso.status)
                        )}
                      >
                        {traduzirStatus(curso.status)}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-[#344054]">
                      {curso.required_rank}
                    </div>

                    <div className="text-sm text-[#475467]">
                      {formatarData(curso.updated_at)}
                    </div>

                    <div className="flex justify-start lg:justify-end">
                      <Link
                        href={`/admin/cursos/${curso.id}/modulos`}
                        className="inline-flex items-center gap-2 rounded-[16px] border border-[#E4E7EC] bg-white px-3.5 py-2 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                      >
                        Abrir gestão
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}