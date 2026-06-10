"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { ArrowLeft, CheckCircle2, Loader2, Plus, Save } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type LayoutVariant = "horizontal" | "vertical" | "featured";
type ContentType = "course" | "trail" | "lesson" | "live";
type FormMode = "categoria" | "card";

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

type ContentOption = {
  id: string;
  label: string;
  description: string;
  meta: string;
  status: string;
  imageUrl: string | null;
};

type SectionFormState = {
  title: string;
  slug: string;
  description: string;
  layout_variant: LayoutVariant;
  sort_order: string;
  is_active: boolean;
};

type ItemFormState = {
  section_id: string;
  content_type: ContentType;
  content_id: string;
  title_override: string;
  subtitle_override: string;
  badge_override: string;
  sort_order: string;
  is_active: boolean;
};

const initialSectionForm: SectionFormState = {
  title: "",
  slug: "",
  description: "",
  layout_variant: "vertical",
  sort_order: "0",
  is_active: true,
};

const initialItemForm: ItemFormState = {
  section_id: "",
  content_type: "trail",
  content_id: "",
  title_override: "",
  subtitle_override: "",
  badge_override: "",
  sort_order: "0",
  is_active: true,
};

function normalizeNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function resolvePublicAssetUrl(path: string | null) {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.replace(/^\/+/, "");
  const supabase = supabaseBrowser();

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

  if (cleanPath.startsWith("materials/")) {
    const { data } = supabase.storage.from("materials").getPublicUrl(cleanPath);
    return data.publicUrl;
  }

  if (cleanPath.startsWith("public/")) {
    return `/${cleanPath.replace(/^public\//, "")}`;
  }

  return `/${cleanPath}`;
}

