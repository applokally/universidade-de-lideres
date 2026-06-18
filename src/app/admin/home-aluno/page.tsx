"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";


function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type LayoutVariant = "horizontal" | "vertical" | "featured";
type ContentType = "trail" | "course" | "lesson" | "live";

type HomeSection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  layout_variant: LayoutVariant;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type HomeSectionItem = {
  id: string;
  section_id: string;
  content_type: ContentType;
  content_id: string;
  title_override: string | null;
  subtitle_override: string | null;
  badge_override: string | null;
  image_url_override: string | null;
  target_url_override: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TrailOption = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  cover_path: string | null;
  preferred_card_format: LayoutVariant | null;
  required_rank: number | null;
  status: string | null;
  is_featured: boolean | null;
};

type CourseOption = {
  id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  status: string;
  required_rank: number;
  is_featured: boolean;
};

type ModuleOption = {
  id: string;
  title: string;
  course_id: string;
};

type LessonOption = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  status: string;
  content_type: string;
  duration_sec: number | null;
  primary_asset_path: string | null;
  scheduled_start_at: string | null;
};

type LiveOption = {
  id: string;
  slug: string | null;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  presenter_name: string | null;
  status: string | null;
  is_featured: boolean | null;
  is_active: boolean | null;
};

const supabase = supabaseBrowser();

function getLayoutLabel(variant: LayoutVariant) {
  if (variant === "horizontal") return "Horizontal";
  if (variant === "featured") return "Destaque extragrande";
  return "Vertical";
}

