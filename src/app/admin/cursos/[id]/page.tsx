"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock3,
  FolderKanban,
  GraduationCap,
  Image as ImageIcon,
  Layers3,
  Loader2,
  PencilLine,
  PlayCircle,
  RefreshCcw,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type StatusGeral = "draft" | "published" | "archived" | string;
type StatusCurso = "draft" | "published" | "archived";
type PreferredCardFormat = "vertical" | "horizontal" | "featured";

type Curso = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  preferred_card_format: PreferredCardFormat | null;
  status: StatusGeral;
  required_rank: number;
  is_featured: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type TrilhaOption = {
  id: string;
  title: string;
  slug: string;
};

type CourseCategoryMap = {
  course_id: string;
  category_id: string;
};

type Modulo = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: StatusGeral;
  created_at: string;
  updated_at: string;
};

type Aula = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: StatusGeral;
  content_type: string;
  video_provider: string | null;
  video_url: string | null;
  duration_sec: number | null;
  is_preview: boolean;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

type PaginaProps = {
  params: Promise<{
    id: string;
  }>;
};

type EditCourseFormState = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  status: StatusCurso;
  requiredRank: string;
  isFeatured: boolean;
  trilhaId: string;
  preferredCardFormat: PreferredCardFormat;
};

type CoverState = {
  file: File | null;
  previewUrl: string | null;
};

