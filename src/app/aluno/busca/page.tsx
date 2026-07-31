"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Filter, GraduationCap, Loader2, Search, X } from "lucide-react";
import { StudentHeader } from "../_components/StudentHeader";
import { supabaseBrowser } from "@/lib/supabase/browser";

type SearchItem = {
  id: string;
  type: "course" | "trail";
  title: string;
  description: string;
  slug: string | null;
  coverPath: string | null;
  requiredRank: number;
  trailIds: string[];
};

type TrailRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  status: string;
  required_rank: number | null;
};

type CourseRow = {
  id: string;
  title: string;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  status: string;
  required_rank: number | null;
};

type MapRow = { course_id: string; category_id: string };
type TierRow = { id: string; name: string; rank: number; is_active: boolean };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function coverUrl(path: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return base ? `${base}/storage/v1/object/public/covers/${path.replace(/^\/+/, "")}` : "";
}

export default function StudentSearchPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "course" | "trail">("all");
  const [trailId, setTrailId] = useState("all");
  const [rank, setRank] = useState("all");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [trails, setTrails] = useState<TrailRow[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const initialQuery =
        new URLSearchParams(window.location.search).get("q") ?? "";
      setQuery(initialQuery);
      setLoading(true);
      const [coursesResponse, trailsResponse, mapsResponse, tiersResponse] =
        await Promise.all([
          supabase
            .from("courses")
            .select("id,title,slug,short_description,description,cover_path,cover_vertical_path,status,required_rank")
            .eq("status", "published")
            .order("title"),
          supabase
            .from("course_categories")
            .select("id,title,slug,description,cover_path,cover_vertical_path,status,required_rank")
            .eq("status", "published")
            .order("title"),
          supabase.from("course_category_map").select("course_id,category_id"),
          supabase
            .from("access_tiers")
            .select("id,name,rank,is_active")
            .eq("is_active", true)
            .order("rank"),
        ]);

      const firstError =
        coursesResponse.error ||
        trailsResponse.error ||
        mapsResponse.error ||
        tiersResponse.error;
      if (firstError) {
        setError("Não foi possível carregar a busca. Tente novamente.");
        setLoading(false);
        return;
      }

      const loadedTrails = (trailsResponse.data ?? []) as TrailRow[];
      const maps = (mapsResponse.data ?? []) as MapRow[];
      const trailIdsByCourse = new Map<string, string[]>();
      maps.forEach((map) => {
        trailIdsByCourse.set(map.course_id, [
          ...(trailIdsByCourse.get(map.course_id) ?? []),
          map.category_id,
        ]);
      });

      const courseItems = ((coursesResponse.data ?? []) as CourseRow[]).map(
        (course): SearchItem => ({
          id: course.id,
          type: "course",
          title: course.title,
          description:
            course.short_description ?? course.description ?? "Curso disponível",
          slug: course.slug,
          coverPath: course.cover_vertical_path ?? course.cover_path,
          requiredRank: Number(course.required_rank ?? 0),
          trailIds: trailIdsByCourse.get(course.id) ?? [],
        }),
      );
      const trailItems = loadedTrails.map(
        (trail): SearchItem => ({
          id: trail.id,
          type: "trail",
          title: trail.title,
          description: trail.description ?? "Trilha de aprendizado",
          slug: trail.slug,
          coverPath: trail.cover_vertical_path ?? trail.cover_path,
          requiredRank: Number(trail.required_rank ?? 0),
          trailIds: [trail.id],
        }),
      );

      setTrails(loadedTrails);
      setTiers((tiersResponse.data ?? []) as TierRow[]);
      setItems([...trailItems, ...courseItems]);
      setLoading(false);
    }

    void load();
  }, [supabase]);

  const results = useMemo(() => {
    const term = normalize(query);
    return items.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (trailId !== "all" && !item.trailIds.includes(trailId)) return false;
      if (rank !== "all" && item.requiredRank !== Number(rank)) return false;
      if (!term) return true;
      return normalize(`${item.title} ${item.description}`).includes(term);
    });
  }, [items, query, rank, trailId, type]);

  const rankName = (requiredRank: number) =>
    tiers.find((tier) => tier.rank === requiredRank)?.name ??
    (requiredRank === 0 ? "Acesso inicial" : `Nível ${requiredRank}`);

  function clearFilters() {
    setQuery("");
    setType("all");
    setTrailId("all");
    setRank("all");
    window.history.replaceState(null, "", "/aluno/busca");
  }

  const inputClass =
    "h-12 rounded-[14px] border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none focus:border-[#DBC094]/55";

  return (
    <main className="min-h-screen bg-[#050609] text-white">
      <StudentHeader />
      <section className="px-5 pb-16 pt-[116px] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#DBC094]">
            Biblioteca
          </p>
          <h1 className="mt-3 text-[38px] font-black tracking-[-0.05em] sm:text-[52px]">
            Buscar conteúdos
          </h1>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-[#101116] p-5">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#DBC094]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busque por curso, trilha ou tema"
                className={`${inputClass} w-full pl-12 text-base`}
                autoFocus
              />
            </label>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className={inputClass}>
                <option value="all">Todos os tipos</option>
                <option value="course">Cursos</option>
                <option value="trail">Trilhas</option>
              </select>
              <select value={trailId} onChange={(event) => setTrailId(event.target.value)} className={inputClass}>
                <option value="all">Todas as trilhas</option>
                {trails.map((trail) => (
                  <option key={trail.id} value={trail.id}>{trail.title}</option>
                ))}
              </select>
              <select value={rank} onChange={(event) => setRank(event.target.value)} className={inputClass}>
                <option value="all">Todos os níveis</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.rank}>{tier.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between gap-4">
            <p className="text-sm text-white/55">
              {loading ? "Carregando..." : `${results.length} resultado(s) encontrado(s)`}
            </p>
            <button onClick={clearFilters} className="inline-flex items-center gap-2 text-sm font-semibold text-[#DBC094]">
              <X className="h-4 w-4" /> Limpar filtros
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center gap-3 text-white/55">
              <Loader2 className="h-5 w-5 animate-spin text-[#DBC094]" /> Carregando biblioteca...
            </div>
          ) : error ? (
            <div className="mt-7 rounded-[18px] border border-red-400/20 bg-red-400/10 p-5 text-red-100">{error}</div>
          ) : results.length === 0 ? (
            <div className="mt-7 flex min-h-[300px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-[#0b0c10] text-center">
              <Filter className="h-10 w-10 text-[#DBC094]" />
              <h2 className="mt-4 text-xl font-bold">Nenhum conteúdo encontrado</h2>
              <p className="mt-2 text-sm text-white/45">Tente outro termo ou remova algum filtro.</p>
            </div>
          ) : (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((item) => {
                const image = coverUrl(item.coverPath);
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={
                      item.type === "course"
                        ? (() => {
                            const parentTrail = trails.find(
                              (trail) => trail.id === item.trailIds[0],
                            );
                            return parentTrail?.slug
                              ? `/aluno/trilhas/${parentTrail.slug}`
                              : "/aluno/cursos";
                          })()
                        : `/aluno/trilhas/${item.slug ?? item.id}`
                    }
                    className="group overflow-hidden rounded-[22px] border border-white/8 bg-[#101116] transition hover:-translate-y-1 hover:border-[#DBC094]/35"
                  >
                    <div className="aspect-[16/10] bg-white/5">
                      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#DBC094]">
                        {item.type === "course" ? <BookOpen className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                        {item.type === "course" ? "Curso" : "Trilha"}
                      </div>
                      <h2 className="mt-3 text-lg font-bold">{item.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/48">{item.description}</p>
                      <p className="mt-4 text-xs font-semibold text-white/60">Nível: {rankName(item.requiredRank)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
