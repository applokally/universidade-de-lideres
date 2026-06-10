"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Search,
  ChevronRight,
  Network,
  LibraryBig,
  FolderKanban,
  RefreshCcw,
  Star,
  Clock3,
  ShieldCheck,
  Layers3,
  FolderTree,
  Eye,
  Image as ImageIcon,
  PencilLine,
  Trash2,
  Upload,
  X,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type StatusCurso = "draft" | "published" | "archived" | string;
type StatusTrilha = "draft" | "published" | "archived";
type PreferredCardFormat = "vertical" | "horizontal" | "featured";
type CoverKind = "vertical" | "horizontal" | "featured";

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

type Trilha = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  preferred_card_format: PreferredCardFormat | null;
  required_rank: number | null;
  status: StatusTrilha | null;
  is_featured: boolean | null;
  created_at: string;
  updated_at: string;
};

type CursoTrilhaMap = {
  course_id: string;
  category_id: string;
};

type EditarTrilhaForm = {
  title: string;
  slug: string;
  description: string;
  status: StatusTrilha;
  requiredRank: string;
  isFeatured: boolean;
  preferredCardFormat: PreferredCardFormat;
};

type CoverState = {
  file: File | null;
  previewUrl: string | null;
};

type CoversState = Record<CoverKind, CoverState>;

const TRAIL_COVERS_BUCKET = "covers";
const TRAIL_COVERS_FOLDER = "trilhas";

const filtros = [
  { id: "todos", label: "Todos" },
  { id: "publicados", label: "Publicados" },
  { id: "rascunhos", label: "Rascunhos" },
  { id: "destaques", label: "Destaques" },
  { id: "sem_trilha", label: "Sem trilha" },
] as const;

