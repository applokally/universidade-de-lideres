"use client";

import { createClient } from "@supabase/supabase-js";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LayoutVariant = "horizontal" | "vertical" | "featured";
type ContentType = "course" | "lesson" | "live";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getLayoutLabel(variant: LayoutVariant) {
  if (variant === "horizontal") return "Horizontal";
  if (variant === "featured") return "Destaque extragrande";
  return "Vertical";
}

function getContentTypeLabel(type: ContentType) {
  if (type === "course") return "Curso / Trilha";
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

  if (cleanPath.startsWith("courses/") || cleanPath.startsWith("trilhas/")) {
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
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
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
      coursesResponse,
      modulesResponse,
      lessonsResponse,
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

    setSections((sectionsResponse.data ?? []) as HomeSection[]);
    setItems((itemsResponse.data ?? []) as HomeSectionItem[]);
    setCourses((coursesResponse.data ?? []) as CourseOption[]);
    setModules((modulesResponse.data ?? []) as ModuleOption[]);
    setLessons((lessonsResponse.data ?? []) as LessonOption[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
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

  function getCourseById(id: string) {
    return courses.find((course) => course.id === id) ?? null;
  }

  function getLessonById(id: string) {
    return lessons.find((lesson) => lesson.id === id) ?? null;
  }

  function getItemTitle(item: HomeSectionItem) {
    if (item.title_override) return item.title_override;

    if (item.content_type === "course") {
      return getCourseById(item.content_id)?.title ?? "Curso não encontrado";
    }

    return getLessonById(item.content_id)?.title ?? "Aula não encontrada";
  }

  function getItemSubtitle(item: HomeSectionItem) {
    if (item.subtitle_override) return item.subtitle_override;

    if (item.content_type === "course") {
      const course = getCourseById(item.content_id);
      return (
        course?.short_description ||
        course?.description ||
        "Curso cadastrado no ADM."
      );
    }

    const lesson = getLessonById(item.content_id);
    const course = lesson ? moduleCourseMap.get(lesson.module_id) : null;

    if (lesson?.description) return lesson.description;
    if (course) return `Vinculado ao curso ${course.title}.`;

    return item.content_type === "live"
      ? "Live cadastrada no ADM."
      : "Aula cadastrada no ADM.";
  }

  function getItemMeta(item: HomeSectionItem) {
    if (item.content_type === "course") {
      const course = getCourseById(item.content_id);
      return course
        ? `Curso / Trilha • Rank ${course.required_rank} • ${course.status}`
        : "Curso / Trilha";
    }

    const lesson = getLessonById(item.content_id);

    if (!lesson) return getContentTypeLabel(item.content_type);

    if (item.content_type === "live") {
      return `Live • ${lesson.status}`;
    }

    return `Aula • ${formatDuration(lesson.duration_sec)} • ${lesson.status}`;
  }

  function getItemImage(item: HomeSectionItem) {
    if (item.image_url_override) return item.image_url_override;

    if (item.content_type === "course") {
      return resolvePublicAssetUrl(getCourseById(item.content_id)?.cover_path ?? null);
    }

    return resolvePublicAssetUrl(
      getLessonById(item.content_id)?.primary_asset_path ?? null
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 text-[#141414]">
      <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
            Área do aluno
          </p>

          <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
            Categorias e cards
          </h1>

          <p className="mt-3 max-w-[760px] text-[15px] leading-6 text-[#5d6472]">
            Controle as fileiras da home do aluno e os conteúdos exibidos em
            cada uma delas.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/admin/home-aluno/novo?tipo=categoria"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
          >
            <Plus size={18} />
            Nova categoria
          </Link>

          <Link
            href="/admin/home-aluno/novo?tipo=card"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
          >
            <Plus size={18} />
            Inserir card
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[14px] border border-[#e5e5e5] bg-white px-5 py-4">
          <p className="text-[13px] font-medium text-[#666b76]">Categorias</p>
          <strong className="mt-2 block text-[34px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
            {sections.length}
          </strong>
        </div>

        <div className="rounded-[14px] border border-[#e5e5e5] bg-white px-5 py-4">
          <p className="text-[13px] font-medium text-[#666b76]">Ativas</p>
          <strong className="mt-2 block text-[34px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
            {activeSectionsCount}
          </strong>
        </div>

        <div className="rounded-[14px] border border-[#e5e5e5] bg-white px-5 py-4">
          <p className="text-[13px] font-medium text-[#666b76]">Cards exibidos</p>
          <strong className="mt-2 block text-[34px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
            {activeItemsCount}
          </strong>
        </div>
      </section>

      {message ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-semibold text-emerald-700">
          <CheckCircle2 size={20} />
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[12px] border border-red-200 bg-red-50 px-5 py-4 text-[14px] font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_180px] gap-4 border-b border-[#e5e5e5] bg-[#fafafa] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8f9d] max-lg:hidden">
          <div>Categoria</div>
          <div>Status</div>
          <div>Layout</div>
          <div className="text-right">Ações</div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex items-center gap-3 text-[14px] font-semibold text-[#666b76]">
              <Loader2 size={18} className="animate-spin" />
              Carregando categorias e cards...
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#e2d2b6] bg-[#f3eee5] text-[#8a6836]">
                <Layers3 size={24} />
              </div>

              <h3 className="text-[20px] font-semibold text-[#141414]">
                Nenhuma categoria cadastrada
              </h3>

              <p className="mx-auto mt-2 max-w-[360px] text-[14px] leading-6 text-[#666b76]">
                Crie a primeira categoria para organizar os cards da home do
                aluno.
              </p>

              <Link
                href="/admin/home-aluno/novo?tipo=categoria"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
              >
                <Plus size={17} />
                Nova categoria
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#ededed]">
            {sections.map((section) => {
              const sectionItems = items.filter(
                (item) => item.section_id === section.id
              );

              return (
                <details key={section.id} className="group bg-white" open>
                  <summary className="grid cursor-pointer list-none gap-4 px-5 py-5 transition hover:bg-[#fafafa] lg:grid-cols-[minmax(0,1fr)_120px_120px_180px] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 lg:hidden">
                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                            section.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700",
                          ].join(" ")}
                        >
                          {section.is_active ? "Ativa" : "Inativa"}
                        </span>

                        <span className="rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[12px] font-semibold text-[#8a6836]">
                          {getLayoutLabel(section.layout_variant)}
                        </span>
                      </div>

                      <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-[#141414]">
                        {section.title}
                      </h3>

                      <p className="mt-1 text-[13px] font-medium text-[#8a8f9d]">
                        /{section.slug} • Ordem {section.sort_order} • {sectionItems.length} card(s)
                      </p>

                      {section.description ? (
                        <p className="mt-2 line-clamp-2 max-w-[720px] text-[14px] leading-6 text-[#666b76]">
                          {section.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="hidden lg:block">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                          section.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700",
                        ].join(" ")}
                      >
                        {section.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </div>

                    <div className="hidden lg:block">
                      <span className="inline-flex rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[12px] font-semibold text-[#8a6836]">
                        {getLayoutLabel(section.layout_variant)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Link
                        href={`/admin/home-aluno/novo?tipo=categoria&id=${section.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-3 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Pencil size={14} />
                        Editar
                      </Link>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleSectionStatus(section);
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-3 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                      >
                        {section.is_active ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                        {section.is_active ? "Ocultar" : "Exibir"}
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          deleteSection(section);
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 text-[13px] font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </summary>

                  <div className="border-t border-[#ededed] bg-[#fcfcfc] px-5 py-4">
                    {sectionItems.length === 0 ? (
                      <div className="flex flex-col items-start justify-between gap-3 rounded-[12px] border border-dashed border-[#d9d9d9] bg-white px-4 py-4 sm:flex-row sm:items-center">
                        <p className="text-[14px] font-medium text-[#666b76]">
                          Esta categoria ainda não possui cards.
                        </p>

                        <Link
                          href={`/admin/home-aluno/novo?tipo=card&section=${section.id}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                        >
                          <Plus size={15} />
                          Inserir card
                        </Link>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-white">
                        <div className="grid grid-cols-[92px_minmax(0,1fr)_150px_170px] gap-4 border-b border-[#ededed] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8f9d] max-lg:hidden">
                          <div>Capa</div>
                          <div>Conteúdo</div>
                          <div>Tipo</div>
                          <div className="text-right">Ações</div>
                        </div>

                        <div className="divide-y divide-[#ededed]">
                          {sectionItems.map((item) => {
                            const imageUrl = getItemImage(item);

                            return (
                              <div
                                key={item.id}
                                className="grid gap-4 p-4 lg:grid-cols-[92px_minmax(0,1fr)_150px_170px] lg:items-center"
                              >
                                <div className="h-[58px] overflow-hidden rounded-[8px] bg-[#141414]">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={getItemTitle(item)}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white/45">
                                      SEM CAPA
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={[
                                        "rounded-full border px-2.5 py-1 text-[12px] font-semibold lg:hidden",
                                        item.is_active
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-red-200 bg-red-50 text-red-700",
                                      ].join(" ")}
                                    >
                                      {item.is_active ? "Ativo" : "Inativo"}
                                    </span>

                                    {item.badge_override ? (
                                      <span className="rounded-full border border-[#e5e5e5] bg-[#f4f4f5] px-2.5 py-1 text-[12px] font-semibold text-[#52525b]">
                                        {item.badge_override}
                                      </span>
                                    ) : null}
                                  </div>

                                  <h4 className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-[#141414]">
                                    {getItemTitle(item)}
                                  </h4>

                                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#666b76]">
                                    {getItemSubtitle(item)}
                                  </p>

                                  <p className="mt-1 text-[12px] font-medium text-[#8a8f9d]">
                                    {getItemMeta(item)} • Ordem {item.sort_order}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-[#e5e5e5] bg-[#f4f4f5] px-2.5 py-1 text-[12px] font-semibold text-[#52525b]">
                                    {getContentTypeLabel(item.content_type)}
                                  </span>

                                  <span
                                    className={[
                                      "hidden rounded-full border px-2.5 py-1 text-[12px] font-semibold lg:inline-flex",
                                      item.is_active
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-red-200 bg-red-50 text-red-700",
                                    ].join(" ")}
                                  >
                                    {item.is_active ? "Ativo" : "Inativo"}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                  <Link
                                    href={`/admin/home-aluno/novo?tipo=card&id=${item.id}`}
                                    className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-3 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                                  >
                                    <Pencil size={14} />
                                    Editar
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => toggleItemStatus(item)}
                                    className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-3 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                                  >
                                    {item.is_active ? (
                                      <EyeOff size={14} />
                                    ) : (
                                      <Eye size={14} />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteItem(item)}
                                    className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 text-[13px] font-semibold text-red-700 transition hover:bg-red-100"
                                  >
                                    <Trash2 size={14} />
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