function getUrlParams() {
  if (typeof window === "undefined") {
    return {
      tipo: "categoria" as FormMode,
      id: "",
      section: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  const tipoParam = params.get("tipo");

  return {
    tipo:
      tipoParam === "card"
        ? ("card" as FormMode)
        : ("categoria" as FormMode),
    id: params.get("id") ?? "",
    section: params.get("section") ?? "",
  };
}

export default function NewStudentHomeConfigPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [mode, setMode] = useState<FormMode>("categoria");
  const [recordId, setRecordId] = useState("");
  const [initialSectionId, setInitialSectionId] = useState("");

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [trails, setTrails] = useState<TrailOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);

  const [sectionForm, setSectionForm] =
    useState<SectionFormState>(initialSectionForm);
  const [itemForm, setItemForm] = useState<ItemFormState>(initialItemForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(recordId);

  const moduleCourseMap = useMemo(() => {
    const map = new Map<string, CourseOption>();

    modules.forEach((module) => {
      const course = courses.find((item) => item.id === module.course_id);
      if (course) map.set(module.id, course);
    });

    return map;
  }, [courses, modules]);

  const availableContentOptions = useMemo<ContentOption[]>(() => {
    if (itemForm.content_type === "trail") {
      return trails.map((trail) => ({
        id: trail.id,
        label: trail.title,
        description: trail.description || "Trilha cadastrada no ADM.",
        meta: `Trilha • Rank ${trail.required_rank ?? 0} • ${
          trail.is_featured ? "Destaque" : "Normal"
        }`,
        status: trail.status || "draft",
        imageUrl: resolvePublicAssetUrl(trail.cover_path),
      }));
    }

    if (itemForm.content_type === "course") {
      return courses.map((course) => ({
        id: course.id,
        label: course.title,
        description:
          course.short_description ||
          course.description ||
          "Curso cadastrado no ADM.",
        meta: `Curso • Rank ${course.required_rank} • ${
          course.is_featured ? "Destaque" : "Normal"
        }`,
        status: course.status,
        imageUrl: resolvePublicAssetUrl(course.cover_path),
      }));
    }

    if (itemForm.content_type === "live") {
      return lessons
        .filter(
          (lesson) =>
            lesson.content_type === "live" ||
            Boolean(lesson.scheduled_start_at)
        )
        .map((lesson) => {
          const course = moduleCourseMap.get(lesson.module_id);

          return {
            id: lesson.id,
            label: lesson.title,
            description:
              lesson.description ||
              (course
                ? `Live vinculada ao curso ${course.title}.`
                : "Live cadastrada no ADM."),
            meta: course ? `Live • ${course.title}` : "Live cadastrada em aulas",
            status: lesson.status,
            imageUrl: resolvePublicAssetUrl(lesson.primary_asset_path),
          };
        });
    }

    return lessons
      .filter(
        (lesson) =>
          lesson.content_type !== "live" && !Boolean(lesson.scheduled_start_at)
      )
      .map((lesson) => {
        const course = moduleCourseMap.get(lesson.module_id);

        return {
          id: lesson.id,
          label: lesson.title,
          description:
            lesson.description ||
            (course
              ? `Aula vinculada ao curso ${course.title}.`
              : "Aula cadastrada no ADM."),
          meta: course
            ? `Aula • ${course.title} • ${formatDuration(lesson.duration_sec)}`
            : `Aula • ${formatDuration(lesson.duration_sec)}`,
          status: lesson.status,
          imageUrl: resolvePublicAssetUrl(lesson.primary_asset_path),
        };
      });
  }, [courses, itemForm.content_type, lessons, moduleCourseMap, trails]);

  const selectedContent = useMemo(() => {
    return (
      availableContentOptions.find(
        (option) => option.id === itemForm.content_id
      ) ?? null
    );
  }, [availableContentOptions, itemForm.content_id]);

  useEffect(() => {
    const params = getUrlParams();

    setMode(params.tipo);
    setRecordId(params.id);
    setInitialSectionId(params.section);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMessage("");

      const [
        sectionsResponse,
        trailsResponse,
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
      ]);

      if (sectionsResponse.error) {
        setErrorMessage(
          `Erro ao carregar categorias: ${sectionsResponse.error.message}`
        );
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

      const loadedSections = (sectionsResponse.data ?? []) as HomeSection[];

      setSections(loadedSections);
      setTrails((trailsResponse.data ?? []) as TrailOption[]);
      setCourses((coursesResponse.data ?? []) as CourseOption[]);
      setModules((modulesResponse.data ?? []) as ModuleOption[]);
      setLessons((lessonsResponse.data ?? []) as LessonOption[]);

      if (!recordId) {
        setItemForm((current) => ({
          ...current,
          section_id: initialSectionId || loadedSections[0]?.id || "",
          content_type: current.content_type || "trail",
        }));
      }

      if (recordId && mode === "categoria") {
        const { data, error } = await supabase
          .from("student_home_sections")
          .select("*")
          .eq("id", recordId)
          .maybeSingle();

        if (error) {
          setErrorMessage(`Erro ao carregar categoria: ${error.message}`);
          setLoading(false);
          return;
        }

        if (data) {
          const section = data as HomeSection;

          setSectionForm({
            title: section.title,
            slug: section.slug,
            description: section.description ?? "",
            layout_variant: section.layout_variant,
            sort_order: String(section.sort_order ?? 0),
            is_active: section.is_active,
          });
        }
      }

      if (recordId && mode === "card") {
        const { data, error } = await supabase
          .from("student_home_section_items")
          .select("*")
          .eq("id", recordId)
          .maybeSingle();

        if (error) {
          setErrorMessage(`Erro ao carregar card: ${error.message}`);
          setLoading(false);
          return;
        }

        if (data) {
          const item = data as HomeSectionItem;

          setItemForm({
            section_id: item.section_id,
            content_type: item.content_type,
            content_id: item.content_id,
            title_override: item.title_override ?? "",
            subtitle_override: item.subtitle_override ?? "",
            badge_override: item.badge_override ?? "",
            sort_order: String(item.sort_order ?? 0),
            is_active: item.is_active,
          });
        }
      }

      setLoading(false);
    }

    loadData();
  }, [recordId, mode, initialSectionId, supabase]);

  function updateSectionField<K extends keyof SectionFormState>(
    field: K,
    value: SectionFormState[K]
  ) {
    setSectionForm((current) => {
      if (field === "title" && !isEditing) {
        return {
          ...current,
          title: value as string,
          slug: slugify(value as string),
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function updateItemField<K extends keyof ItemFormState>(
    field: K,
    value: ItemFormState[K]
  ) {
    setItemForm((current) => {
      if (field === "content_type") {
        return {
          ...current,
          content_type: value as ContentType,
          content_id: "",
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function selectContent(option: ContentOption) {
    setItemForm((current) => ({
      ...current,
      content_id: option.id,
    }));
  }

  async function handleSectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!sectionForm.title.trim()) {
      setErrorMessage("Informe o título da categoria.");
      setSaving(false);
      return;
    }

    const finalSlug = slugify(sectionForm.slug || sectionForm.title);

    if (!finalSlug) {
      setErrorMessage("Informe um slug válido para a categoria.");
      setSaving(false);
      return;
    }

    const payload = {
      title: sectionForm.title.trim(),
      slug: finalSlug,
      description: normalizeNullable(sectionForm.description),
      layout_variant: sectionForm.layout_variant,
      sort_order: Number(sectionForm.sort_order || 0),
      is_active: sectionForm.is_active,
    };

    if (isEditing) {
      const { error } = await supabase
        .from("student_home_sections")
        .update(payload)
        .eq("id", recordId);

      if (error) {
        setErrorMessage(`Erro ao atualizar categoria: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Categoria atualizada com sucesso.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("student_home_sections")
      .insert(payload);

    if (error) {
      setErrorMessage(`Erro ao cadastrar categoria: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Categoria cadastrada com sucesso.");
    setSectionForm(initialSectionForm);
    setSaving(false);
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!itemForm.section_id) {
      setErrorMessage("Selecione a categoria da home.");
      setSaving(false);
      return;
    }

    if (!itemForm.content_id) {
      setErrorMessage("Selecione um conteúdo disponível na listagem.");
      setSaving(false);
      return;
    }

    const payload = {
      section_id: itemForm.section_id,
      content_type: itemForm.content_type,
      content_id: itemForm.content_id,
      title_override: normalizeNullable(itemForm.title_override),
      subtitle_override: normalizeNullable(itemForm.subtitle_override),
      badge_override: normalizeNullable(itemForm.badge_override),
      image_url_override: null,
      target_url_override: null,
      sort_order: Number(itemForm.sort_order || 0),
      is_active: itemForm.is_active,
    };

    if (isEditing) {
      const { error } = await supabase
        .from("student_home_section_items")
        .update(payload)
        .eq("id", recordId);

      if (error) {
        setErrorMessage(`Erro ao atualizar card: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Card atualizado com sucesso.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("student_home_section_items")
      .insert(payload);

    if (error) {
      setErrorMessage(`Erro ao inserir card: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Card inserido na home com sucesso.");
    setItemForm({
      ...initialItemForm,
      section_id: itemForm.section_id,
    });
    setSaving(false);
  }

  const pageTitle =
    mode === "categoria"
      ? isEditing
        ? "Editar categoria"
        : "Nova categoria"
      : isEditing
        ? "Editar card"
        : "Inserir card";

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="mb-8">
        <Link
          href="/admin/home-aluno"
          className="mb-5 inline-flex items-center gap-2 text-[14px] font-semibold text-[#666b76] transition hover:text-[#141414]"
        >
          <ArrowLeft size={18} />
          Voltar para Categorias/Cards
        </Link>

        <span className="mb-3 inline-flex items-center rounded-full border border-[#DBC094]/35 bg-[#DBC094]/12 px-4 py-2 text-[14px] font-semibold text-[#8a6836]">
          Área do aluno
        </span>

        <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-[#141414] sm:text-[42px]">
          {pageTitle}
        </h1>

        <p className="mt-3 max-w-[760px] text-[16px] leading-7 text-[#666b76]">
          {mode === "categoria"
            ? "Configure uma fileira da home do aluno, definindo título, formato de card, ordem e status."
            : "Escolha uma trilha, curso, aula ou live já cadastrada no ADM para aparecer dentro de uma categoria da home do aluno."}
        </p>
      </div>

      {message ? (
        <div className="mb-5 flex items-center gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-semibold text-emerald-700">
          <CheckCircle2 size={20} />
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-5 rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-[14px] font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[460px] items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="flex items-center gap-3 text-[14px] font-semibold text-[#666b76]">
            <Loader2 size={18} className="animate-spin" />
            Carregando...
          </div>
        </div>
      ) : mode === "categoria" ? (
        <form
          onSubmit={handleSectionSubmit}
          className="rounded-[18px] border border-[#e5e5e5] bg-white p-5  sm:p-6"
        >
          <div className="grid gap-5">
            <label className="block">
              <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                Título da categoria *
              </span>
              <input
                type="text"
                value={sectionForm.title}
                onChange={(event) =>
                  updateSectionField("title", event.target.value)
                }
                placeholder="Ex: Trilhas recomendadas para você"
                className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                Slug
              </span>
              <input
                type="text"
                value={sectionForm.slug}
                onChange={(event) =>
                  updateSectionField("slug", slugify(event.target.value))
                }
                placeholder="trilhas-recomendadas"
                className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                Descrição interna
              </span>
              <textarea
                value={sectionForm.description}
                onChange={(event) =>
                  updateSectionField("description", event.target.value)
                }
                rows={4}
                placeholder="Descrição apenas para organização do ADM"
                className="w-full resize-none rounded-[14px] border border-[#e5e5e5] bg-white px-4 py-3 text-[15px] leading-6 text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Formato dos cards
                </span>
                <select
                  value={sectionForm.layout_variant}
                  onChange={(event) =>
                    updateSectionField(
                      "layout_variant",
                      event.target.value as LayoutVariant
                    )
                  }
                  className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition focus:border-[#DBC094]"
                >
                  <option value="vertical">Vertical</option>
                  <option value="featured">Destaque extragrande</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Ordem
                </span>
                <input
                  type="number"
                  value={sectionForm.sort_order}
                  onChange={(event) =>
                    updateSectionField("sort_order", event.target.value)
                  }
                  className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition focus:border-[#DBC094]"
                />
              </label>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-3">
              <div>
                <span className="block text-[14px] font-semibold text-[#52525b]">
                  Categoria ativa
                </span>
                <span className="mt-1 block text-[12px] text-[#8a8f9d]">
                  Categorias inativas não aparecem na área do aluno.
                </span>
              </div>

              <input
                type="checkbox"
                checked={sectionForm.is_active}
                onChange={(event) =>
                  updateSectionField("is_active", event.target.checked)
                }
                className="h-5 w-5 accent-[#DBC094]"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/home-aluno"
                className="inline-flex h-[52px] items-center justify-center rounded-[15px] border border-[#e5e5e5] bg-white px-5 text-[15px] font-bold text-[#52525b] transition hover:bg-[#f7f7f7]"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[15px] bg-[#DBC094] px-5 text-[15px] font-bold text-black transition hover:bg-[#cfb27a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isEditing ? (
                  <Save size={18} />
                ) : (
                  <Plus size={18} />
                )}
                {isEditing ? "Salvar alterações" : "Cadastrar categoria"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleItemSubmit}
          className="rounded-[18px] border border-[#e5e5e5] bg-white p-5  sm:p-6"
        >
          <div className="grid gap-5">
            <label className="block">
              <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                Categoria da home *
              </span>
              <select
                value={itemForm.section_id}
                onChange={(event) =>
                  updateItemField("section_id", event.target.value)
                }
                className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition focus:border-[#DBC094]"
              >
                <option value="">Selecione</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title} • {getLayoutLabel(section.layout_variant)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Tipo de conteúdo
                </span>
                <select
                  value={itemForm.content_type}
                  onChange={(event) =>
                    updateItemField(
                      "content_type",
                      event.target.value as ContentType
                    )
                  }
                  className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition focus:border-[#DBC094]"
                >
                  <option value="trail">Trilha</option>
                  <option value="course">Curso</option>
                  <option value="lesson">Aula</option>
                  <option value="live">Live</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Ordem
                </span>
                <input
                  type="number"
                  value={itemForm.sort_order}
                  onChange={(event) =>
                    updateItemField("sort_order", event.target.value)
                  }
                  className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition focus:border-[#DBC094]"
                />
              </label>
            </div>

            <div>
              <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                Listagem de conteúdos cadastrados *
              </span>

              <div className="mb-3 rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-3 text-[14px] font-semibold text-[#666b76]">
                {itemForm.content_type === "trail"
                  ? `${trails.length} trilha(s) encontrada(s)`
                  : itemForm.content_type === "course"
                    ? `${courses.length} curso(s) encontrado(s)`
                    : `${availableContentOptions.length} conteúdo(s) encontrado(s)`}
              </div>

              {selectedContent ? (
                <div className="mb-3 rounded-[18px] border border-[#DBC094]/50 bg-[#fffaf0] p-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8a6836]">
                    Conteúdo selecionado
                  </p>
                  <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-[#141414]">
                    {selectedContent.label}
                  </h3>
                  <p className="mt-1 text-[14px] leading-6 text-[#666b76]">
                    {selectedContent.meta}
                  </p>
                </div>
              ) : null}

              <div className="max-h-[520px] overflow-y-auto rounded-[18px] border border-[#e5e5e5] bg-white">
                {availableContentOptions.length === 0 ? (
                  <div className="m-3 rounded-[12px] border border-dashed border-[#e5e5e5] bg-white px-5 py-8 text-center">
                    <p className="text-[14px] font-semibold text-[#666b76]">
                      Nenhum conteúdo cadastrado para este tipo.
                    </p>

                    {itemForm.content_type === "trail" ? (
                      <p className="mt-2 text-[12px] font-medium leading-5 text-[#98a2b3]">
                        Nenhuma trilha foi encontrada na leitura autenticada de
                        course_categories.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="divide-y divide-[#e8eaf0]">
                    {availableContentOptions.map((option, index) => {
                      const selected = itemForm.content_id === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => selectContent(option)}
                          className={[
                            "grid w-full grid-cols-[42px_94px_1fr] gap-4 bg-white p-4 text-left transition hover:bg-[#fffaf0]",
                            selected ? "bg-[#fff6e7]" : "",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "mt-1 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-black",
                              selected
                                ? "border-[#DBC094] bg-[#DBC094] text-black"
                                : "border-[#e5e5e5] bg-white text-[#8a8f9d]",
                            ].join(" ")}
                          >
                            {selected ? "✓" : index + 1}
                          </div>

                          <div className="h-[70px] w-[94px] overflow-hidden rounded-[12px] bg-[#171a24]">
                            {option.imageUrl ? (
                              <img
                                src={option.imageUrl}
                                alt={option.label}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#202431] to-[#0f1118] text-[10px] font-bold text-white/48">
                                SEM CAPA
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-[#f4f4f5] px-2.5 py-1 text-[11px] font-bold text-[#596174]">
                                {getContentTypeLabel(itemForm.content_type)}
                              </span>

                              <span
                                className={[
                                  "rounded-full px-2.5 py-1 text-[11px] font-bold",
                                  option.status === "published"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700",
                                ].join(" ")}
                              >
                                {option.status}
                              </span>
                            </div>

                            <h4 className="text-[16px] font-semibold leading-tight tracking-[-0.03em] text-[#141414]">
                              {option.label}
                            </h4>

                            <p className="mt-1 line-clamp-2 text-[14px] leading-5 text-[#666b76]">
                              {option.description}
                            </p>

                            <p className="mt-2 text-[12px] font-semibold text-[#8a8f9d]">
                              {option.meta}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                Título alternativo
              </span>
              <input
                type="text"
                value={itemForm.title_override}
                onChange={(event) =>
                  updateItemField("title_override", event.target.value)
                }
                placeholder="Opcional. Se vazio, usa o título original."
                className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                Descrição alternativa
              </span>
              <textarea
                value={itemForm.subtitle_override}
                onChange={(event) =>
                  updateItemField("subtitle_override", event.target.value)
                }
                rows={4}
                placeholder="Opcional. Se vazio, usa a descrição original."
                className="w-full resize-none rounded-[14px] border border-[#e5e5e5] bg-white px-4 py-3 text-[15px] leading-6 text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                Selo alternativo
              </span>
              <input
                type="text"
                value={itemForm.badge_override}
                onChange={(event) =>
                  updateItemField("badge_override", event.target.value)
                }
                placeholder="Ex: Novo, Premium, Ao vivo"
                className="h-12 w-full rounded-[14px] border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-3">
              <div>
                <span className="block text-[14px] font-semibold text-[#52525b]">
                  Card ativo
                </span>
                <span className="mt-1 block text-[12px] text-[#8a8f9d]">
                  Cards inativos não aparecem na home do aluno.
                </span>
              </div>

              <input
                type="checkbox"
                checked={itemForm.is_active}
                onChange={(event) =>
                  updateItemField("is_active", event.target.checked)
                }
                className="h-5 w-5 accent-[#DBC094]"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/home-aluno"
                className="inline-flex h-[52px] items-center justify-center rounded-[15px] border border-[#e5e5e5] bg-white px-5 text-[15px] font-bold text-[#52525b] transition hover:bg-[#f7f7f7]"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[15px] bg-[#141414] px-5 text-[15px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isEditing ? (
                  <Save size={18} />
                ) : (
                  <Plus size={18} />
                )}
                {isEditing ? "Salvar alterações" : "Inserir card"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}