type FiltroId = (typeof filtros)[number]["id"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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
      return "border-[#e2d2b6] bg-[#f3eee5] text-[#8a6836]";
    case "draft":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "archived":
      return "border-[#e5e5e5] bg-[#f4f4f5] text-[#52525b]";
    default:
      return "border-[#e5e5e5] bg-[#f4f4f5] text-[#52525b]";
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

function resumoTrilha(trilha: Trilha) {
  return trilha.description?.trim() || "Sem descrição cadastrada.";
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

function traduzirErroBanco(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("duplicate key value") || texto.includes("unique")) {
    return "Já existe uma trilha com este identificador.";
  }

  if (texto.includes("row-level security")) {
    return "Seu usuário não tem permissão para alterar esta trilha.";
  }

  return mensagem;
}

function getFileExtension(fileName: string) {
  const partes = fileName.split(".");
  return partes.length > 1 ? partes.pop()!.toLowerCase() : "";
}

function buildCoverStoragePath(slug: string, file: File, kind: CoverKind) {
  const ext = getFileExtension(file.name) || "bin";
  const safeSlug = gerarSlug(slug || "trilha");
  const uniqueId = crypto.randomUUID();

  return `${TRAIL_COVERS_FOLDER}/${safeSlug}-${kind}-${uniqueId}.${ext}`;
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

function getCoverConfig(kind: CoverKind) {
  if (kind === "horizontal") {
    return {
      label: "Capa horizontal",
      description:
        "Imagem usada em cards horizontais e no hover paisagem do Destaque extragrande.",
      helper: "Recomendado: 1600x900 ou proporção 16:9.",
      previewClass: "h-28 w-44",
    };
  }

  if (kind === "featured") {
    return {
      label: "Capa vertical grande",
      description:
        "Imagem usada no card parado de seções com Destaque extragrande.",
      helper: "Recomendado: 900x1350 ou proporção 2:3.",
      previewClass: "h-36 w-24",
    };
  }

  return {
    label: "Capa vertical",
    description:
      "Imagem usada para cards verticais normais, como Trilhas recomendadas.",
    helper: "Recomendado: 900x1200 ou proporção 3:4.",
    previewClass: "h-36 w-24",
  };
}

function getActiveCoverKinds(format: PreferredCardFormat): CoverKind[] {
  if (format === "featured") return ["featured", "horizontal"];
  if (format === "horizontal") return ["horizontal"];
  return ["vertical"];
}

function traduzirFormato(format: PreferredCardFormat | null | undefined) {
  if (format === "horizontal") return "Horizontal";
  if (format === "featured") return "Destaque extragrande";
  return "Vertical";
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
    .from(TRAIL_COVERS_BUCKET)
    .getPublicUrl(cleanPath.replace(/^covers\//, ""));

  return data.publicUrl;
}

function getCurrentCoverPath(trilha: Trilha, kind: CoverKind) {
  if (kind === "horizontal") {
    return trilha.cover_horizontal_path || trilha.cover_path;
  }

  if (kind === "featured") {
    return trilha.cover_featured_path || trilha.cover_path;
  }

  return trilha.cover_vertical_path || trilha.cover_path;
}

function cloneEmptyCoversState(): CoversState {
  return {
    vertical: { file: null, previewUrl: null },
    horizontal: { file: null, previewUrl: null },
    featured: { file: null, previewUrl: null },
  };
}

export default function AdminCursosPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroId>("todos");

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [vinculos, setVinculos] = useState<CursoTrilhaMap[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [trilhaVisualizando, setTrilhaVisualizando] = useState<Trilha | null>(null);

  const [trilhaEditando, setTrilhaEditando] = useState<Trilha | null>(null);
  const [formEditarTrilha, setFormEditarTrilha] = useState<EditarTrilhaForm>({
    title: "",
    slug: "",
    description: "",
    status: "draft",
    requiredRank: "0",
    isFeatured: false,
    preferredCardFormat: "vertical",
  });
  const [coversEditando, setCoversEditando] =
    useState<CoversState>(cloneEmptyCoversState);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  const [trilhaExcluindo, setTrilhaExcluindo] = useState<Trilha | null>(null);
  const [excluindoTrilha, setExcluindoTrilha] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      Object.values(coversEditando).forEach((cover) => {
        if (cover.previewUrl) URL.revokeObjectURL(cover.previewUrl);
      });
    };
  }, [coversEditando]);

  async function carregarDados() {
    setCarregando(true);
    setErro(null);

    try {
      const [
        { data: cursosData, error: cursosError },
        { data: trilhasData, error: trilhasError },
        { data: vinculosData, error: vinculosError },
      ] = await Promise.all([
        supabase
          .from("courses")
          .select(
            [
              "id",
              "slug",
              "title",
              "short_description",
              "description",
              "cover_path",
              "status",
              "required_rank",
              "is_featured",
              "published_at",
              "created_by",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .order("updated_at", { ascending: false }),

        supabase
          .from("course_categories")
          .select("id, slug, title, description, cover_path, cover_vertical_path, cover_horizontal_path, cover_featured_path, preferred_card_format, required_rank, status, is_featured, created_at, updated_at")
          .order("updated_at", { ascending: false }),

        supabase.from("course_category_map").select("course_id, category_id"),
      ]);

      if (cursosError) throw cursosError;
      if (trilhasError) throw trilhasError;
      if (vinculosError) throw vinculosError;

      setCursos(((cursosData ?? []) as unknown as Curso[]));
      setTrilhas(((trilhasData ?? []) as unknown as Trilha[]));
      setVinculos(((vinculosData ?? []) as unknown as CursoTrilhaMap[]));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar trilhas e cursos.";

      setErro(message);
      setCursos([]);
      setTrilhas([]);
      setVinculos([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  const trilhaPorId = useMemo(() => {
    const mapa = new Map<string, Trilha>();

    for (const trilha of trilhas) {
      mapa.set(trilha.id, trilha);
    }

    return mapa;
  }, [trilhas]);

  const trilhasPorCurso = useMemo(() => {
    const mapa = new Map<string, Trilha[]>();

    for (const vinculo of vinculos) {
      const trilha = trilhaPorId.get(vinculo.category_id);
      if (!trilha) continue;

      const listaAtual = mapa.get(vinculo.course_id) ?? [];
      listaAtual.push(trilha);
      mapa.set(vinculo.course_id, listaAtual);
    }

    return mapa;
  }, [trilhaPorId, vinculos]);

  const quantidadeCursosPorTrilha = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const vinculo of vinculos) {
      mapa.set(vinculo.category_id, (mapa.get(vinculo.category_id) ?? 0) + 1);
    }

    return mapa;
  }, [vinculos]);

  const cursosPorTrilha = useMemo(() => {
    const mapa = new Map<string, Curso[]>();

    for (const vinculo of vinculos) {
      const curso = cursos.find((item) => item.id === vinculo.course_id);
      if (!curso) continue;

      const listaAtual = mapa.get(vinculo.category_id) ?? [];
      listaAtual.push(curso);
      mapa.set(vinculo.category_id, listaAtual);
    }

    return mapa;
  }, [cursos, vinculos]);

  const trilhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return trilhas.filter((trilha) => {
      const textoBusca = [trilha.title, trilha.slug, trilha.description ?? ""]
        .join(" ")
        .toLowerCase();

      return !termo || textoBusca.includes(termo);
    });
  }, [busca, trilhas]);

  const cursosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return cursos.filter((curso) => {
      const textoBusca = [
        curso.title,
        curso.slug,
        curso.short_description ?? "",
        curso.description ?? "",
        ...(trilhasPorCurso.get(curso.id)?.map((item) => item.title) ?? []),
      ]
        .join(" ")
        .toLowerCase();

      const correspondeBusca = !termo || textoBusca.includes(termo);
      const cursoTemTrilha = (trilhasPorCurso.get(curso.id)?.length ?? 0) > 0;

      const correspondeFiltro =
        filtroAtivo === "todos" ||
        (filtroAtivo === "publicados" && curso.status === "published") ||
        (filtroAtivo === "rascunhos" && curso.status === "draft") ||
        (filtroAtivo === "destaques" && curso.is_featured) ||
        (filtroAtivo === "sem_trilha" && !cursoTemTrilha);

      return correspondeBusca && correspondeFiltro;
    });
  }, [busca, cursos, filtroAtivo, trilhasPorCurso]);

  const totalCursos = cursos.length;
  const totalTrilhas = trilhas.length;
  const totalPublicados = cursos.filter(
    (curso) => curso.status === "published"
  ).length;
  const totalRascunhos = cursos.filter((curso) => curso.status === "draft").length;
  const totalDestaques = cursos.filter((curso) => curso.is_featured).length;
  const totalSemTrilha = cursos.filter(
    (curso) => (trilhasPorCurso.get(curso.id)?.length ?? 0) === 0
  ).length;

  function resetCoversEditando() {
    Object.values(coversEditando).forEach((cover) => {
      if (cover.previewUrl) URL.revokeObjectURL(cover.previewUrl);
    });

    setCoversEditando(cloneEmptyCoversState());
  }

  function abrirEdicaoTrilha(trilha: Trilha) {
    resetCoversEditando();
    setTrilhaEditando(trilha);
    setErroEdicao(null);
    setFormEditarTrilha({
      title: trilha.title,
      slug: trilha.slug,
      description: trilha.description ?? "",
      status: trilha.status || "draft",
      requiredRank: String(trilha.required_rank ?? 0),
      isFeatured: Boolean(trilha.is_featured),
      preferredCardFormat: trilha.preferred_card_format || "vertical",
    });
  }

  function fecharEdicaoTrilha() {
    if (salvandoEdicao) return;

    resetCoversEditando();
    setTrilhaEditando(null);
    setErroEdicao(null);
  }

  function updateFormEditarTrilha<K extends keyof EditarTrilhaForm>(
    field: K,
    value: EditarTrilhaForm[K]
  ) {
    setFormEditarTrilha((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleChangeFormatoTrilha(format: PreferredCardFormat) {
    resetCoversEditando();

    setFormEditarTrilha((current) => ({
      ...current,
      preferredCardFormat: format,
      isFeatured: format === "featured" ? true : current.isFeatured,
    }));

    setErroEdicao(null);
  }

  function handleSelecionarCapaTrilha(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: CoverKind
  ) {
    const arquivo = event.target.files?.[0] ?? null;

    if (!arquivo) return;

    const tiposPermitidos = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErroEdicao("Envie uma imagem válida em PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }

    setCoversEditando((current) => {
      const currentPreview = current[kind].previewUrl;

      if (currentPreview) URL.revokeObjectURL(currentPreview);

      return {
        ...current,
        [kind]: {
          file: arquivo,
          previewUrl: URL.createObjectURL(arquivo),
        },
      };
    });

    setErroEdicao(null);
    event.target.value = "";
  }

  function removerCapaSelecionadaTrilha(kind: CoverKind) {
    setCoversEditando((current) => {
      const currentPreview = current[kind].previewUrl;

      if (currentPreview) URL.revokeObjectURL(currentPreview);

      return {
        ...current,
        [kind]: {
          file: null,
          previewUrl: null,
        },
      };
    });
  }

  async function uploadCapaTrilhaIfNeeded(
    slug: string,
    kind: CoverKind
  ): Promise<string | null> {
    const file = coversEditando[kind].file;

    if (!file) return null;

    const storagePath = buildCoverStoragePath(slug, file, kind);

    const { error } = await supabase.storage
      .from(TRAIL_COVERS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;

    return storagePath;
  }

  async function removerCapasEnviadas(paths: Array<string | null>) {
    const validPaths = paths.filter(Boolean) as string[];

    if (validPaths.length === 0) return;

    await supabase.storage.from(TRAIL_COVERS_BUCKET).remove(validPaths);
  }

  async function salvarEdicaoTrilha() {
    if (!trilhaEditando) return;

    const title = formEditarTrilha.title.trim();
    const slug = gerarSlug(formEditarTrilha.slug || formEditarTrilha.title);
    const rank = Number(formEditarTrilha.requiredRank);

    if (!title) {
      setErroEdicao("Informe o nome da trilha.");
      return;
    }

    if (!slug) {
      setErroEdicao("Informe um identificador válido para a trilha.");
      return;
    }

    if (Number.isNaN(rank) || rank < 0) {
      setErroEdicao("Informe um rank mínimo válido.");
      return;
    }

    setSalvandoEdicao(true);
    setErroEdicao(null);

    const uploadedPaths: Array<string | null> = [];

    try {
      const activeKinds = getActiveCoverKinds(
        formEditarTrilha.preferredCardFormat
      );

      const uploadedVertical = activeKinds.includes("vertical")
        ? await uploadCapaTrilhaIfNeeded(slug, "vertical")
        : null;
      uploadedPaths.push(uploadedVertical);

      const uploadedHorizontal = activeKinds.includes("horizontal")
        ? await uploadCapaTrilhaIfNeeded(slug, "horizontal")
        : null;
      uploadedPaths.push(uploadedHorizontal);

      const uploadedFeatured = activeKinds.includes("featured")
        ? await uploadCapaTrilhaIfNeeded(slug, "featured")
        : null;
      uploadedPaths.push(uploadedFeatured);

      const coverVerticalPath =
        formEditarTrilha.preferredCardFormat === "vertical"
          ? uploadedVertical ||
            trilhaEditando.cover_vertical_path ||
            trilhaEditando.cover_path
          : null;

      const coverHorizontalPath =
        formEditarTrilha.preferredCardFormat === "horizontal" ||
        formEditarTrilha.preferredCardFormat === "featured"
          ? uploadedHorizontal ||
            trilhaEditando.cover_horizontal_path ||
            trilhaEditando.cover_path
          : null;

      const coverFeaturedPath =
        formEditarTrilha.preferredCardFormat === "featured"
          ? uploadedFeatured ||
            trilhaEditando.cover_featured_path ||
            trilhaEditando.cover_path
          : null;

      const fallbackCoverPath =
        coverFeaturedPath ||
        coverVerticalPath ||
        coverHorizontalPath ||
        trilhaEditando.cover_path ||
        null;

      const { error } = await supabase
        .from("course_categories")
        .update({
          title,
          slug,
          description: formEditarTrilha.description.trim() || null,
          cover_path: fallbackCoverPath,
          cover_vertical_path: coverVerticalPath,
          cover_horizontal_path: coverHorizontalPath,
          cover_featured_path: coverFeaturedPath,
          preferred_card_format: formEditarTrilha.preferredCardFormat,
          required_rank: rank,
          status: formEditarTrilha.status,
          is_featured:
            formEditarTrilha.preferredCardFormat === "featured"
              ? true
              : formEditarTrilha.isFeatured,
        })
        .eq("id", trilhaEditando.id);

      if (error) throw error;

      resetCoversEditando();
      setTrilhaEditando(null);
      await carregarDados();
    } catch (error) {
      await removerCapasEnviadas(uploadedPaths);

      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar a trilha.";

      setErroEdicao(mensagem);
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluirTrilha() {
    if (!trilhaExcluindo) return;

    setExcluindoTrilha(true);
    setErroExclusao(null);

    try {
      const { error: deleteMapError } = await supabase
        .from("course_category_map")
        .delete()
        .eq("category_id", trilhaExcluindo.id);

      if (deleteMapError) throw deleteMapError;

      const { error: deleteCategoryError } = await supabase
        .from("course_categories")
        .delete()
        .eq("id", trilhaExcluindo.id);

      if (deleteCategoryError) throw deleteCategoryError;

      setTrilhaExcluindo(null);
      await carregarDados();
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível excluir a trilha.";

      setErroExclusao(mensagem);
    } finally {
      setExcluindoTrilha(false);
    }
  }

  return (
    <div className="space-y-7 text-[#141414]">
      <div className="flex w-full flex-col gap-7">
        <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
              Módulo cursos
            </p>

            <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
              Trilhas e cursos
            </h1>

            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
              Gerencie as trilhas e cursos cadastrados na plataforma e organize
              a estrutura de ensino com clareza.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/cursos/trilhas/nova"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              Nova trilha
            </Link>

            <Link
              href="/admin/cursos/cursos/novo"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
            >
              <Plus className="h-4 w-4" />
              Novo curso
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="grid divide-y divide-[#ededed] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
          <MetricCard
            title="Trilhas cadastradas"
            value={String(totalTrilhas).padStart(2, "0")}
            icon={<Network className="h-5 w-5" />}
            iconTone="gold"
          />
          <MetricCard
            title="Cursos cadastrados"
            value={String(totalCursos).padStart(2, "0")}
            icon={<GraduationCap className="h-5 w-5" />}
            iconTone="blue"
          />
          <MetricCard
            title="Publicados"
            value={String(totalPublicados).padStart(2, "0")}
            icon={<LibraryBig className="h-5 w-5" />}
            iconTone="blue"
          />
          <MetricCard
            title="Rascunhos"
            value={String(totalRascunhos).padStart(2, "0")}
            icon={<FolderKanban className="h-5 w-5" />}
            iconTone="violet"
          />
          <MetricCard
            title="Sem trilha"
            value={String(totalSemTrilha).padStart(2, "0")}
            icon={<FolderTree className="h-5 w-5" />}
            iconTone="goldSoft"
          />
          </div>
        </section>

        <section className="rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e5e5e5] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                Trilhas cadastradas
              </h2>
              <p className="mt-1 text-[13px] text-[#767b87]">
                Visualize as trilhas criadas e acompanhe a organização dos cursos.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={() => void carregarDados()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>

              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8f9d]" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar trilha ou curso"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-white pl-10 pr-4 text-[14px] font-medium text-[#27272a] outline-none placeholder:text-[#8a8f9d] transition focus:border-[#DBC094]"
                />
              </div>
            </div>
          </div>

          {erro ? (
            <div className="p-6">
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-5">
                <h3 className="text-[14px] font-semibold text-rose-700">
                  Erro ao carregar trilhas e cursos
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-rose-600">{erro}</p>
              </div>
            </div>
          ) : null}

          <div className="p-6">
            {carregando ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[12px] border border-[#e5e5e5] bg-white p-5"
                  >
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-40 rounded bg-[#E9EDF3]" />
                      <div className="h-3 w-60 rounded bg-[#EEF2F6]" />
                      <div className="h-3 w-44 rounded bg-[#EEF2F6]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : trilhasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="mb-4 rounded-full border border-[#e5e5e5] bg-white p-4">
                  <Network className="h-6 w-6 text-[#8a8f9d]" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#141414]">
                  Nenhuma trilha encontrada
                </h3>
                <p className="mt-2 max-w-md text-[14px] text-[#666b76]">
                  Não há trilhas cadastradas com os filtros atuais.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {trilhasFiltradas.map((trilha) => {
                  const totalCursosNaTrilha =
                    quantidadeCursosPorTrilha.get(trilha.id) ?? 0;

                  return (
                    <article
                      key={trilha.id}
                      className="rounded-[12px] border border-[#e5e5e5] bg-white p-5 transition hover:border-[#DBC094]/60 hover:bg-[#f7f7f7]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[11px] font-semibold text-[#8a6836]">
                            <Network className="h-3 w-3" />
                            Trilha
                          </span>

                          <h3 className="mt-3 truncate text-[16px] font-semibold text-[#141414] md:text-[17px]">
                            {trilha.title}
                          </h3>

                          <p className="mt-2 line-clamp-3 text-[14px] leading-6 text-[#666b76]">
                            {resumoTrilha(trilha)}
                          </p>
                        </div>

                        <div className="rounded-full bg-[#f3eee5] p-3 text-[#8a6836]">
                          <Layers3 className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5 text-[12px] font-medium text-[#52525b]">
                          {totalCursosNaTrilha} curso(s)
                        </span>

                        <span className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5 text-[12px] font-medium text-[#52525b]">
                          {trilha.slug}
                        </span>
                      </div>

                      <div className="mt-4 text-[12px] text-[#8a8f9d]">
                        Atualizada em {formatarData(trilha.updated_at)}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setTrilhaVisualizando(trilha)}
                          className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#e5e5e5] bg-white px-3.5 py-2 text-[14px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f7]"
                        >
                          <Eye className="h-4 w-4" />
                          Visualizar
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirEdicaoTrilha(trilha)}
                          className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#e5e5e5] bg-white px-3.5 py-2 text-[14px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f7]"
                        >
                          <PencilLine className="h-4 w-4" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTrilhaExcluindo(trilha);
                            setErroExclusao(null);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-3.5 py-2 text-[14px] font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e5e5e5] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                Cursos cadastrados
              </h2>
              <p className="mt-1 text-[13px] text-[#767b87]">
                Visualize os cursos, seus status e a trilha vinculada quando existir.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white p-1">
              {filtros.map((filtro) => {
                const ativo = filtroAtivo === filtro.id;

                return (
                  <button
                    key={filtro.id}
                    type="button"
                    onClick={() => setFiltroAtivo(filtro.id)}
                    className={cx(
                      "rounded-[12px] px-4 py-2 text-[14px] font-medium transition",
                      ativo
                        ? "bg-[#DBC094] text-black"
                        : "text-[#666b76] hover:bg-[#f7f7f7] hover:text-[#141414]"
                    )}
                  >
                    {filtro.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden grid-cols-[1.2fr_0.75fr_0.7fr_0.55fr_1fr_0.65fr] gap-4 border-b border-[#e5e5e5] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d] lg:grid">
            <div>Curso</div>
            <div>Slug</div>
            <div>Status</div>
            <div>Rank</div>
            <div>Trilha</div>
            <div className="text-right">Ação</div>
          </div>

          <div className="divide-y divide-[#e5e5e5]">
            {carregando ? (
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-[12px] border border-[#e5e5e5] bg-white p-5"
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
                <div className="mb-4 rounded-full border border-[#e5e5e5] bg-white p-4">
                  <GraduationCap className="h-6 w-6 text-[#8a8f9d]" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#141414]">
                  Nenhum curso encontrado
                </h3>
                <p className="mt-2 max-w-md text-[14px] text-[#666b76]">
                  Não há cursos cadastrados com os filtros atuais.
                </p>
              </div>
            ) : (
              cursosFiltrados.map((curso) => {
                const trilhasDoCurso = trilhasPorCurso.get(curso.id) ?? [];

                return (
                  <article
                    key={curso.id}
                    className="px-5 py-5 transition hover:bg-[#f7f7f7] md:px-6"
                  >
                    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.2fr_0.75fr_0.7fr_0.55fr_1fr_0.65fr] lg:items-center lg:gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {curso.is_featured ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[11px] font-semibold text-[#8a6836]">
                              <Star className="h-3 w-3" />
                              Destaque
                            </span>
                          ) : null}

                          <span className="inline-flex items-center gap-1 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[11px] font-medium text-[#8a6836]">
                            <GraduationCap className="h-3 w-3" />
                            Curso
                          </span>
                        </div>

                        <h3 className="mt-3 truncate text-[16px] font-semibold text-[#141414] md:text-[17px]">
                          {curso.title}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-[#666b76]">
                          {resumoCurso(curso)}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-[#8a8f9d] lg:hidden">
                          <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Rank {curso.required_rank}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatarData(curso.updated_at)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 lg:hidden">
                          {trilhasDoCurso.length > 0 ? (
                            trilhasDoCurso.map((trilha) => (
                              <span
                                key={`${curso.id}-${trilha.id}`}
                                className="inline-flex items-center gap-1 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[11px] font-medium text-[#8a6836]"
                              >
                                <Network className="h-3 w-3" />
                                {trilha.title}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#e5e5e5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#666b76]">
                              Sem trilha
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="truncate text-[14px] text-[#52525b]">
                        {curso.slug}
                      </div>

                      <div>
                        <span
                          className={cx(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium",
                            statusClasses(curso.status)
                          )}
                        >
                          {traduzirStatus(curso.status)}
                        </span>
                      </div>

                      <div className="text-[14px] font-medium text-[#52525b]">
                        {curso.required_rank}
                      </div>

                      <div className="hidden min-w-0 flex-wrap items-center gap-2 lg:flex">
                        {trilhasDoCurso.length > 0 ? (
                          trilhasDoCurso.map((trilha) => (
                            <span
                              key={`${curso.id}-${trilha.id}`}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-2.5 py-1 text-[11px] font-medium text-[#8a6836]"
                            >
                              <Network className="h-3 w-3 shrink-0" />
                              <span className="truncate">{trilha.title}</span>
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#e5e5e5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#666b76]">
                            Sem trilha
                          </span>
                        )}
                      </div>

                      <div className="flex justify-start lg:justify-end">
                        <Link
                          href={`/admin/cursos/${curso.id}`}
                          className="inline-flex items-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white px-3.5 py-2 text-[14px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f7]"
                        >
                          Gerenciar
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      {trilhaVisualizando ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[720px] rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_24px_80px_rgba(31,34,48,0.16)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-3 py-1 text-[12px] font-medium uppercase tracking-[0.14em] text-[#8a6836]">
                  <Eye className="h-3.5 w-3.5" />
                  Visualização da trilha
                </div>
                <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                  {trilhaVisualizando.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setTrilhaVisualizando(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#666b76] transition hover:bg-[#f7f7f7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <DetailBox label="Nome da trilha" value={trilhaVisualizando.title} />
              <DetailBox label="Slug" value={trilhaVisualizando.slug} />
              <DetailBox
                label="Criada em"
                value={formatarData(trilhaVisualizando.created_at)}
              />
              <DetailBox
                label="Atualizada em"
                value={formatarData(trilhaVisualizando.updated_at)}
              />
              <div className="md:col-span-2">
                <DetailBox
                  label="Descrição"
                  value={resumoTrilha(trilhaVisualizando)}
                  multiLine
                />
              </div>
              <div className="md:col-span-2">
                <DetailBox
                  label="Cursos vinculados"
                  value={
                    (cursosPorTrilha.get(trilhaVisualizando.id) ?? [])
                      .map((curso) => curso.title)
                      .join(" • ") || "Nenhum curso vinculado."
                  }
                  multiLine
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {trilhaEditando ? (
        <div className="fixed inset-0 z-[121] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-[980px] overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_24px_80px_rgba(31,34,48,0.16)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-3 py-1 text-[12px] font-medium uppercase tracking-[0.14em] text-[#8a6836]">
                  <PencilLine className="h-3.5 w-3.5" />
                  Edição completa da trilha
                </div>
                <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                  Editar trilha
                </h3>
                <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#666b76]">
                  Ajuste os dados da trilha e substitua as capas conforme o modelo escolhido.
                  Em Destaque extragrande, use uma capa vertical grande para o card parado e
                  uma capa horizontal para o hover paisagem.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void salvarEdicaoTrilha()}
                  disabled={salvandoEdicao}
                  className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#e2d2b6] bg-[#DBC094] px-4 py-2.5 text-[14px] font-semibold text-black transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {salvandoEdicao ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {salvandoEdicao ? "Salvando..." : "Salvar"}
                </button>

                <button
                  type="button"
                  onClick={fecharEdicaoTrilha}
                  disabled={salvandoEdicao}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#666b76] transition hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-188px)] overflow-y-auto p-6">
              <div className="grid gap-5">
                {erroEdicao ? (
                  <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4 text-[14px] text-rose-700">
                    {erroEdicao}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Nome da trilha
                    </label>
                    <input
                      type="text"
                      value={formEditarTrilha.title}
                      onChange={(e) =>
                        updateFormEditarTrilha("title", e.target.value)
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Identificador
                    </label>
                    <input
                      type="text"
                      value={formEditarTrilha.slug}
                      onChange={(e) =>
                        updateFormEditarTrilha("slug", gerarSlug(e.target.value))
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                    Descrição
                  </label>
                  <textarea
                    rows={5}
                    value={formEditarTrilha.description}
                    onChange={(e) =>
                      updateFormEditarTrilha("description", e.target.value)
                    }
                    className="w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-3 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Status visual
                    </label>
                    <select
                      value={formEditarTrilha.status}
                      onChange={(e) =>
                        updateFormEditarTrilha(
                          "status",
                          e.target.value as StatusTrilha
                        )
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="published">Publicado</option>
                      <option value="archived">Arquivado</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                      Rank mínimo exigido
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formEditarTrilha.requiredRank}
                      onChange={(e) =>
                        updateFormEditarTrilha("requiredRank", e.target.value)
                      }
                      className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                    />
                  </div>

                  <label className="flex min-h-12 items-start gap-3 rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                    <input
                      type="checkbox"
                      checked={formEditarTrilha.isFeatured}
                      onChange={(e) =>
                        updateFormEditarTrilha("isFeatured", e.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-[#e5e5e5] text-[#8a6836] focus:ring-[#DBC094]"
                    />

                    <span className="block">
                      <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#141414]">
                        <Star className="h-4 w-4 text-[#8a6836]" />
                        Marcar como destaque
                      </span>
                      <span className="mt-1 block text-[14px] leading-6 text-[#666b76]">
                        O modelo Destaque extragrande força este campo como ativo.
                      </span>
                    </span>
                  </label>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                    Modelo de capa da trilha
                  </label>

                  <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                    <p className="mb-4 text-[14px] leading-6 text-[#666b76]">
                      Selecione o modelo visual. Ao trocar o modelo, qualquer nova imagem
                      selecionada nesta edição será removida para evitar capas incorretas.
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
                            title: "Destaque extragrande",
                            description:
                              "Card vertical parado e hover paisagem na Home do aluno.",
                          },
                        ] as Array<{
                          value: PreferredCardFormat;
                          title: string;
                          description: string;
                        }>
                      ).map((option) => {
                        const selected =
                          formEditarTrilha.preferredCardFormat === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleChangeFormatoTrilha(option.value)}
                            className={cx(
                              "rounded-[18px] border p-4 text-left transition",
                              selected
                                ? "border-[#DBC094] bg-[#f3eee5] "
                                : "border-[#e5e5e5] bg-white hover:border-[#DBC094]/70"
                            )}
                          >
                            <span
                              className={cx(
                                "mb-3 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-black",
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

                    <div className="mt-4 rounded-[12px] border border-[#e2d2b6] bg-[#f3eee5] p-4">
                      <p className="text-[14px] font-semibold text-[#8a6836]">
                        Modelo atual: {traduzirFormato(formEditarTrilha.preferredCardFormat)}
                      </p>
                      <p className="mt-1 text-[14px] leading-6 text-[#8a6836]">
                        {formEditarTrilha.preferredCardFormat === "featured"
                          ? "Envie ou substitua a capa vertical grande do card parado e a capa horizontal do hover paisagem."
                          : "O upload abaixo fica ativo somente para o modelo selecionado."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {getActiveCoverKinds(formEditarTrilha.preferredCardFormat).map(
                    (kind) => {
                      const coverConfig = getCoverConfig(kind);
                      const cover = coversEditando[kind];
                      const currentCoverPath = getCurrentCoverPath(
                        trilhaEditando,
                        kind
                      );
                      const currentCoverUrl = getPublicCoverUrl(currentCoverPath);

                      return (
                        <div
                          key={kind}
                          className="rounded-[12px] border border-[#e5e5e5] bg-white p-4"
                        >
                          <div className="mb-4">
                            <label className="block text-[14px] font-semibold text-[#52525b]">
                              {coverConfig.label}
                            </label>
                            <p className="mt-1 text-[14px] leading-6 text-[#666b76]">
                              {coverConfig.description}
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#8a8f9d]">
                              {coverConfig.helper}
                            </p>
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="flex min-w-0 gap-4">
                              <div
                                className={cx(
                                  "flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-white",
                                  coverConfig.previewClass
                                )}
                              >
                                {cover.previewUrl ? (
                                  <img
                                    src={cover.previewUrl}
                                    alt={`Prévia ${coverConfig.label}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : currentCoverUrl ? (
                                  <img
                                    src={currentCoverUrl}
                                    alt={`Capa atual ${coverConfig.label}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-[#8a8f9d]" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-semibold text-[#141414]">
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
                                    : currentCoverPath ||
                                      "Envie uma capa para este formato."}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[#e5e5e5] bg-white px-4 py-2 text-[14px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f7]">
                                <Upload className="h-4 w-4" />
                                {currentCoverPath || cover.file
                                  ? "Substituir capa"
                                  : "Enviar capa"}
                                <input
                                  type="file"
                                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                  onChange={(event) =>
                                    handleSelecionarCapaTrilha(event, kind)
                                  }
                                  className="hidden"
                                />
                              </label>

                              {cover.file ? (
                                <button
                                  type="button"
                                  onClick={() => removerCapaSelecionadaTrilha(kind)}
                                  className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-2 text-[14px] font-semibold text-rose-700 transition hover:bg-rose-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remover seleção
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[#e5e5e5] bg-white p-6 ">
              <button
                type="button"
                onClick={fecharEdicaoTrilha}
                disabled={salvandoEdicao}
                className="inline-flex items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void salvarEdicaoTrilha()}
                disabled={salvandoEdicao}
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#e2d2b6] bg-[#DBC094] px-4 py-2.5 text-[14px] font-semibold text-black transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {salvandoEdicao ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {trilhaExcluindo ? (
        <div className="fixed inset-0 z-[122] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[620px] rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_24px_80px_rgba(31,34,48,0.16)]">
            <div className="flex items-start gap-4 border-b border-[#e5e5e5] p-6">
              <div className="rounded-full bg-rose-50 p-3 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                  Excluir trilha
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-[#666b76]">
                  A trilha <strong>{trilhaExcluindo.title}</strong> será excluída,
                  mas os cursos não serão removidos. Apenas o vínculo entre eles
                  será desfeito.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrilhaExcluindo(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#666b76] transition hover:bg-[#f7f7f7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              {erroExclusao ? (
                <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4 text-[14px] text-rose-700">
                  {erroExclusao}
                </div>
              ) : (
                <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4 text-[14px] leading-6 text-[#666b76]">
                  Cursos atualmente vinculados:{" "}
                  <strong>{quantidadeCursosPorTrilha.get(trilhaExcluindo.id) ?? 0}</strong>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#e5e5e5] p-6">
              <button
                type="button"
                onClick={() => setTrilhaExcluindo(null)}
                className="inline-flex items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f7]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void excluirTrilha()}
                disabled={excluindoTrilha}
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-[14px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {excluindoTrilha ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {excluindoTrilha ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
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
    gold: "bg-[#f3eee5] text-[#8a6836]",
    violet: "bg-[#f3eee5] text-[#8a6836]",
    blue: "bg-[#f3eee5] text-[#8a6836]",
    goldSoft: "bg-[#f3eee5] text-[#8a6836]",
  };

  return (
    <article className="rounded-[12px] border border-[#e5e5e5] bg-white p-5 ">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#666b76]">{title}</p>
          <p className="mt-4 text-[36px] font-semibold tracking-[-0.03em] text-[#141414]">
            {value}
          </p>
        </div>

        <div className={cx("rounded-full p-4", tones[iconTone])}>{icon}</div>
      </div>
    </article>
  );
}

function DetailBox({
  label,
  value,
  multiLine = false,
}: {
  label: string;
  value: string;
  multiLine?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
      <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8a8f9d]">
        {label}
      </div>
      <div
        className={cx(
          "mt-2 text-[14px] text-[#141414]",
          multiLine ? "whitespace-pre-wrap leading-6" : "truncate"
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}