const COURSE_COVERS_BUCKET = "covers";
const COURSE_COVERS_FOLDER = "courses";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function gerarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function traduzirStatus(status: StatusGeral) {
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

function statusClasses(status: StatusGeral) {
  switch (status) {
    case "published":
      return "border-[#e2d2b6] bg-[#f3eee5] text-[#8a6836]";
    case "draft":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "archived":
      return "border-[#e5e5e5] bg-[#f4f4f5] text-[#52525b]";
    default:
      return "border-[#e5e5e5] bg-[#f4f4f5] text-[#52525b]";
  }
}

function traduzirFormato(format: PreferredCardFormat | null | undefined) {
  if (format === "horizontal") return "Horizontal";
  if (format === "featured") return "Vertical grande";
  return "Vertical";
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

function formatarDuracao(segundos: number | null) {
  if (!segundos || segundos <= 0) return "—";

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segundosRestantes = segundos % 60;

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, "0")}min`;
  }

  if (minutos > 0) {
    return `${minutos}min`;
  }

  return `${segundosRestantes}s`;
}

function formatarTamanho(bytes: number) {
  if (!bytes || bytes <= 0) return "—";

  const unidades = ["B", "KB", "MB", "GB"];
  let valor = bytes;
  let indice = 0;

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }

  return `${valor.toFixed(valor >= 10 || indice === 0 ? 0 : 1)} ${
    unidades[indice]
  }`;
}

function resumoCurso(curso: Curso | null) {
  if (!curso) return "";

  return (
    curso.short_description?.trim() ||
    curso.description?.trim() ||
    "Sem descrição cadastrada para este curso."
  );
}

function traduzirErroBanco(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("row-level security")) {
    return "Seu usuário não tem permissão para salvar este conteúdo.";
  }

  if (texto.includes("duplicate key value") || texto.includes("unique")) {
    return "Já existe um curso com este identificador. Altere o slug e tente novamente.";
  }

  if (texto.includes("violates foreign key constraint")) {
    return "Não foi possível vincular o curso à trilha selecionada.";
  }

  if (texto.includes("bucket")) {
    return "Não foi possível enviar a capa do curso.";
  }

  return mensagem;
}

function getFileExtension(fileName: string) {
  const partes = fileName.split(".");
  return partes.length > 1 ? partes.pop()!.toLowerCase() : "";
}

function buildCoverStoragePath(
  slug: string,
  file: File,
  format: PreferredCardFormat
) {
  const ext = getFileExtension(file.name) || "bin";
  const safeSlug = gerarSlug(slug || "curso");
  const uniqueId = crypto.randomUUID();

  return `${COURSE_COVERS_FOLDER}/${safeSlug}-${format}-${uniqueId}.${ext}`;
}

function getFormatConfig(format: PreferredCardFormat) {
  if (format === "horizontal") {
    return {
      label: "Capa horizontal",
      description:
        "Use este formato para cards horizontais, como fileiras largas ou conteúdos em formato paisagem.",
      helper: "Recomendado: 1600x900 ou proporção 16:9.",
      previewClass: "h-28 w-44",
    };
  }

  if (format === "featured") {
    return {
      label: "Capa vertical grande",
      description:
        "Use este formato apenas para cursos que entrarão em seções de Destaque extragrande.",
      helper: "Recomendado: 900x1350 ou proporção 2:3.",
      previewClass: "h-36 w-24",
    };
  }

  return {
    label: "Capa vertical",
    description:
      "Use este formato para cards verticais normais, como Trilhas recomendadas.",
    helper: "Recomendado: 900x1200 ou proporção 3:4.",
    previewClass: "h-36 w-24",
  };
}

function getCourseCoverByFormat(curso: Curso | null) {
  if (!curso) return null;

  if (curso.preferred_card_format === "horizontal") {
    return curso.cover_horizontal_path || curso.cover_path;
  }

  if (curso.preferred_card_format === "featured") {
    return curso.cover_featured_path || curso.cover_path;
  }

  return curso.cover_vertical_path || curso.cover_path;
}

function getPublicCoverUrl(path: string | null) {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.replace(/^\/+/, "");

  if (cleanPath.startsWith("public/")) {
    return `/${cleanPath.replace(/^public\//, "")}`;
  }

  const supabase = supabaseBrowser();
  const { data } = supabase.storage
    .from(COURSE_COVERS_BUCKET)
    .getPublicUrl(cleanPath);

  return data.publicUrl;
}

function buildEditFormFromCourse(
  curso: Curso,
  selectedCategoryId: string
): EditCourseFormState {
  return {
    title: curso.title ?? "",
    slug: curso.slug ?? "",
    shortDescription: curso.short_description ?? "",
    description: curso.description ?? "",
    status: ((curso.status as StatusCurso) || "draft") as StatusCurso,
    requiredRank: String(curso.required_rank ?? 0),
    isFeatured: Boolean(curso.is_featured),
    trilhaId: selectedCategoryId,
    preferredCardFormat: curso.preferred_card_format || "vertical",
  };
}

export default function AdminCursoDetalhePage({ params }: PaginaProps) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [cursoId, setCursoId] = useState<string>("");
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [trilhas, setTrilhas] = useState<TrilhaOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editandoCurso, setEditandoCurso] = useState(false);
  const [salvandoCurso, setSalvandoCurso] = useState(false);
  const [erroEditarCurso, setErroEditarCurso] = useState<string | null>(null);
  const [mensagemCurso, setMensagemCurso] = useState<string | null>(null);

  const [formCurso, setFormCurso] = useState<EditCourseFormState>({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    status: "draft",
    requiredRank: "0",
    isFeatured: false,
    trilhaId: "",
    preferredCardFormat: "vertical",
  });

  const [cover, setCover] = useState<CoverState>({
    file: null,
    previewUrl: null,
  });

  useEffect(() => {
    return () => {
      if (cover.previewUrl) {
        URL.revokeObjectURL(cover.previewUrl);
      }
    };
  }, [cover.previewUrl]);

  useEffect(() => {
    let ativo = true;

    async function resolverParams() {
      const resolved = await params;
      if (!ativo) return;
      setCursoId(resolved.id);
    }

    void resolverParams();

    return () => {
      ativo = false;
    };
  }, [params]);

  async function carregarEstrutura(id: string) {
    if (!id) return;

    setCarregando(true);
    setErro(null);
    setMensagemCurso(null);

    try {
      const { data: cursoData, error: cursoError } = await supabase
        .from("courses")
        .select(
          [
            "id",
            "slug",
            "title",
            "short_description",
            "description",
            "cover_path",
            "cover_vertical_path",
            "cover_horizontal_path",
            "cover_featured_path",
            "preferred_card_format",
            "status",
            "required_rank",
            "is_featured",
            "published_at",
            "created_by",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .eq("id", id)
        .maybeSingle();

      if (cursoError) throw cursoError;
      if (!cursoData) throw new Error("Curso não encontrado.");

      const { data: trilhasData, error: trilhasError } = await supabase
        .from("course_categories")
        .select("id, title, slug")
        .order("title", { ascending: true });

      if (trilhasError) throw trilhasError;

      const { data: mapData, error: mapError } = await supabase
        .from("course_category_map")
        .select("course_id, category_id")
        .eq("course_id", id);

      if (mapError) throw mapError;

      const { data: modulosData, error: modulosError } = await supabase
        .from("course_modules")
        .select(
          [
            "id",
            "course_id",
            "title",
            "description",
            "sort_order",
            "status",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .eq("course_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (modulosError) throw modulosError;

      const modulosNormalizados = (((modulosData ?? []) as unknown as Modulo[])).map(
        (modulo) => ({
          ...modulo,
          sort_order: Number(modulo.sort_order ?? 0),
        })
      );

      const moduloIds = modulosNormalizados.map((modulo) => modulo.id);

      let aulasNormalizadas: Aula[] = [];

      if (moduloIds.length > 0) {
        const { data: aulasData, error: aulasError } = await supabase
          .from("lessons")
          .select(
            [
              "id",
              "module_id",
              "title",
              "description",
              "sort_order",
              "status",
              "content_type",
              "video_provider",
              "video_url",
              "duration_sec",
              "is_preview",
              "released_at",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .in("module_id", moduloIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (aulasError) throw aulasError;

        aulasNormalizadas = (((aulasData ?? []) as unknown as Aula[])).map((aula) => ({
          ...aula,
          sort_order: Number(aula.sort_order ?? 0),
          duration_sec:
            aula.duration_sec === null ? null : Number(aula.duration_sec),
        }));
      }

      const cursoNormalizado = cursoData as unknown as Curso;
      const mapsNormalizados = ((mapData ?? []) as unknown as CourseCategoryMap[]);
      const categoryId = mapsNormalizados[0]?.category_id || "";

      setCurso(cursoNormalizado);
      setTrilhas(((trilhasData ?? []) as unknown as TrilhaOption[]));
      setSelectedCategoryId(categoryId);
      setModulos(modulosNormalizados);
      setAulas(aulasNormalizadas);

      if (editandoCurso) {
        setFormCurso(buildEditFormFromCourse(cursoNormalizado, categoryId));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a estrutura do curso.";

      setErro(message);
      setCurso(null);
      setModulos([]);
      setAulas([]);
      setTrilhas([]);
      setSelectedCategoryId("");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (!cursoId) return;
    void carregarEstrutura(cursoId);
  }, [cursoId, supabase]);

  const aulasPorModulo = useMemo(() => {
    const mapa = new Map<string, Aula[]>();

    for (const aula of aulas) {
      const grupoAtual = mapa.get(aula.module_id) ?? [];
      grupoAtual.push(aula);
      mapa.set(aula.module_id, grupoAtual);
    }

    return mapa;
  }, [aulas]);

  const totalModulos = modulos.length;
  const totalAulas = aulas.length;
  const totalAulasPublicadas = aulas.filter(
    (aula) => aula.status === "published"
  ).length;
  const totalAulasPreview = aulas.filter((aula) => aula.is_preview).length;

  const currentCoverPath = getCourseCoverByFormat(curso);
  const currentCoverUrl = getPublicCoverUrl(currentCoverPath);
  const formatConfig = getFormatConfig(formCurso.preferredCardFormat);

  function abrirEdicaoCurso() {
    if (!curso) return;

    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    setCover({
      file: null,
      previewUrl: null,
    });

    setErroEditarCurso(null);
    setMensagemCurso(null);
    setFormCurso(buildEditFormFromCourse(curso, selectedCategoryId));
    setEditandoCurso(true);
  }

  function fecharEdicaoCurso() {
    if (salvandoCurso) return;

    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    setCover({
      file: null,
      previewUrl: null,
    });

    setEditandoCurso(false);
    setErroEditarCurso(null);
  }

  function updateCourseField<K extends keyof EditCourseFormState>(
    field: K,
    value: EditCourseFormState[K]
  ) {
    setFormCurso((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleChangeFormat(value: PreferredCardFormat) {
    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    setCover({
      file: null,
      previewUrl: null,
    });

    setFormCurso((current) => ({
      ...current,
      preferredCardFormat: value,
    }));

    setErroEditarCurso(null);
  }

  function handleSelecionarCapa(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0] ?? null;

    if (!arquivo) return;

    const tiposPermitidos = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErroEditarCurso("Envie uma imagem válida em PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    const preview = URL.createObjectURL(arquivo);

    setCover({
      file: arquivo,
      previewUrl: preview,
    });

    setErroEditarCurso(null);
    event.target.value = "";
  }

  function removerCapaSelecionada() {
    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    setCover({
      file: null,
      previewUrl: null,
    });
  }

  function validarEdicaoCurso() {
    if (!formCurso.title.trim()) {
      return "Informe o nome do curso.";
    }

    const slugFinal = gerarSlug(formCurso.slug || formCurso.title);

    if (!slugFinal) {
      return "Informe um identificador válido para o curso.";
    }

    const rank = Number(formCurso.requiredRank);

    if (Number.isNaN(rank) || rank < 0) {
      return "Informe um rank mínimo válido.";
    }

    return null;
  }

  async function uploadCoverIfNeeded(slug: string): Promise<string | null> {
    if (!cover.file) return null;

    const storagePath = buildCoverStoragePath(
      slug,
      cover.file,
      formCurso.preferredCardFormat
    );

    const { error } = await supabase.storage
      .from(COURSE_COVERS_BUCKET)
      .upload(storagePath, cover.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: cover.file.type,
      });

    if (error) throw error;

    return storagePath;
  }

  async function salvarEdicaoCurso(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!curso) return;

    const erroValidacao = validarEdicaoCurso();
    if (erroValidacao) {
      setErroEditarCurso(erroValidacao);
      return;
    }

    setSalvandoCurso(true);
    setErroEditarCurso(null);
    setMensagemCurso(null);

    let uploadedCoverPath: string | null = null;

    try {
      const slugFinal = gerarSlug(formCurso.slug || formCurso.title);
      uploadedCoverPath = await uploadCoverIfNeeded(slugFinal);

      const existingCoverPath =
        uploadedCoverPath || getCourseCoverByFormat(curso) || curso.cover_path;

      const coverVerticalPath =
        formCurso.preferredCardFormat === "vertical" ? existingCoverPath : null;

      const coverHorizontalPath =
        formCurso.preferredCardFormat === "horizontal"
          ? existingCoverPath
          : null;

      const coverFeaturedPath =
        formCurso.preferredCardFormat === "featured" ? existingCoverPath : null;

      const payload = {
        title: formCurso.title.trim(),
        slug: slugFinal,
        short_description: formCurso.shortDescription.trim() || null,
        description: formCurso.description.trim() || null,
        status: formCurso.status,
        required_rank: Number(formCurso.requiredRank),
        is_featured: formCurso.isFeatured,
        preferred_card_format: formCurso.preferredCardFormat,
        cover_path: existingCoverPath,
        cover_vertical_path: coverVerticalPath,
        cover_horizontal_path: coverHorizontalPath,
        cover_featured_path: coverFeaturedPath,
        published_at:
          formCurso.status === "published"
            ? curso.published_at || new Date().toISOString()
            : null,
      };

      const { error: updateError } = await supabase
        .from("courses")
        .update(payload)
        .eq("id", curso.id);

      if (updateError) throw updateError;

      const { error: deleteMapError } = await supabase
        .from("course_category_map")
        .delete()
        .eq("course_id", curso.id);

      if (deleteMapError) throw deleteMapError;

      if (formCurso.trilhaId) {
        const { error: insertMapError } = await supabase
          .from("course_category_map")
          .insert({
            course_id: curso.id,
            category_id: formCurso.trilhaId,
          });

        if (insertMapError) throw insertMapError;
      }

      setEditandoCurso(false);
      setMensagemCurso("Curso atualizado com sucesso.");

      if (cover.previewUrl) {
        URL.revokeObjectURL(cover.previewUrl);
      }

      setCover({
        file: null,
        previewUrl: null,
      });

      await carregarEstrutura(curso.id);
    } catch (error) {
      if (uploadedCoverPath) {
        await supabase.storage
          .from(COURSE_COVERS_BUCKET)
          .remove([uploadedCoverPath]);
      }

      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar as alterações do curso.";

      setErroEditarCurso(mensagem);
    } finally {
      setSalvandoCurso(false);
    }
  }

  return (
    <div className="space-y-7 text-[#141414]">
      <div className="flex w-full flex-col gap-7">
        <section className="border-b border-[#e5e5e5] pb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
                <Link
                  href="/admin/cursos"
                  className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-[#666b76] transition hover:text-[#141414]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para trilhas e cursos
                </Link>

                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
                  Gerenciamento do curso
                </p>

                <h1 className="text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
                  {carregando ? "Carregando curso..." : curso?.title ?? "Curso"}
                </h1>

                <p className="mt-3 max-w-3xl text-[15px] leading-6 text-[#5d6472]">
                  {carregando
                    ? "Buscando dados reais do curso, módulos e aulas."
                    : resumoCurso(curso)}
                </p>

                {!carregando && curso ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={cx(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium",
                        statusClasses(curso.status)
                      )}
                    >
                      {traduzirStatus(curso.status)}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[12px] font-medium text-[#8a6836]">
                      <ShieldCheck className="h-3 w-3" />
                      Rank mínimo {curso.required_rank}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full border border-[#e5e5e5] bg-white px-2.5 py-1 text-[12px] font-medium text-[#52525b]">
                      <ImageIcon className="h-3 w-3" />
                      {traduzirFormato(curso.preferred_card_format)}
                    </span>

                    {curso.is_featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[12px] font-semibold text-[#8a6836]">
                        <Star className="h-3 w-3" />
                        Destaque
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void carregarEstrutura(cursoId)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar
                </button>

                <button
                  type="button"
                  onClick={abrirEdicaoCurso}
                  disabled={!curso || carregando}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PencilLine className="h-4 w-4" />
                  Editar curso
                </button>

                <Link
                  href={`/admin/cursos/${cursoId}/modulos`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
                >
                  <Layers3 className="h-4 w-4" />
                  Gerenciar módulos
                </Link>
              </div>
            </div>

            {mensagemCurso ? (
              <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-4 text-[14px] font-semibold text-emerald-700">
                {mensagemCurso}
              </div>
            ) : null}

            {!carregando && curso ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoPill
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Slug"
                  value={curso.slug}
                />
                <InfoPill
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Publicado em"
                  value={formatarData(curso.published_at)}
                />
                <InfoPill
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Atualizado em"
                  value={formatarData(curso.updated_at)}
                />
                <InfoPill
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Identificador"
                  value={curso.id}
                />
              </div>
            ) : null}
        </section>

        {editandoCurso && curso ? (
          <section className="rounded-[12px] border border-[#e5e5e5] bg-white ">
            <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] p-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-3 py-1 text-[12px] font-medium uppercase tracking-[0.18em] text-[#8a6836]">
                  <PencilLine className="h-3.5 w-3.5" />
                  Edição completa
                </div>

                <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                  Editar curso
                </h2>

                <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[#666b76]">
                  Ajuste todas as informações do curso, vincule uma trilha,
                  troque o modelo de capa e salve para sobrescrever o cadastro
                  atual.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharEdicaoCurso}
                disabled={salvandoCurso}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#666b76] transition hover:bg-white hover:text-[#141414] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoCurso} className="p-5">
              <div className="grid grid-cols-1 gap-6">
                {erroEditarCurso ? (
                  <div className="rounded-[12px] border border-rose-200 bg-rose-50 p-4">
                    <h3 className="text-[14px] font-semibold text-rose-700">
                      Não foi possível salvar o curso
                    </h3>
                    <p className="mt-2 text-[14px] leading-6 text-rose-600">
                      {erroEditarCurso}
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-12">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Nome do curso
                    </label>
                    <input
                      type="text"
                      value={formCurso.title}
                      onChange={(event) =>
                        updateCourseField("title", event.target.value)
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    />
                  </div>

                  <div className="xl:col-span-12">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Identificador do curso
                    </label>
                    <input
                      type="text"
                      value={formCurso.slug}
                      onChange={(event) =>
                        updateCourseField("slug", gerarSlug(event.target.value))
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    />
                  </div>

                  <div className="xl:col-span-12">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Trilha vinculada
                    </label>

                    <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                      <select
                        value={formCurso.trilhaId}
                        onChange={(event) =>
                          updateCourseField("trilhaId", event.target.value)
                        }
                        className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                      >
                        <option value="">Sem trilha</option>
                        {trilhas.map((trilha) => (
                          <option key={trilha.id} value={trilha.id}>
                            {trilha.title}
                          </option>
                        ))}
                      </select>

                      <p className="mt-3 text-[14px] leading-6 text-[#666b76]">
                        Altere a trilha vinculada ao curso ou deixe sem trilha.
                      </p>
                    </div>
                  </div>

                  <div className="xl:col-span-12">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Modelo de capa do curso
                    </label>

                    <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                      <p className="mb-4 text-[14px] leading-6 text-[#666b76]">
                        Selecione apenas um modelo de capa. Ao trocar o modelo,
                        uma nova imagem selecionada anteriormente será removida
                        para evitar múltiplas capas ativas no mesmo cadastro.
                      </p>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                        {(
                          [
                            {
                              value: "vertical",
                              title: "Vertical",
                              description:
                                "Para cards verticais normais, como Trilhas recomendadas.",
                            },
                            {
                              value: "horizontal",
                              title: "Horizontal",
                              description:
                                "Para cards horizontais, como fileiras largas.",
                            },
                            {
                              value: "featured",
                              title: "Vertical grande",
                              description:
                                "Somente para seções de Destaque extragrande.",
                            },
                          ] as Array<{
                            value: PreferredCardFormat;
                            title: string;
                            description: string;
                          }>
                        ).map((option) => {
                          const selected =
                            formCurso.preferredCardFormat === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleChangeFormat(option.value)}
                              className={cx(
                                "rounded-[12px] border p-4 text-left transition",
                                selected
                                  ? "border-[#DBC094] bg-[#f3eee5] "
                                  : "border-[#e5e5e5] bg-white hover:border-[#DBC094]"
                              )}
                            >
                              <span
                                className={cx(
                                  "mb-3 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-semibold",
                                  selected
                                    ? "border-[#DBC094] bg-[#DBC094] text-black"
                                    : "border-[#e5e5e5] bg-white text-[#666b76]"
                                )}
                              >
                                {selected ? "✓" : ""}
                              </span>

                              <strong className="block text-[14px] font-semibold text-[#141414]">
                                {option.title}
                              </strong>
                              <span className="mt-1 block text-[14px] leading-6 text-[#666b76]">
                                {option.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-12">
                    <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                      <div className="mb-4">
                        <label className="block text-[14px] font-semibold text-[#52525b]">
                          {formatConfig.label}
                        </label>
                        <p className="mt-1 text-[14px] leading-6 text-[#666b76]">
                          {formatConfig.description}
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-[#8a8f9d]">
                          {formatConfig.helper}
                        </p>
                      </div>

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div
                            className={cx(
                              "flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-white",
                              formatConfig.previewClass
                            )}
                          >
                            {cover.previewUrl ? (
                              <img
                                src={cover.previewUrl}
                                alt={`Prévia ${formatConfig.label}`}
                                className="h-full w-full object-cover"
                              />
                            ) : currentCoverUrl ? (
                              <img
                                src={currentCoverUrl}
                                alt="Capa atual do curso"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-[#8a8f9d]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[#141414]">
                              {cover.file
                                ? cover.file.name
                                : currentCoverPath
                                ? "Capa atual cadastrada"
                                : "Nenhuma capa cadastrada"}
                            </p>

                            <p className="mt-1 text-[14px] leading-6 text-[#666b76]">
                              {cover.file
                                ? `${cover.file.type || "Tipo não identificado"} • ${formatarTamanho(
                                    cover.file.size
                                  )}`
                                : currentCoverPath || "Envie uma capa para este formato."}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#e2d2b6] bg-[#DBC094] px-4 py-2.5 text-[14px] font-semibold text-black transition hover:brightness-[1.02]">
                            <Upload className="h-4 w-4" />
                            {currentCoverPath || cover.file
                              ? "Substituir capa"
                              : "Enviar capa"}
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                              onChange={handleSelecionarCapa}
                              className="hidden"
                            />
                          </label>

                          {cover.file ? (
                            <button
                              type="button"
                              onClick={removerCapaSelecionada}
                              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-[14px] font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remover seleção
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-12">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Descrição curta
                    </label>
                    <input
                      type="text"
                      value={formCurso.shortDescription}
                      onChange={(event) =>
                        updateCourseField(
                          "shortDescription",
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    />
                  </div>

                  <div className="xl:col-span-12">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Descrição completa
                    </label>
                    <textarea
                      rows={6}
                      value={formCurso.description}
                      onChange={(event) =>
                        updateCourseField("description", event.target.value)
                      }
                      className="w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-3 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    />
                  </div>

                  <div className="xl:col-span-4">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Rank mínimo exigido
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formCurso.requiredRank}
                      onChange={(event) =>
                        updateCourseField("requiredRank", event.target.value)
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    />
                  </div>

                  <div className="xl:col-span-4">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Status visual
                    </label>
                    <select
                      value={formCurso.status}
                      onChange={(event) =>
                        updateCourseField(
                          "status",
                          event.target.value as StatusCurso
                        )
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="published">Publicado</option>
                      <option value="archived">Arquivado</option>
                    </select>
                  </div>

                  <div className="xl:col-span-4">
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Exibição
                    </label>
                    <label className="flex min-h-12 items-start gap-3 rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                      <input
                        type="checkbox"
                        checked={formCurso.isFeatured}
                        onChange={(event) =>
                          updateCourseField("isFeatured", event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-[#e5e5e5] text-[#8a6836] focus:ring-[#DBC094]"
                      />

                      <span className="block">
                        <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#141414]">
                          <Star className="h-4 w-4 text-[#8a6836]" />
                          Marcar como destaque
                        </span>
                        <span className="mt-1 block text-[14px] leading-6 text-[#666b76]">
                          Este campo ajuda a organizar a prioridade de exibição
                          no sistema.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={fecharEdicaoCurso}
                    disabled={salvandoCurso}
                    className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={salvandoCurso}
                    className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#e2d2b6] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {salvandoCurso ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {salvandoCurso ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Módulos"
            value={String(totalModulos).padStart(2, "0")}
            icon={<Layers3 className="h-5 w-5" />}
            iconTone="gold"
          />
          <MetricCard
            title="Aulas"
            value={String(totalAulas).padStart(2, "0")}
            icon={<PlayCircle className="h-5 w-5" />}
            iconTone="blue"
          />
          <MetricCard
            title="Aulas publicadas"
            value={String(totalAulasPublicadas).padStart(2, "0")}
            icon={<BookOpen className="h-5 w-5" />}
            iconTone="violet"
          />
          <MetricCard
            title="Prévias"
            value={String(totalAulasPreview).padStart(2, "0")}
            icon={<PlayCircle className="h-5 w-5" />}
            iconTone="goldSoft"
          />
        </section>

        <section className="rounded-[12px] border border-[#e5e5e5] bg-white ">
          <div className="border-b border-[#e5e5e5] p-5">
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
              Estrutura do curso
            </h2>
            <p className="mt-2 text-[14px] text-[#666b76]">
              Visualização real da hierarquia do curso com módulos e aulas.
            </p>
          </div>

          {erro ? (
            <div className="p-6">
              <div className="rounded-[12px] border border-rose-200 bg-rose-50 p-5">
                <h3 className="text-[14px] font-semibold text-rose-700">
                  Erro ao carregar estrutura
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-rose-600">{erro}</p>
              </div>
            </div>
          ) : carregando ? (
            <div className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[12px] border border-[#e5e5e5] bg-white p-5"
                  >
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-40 rounded bg-[#E9EDF3]" />
                      <div className="h-3 w-72 rounded bg-[#EEF2F6]" />
                      <div className="h-3 w-56 rounded bg-[#EEF2F6]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : modulos.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 rounded-full border border-[#e5e5e5] bg-white p-4">
                <FolderKanban className="h-6 w-6 text-[#8a8f9d]" />
              </div>
              <h3 className="text-base font-semibold text-[#141414]">
                Nenhum módulo cadastrado
              </h3>
              <p className="mt-2 max-w-md text-[14px] text-[#666b76]">
                Este curso ainda não possui módulos cadastrados no banco.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EEF1F5]">
              {modulos.map((modulo, moduloIndex) => {
                const aulasDoModulo = aulasPorModulo.get(modulo.id) ?? [];

                return (
                  <article key={modulo.id} className="p-5">
                    <div className="rounded-[12px] border border-[#e5e5e5] bg-white">
                      <div className="flex flex-col gap-4 border-b border-[#e5e5e5] p-5 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[11px] font-semibold text-[#8a6836]">
                              Módulo {moduloIndex + 1}
                            </span>

                            <span
                              className={cx(
                                "inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium",
                                statusClasses(modulo.status)
                              )}
                            >
                              {traduzirStatus(modulo.status)}
                            </span>
                          </div>

                          <h3 className="mt-3 text-[17px] font-semibold text-[#141414]">
                            {modulo.title}
                          </h3>

                          <p className="mt-2 text-[14px] leading-6 text-[#666b76]">
                            {modulo.description?.trim() ||
                              "Sem descrição cadastrada para este módulo."}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#666b76]">
                          <span className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5">
                            Ordem {modulo.sort_order}
                          </span>
                          <span className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5">
                            {aulasDoModulo.length} aula(s)
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        {aulasDoModulo.length === 0 ? (
                          <div className="rounded-[12px] border border-dashed border-[#e5e5e5] bg-white px-4 py-5 text-[14px] text-[#666b76]">
                            Este módulo ainda não possui aulas cadastradas.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {aulasDoModulo.map((aula, aulaIndex) => (
                              <div
                                key={aula.id}
                                className="rounded-[12px] border border-[#e5e5e5] bg-white p-4"
                              >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="inline-flex items-center rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[11px] font-medium text-[#8a6836]">
                                        Aula {aulaIndex + 1}
                                      </span>

                                      <span
                                        className={cx(
                                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium",
                                          statusClasses(aula.status)
                                        )}
                                      >
                                        {traduzirStatus(aula.status)}
                                      </span>

                                      {aula.is_preview ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[11px] font-semibold text-[#8a6836]">
                                          <PlayCircle className="h-3 w-3" />
                                          Prévia
                                        </span>
                                      ) : null}
                                    </div>

                                    <h4 className="mt-3 text-base font-semibold text-[#141414]">
                                      {aula.title}
                                    </h4>

                                    <p className="mt-2 text-[14px] leading-6 text-[#666b76]">
                                      {aula.description?.trim() ||
                                        "Sem descrição cadastrada para esta aula."}
                                    </p>
                                  </div>

                                  <div className="grid min-w-[220px] grid-cols-2 gap-2 text-[12px] text-[#666b76]">
                                    <MiniInfo
                                      label="Tipo"
                                      value={aula.content_type || "—"}
                                    />
                                    <MiniInfo
                                      label="Ordem"
                                      value={String(aula.sort_order)}
                                    />
                                    <MiniInfo
                                      label="Duração"
                                      value={formatarDuracao(aula.duration_sec)}
                                    />
                                    <MiniInfo
                                      label="Liberação"
                                      value={formatarData(aula.released_at)}
                                    />
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  {aula.video_provider ? (
                                    <span className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5 text-[12px] font-medium text-[#52525b]">
                                      Provedor: {aula.video_provider}
                                    </span>
                                  ) : null}

                                  {aula.video_url ? (
                                    <span className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5 text-[12px] font-medium text-[#52525b]">
                                      Vídeo configurado
                                    </span>
                                  ) : null}

                                  <Link
                                    href={`/admin/cursos/${cursoId}/modulos`}
                                    className="inline-flex items-center gap-1 rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#52525b] transition hover:bg-white"
                                  >
                                    Abrir gestão
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  iconTone: "gold" | "violet" | "blue" | "goldSoft";
};

function MetricCard({ title, value, icon, iconTone }: MetricCardProps) {
  const tones = {
    gold: "bg-[#F8EFE0] text-[#8a6836]",
    violet: "bg-[#EFE9FB] text-[#6F4AA7]",
    blue: "bg-[#EAF3FB] text-[#4C84B8]",
    goldSoft: "bg-[#F5EEDC] text-[#9F7A28]",
  };

  return (
    <article className="rounded-[12px] border border-[#e5e5e5] bg-white p-5 ">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#666b76]">{title}</p>
          <p className="mt-4 text-5xl font-semibold tracking-[-0.03em] text-[#141414]">
            {value}
          </p>
        </div>

        <div className={cx("rounded-full p-4", tones[iconTone])}>{icon}</div>
      </div>
    </article>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[#f3eee5] p-2 text-[#8a6836]">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#8a8f9d]">
            {label}
          </p>
          <p className="mt-2 truncate text-[14px] font-semibold text-[#141414]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[#e5e5e5] bg-white px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a8f9d]">
        {label}
      </p>
      <p className="mt-1 text-[14px] font-semibold text-[#141414]">{value}</p>
    </div>
  );
}