function getContentTypeLabel(type: ContentType) {
  if (type === "trail") return "Trilha";
  if (type === "course") return "Curso";
  if (type === "live") return "Live";
  return "Aula";
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "Duração não informada";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}min`;
}

function resolvePublicAssetUrl(path: string | null) {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.replace(/^\/+/, "");

  if (cleanPath.startsWith("public/")) {
    return `/${cleanPath.replace(/^public\//, "")}`;
  }

  if (
    cleanPath.startsWith("courses/") ||
    cleanPath.startsWith("trilhas/") ||
    cleanPath.startsWith("lives/")
  ) {
    const { data } = supabase.storage.from("covers").getPublicUrl(cleanPath);
    return data.publicUrl;
  }

  if (cleanPath.startsWith("covers/")) {
    const { data } = supabase.storage
      .from("covers")
      .getPublicUrl(cleanPath.replace(/^covers\//, ""));
    return data.publicUrl;
  }

  if (cleanPath.startsWith("course-covers/")) {
    const { data } = supabase.storage
      .from("covers")
      .getPublicUrl(cleanPath.replace(/^course-covers\//, ""));
    return data.publicUrl;
  }

  if (cleanPath.startsWith("materials/")) {
    const { data } = supabase.storage.from("materials").getPublicUrl(cleanPath);
    return data.publicUrl;
  }

  return `/${cleanPath}`;
}

export default function AdminStudentHomePage() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [items, setItems] = useState<HomeSectionItem[]>([]);
  const [trails, setTrails] = useState<TrailOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [lives, setLives] = useState<LiveOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const activeSectionsCount = useMemo(
    () => sections.filter((section) => section.is_active).length,
    [sections]
  );

  const activeItemsCount = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items]
  );

  const moduleCourseMap = useMemo(() => {
    const map = new Map<string, CourseOption>();

    modules.forEach((module) => {
      const course = courses.find((item) => item.id === module.course_id);
      if (course) map.set(module.id, course);
    });

    return map;
  }, [courses, modules]);

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const [
      sectionsResponse,
      itemsResponse,
      trailsResponse,
      coursesResponse,
      modulesResponse,
      lessonsResponse,
      livesResponse,
    ] = await Promise.all([
      supabase
        .from("student_home_sections")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("student_home_section_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("course_categories")
        .select(
          "id,title,slug,description,cover_path,preferred_card_format,required_rank,status,is_featured"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("courses")
        .select(
          "id,title,short_description,description,cover_path,status,required_rank,is_featured"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("course_modules")
        .select("id,title,course_id")
        .order("sort_order", { ascending: true }),
      supabase
        .from("lessons")
        .select(
          "id,module_id,title,description,status,content_type,duration_sec,primary_asset_path,scheduled_start_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("lives")
        .select(
          "id,slug,title,short_description,description,cover_path,starts_at,ends_at,presenter_name,status,is_featured,is_active"
        )
        .order("starts_at", { ascending: false }),
    ]);

    if (sectionsResponse.error) {
      setErrorMessage(
        `Erro ao carregar categorias: ${sectionsResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    if (itemsResponse.error) {
      setErrorMessage(`Erro ao carregar cards: ${itemsResponse.error.message}`);
      setLoading(false);
      return;
    }

    if (trailsResponse.error) {
      setErrorMessage(
        `Erro ao carregar trilhas: ${trailsResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    if (coursesResponse.error) {
      setErrorMessage(
        `Erro ao carregar cursos: ${coursesResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    if (modulesResponse.error) {
      setErrorMessage(
        `Erro ao carregar módulos: ${modulesResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    if (lessonsResponse.error) {
      setErrorMessage(
        `Erro ao carregar aulas: ${lessonsResponse.error.message}`
      );
      setLoading(false);
      return;
    }

    if (livesResponse.error) {
      setErrorMessage(`Erro ao carregar lives: ${livesResponse.error.message}`);
      setLoading(false);
      return;
    }

    setSections((sectionsResponse.data ?? []) as HomeSection[]);
    setItems((itemsResponse.data ?? []) as HomeSectionItem[]);
    setTrails((trailsResponse.data ?? []) as TrailOption[]);
    setCourses((coursesResponse.data ?? []) as CourseOption[]);
    setModules((modulesResponse.data ?? []) as ModuleOption[]);
    setLessons((lessonsResponse.data ?? []) as LessonOption[]);
    setLives((livesResponse.data ?? []) as LiveOption[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleSectionStatus(section: HomeSection) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_home_sections")
      .update({ is_active: !section.is_active })
      .eq("id", section.id);

    if (error) {
      setErrorMessage(`Erro ao alterar status da categoria: ${error.message}`);
      return;
    }

    setMessage(
      section.is_active
        ? "Categoria desativada com sucesso."
        : "Categoria ativada com sucesso."
    );

    await loadData();
  }

  async function toggleItemStatus(item: HomeSectionItem) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_home_section_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      setErrorMessage(`Erro ao alterar status do card: ${error.message}`);
      return;
    }

    setMessage(
      item.is_active
        ? "Card desativado com sucesso."
        : "Card ativado com sucesso."
    );

    await loadData();
  }

  async function deleteSection(section: HomeSection) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a categoria "${section.title}"? Os cards vinculados a ela também podem ser removidos.`
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_home_sections")
      .delete()
      .eq("id", section.id);

    if (error) {
      setErrorMessage(`Erro ao excluir categoria: ${error.message}`);
      return;
    }

    setMessage("Categoria excluída com sucesso.");
    await loadData();
  }

  async function deleteItem(item: HomeSectionItem) {
    const confirmed = window.confirm(
      `Tem certeza que deseja remover o card "${getItemTitle(item)}"?`
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_home_section_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      setErrorMessage(`Erro ao remover card: ${error.message}`);
      return;
    }

    setMessage("Card removido com sucesso.");
    await loadData();
  }

  function getTrailById(id: string) {
    return trails.find((trail) => trail.id === id) ?? null;
  }

  function getCourseById(id: string) {
    return courses.find((course) => course.id === id) ?? null;
  }

  function getLessonById(id: string) {
    return lessons.find((lesson) => lesson.id === id) ?? null;
  }

  function getLiveById(id: string) {
    return lives.find((live) => live.id === id) ?? null;
  }

  function getItemTitle(item: HomeSectionItem) {
    if (item.title_override) return item.title_override;

    if (item.content_type === "trail") {
      return getTrailById(item.content_id)?.title ?? "Trilha não encontrada";
    }

    if (item.content_type === "course") {
      return getCourseById(item.content_id)?.title ?? "Curso não encontrado";
    }

    if (item.content_type === "live") {
      return getLiveById(item.content_id)?.title ?? "Live não encontrada";
    }

    return getLessonById(item.content_id)?.title ?? "Aula não encontrada";
  }

  function getItemSubtitle(item: HomeSectionItem) {
    if (item.subtitle_override) return item.subtitle_override;

    if (item.content_type === "trail") {
      return getTrailById(item.content_id)?.description ?? "Trilha cadastrada no ADM.";
    }

    if (item.content_type === "course") {
      const course = getCourseById(item.content_id);
      return (
        course?.short_description ||
        course?.description ||
        "Curso cadastrado no ADM."
      );
    }

    if (item.content_type === "live") {
      const live = getLiveById(item.content_id);
      return (
        live?.short_description ||
        live?.description ||
        "Live cadastrada no ADM."
      );
    }

    const lesson = getLessonById(item.content_id);
    const course = lesson ? moduleCourseMap.get(lesson.module_id) : null;

    if (lesson?.description) return lesson.description;
    if (course) return `Vinculado ao curso ${course.title}.`;

    return "Aula cadastrada no ADM.";
  }

  function getItemMeta(item: HomeSectionItem) {
    if (item.content_type === "trail") {
      const trail = getTrailById(item.content_id);
      return trail
        ? `Trilha • Rank ${trail.required_rank ?? 0} • ${trail.status ?? "draft"}`
        : "Trilha";
    }

    if (item.content_type === "course") {
      const course = getCourseById(item.content_id);
      return course
        ? `Curso • Rank ${course.required_rank} • ${course.status}`
        : "Curso";
    }

    if (item.content_type === "live") {
      const live = getLiveById(item.content_id);

      if (!live) return "Live";

      const details = [
        "Live",
        live.presenter_name ? `Com ${live.presenter_name}` : null,
        live.status ?? "scheduled",
      ].filter(Boolean);

      return details.join(" • ");
    }

    const lesson = getLessonById(item.content_id);

    if (!lesson) return "Aula";

    return `Aula • ${formatDuration(lesson.duration_sec)} • ${lesson.status}`;
  }

  function getItemImage(item: HomeSectionItem) {
    if (item.image_url_override) {
      return resolvePublicAssetUrl(item.image_url_override);
    }

    if (item.content_type === "trail") {
      return resolvePublicAssetUrl(getTrailById(item.content_id)?.cover_path ?? null);
    }

    if (item.content_type === "course") {
      return resolvePublicAssetUrl(
        getCourseById(item.content_id)?.cover_path ?? null
      );
    }

    if (item.content_type === "live") {
      return resolvePublicAssetUrl(getLiveById(item.content_id)?.cover_path ?? null);
    }

    return resolvePublicAssetUrl(
      getLessonById(item.content_id)?.primary_asset_path ?? null
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 text-[#141414]">
      <section className="border-b border-[#e5e5e5] pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
              Área do aluno
            </p>

            <h1 className="mt-2 text-[36px] font-semibold leading-tight tracking-[-0.04em] text-[#141414] sm:text-[44px]">
              Categorias e cards
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/home-aluno/novo?tipo=categoria"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              Nova categoria
            </Link>

            <Link
              href="/admin/home-aluno/novo?tipo=card"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
            >
              <Plus className="h-4 w-4" />
              Inserir card
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
        <div className="grid grid-cols-3 divide-x divide-[#ededed]">
          <div className="px-5 py-4">
            <p className="text-[13px] font-medium text-[#666b76]">Categorias</p>
            <strong className="mt-2 block text-[32px] font-semibold leading-none tracking-[-0.04em] text-[#141414]">
              {sections.length}
            </strong>
          </div>

          <div className="px-5 py-4">
            <p className="text-[13px] font-medium text-[#666b76]">Ativas</p>
            <strong className="mt-2 block text-[32px] font-semibold leading-none tracking-[-0.04em] text-[#141414]">
              {activeSectionsCount}
            </strong>
          </div>

          <div className="px-5 py-4">
            <p className="text-[13px] font-medium text-[#666b76]">Cards</p>
            <strong className="mt-2 block text-[32px] font-semibold leading-none tracking-[-0.04em] text-[#141414]">
              {activeItemsCount}
            </strong>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[12px] border border-red-200 bg-red-50 px-5 py-4 text-[14px] font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_130px_132px] gap-4 border-b border-[#ededed] bg-[#fafafa] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8f9d] lg:grid">
          <div>Categoria</div>
          <div>Status</div>
          <div>Layout</div>
          <div className="text-right">Ações</div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center bg-white">
            <div className="flex items-center gap-3 text-[14px] font-semibold text-[#666b76]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando categorias...
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
            <div>
              <h3 className="text-[18px] font-semibold text-[#141414]">
                Nenhuma categoria cadastrada
              </h3>

              <Link
                href="/admin/home-aluno/novo?tipo=categoria"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
              >
                <Plus className="h-4 w-4" />
                Criar categoria
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#ededed]">
            {sections.map((section) => {
              const sectionItems = items.filter((item) => item.section_id === section.id);

              return (
                <details key={section.id} className="group bg-white">
                  <summary className="grid cursor-pointer list-none gap-4 px-5 py-4 transition hover:bg-[#fafafa] lg:grid-cols-[minmax(0,1fr)_120px_130px_132px] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#8a8f9d] transition group-open:rotate-90" />

                      <div className="min-w-0">
                        <h3 className="truncate text-[16px] font-semibold text-[#141414]">
                          {section.title}
                        </h3>

                        <p className="mt-1 truncate text-[13px] text-[#666b76]">
                          Ordem {section.sort_order} • {sectionItems.length} card(s)
                        </p>

                        {section.description ? (
                          <p className="mt-1 line-clamp-1 text-[13px] text-[#666b76]">
                            {section.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <span
                        className={cx(
                          "inline-flex rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                          section.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-[#e5e5e5] bg-[#f4f4f5] text-[#52525b]"
                        )}
                      >
                        {section.is_active ? "Ativa" : "Oculta"}
                      </span>
                    </div>

                    <div className="text-[13px] font-semibold text-[#8a6836]">
                      {getLayoutLabel(section.layout_variant)}
                    </div>

                    <div className="flex items-center justify-start gap-2 lg:justify-end">
                      <Link
                        href={`/admin/home-aluno/novo?tipo=categoria&id=${section.id}`}
                        title="Editar categoria"
                        aria-label="Editar categoria"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void toggleSectionStatus(section);
                        }}
                        title={section.is_active ? "Ocultar categoria" : "Ativar categoria"}
                        aria-label={section.is_active ? "Ocultar categoria" : "Ativar categoria"}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                      >
                        {section.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void deleteSection(section);
                        }}
                        title="Excluir categoria"
                        aria-label="Excluir categoria"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </summary>

                  <div className="border-t border-[#ededed] bg-white px-5 py-2">
                    {sectionItems.length === 0 ? (
                      <div className="flex items-center justify-between gap-4 py-4">
                        <p className="text-[14px] text-[#666b76]">
                          Nenhum card cadastrado nesta categoria.
                        </p>

                        <Link
                          href={`/admin/home-aluno/novo?tipo=card&section=${section.id}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                        >
                          <Plus className="h-4 w-4" />
                          Inserir card
                        </Link>
                      </div>
                    ) : (
                      <div>
                        <div className="hidden grid-cols-[92px_minmax(0,1fr)_110px_112px] gap-4 border-b border-[#ededed] px-1 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8f9d] lg:grid">
                          <div>Capa</div>
                          <div>Conteúdo</div>
                          <div>Tipo</div>
                          <div className="text-right">Ações</div>
                        </div>

                        <div className="divide-y divide-[#ededed]">
                          {sectionItems.map((item) => {
                            const itemImage = getItemImage(item);
                            const itemTitle = getItemTitle(item);

                            return (
                              <div
                                key={item.id}
                                className="grid gap-4 px-1 py-3 lg:grid-cols-[92px_minmax(0,1fr)_110px_112px] lg:items-center"
                              >
                                <div className="h-[52px] w-[92px] overflow-hidden rounded-[10px] bg-[#141414]">
                                  {itemImage ? (
                                    <img
                                      src={itemImage}
                                      alt={itemTitle}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">
                                      Sem capa
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <h4 className="truncate text-[15px] font-semibold text-[#141414]">
                                    {itemTitle}
                                  </h4>

                                  <p className="mt-1 line-clamp-1 text-[13px] text-[#666b76]">
                                    {getItemSubtitle(item)}
                                  </p>

                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold text-[#52525b]">
                                    {getContentTypeLabel(item.content_type)}
                                  </span>

                                  <span
                                    className={cx(
                                      "inline-flex rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                                      item.is_active
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-[#e5e5e5] bg-[#f4f4f5] text-[#52525b]"
                                    )}
                                  >
                                    {item.is_active ? "Ativo" : "Oculto"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-start gap-2 lg:justify-end">
                                  <Link
                                    href={`/admin/home-aluno/novo?tipo=card&id=${item.id}`}
                                    title="Editar card"
                                    aria-label="Editar card"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => void toggleItemStatus(item)}
                                    title={item.is_active ? "Ocultar card" : "Ativar card"}
                                    aria-label={item.is_active ? "Ocultar card" : "Ativar card"}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                                  >
                                    {item.is_active ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void deleteItem(item)}
                                    title="Excluir card"
                                    aria-label="Excluir card"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
