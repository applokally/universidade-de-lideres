"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock3,
  Eye,
  PencilLine,
  Trash2,
  AlertTriangle,
  Save,
  FileText,
  FolderKanban,
  GraduationCap,
  Layers3,
  Loader2,
  Paperclip,
  PlayCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
  X,
  Upload,
  Music4,
  FileUp,
  Type,
  Radio,
  Link as LinkIcon,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type StatusGeral = "draft" | "published" | "archived" | string;
type StatusModulo = "draft" | "published" | "archived";
type StatusAula = "draft" | "published" | "archived";
type TipoConteudo = "video" | "text" | "pdf" | "audio" | "live";
type SourceMode = "upload" | "url" | "zoom_recording" | "zoom_live" | "text";

type Curso = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  status: StatusGeral;
  required_rank: number;
  is_featured: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  source_mode: string | null;
  content_body: string | null;
  primary_asset_path: string | null;
  primary_asset_name: string | null;
  primary_asset_mime_type: string | null;
  primary_asset_size_bytes: number | null;
  external_url: string | null;
  live_provider: string | null;
  meeting_sdk: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  zoom_recording_id: string | null;
  zoom_recording_url: string | null;
  video_provider: string | null;
  video_url: string | null;
  duration_sec: number | null;
  is_preview: boolean;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

type Material = {
  id: string;
  lesson_id: string;
  asset_type: string;
  title: string | null;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type PaginaProps = {
  params: Promise<{
    id: string;
  }>;
};

type FormModuloState = {
  title: string;
  description: string;
  sortOrder: string;
  status: StatusModulo;
};

type FormEditarModuloState = {
  title: string;
  description: string;
  sortOrder: string;
  status: StatusModulo;
};

type FormAulaState = {
  title: string;
  description: string;
  sortOrder: string;
  status: StatusAula;
  contentType: TipoConteudo;
  sourceMode: SourceMode;
  durationSec: string;
  isPreview: boolean;
  releasedAt: string;
  contentBody: string;
  externalUrl: string;
  zoomMeetingId: string;
  zoomPasscode: string;
  zoomJoinUrl: string;
  zoomStartUrl: string;
  zoomRecordingId: string;
  zoomRecordingUrl: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
};

type FormMaterialState = {
  assetType: string;
  title: string;
  sortOrder: string;
};

type FormEditarAulaState = FormAulaState & {
  moduleId: string;
};

const LESSON_CONTENT_BUCKET = "lesson-content";
const LESSON_MATERIALS_BUCKET = "lesson-materials";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "archived":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function traduzirTipoConteudo(tipo: string) {
  switch (tipo) {
    case "video":
      return "Vídeo";
    case "text":
      return "Texto";
    case "pdf":
      return "PDF";
    case "audio":
      return "Áudio";
    case "live":
      return "Ao vivo";
    default:
      return tipo || "—";
  }
}

function traduzirSourceMode(modo: string | null) {
  switch (modo) {
    case "upload":
      return "Upload";
    case "url":
      return "URL externa";
    case "zoom_recording":
      return "Gravação Zoom";
    case "zoom_live":
      return "Ao vivo Zoom";
    case "text":
      return "Texto";
    default:
      return "—";
  }
}

function traduzirTipoMaterial(tipo: string) {
  switch (tipo) {
    case "pdf":
      return "PDF";
    case "document":
      return "Documento";
    case "link":
      return "Link";
    case "image":
      return "Imagem";
    case "audio":
      return "Áudio";
    case "spreadsheet":
      return "Planilha";
    case "presentation":
      return "Apresentação";
    case "download":
      return "Download";
    default:
      return tipo || "—";
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

function formatarTamanho(bytes: number | null) {
  if (!bytes || bytes <= 0) return "—";

  const unidades = ["B", "KB", "MB", "GB"];
  let valor = bytes;
  let indice = 0;

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }

  return `${valor.toFixed(valor >= 10 || indice === 0 ? 0 : 1)} ${unidades[indice]}`;
}

function resumoCurso(curso: Curso | null) {
  if (!curso) return "";
  return (
    curso.short_description?.trim() ||
    curso.description?.trim() ||
    "Sem descrição cadastrada para este curso."
  );
}

function iconeConteudo(tipo: string) {
  if (tipo === "video") return <Video className="h-4 w-4" />;
  if (tipo === "audio") return <Music4 className="h-4 w-4" />;
  if (tipo === "pdf") return <FileUp className="h-4 w-4" />;
  if (tipo === "live") return <Radio className="h-4 w-4" />;
  if (tipo === "text") return <Type className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function traduzirErroBanco(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("row-level security")) {
    return "Seu usuário não tem permissão para salvar este conteúdo.";
  }

  if (texto.includes("violates foreign key constraint")) {
    return "Não foi possível vincular o registro ao item selecionado.";
  }

  if (texto.includes("duplicate key value") || texto.includes("unique")) {
    return "Já existe um registro com essas informações.";
  }

  return mensagem;
}

function cleanTextUrl(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function cleanZoomRecordingUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const senhaIndex = trimmed.search(/\s+(senha|password|passcode|código|codigo)\s*:/i);
  const withoutLoosePassword = senhaIndex >= 0 ? trimmed.slice(0, senhaIndex) : trimmed;

  return withoutLoosePassword.trim();
}

function validarZoomRecordingUrl(value: string) {
  const link = cleanZoomRecordingUrl(value);

  if (!link) {
    return "Informe o link da gravação do Zoom.";
  }

  if (/\s+(senha|password|passcode|código|codigo)\s*:/i.test(value)) {
    return "Cole somente o link compartilhável da gravação. Não cole texto separado como “Senha: ...”. O link precisa conter pwd=.";
  }

  let url: URL;

  try {
    url = new URL(link);
  } catch {
    return "Informe uma URL válida da gravação do Zoom.";
  }

  const host = url.hostname.toLowerCase();

  if (!host.includes("zoom.us") && !host.includes("zoom.com") && !host.includes("zoomgov.com")) {
    return "Informe um link de gravação do Zoom.";
  }

  if (!url.pathname.includes("/rec/share/")) {
    return "Use o link compartilhável da gravação do Zoom, no formato /rec/share/.";
  }

  if (!url.searchParams.get("pwd")) {
    return "O link da gravação precisa conter pwd=. Ative no Zoom a opção de incorporar a senha no link compartilhável e gere o link novamente.";
  }

  return null;
}

function formAulaInicial(): FormAulaState {
  return {
    title: "",
    description: "",
    sortOrder: "0",
    status: "draft",
    contentType: "video",
    sourceMode: "upload",
    durationSec: "",
    isPreview: false,
    releasedAt: "",
    contentBody: "",
    externalUrl: "",
    zoomMeetingId: "",
    zoomPasscode: "",
    zoomJoinUrl: "",
    zoomStartUrl: "",
    zoomRecordingId: "",
    zoomRecordingUrl: "",
    scheduledStartAt: "",
    scheduledEndAt: "",
  };
}

function formEditarAulaInicial(): FormEditarAulaState {
  return {
    moduleId: "",
    ...formAulaInicial(),
  };
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (num: number) => String(num).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeSourceModeFromLesson(aula: Aula): SourceMode {
  if (aula.content_type === "text") return "text";
  if (aula.content_type === "live") return "zoom_live";
  if (aula.source_mode === "upload" || aula.source_mode === "url" || aula.source_mode === "zoom_recording") {
    return aula.source_mode;
  }
  if (aula.zoom_recording_url) return "zoom_recording";
  if (aula.external_url || aula.video_url) return "url";
  return "upload";
}

function buildEditAulaForm(aula: Aula): FormEditarAulaState {
  return {
    moduleId: aula.module_id,
    title: aula.title ?? "",
    description: aula.description ?? "",
    sortOrder: String(aula.sort_order ?? 0),
    status: ((aula.status as StatusAula) || "draft"),
    contentType: ((aula.content_type as TipoConteudo) || "video"),
    sourceMode: normalizeSourceModeFromLesson(aula),
    durationSec: aula.duration_sec === null ? "" : String(aula.duration_sec),
    isPreview: Boolean(aula.is_preview),
    releasedAt: toDatetimeLocal(aula.released_at),
    contentBody: aula.content_body ?? "",
    externalUrl:
      normalizeSourceModeFromLesson(aula) === "zoom_recording"
        ? ""
        : aula.external_url ?? aula.video_url ?? "",
    zoomMeetingId: aula.zoom_meeting_id ?? "",
    zoomPasscode: aula.zoom_passcode ?? "",
    zoomJoinUrl: aula.zoom_join_url ?? "",
    zoomStartUrl: aula.zoom_start_url ?? "",
    zoomRecordingId: aula.zoom_recording_id ?? "",
    zoomRecordingUrl:
      aula.zoom_recording_url ??
      (normalizeSourceModeFromLesson(aula) === "zoom_recording"
        ? aula.video_url ?? aula.external_url ?? ""
        : ""),
    scheduledStartAt: toDatetimeLocal(aula.scheduled_start_at),
    scheduledEndAt: toDatetimeLocal(aula.scheduled_end_at),
  };
}

function formMaterialInicial(): FormMaterialState {
  return {
    assetType: "pdf",
    title: "",
    sortOrder: "0",
  };
}

function getAcceptedMimeByContentType(contentType: TipoConteudo) {
  switch (contentType) {
    case "video":
      return "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
    case "pdf":
      return "application/pdf,.pdf";
    case "audio":
      return "audio/mpeg,audio/mp3,audio/wav,.mp3,.wav";
    default:
      return "";
  }
}

function buildLessonContentPath(cursoId: string, moduloId: string, contentType: TipoConteudo, file: File) {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  const unique = crypto.randomUUID();
  return `courses/${cursoId}/modules/${moduloId}/${contentType}/${unique}.${ext}`;
}

function buildLessonMaterialPath(cursoId: string, aulaId: string, assetType: string, file: File) {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  const unique = crypto.randomUUID();
  return `courses/${cursoId}/lessons/${aulaId}/materials/${assetType}/${unique}.${ext}`;
}

export default function AdminCursoModulosPage({ params }: PaginaProps) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [cursoId, setCursoId] = useState<string>("");
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalNovoModuloAberto, setModalNovoModuloAberto] = useState(false);
  const [salvandoModulo, setSalvandoModulo] = useState(false);
  const [erroNovoModulo, setErroNovoModulo] = useState<string | null>(null);
  const [formModulo, setFormModulo] = useState<FormModuloState>({
    title: "",
    description: "",
    sortOrder: "0",
    status: "draft",
  });

  const [moduloVisualizando, setModuloVisualizando] = useState<Modulo | null>(null);
  const [moduloEditando, setModuloEditando] = useState<Modulo | null>(null);
  const [moduloExcluindo, setModuloExcluindo] = useState<Modulo | null>(null);
  const [salvandoEdicaoModulo, setSalvandoEdicaoModulo] = useState(false);
  const [excluindoModulo, setExcluindoModulo] = useState(false);
  const [erroEditarModulo, setErroEditarModulo] = useState<string | null>(null);
  const [erroExcluirModulo, setErroExcluirModulo] = useState<string | null>(null);
  const [formEditarModulo, setFormEditarModulo] = useState<FormEditarModuloState>({
    title: "",
    description: "",
    sortOrder: "0",
    status: "draft",
  });

  const [modalNovaAulaAberto, setModalNovaAulaAberto] = useState(false);
  const [moduloSelecionadoParaAula, setModuloSelecionadoParaAula] =
    useState<Modulo | null>(null);
  const [salvandoAula, setSalvandoAula] = useState(false);
  const [erroNovaAula, setErroNovaAula] = useState<string | null>(null);
  const [formAula, setFormAula] = useState<FormAulaState>(formAulaInicial());
  const [arquivoConteudoPrincipal, setArquivoConteudoPrincipal] = useState<File | null>(null);

  const [modalMateriaisAberto, setModalMateriaisAberto] = useState(false);
  const [aulaSelecionadaParaMateriais, setAulaSelecionadaParaMateriais] =
    useState<Aula | null>(null);
  const [salvandoMaterial, setSalvandoMaterial] = useState(false);
  const [erroMaterial, setErroMaterial] = useState<string | null>(null);
  const [arquivoMaterial, setArquivoMaterial] = useState<File | null>(null);
  const [formMaterial, setFormMaterial] = useState<FormMaterialState>(
    formMaterialInicial()
  );

  const [aulaVisualizando, setAulaVisualizando] = useState<Aula | null>(null);
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);
  const [aulaExcluindo, setAulaExcluindo] = useState<Aula | null>(null);
  const [salvandoEdicaoAula, setSalvandoEdicaoAula] = useState(false);
  const [excluindoAula, setExcluindoAula] = useState(false);
  const [erroEditarAula, setErroEditarAula] = useState<string | null>(null);
  const [erroExcluirAula, setErroExcluirAula] = useState<string | null>(null);
  const [formEditarAula, setFormEditarAula] = useState<FormEditarAulaState>(
    formEditarAulaInicial()
  );
  const [arquivoEditarConteudoPrincipal, setArquivoEditarConteudoPrincipal] =
    useState<File | null>(null);

  const [materialVisualizando, setMaterialVisualizando] = useState<Material | null>(null);
  const [materialEditando, setMaterialEditando] = useState<Material | null>(null);
  const [materialExcluindo, setMaterialExcluindo] = useState<Material | null>(null);
  const [salvandoEdicaoMaterial, setSalvandoEdicaoMaterial] = useState(false);
  const [excluindoMaterial, setExcluindoMaterial] = useState(false);
  const [erroEditarMaterial, setErroEditarMaterial] = useState<string | null>(null);
  const [erroExcluirMaterial, setErroExcluirMaterial] = useState<string | null>(null);
  const [formEditarMaterialMeta, setFormEditarMaterialMeta] = useState<FormMaterialState>(
    formMaterialInicial()
  );
  const [arquivoEditarMaterial, setArquivoEditarMaterial] = useState<File | null>(null);

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

      const modulosNormalizados = (((modulosData ?? []) as unknown as Modulo[])).map((modulo) => ({
        ...modulo,
        sort_order: Number(modulo.sort_order ?? 0),
      }));

      const moduloIds = modulosNormalizados.map((modulo) => modulo.id);

      let aulasNormalizadas: Aula[] = [];
      let materiaisNormalizados: Material[] = [];

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
              "source_mode",
              "content_body",
              "primary_asset_path",
              "primary_asset_name",
              "primary_asset_mime_type",
              "primary_asset_size_bytes",
              "external_url",
              "live_provider",
              "meeting_sdk",
              "zoom_meeting_id",
              "zoom_passcode",
              "zoom_join_url",
              "zoom_start_url",
              "scheduled_start_at",
              "scheduled_end_at",
              "zoom_recording_id",
              "zoom_recording_url",
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
          duration_sec: aula.duration_sec === null ? null : Number(aula.duration_sec),
          primary_asset_size_bytes:
            aula.primary_asset_size_bytes === null ? null : Number(aula.primary_asset_size_bytes),
        }));

        const aulaIds = aulasNormalizadas.map((aula) => aula.id);

        if (aulaIds.length > 0) {
          const { data: materiaisData, error: materiaisError } = await supabase
            .from("lesson_assets")
            .select(
              [
                "id",
                "lesson_id",
                "asset_type",
                "title",
                "storage_path",
                "file_name",
                "mime_type",
                "size_bytes",
                "sort_order",
                "created_at",
                "updated_at",
              ].join(",")
            )
            .in("lesson_id", aulaIds)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          if (materiaisError) throw materiaisError;

          materiaisNormalizados = (((materiaisData ?? []) as unknown as Material[])).map((material) => ({
            ...material,
            sort_order: Number(material.sort_order ?? 0),
            size_bytes: material.size_bytes === null ? null : Number(material.size_bytes),
          }));
        }
      }

      setCurso(cursoData as unknown as Curso);
      setModulos(modulosNormalizados);
      setAulas(aulasNormalizadas);
      setMateriais(materiaisNormalizados);
      setFormModulo((current) => ({
        ...current,
        sortOrder: String(modulosNormalizados.length),
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os módulos e aulas do curso.";

      setErro(message);
      setCurso(null);
      setModulos([]);
      setAulas([]);
      setMateriais([]);
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

  const materiaisPorAula = useMemo(() => {
    const mapa = new Map<string, Material[]>();
    for (const material of materiais) {
      const grupoAtual = mapa.get(material.lesson_id) ?? [];
      grupoAtual.push(material);
      mapa.set(material.lesson_id, grupoAtual);
    }
    return mapa;
  }, [materiais]);

  const totalModulos = modulos.length;
  const totalAulas = aulas.length;
  const totalPublicadas = aulas.filter((aula) => aula.status === "published").length;
  const totalPreviews = aulas.filter((aula) => aula.is_preview).length;

  function abrirModalNovoModulo() {
    setErroNovoModulo(null);
    setFormModulo({
      title: "",
      description: "",
      sortOrder: String(modulos.length),
      status: "draft",
    });
    setModalNovoModuloAberto(true);
  }

  function fecharModalNovoModulo() {
    if (salvandoModulo) return;
    setModalNovoModuloAberto(false);
    setErroNovoModulo(null);
  }

  function abrirVisualizacaoModulo(modulo: Modulo) {
    setModuloVisualizando(modulo);
  }

  function abrirEdicaoModulo(modulo: Modulo) {
    setErroEditarModulo(null);
    setModuloEditando(modulo);
    setFormEditarModulo({
      title: modulo.title,
      description: modulo.description ?? "",
      sortOrder: String(modulo.sort_order),
      status: (modulo.status as StatusModulo) || "draft",
    });
  }

  function fecharEdicaoModulo() {
    if (salvandoEdicaoModulo) return;
    setModuloEditando(null);
    setErroEditarModulo(null);
  }

  function abrirExclusaoModulo(modulo: Modulo) {
    setErroExcluirModulo(null);
    setModuloExcluindo(modulo);
  }

  function fecharExclusaoModulo() {
    if (excluindoModulo) return;
    setModuloExcluindo(null);
    setErroExcluirModulo(null);
  }

  function validarModulo() {
    if (!formModulo.title.trim()) return "Informe o título do módulo.";
    const ordem = Number(formModulo.sortOrder);
    if (Number.isNaN(ordem) || ordem < 0) return "Informe uma ordem válida para o módulo.";
    return null;
  }

  async function salvarNovoModulo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const erroValidacao = validarModulo();
    if (erroValidacao) {
      setErroNovoModulo(erroValidacao);
      return;
    }

    setSalvandoModulo(true);
    setErroNovoModulo(null);

    try {
      const payload = {
        course_id: cursoId,
        title: formModulo.title.trim(),
        description: formModulo.description.trim() || null,
        sort_order: Number(formModulo.sortOrder),
        status: formModulo.status,
      };

      const { error: insertError } = await supabase
        .from("course_modules")
        .insert(payload);

      if (insertError) throw insertError;

      setModalNovoModuloAberto(false);
      await carregarEstrutura(cursoId);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar o módulo.";

      setErroNovoModulo(mensagem);
    } finally {
      setSalvandoModulo(false);
    }
  }

  async function salvarEdicaoModulo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!moduloEditando) return;

    if (!formEditarModulo.title.trim()) {
      setErroEditarModulo("Informe o título do módulo.");
      return;
    }

    const ordem = Number(formEditarModulo.sortOrder);
    if (Number.isNaN(ordem) || ordem < 0) {
      setErroEditarModulo("Informe uma ordem válida para o módulo.");
      return;
    }

    setSalvandoEdicaoModulo(true);
    setErroEditarModulo(null);

    try {
      const payload = {
        title: formEditarModulo.title.trim(),
        description: formEditarModulo.description.trim() || null,
        sort_order: ordem,
        status: formEditarModulo.status,
      };

      const { error } = await supabase
        .from("course_modules")
        .update(payload)
        .eq("id", moduloEditando.id);

      if (error) throw error;

      setModuloEditando(null);
      await carregarEstrutura(cursoId);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar as alterações do módulo.";

      setErroEditarModulo(mensagem);
    } finally {
      setSalvandoEdicaoModulo(false);
    }
  }

  async function excluirModuloSelecionado() {
    if (!moduloExcluindo) return;

    setExcluindoModulo(true);
    setErroExcluirModulo(null);

    try {
      const aulasDoModulo = aulasPorModulo.get(moduloExcluindo.id) ?? [];
      const aulaIds = aulasDoModulo.map((aula) => aula.id);

      if (aulaIds.length > 0) {
        const { error: deleteAssetsError } = await supabase
          .from("lesson_assets")
          .delete()
          .in("lesson_id", aulaIds);

        if (deleteAssetsError) throw deleteAssetsError;

        const { error: deleteLessonsError } = await supabase
          .from("lessons")
          .delete()
          .eq("module_id", moduloExcluindo.id);

        if (deleteLessonsError) throw deleteLessonsError;
      }

      const { error: deleteModuleError } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduloExcluindo.id);

      if (deleteModuleError) throw deleteModuleError;

      setModuloExcluindo(null);
      await carregarEstrutura(cursoId);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível excluir o módulo.";

      setErroExcluirModulo(mensagem);
    } finally {
      setExcluindoModulo(false);
    }
  }

  function sourceModeForContentType(contentType: TipoConteudo): SourceMode {
    switch (contentType) {
      case "video":
        return "upload";
      case "pdf":
        return "upload";
      case "audio":
        return "upload";
      case "text":
        return "text";
      case "live":
        return "zoom_live";
      default:
        return "upload";
    }
  }

  function onChangeEditarTipoConteudo(contentType: TipoConteudo) {
    setArquivoEditarConteudoPrincipal(null);
    setFormEditarAula((current) => ({
      ...current,
      contentType,
      sourceMode: sourceModeForContentType(contentType),
      externalUrl: "",
      contentBody: "",
      zoomMeetingId: "",
      zoomPasscode: "",
      zoomJoinUrl: "",
      zoomStartUrl: "",
      zoomRecordingId: "",
      zoomRecordingUrl: "",
      scheduledStartAt: "",
      scheduledEndAt: "",
    }));
  }

  function onChangeTipoConteudo(contentType: TipoConteudo) {
    setArquivoConteudoPrincipal(null);
    setFormAula((current) => ({
      ...current,
      contentType,
      sourceMode: sourceModeForContentType(contentType),
      externalUrl: "",
      contentBody: "",
      zoomMeetingId: "",
      zoomPasscode: "",
      zoomJoinUrl: "",
      zoomStartUrl: "",
      zoomRecordingId: "",
      zoomRecordingUrl: "",
      scheduledStartAt: "",
      scheduledEndAt: "",
      durationSec: current.durationSec,
    }));
  }

  function abrirModalNovaAula(modulo: Modulo) {
    const aulasDoModulo = aulasPorModulo.get(modulo.id) ?? [];
    setModuloSelecionadoParaAula(modulo);
    setErroNovaAula(null);
    setArquivoConteudoPrincipal(null);
    setFormAula({
      ...formAulaInicial(),
      sortOrder: String(aulasDoModulo.length),
    });
    setModalNovaAulaAberto(true);
  }

  function fecharModalNovaAula() {
    if (salvandoAula) return;
    setModalNovaAulaAberto(false);
    setModuloSelecionadoParaAula(null);
    setErroNovaAula(null);
    setArquivoConteudoPrincipal(null);
  }

  function validarAula() {
    if (!moduloSelecionadoParaAula) {
      return "Selecione um módulo válido para a aula.";
    }

    if (!formAula.title.trim()) {
      return "Informe o título da aula.";
    }

    const ordem = Number(formAula.sortOrder);
    if (Number.isNaN(ordem) || ordem < 0) {
      return "Informe uma ordem válida para a aula.";
    }

    if (formAula.durationSec.trim()) {
      const duracao = Number(formAula.durationSec);
      if (Number.isNaN(duracao) || duracao < 0) {
        return "Informe uma duração válida em segundos.";
      }
    }

    if (formAula.contentType === "text") {
      if (!formAula.contentBody.trim()) {
        return "Informe o conteúdo textual da aula.";
      }
    }

    if (formAula.contentType === "video") {
      if (formAula.sourceMode === "upload" && !arquivoConteudoPrincipal) {
        return "Envie o arquivo do vídeo.";
      }
      if (formAula.sourceMode === "url" && !formAula.externalUrl.trim()) {
        return "Informe a URL do vídeo.";
      }
      if (formAula.sourceMode === "zoom_recording") {
        const zoomError = validarZoomRecordingUrl(formAula.zoomRecordingUrl);

        if (zoomError) return zoomError;
      }
    }

    if (formAula.contentType === "pdf" && !arquivoConteudoPrincipal) {
      return "Envie o arquivo PDF da aula.";
    }

    if (formAula.contentType === "audio" && !arquivoConteudoPrincipal) {
      return "Envie o arquivo de áudio da aula.";
    }

    if (formAula.contentType === "live") {
      if (!formAula.zoomMeetingId.trim()) {
        return "Informe o ID da reunião do Zoom.";
      }
      if (!formAula.zoomJoinUrl.trim()) {
        return "Informe o link de entrada da reunião do Zoom.";
      }
      if (!formAula.scheduledStartAt) {
        return "Informe a data e hora de início da aula ao vivo.";
      }
    }

    return null;
  }

  async function uploadConteudoPrincipal(): Promise<{
    primaryAssetPath: string | null;
    primaryAssetName: string | null;
    primaryAssetMimeType: string | null;
    primaryAssetSizeBytes: number | null;
  }> {
    if (!arquivoConteudoPrincipal || !moduloSelecionadoParaAula) {
      return {
        primaryAssetPath: null,
        primaryAssetName: null,
        primaryAssetMimeType: null,
        primaryAssetSizeBytes: null,
      };
    }

    const path = buildLessonContentPath(
      cursoId,
      moduloSelecionadoParaAula.id,
      formAula.contentType,
      arquivoConteudoPrincipal
    );

    const { error } = await supabase.storage
      .from(LESSON_CONTENT_BUCKET)
      .upload(path, arquivoConteudoPrincipal, {
        upsert: false,
        contentType: arquivoConteudoPrincipal.type || undefined,
      });

    if (error) throw error;

    return {
      primaryAssetPath: path,
      primaryAssetName: arquivoConteudoPrincipal.name,
      primaryAssetMimeType: arquivoConteudoPrincipal.type || null,
      primaryAssetSizeBytes: arquivoConteudoPrincipal.size || null,
    };
  }

  async function salvarNovaAula(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const erroValidacao = validarAula();
    if (erroValidacao) {
      setErroNovaAula(erroValidacao);
      return;
    }

    if (!moduloSelecionadoParaAula) {
      setErroNovaAula("Módulo não encontrado.");
      return;
    }

    setSalvandoAula(true);
    setErroNovaAula(null);

    try {
      const arquivo = await uploadConteudoPrincipal();

      const payload = {
        module_id: moduloSelecionadoParaAula.id,
        title: formAula.title.trim(),
        description: formAula.description.trim() || null,
        sort_order: Number(formAula.sortOrder),
        status: formAula.status,
        content_type: formAula.contentType,
        source_mode:
          formAula.contentType === "live"
            ? "zoom_live"
            : formAula.contentType === "text"
            ? "text"
            : formAula.sourceMode,
        content_body:
          formAula.contentType === "text" ? formAula.contentBody.trim() : null,
        primary_asset_path: arquivo.primaryAssetPath,
        primary_asset_name: arquivo.primaryAssetName,
        primary_asset_mime_type: arquivo.primaryAssetMimeType,
        primary_asset_size_bytes: arquivo.primaryAssetSizeBytes,
        external_url:
          formAula.contentType === "video" && formAula.sourceMode === "url"
            ? cleanTextUrl(formAula.externalUrl)
            : formAula.contentType === "video" &&
              formAula.sourceMode === "zoom_recording"
            ? cleanZoomRecordingUrl(formAula.zoomRecordingUrl)
            : null,
        live_provider: formAula.contentType === "live" ? "zoom" : null,
        meeting_sdk: formAula.contentType === "live" ? "zoom-meeting-sdk" : null,
        zoom_meeting_id:
          formAula.contentType === "live"
            ? formAula.zoomMeetingId.trim() || null
            : null,
        zoom_passcode:
          formAula.contentType === "live"
            ? formAula.zoomPasscode.trim() || null
            : null,
        zoom_join_url:
          formAula.contentType === "live"
            ? cleanTextUrl(formAula.zoomJoinUrl) || null
            : null,
        zoom_start_url:
          formAula.contentType === "live"
            ? cleanTextUrl(formAula.zoomStartUrl) || null
            : null,
        scheduled_start_at:
          formAula.contentType === "live" && formAula.scheduledStartAt
            ? new Date(formAula.scheduledStartAt).toISOString()
            : null,
        scheduled_end_at:
          formAula.contentType === "live" && formAula.scheduledEndAt
            ? new Date(formAula.scheduledEndAt).toISOString()
            : null,
        zoom_recording_id:
          formAula.contentType === "video" &&
          formAula.sourceMode === "zoom_recording"
            ? formAula.zoomRecordingId.trim() || null
            : null,
        zoom_recording_url:
          formAula.contentType === "video" &&
          formAula.sourceMode === "zoom_recording"
            ? cleanZoomRecordingUrl(formAula.zoomRecordingUrl) || null
            : null,
        video_provider:
          formAula.contentType === "video" && formAula.sourceMode === "zoom_recording"
            ? "zoom"
            : formAula.contentType === "live"
            ? "zoom"
            : null,
        video_url:
          formAula.contentType === "video" && formAula.sourceMode === "url"
            ? cleanTextUrl(formAula.externalUrl)
            : formAula.contentType === "video" &&
              formAula.sourceMode === "zoom_recording"
            ? cleanZoomRecordingUrl(formAula.zoomRecordingUrl)
            : null,
        duration_sec: formAula.durationSec.trim()
          ? Number(formAula.durationSec)
          : null,
        is_preview: formAula.isPreview,
        released_at: formAula.releasedAt
          ? new Date(formAula.releasedAt).toISOString()
          : null,
      };

      const { error: insertError } = await supabase.from("lessons").insert(payload);

      if (insertError) throw insertError;

      setModalNovaAulaAberto(false);
      setModuloSelecionadoParaAula(null);
      setArquivoConteudoPrincipal(null);
      await carregarEstrutura(cursoId);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar a aula.";

      setErroNovaAula(mensagem);
    } finally {
      setSalvandoAula(false);
    }
  }

  function abrirModalMateriais(aula: Aula) {
    const materiaisDaAula = materiaisPorAula.get(aula.id) ?? [];
    setAulaSelecionadaParaMateriais(aula);
    setErroMaterial(null);
    setArquivoMaterial(null);
    setFormMaterial({
      ...formMaterialInicial(),
      sortOrder: String(materiaisDaAula.length),
    });
    setModalMateriaisAberto(true);
  }

  function fecharModalMateriais() {
    if (salvandoMaterial) return;
    setModalMateriaisAberto(false);
    setAulaSelecionadaParaMateriais(null);
    setErroMaterial(null);
    setArquivoMaterial(null);
  }

  function validarMaterial() {
    if (!aulaSelecionadaParaMateriais) {
      return "Selecione uma aula válida para o material.";
    }

    if (!formMaterial.assetType.trim()) {
      return "Informe o tipo do material.";
    }

    if (!arquivoMaterial) {
      return "Selecione o arquivo do material.";
    }

    const ordem = Number(formMaterial.sortOrder);
    if (Number.isNaN(ordem) || ordem < 0) {
      return "Informe uma ordem válida para o material.";
    }

    return null;
  }

  async function salvarNovoMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const erroValidacao = validarMaterial();
    if (erroValidacao) {
      setErroMaterial(erroValidacao);
      return;
    }

    if (!aulaSelecionadaParaMateriais || !arquivoMaterial) {
      setErroMaterial("Aula ou arquivo do material não encontrado.");
      return;
    }

    setSalvandoMaterial(true);
    setErroMaterial(null);

    try {
      const storagePath = buildLessonMaterialPath(
        cursoId,
        aulaSelecionadaParaMateriais.id,
        formMaterial.assetType.trim(),
        arquivoMaterial
      );

      const { error: uploadError } = await supabase.storage
        .from(LESSON_MATERIALS_BUCKET)
        .upload(storagePath, arquivoMaterial, {
          upsert: false,
          contentType: arquivoMaterial.type || undefined,
        });

      if (uploadError) throw uploadError;

      const payload = {
        lesson_id: aulaSelecionadaParaMateriais.id,
        asset_type: formMaterial.assetType.trim(),
        title: formMaterial.title.trim() || null,
        storage_path: storagePath,
        file_name: arquivoMaterial.name,
        mime_type: arquivoMaterial.type || null,
        size_bytes: arquivoMaterial.size || null,
        sort_order: Number(formMaterial.sortOrder),
      };

      const { error: insertError } = await supabase
        .from("lesson_assets")
        .insert(payload);

      if (insertError) throw insertError;

      await carregarEstrutura(cursoId);
      setArquivoMaterial(null);
      setFormMaterial({
        ...formMaterialInicial(),
        sortOrder: String(
          (materiaisPorAula.get(aulaSelecionadaParaMateriais.id) ?? []).length + 1
        ),
      });
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar o material.";

      setErroMaterial(mensagem);
    } finally {
      setSalvandoMaterial(false);
    }
  }


  function abrirVisualizacaoAula(aula: Aula) {
    setAulaVisualizando(aula);
  }

  function abrirEdicaoAula(aula: Aula) {
    setErroEditarAula(null);
    setArquivoEditarConteudoPrincipal(null);
    setAulaEditando(aula);
    setFormEditarAula(buildEditAulaForm(aula));
  }

  function fecharEdicaoAula() {
    if (salvandoEdicaoAula) return;
    setAulaEditando(null);
    setErroEditarAula(null);
    setArquivoEditarConteudoPrincipal(null);
  }

  function abrirExclusaoAula(aula: Aula) {
    setErroExcluirAula(null);
    setAulaExcluindo(aula);
  }

  function fecharExclusaoAula() {
    if (excluindoAula) return;
    setAulaExcluindo(null);
    setErroExcluirAula(null);
  }

  function validarEdicaoAula() {
    if (!aulaEditando) {
      return "Aula não encontrada.";
    }

    if (!formEditarAula.moduleId) {
      return "Selecione um módulo válido para a aula.";
    }

    if (!formEditarAula.title.trim()) {
      return "Informe o título da aula.";
    }

    const ordem = Number(formEditarAula.sortOrder);
    if (Number.isNaN(ordem) || ordem < 0) {
      return "Informe uma ordem válida para a aula.";
    }

    if (formEditarAula.durationSec.trim()) {
      const duracao = Number(formEditarAula.durationSec);
      if (Number.isNaN(duracao) || duracao < 0) {
        return "Informe uma duração válida em segundos.";
      }
    }

    if (formEditarAula.contentType === "text" && !formEditarAula.contentBody.trim()) {
      return "Informe o conteúdo textual da aula.";
    }

    if (formEditarAula.contentType === "video") {
      const hasCurrentUpload = Boolean(aulaEditando.primary_asset_path);
      if (
        formEditarAula.sourceMode === "upload" &&
        !arquivoEditarConteudoPrincipal &&
        !hasCurrentUpload
      ) {
        return "Envie o arquivo do vídeo.";
      }
      if (
        formEditarAula.sourceMode === "url" &&
        !formEditarAula.externalUrl.trim()
      ) {
        return "Informe a URL do vídeo.";
      }
      if (formEditarAula.sourceMode === "zoom_recording") {
        const zoomError = validarZoomRecordingUrl(formEditarAula.zoomRecordingUrl);

        if (zoomError) return zoomError;
      }
    }

    if (formEditarAula.contentType === "pdf") {
      const hasCurrentUpload = Boolean(aulaEditando.primary_asset_path);
      if (!arquivoEditarConteudoPrincipal && !hasCurrentUpload) {
        return "Envie o arquivo PDF da aula.";
      }
    }

    if (formEditarAula.contentType === "audio") {
      const hasCurrentUpload = Boolean(aulaEditando.primary_asset_path);
      if (!arquivoEditarConteudoPrincipal && !hasCurrentUpload) {
        return "Envie o arquivo de áudio da aula.";
      }
    }

    if (formEditarAula.contentType === "live") {
      if (!formEditarAula.zoomMeetingId.trim()) {
        return "Informe o ID da reunião do Zoom.";
      }
      if (!formEditarAula.zoomJoinUrl.trim()) {
        return "Informe o link de entrada da reunião do Zoom.";
      }
      if (!formEditarAula.scheduledStartAt) {
        return "Informe a data e hora de início da aula ao vivo.";
      }
    }

    return null;
  }

  async function uploadEditarConteudoPrincipal(): Promise<{
    primaryAssetPath: string | null;
    primaryAssetName: string | null;
    primaryAssetMimeType: string | null;
    primaryAssetSizeBytes: number | null;
  }> {
    if (!arquivoEditarConteudoPrincipal || !formEditarAula.moduleId) {
      return {
        primaryAssetPath: aulaEditando?.primary_asset_path ?? null,
        primaryAssetName: aulaEditando?.primary_asset_name ?? null,
        primaryAssetMimeType: aulaEditando?.primary_asset_mime_type ?? null,
        primaryAssetSizeBytes: aulaEditando?.primary_asset_size_bytes ?? null,
      };
    }

    const path = buildLessonContentPath(
      cursoId,
      formEditarAula.moduleId,
      formEditarAula.contentType,
      arquivoEditarConteudoPrincipal
    );

    const { error } = await supabase.storage
      .from(LESSON_CONTENT_BUCKET)
      .upload(path, arquivoEditarConteudoPrincipal, {
        upsert: false,
        contentType: arquivoEditarConteudoPrincipal.type || undefined,
      });

    if (error) throw error;

    return {
      primaryAssetPath: path,
      primaryAssetName: arquivoEditarConteudoPrincipal.name,
      primaryAssetMimeType: arquivoEditarConteudoPrincipal.type || null,
      primaryAssetSizeBytes: arquivoEditarConteudoPrincipal.size || null,
    };
  }

  async function salvarEdicaoAula(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aulaEditando) return;

    const erroValidacao = validarEdicaoAula();
    if (erroValidacao) {
      setErroEditarAula(erroValidacao);
      return;
    }

    setSalvandoEdicaoAula(true);
    setErroEditarAula(null);

    try {
      const arquivo = await uploadEditarConteudoPrincipal();
      const isUploadType =
        formEditarAula.contentType === "video"
          ? formEditarAula.sourceMode === "upload"
          : formEditarAula.contentType === "pdf" || formEditarAula.contentType === "audio";

      const payload = {
        module_id: formEditarAula.moduleId,
        title: formEditarAula.title.trim(),
        description: formEditarAula.description.trim() || null,
        sort_order: Number(formEditarAula.sortOrder),
        status: formEditarAula.status,
        content_type: formEditarAula.contentType,
        source_mode:
          formEditarAula.contentType === "live"
            ? "zoom_live"
            : formEditarAula.contentType === "text"
            ? "text"
            : formEditarAula.sourceMode,
        content_body:
          formEditarAula.contentType === "text"
            ? formEditarAula.contentBody.trim()
            : null,
        primary_asset_path: isUploadType ? arquivo.primaryAssetPath : null,
        primary_asset_name: isUploadType ? arquivo.primaryAssetName : null,
        primary_asset_mime_type: isUploadType ? arquivo.primaryAssetMimeType : null,
        primary_asset_size_bytes: isUploadType ? arquivo.primaryAssetSizeBytes : null,
        external_url:
          formEditarAula.contentType === "video" && formEditarAula.sourceMode === "url"
            ? cleanTextUrl(formEditarAula.externalUrl)
            : formEditarAula.contentType === "video" &&
              formEditarAula.sourceMode === "zoom_recording"
            ? cleanZoomRecordingUrl(formEditarAula.zoomRecordingUrl)
            : null,
        live_provider: formEditarAula.contentType === "live" ? "zoom" : null,
        meeting_sdk:
          formEditarAula.contentType === "live" ? "zoom-meeting-sdk" : null,
        zoom_meeting_id:
          formEditarAula.contentType === "live"
            ? formEditarAula.zoomMeetingId.trim() || null
            : null,
        zoom_passcode:
          formEditarAula.contentType === "live"
            ? formEditarAula.zoomPasscode.trim() || null
            : null,
        zoom_join_url:
          formEditarAula.contentType === "live"
            ? cleanTextUrl(formEditarAula.zoomJoinUrl) || null
            : null,
        zoom_start_url:
          formEditarAula.contentType === "live"
            ? cleanTextUrl(formEditarAula.zoomStartUrl) || null
            : null,
        scheduled_start_at:
          formEditarAula.contentType === "live" && formEditarAula.scheduledStartAt
            ? new Date(formEditarAula.scheduledStartAt).toISOString()
            : null,
        scheduled_end_at:
          formEditarAula.contentType === "live" && formEditarAula.scheduledEndAt
            ? new Date(formEditarAula.scheduledEndAt).toISOString()
            : null,
        zoom_recording_id:
          formEditarAula.contentType === "video" &&
          formEditarAula.sourceMode === "zoom_recording"
            ? formEditarAula.zoomRecordingId.trim() || null
            : null,
        zoom_recording_url:
          formEditarAula.contentType === "video" &&
          formEditarAula.sourceMode === "zoom_recording"
            ? cleanZoomRecordingUrl(formEditarAula.zoomRecordingUrl) || null
            : null,
        video_provider:
          formEditarAula.contentType === "video" &&
          formEditarAula.sourceMode === "zoom_recording"
            ? "zoom"
            : formEditarAula.contentType === "live"
            ? "zoom"
            : null,
        video_url:
          formEditarAula.contentType === "video" &&
          formEditarAula.sourceMode === "url"
            ? cleanTextUrl(formEditarAula.externalUrl)
            : formEditarAula.contentType === "video" &&
              formEditarAula.sourceMode === "zoom_recording"
            ? cleanZoomRecordingUrl(formEditarAula.zoomRecordingUrl)
            : null,
        duration_sec: formEditarAula.durationSec.trim()
          ? Number(formEditarAula.durationSec)
          : null,
        is_preview: formEditarAula.isPreview,
        released_at: formEditarAula.releasedAt
          ? new Date(formEditarAula.releasedAt).toISOString()
          : null,
      };

      const { error } = await supabase
        .from("lessons")
        .update(payload)
        .eq("id", aulaEditando.id);

      if (error) throw error;

      setAulaEditando(null);
      setArquivoEditarConteudoPrincipal(null);
      await carregarEstrutura(cursoId);
    } catch (error) {
      setErroEditarAula(
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar as alterações da aula."
      );
    } finally {
      setSalvandoEdicaoAula(false);
    }
  }

  async function excluirAulaSelecionada() {
    if (!aulaExcluindo) return;

    setExcluindoAula(true);
    setErroExcluirAula(null);

    try {
      const { error: deleteAssetsError } = await supabase
        .from("lesson_assets")
        .delete()
        .eq("lesson_id", aulaExcluindo.id);

      if (deleteAssetsError) throw deleteAssetsError;

      const { error: deleteLessonError } = await supabase
        .from("lessons")
        .delete()
        .eq("id", aulaExcluindo.id);

      if (deleteLessonError) throw deleteLessonError;

      setAulaExcluindo(null);
      await carregarEstrutura(cursoId);
    } catch (error) {
      setErroExcluirAula(
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível excluir a aula."
      );
    } finally {
      setExcluindoAula(false);
    }
  }

  function abrirVisualizacaoMaterial(material: Material) {
    setMaterialVisualizando(material);
  }

  function abrirEdicaoMaterial(material: Material) {
    setErroEditarMaterial(null);
    setArquivoEditarMaterial(null);
    setMaterialEditando(material);
    setFormEditarMaterialMeta({
      assetType: material.asset_type,
      title: material.title ?? "",
      sortOrder: String(material.sort_order),
    });
  }

  function fecharEdicaoMaterial() {
    if (salvandoEdicaoMaterial) return;
    setMaterialEditando(null);
    setErroEditarMaterial(null);
    setArquivoEditarMaterial(null);
  }

  function abrirExclusaoMaterial(material: Material) {
    setErroExcluirMaterial(null);
    setMaterialExcluindo(material);
  }

  function fecharExclusaoMaterial() {
    if (excluindoMaterial) return;
    setMaterialExcluindo(null);
    setErroExcluirMaterial(null);
  }

  async function salvarEdicaoMaterialMeta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!materialEditando) return;

    if (!formEditarMaterialMeta.assetType.trim()) {
      setErroEditarMaterial("Informe o tipo do material.");
      return;
    }

    const ordem = Number(formEditarMaterialMeta.sortOrder);
    if (Number.isNaN(ordem) || ordem < 0) {
      setErroEditarMaterial("Informe uma ordem válida para o material.");
      return;
    }

    setSalvandoEdicaoMaterial(true);
    setErroEditarMaterial(null);

    try {
      const payload: Record<string, unknown> = {
        asset_type: formEditarMaterialMeta.assetType.trim(),
        title: formEditarMaterialMeta.title.trim() || null,
        sort_order: ordem,
      };

      if (arquivoEditarMaterial) {
        const storagePath = buildLessonMaterialPath(
          cursoId,
          materialEditando.lesson_id,
          formEditarMaterialMeta.assetType.trim(),
          arquivoEditarMaterial
        );

        const { error: uploadError } = await supabase.storage
          .from(LESSON_MATERIALS_BUCKET)
          .upload(storagePath, arquivoEditarMaterial, {
            upsert: false,
            contentType: arquivoEditarMaterial.type || undefined,
          });

        if (uploadError) throw uploadError;

        payload.storage_path = storagePath;
        payload.file_name = arquivoEditarMaterial.name;
        payload.mime_type = arquivoEditarMaterial.type || null;
        payload.size_bytes = arquivoEditarMaterial.size || null;
      }

      const { error } = await supabase
        .from("lesson_assets")
        .update(payload)
        .eq("id", materialEditando.id);

      if (error) throw error;

      setMaterialEditando(null);
      setArquivoEditarMaterial(null);
      await carregarEstrutura(cursoId);
    } catch (error) {
      setErroEditarMaterial(
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar as alterações do material."
      );
    } finally {
      setSalvandoEdicaoMaterial(false);
    }
  }

  async function excluirMaterialSelecionado() {
    if (!materialExcluindo) return;

    setExcluindoMaterial(true);
    setErroExcluirMaterial(null);

    try {
      const { error } = await supabase
        .from("lesson_assets")
        .delete()
        .eq("id", materialExcluindo.id);

      if (error) throw error;

      setMaterialExcluindo(null);
      await carregarEstrutura(cursoId);
    } catch (error) {
      setErroExcluirMaterial(
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível excluir o material."
      );
    } finally {
      setExcluindoMaterial(false);
    }
  }

  const materiaisDaAulaSelecionada = aulaSelecionadaParaMateriais
    ? materiaisPorAula.get(aulaSelecionadaParaMateriais.id) ?? []
    : [];

  return (
    <div className="min-h-screen bg-transparent text-[#111827]">
      <div className="flex w-full flex-col gap-6">
        <section className="rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-4xl">
                <Link
                  href={`/admin/cursos/${cursoId}`}
                  className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#667085] transition hover:text-[#101828]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o curso
                </Link>

                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9B6B22]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Módulos e aulas
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A] md:text-4xl">
                  {carregando ? "Carregando estrutura..." : curso?.title ?? "Estrutura do curso"}
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#667085] md:text-base">
                  {carregando
                    ? "Buscando módulos, aulas e materiais reais do curso selecionado."
                    : resumoCurso(curso)}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void carregarEstrutura(cursoId)}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar
                </button>

                <button
                  type="button"
                  onClick={abrirModalNovoModulo}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]"
                >
                  <Plus className="h-4 w-4" />
                  Novo módulo
                </button>
              </div>
            </div>

          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Módulos" value={String(totalModulos).padStart(2, "0")} icon={<Layers3 className="h-5 w-5" />} iconTone="gold" />
          <MetricCard title="Aulas" value={String(totalAulas).padStart(2, "0")} icon={<PlayCircle className="h-5 w-5" />} iconTone="blue" />
          <MetricCard title="Publicadas" value={String(totalPublicadas).padStart(2, "0")} icon={<BookOpen className="h-5 w-5" />} iconTone="violet" />
          <MetricCard title="Prévias" value={String(totalPreviews).padStart(2, "0")} icon={<Sparkles className="h-5 w-5" />} iconTone="goldSoft" />
        </section>

        <section className="rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="border-b border-[#EEF1F5] p-5 md:p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[#101828]">
              Gestão operacional
            </h2>
            <p className="mt-2 text-sm text-[#667085]">
              Organize o curso em módulos, aulas e materiais sem sair desta tela.
            </p>
          </div>

          {erro ? (
            <div className="p-6">
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 p-5">
                <h3 className="text-sm font-semibold text-rose-700">
                  Erro ao carregar estrutura
                </h3>
                <p className="mt-2 text-sm leading-6 text-rose-600">{erro}</p>
              </div>
            </div>
          ) : carregando ? (
            <div className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[20px] border border-[#EEF1F5] bg-[#FCFCFD] p-5"
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
              <div className="mb-4 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] p-4">
                <FolderKanban className="h-6 w-6 text-[#98A2B3]" />
              </div>
              <h3 className="text-base font-semibold text-[#101828]">
                Nenhum módulo cadastrado
              </h3>
              <p className="mt-2 max-w-md text-sm text-[#667085]">
                Este curso ainda não possui módulos cadastrados no banco.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EEF1F5]">
              {modulos.map((modulo, moduloIndex) => {
                const aulasDoModulo = aulasPorModulo.get(modulo.id) ?? [];

                return (
                  <article key={modulo.id} className="p-5 md:p-6">
                    <div className="rounded-[24px] border border-[#E7EAF0] bg-[#FCFCFD]">
                      <div className="flex flex-col gap-4 border-b border-[#EEF1F5] p-5 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-2.5 py-1 text-[11px] font-semibold text-[#9B6B22]">
                              Módulo {moduloIndex + 1}
                            </span>

                            <span
                              className={cx(
                                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                                statusClasses(modulo.status)
                              )}
                            >
                              {traduzirStatus(modulo.status)}
                            </span>
                          </div>

                          <h3 className="mt-3 text-lg font-semibold text-[#101828]">
                            {modulo.title}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-[#667085]">
                            {modulo.description?.trim() ||
                              "Sem descrição cadastrada para este módulo."}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-medium text-[#475467]">
                            Ordem {modulo.sort_order}
                          </span>
                          <span className="rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-medium text-[#475467]">
                            {aulasDoModulo.length} aula(s)
                          </span>
                          <button
                            type="button"
                            onClick={() => abrirVisualizacaoModulo(modulo)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Visualizar
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEdicaoModulo(modulo)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirExclusaoModulo(modulo)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirModalNovaAula(modulo)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Nova aula
                          </button>
                        </div>
                      </div>

                      <div className="p-5">
                        {aulasDoModulo.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#DDE3EA] bg-white px-4 py-5 text-sm text-[#667085]">
                            Este módulo ainda não possui aulas cadastradas.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {aulasDoModulo.map((aula, aulaIndex) => {
                              const totalMateriaisAula =
                                (materiaisPorAula.get(aula.id) ?? []).length;

                              return (
                                <div
                                  key={aula.id}
                                  className="rounded-[18px] border border-[#E7EAF0] bg-white p-4"
                                >
                                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full border border-[#D9E6F5] bg-[#EEF5FB] px-2.5 py-1 text-[11px] font-medium text-[#476A8E]">
                                          Aula {aulaIndex + 1}
                                        </span>

                                        <span
                                          className={cx(
                                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                                            statusClasses(aula.status)
                                          )}
                                        >
                                          {traduzirStatus(aula.status)}
                                        </span>

                                        {aula.is_preview ? (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-2.5 py-1 text-[11px] font-semibold text-[#9B6B22]">
                                            <Sparkles className="h-3 w-3" />
                                            Prévia
                                          </span>
                                        ) : null}

                                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-medium text-[#475467]">
                                          {iconeConteudo(aula.content_type)}
                                          {traduzirTipoConteudo(aula.content_type)}
                                        </span>

                                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-medium text-[#475467]">
                                          <Paperclip className="h-3 w-3" />
                                          {totalMateriaisAula} material(is)
                                        </span>

                                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#667085]">
                                          <LinkIcon className="h-3 w-3" />
                                          {traduzirSourceMode(aula.source_mode)}
                                        </span>
                                      </div>

                                      <h4 className="mt-3 text-base font-semibold text-[#101828]">
                                        {aula.title}
                                      </h4>

                                      <p className="mt-2 text-sm leading-6 text-[#667085]">
                                        {aula.description?.trim() ||
                                          "Sem descrição cadastrada para esta aula."}
                                      </p>
                                    </div>

                                    <div className="grid min-w-[240px] grid-cols-2 gap-2">
                                      <MiniInfo label="Ordem" value={String(aula.sort_order)} />
                                      <MiniInfo label="Duração" value={formatarDuracao(aula.duration_sec)} />
                                      <MiniInfo label="Liberação" value={formatarData(aula.released_at)} />
                                      <MiniInfo label="Atualizado" value={formatarData(aula.updated_at)} />
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap items-center gap-2">
                                    {aula.primary_asset_name ? (
                                      <span className="rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1.5 text-xs font-medium text-[#475467]">
                                        Arquivo: {aula.primary_asset_name}
                                      </span>
                                    ) : null}

                                    {aula.external_url ? (
                                      <span className="rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1.5 text-xs font-medium text-[#475467]">
                                        URL configurada
                                      </span>
                                    ) : null}

                                    {aula.zoom_meeting_id ? (
                                      <span className="rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1.5 text-xs font-medium text-[#475467]">
                                        Zoom Meeting ID: {aula.zoom_meeting_id}
                                      </span>
                                    ) : null}

                                    <button
                                      type="button"
                                      onClick={() => abrirVisualizacaoAula(aula)}
                                      className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Visualizar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => abrirEdicaoAula(aula)}
                                      className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                                    >
                                      <PencilLine className="h-3.5 w-3.5" />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => abrirExclusaoAula(aula)}
                                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Excluir
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => abrirModalMateriais(aula)}
                                      className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                                    >
                                      Gerenciar materiais
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
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

            {moduloVisualizando ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-2xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#475467]">
                    <Eye className="h-3.5 w-3.5" />
                    Visualização do módulo
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">
                    {moduloVisualizando.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    Visualize os dados principais do módulo criado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModuloVisualizando(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <InfoPill icon={<Layers3 className="h-4 w-4" />} label="Título" value={moduloVisualizando.title} />
                <InfoPill icon={<Clock3 className="h-4 w-4" />} label="Status" value={traduzirStatus(moduloVisualizando.status)} />
                <InfoPill icon={<BookOpen className="h-4 w-4" />} label="Ordem" value={String(moduloVisualizando.sort_order)} />
                <InfoPill icon={<PlayCircle className="h-4 w-4" />} label="Aulas vinculadas" value={String((aulasPorModulo.get(moduloVisualizando.id) ?? []).length)} />
                <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#98A2B3]">
                    Descrição
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#101828]">
                    {moduloVisualizando.description?.trim() || "Sem descrição cadastrada para este módulo."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {moduloEditando ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-2xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9B6B22]">
                    <PencilLine className="h-3.5 w-3.5" />
                    Editar módulo
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">
                    Editar módulo
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    Ajuste os dados do módulo selecionado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharEdicaoModulo}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={salvarEdicaoModulo} className="p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {erroEditarModulo ? (
                    <div className="md:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                      <h3 className="text-sm font-semibold text-rose-700">
                        Não foi possível salvar o módulo
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-rose-600">
                        {erroEditarModulo}
                      </p>
                    </div>
                  ) : null}

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#344054]">
                      Título do módulo
                    </label>
                    <input
                      type="text"
                      value={formEditarModulo.title}
                      onChange={(e) =>
                        setFormEditarModulo((current) => ({
                          ...current,
                          title: e.target.value,
                        }))
                      }
                      className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#344054]">
                      Ordem
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formEditarModulo.sortOrder}
                      onChange={(e) =>
                        setFormEditarModulo((current) => ({
                          ...current,
                          sortOrder: e.target.value,
                        }))
                      }
                      className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#344054]">
                      Status
                    </label>
                    <select
                      value={formEditarModulo.status}
                      onChange={(e) =>
                        setFormEditarModulo((current) => ({
                          ...current,
                          status: e.target.value as StatusModulo,
                        }))
                      }
                      className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="published">Publicado</option>
                      <option value="archived">Arquivado</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#344054]">
                      Descrição
                    </label>
                    <textarea
                      rows={5}
                      value={formEditarModulo.description}
                      onChange={(e) =>
                        setFormEditarModulo((current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                      className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={fecharEdicaoModulo}
                    disabled={salvandoEdicaoModulo}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={salvandoEdicaoModulo}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {salvandoEdicaoModulo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {salvandoEdicaoModulo ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {moduloExcluindo ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Excluir módulo
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">
                    Confirmar exclusão
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    O módulo será removido com todas as aulas e materiais vinculados a ele.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharExclusaoModulo}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                {erroExcluirModulo ? (
                  <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                    <h3 className="text-sm font-semibold text-rose-700">
                      Não foi possível excluir o módulo
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-rose-600">
                      {erroExcluirModulo}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4 text-sm leading-6 text-[#667085]">
                    Você está prestes a excluir o módulo <strong>{moduloExcluindo.title}</strong>.
                    Esta ação também removerá as aulas e os materiais ligados a ele.
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={fecharExclusaoModulo}
                    disabled={excluindoModulo}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => void excluirModuloSelecionado()}
                    disabled={excluindoModulo}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {excluindoModulo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {excluindoModulo ? "Excluindo..." : "Confirmar exclusão"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalNovoModuloAberto ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-2xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9B6B22]">
                    <Layers3 className="h-3.5 w-3.5" />
                    Novo módulo
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">
                    Cadastrar módulo
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    Cadastre um novo módulo dentro deste curso.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModalNovoModulo}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={salvarNovoModulo} className="p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {erroNovoModulo ? (
                    <div className="md:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                      <h3 className="text-sm font-semibold text-rose-700">
                        Não foi possível salvar o módulo
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-rose-600">
                        {erroNovoModulo}
                      </p>
                    </div>
                  ) : null}

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#344054]">
                      Título do módulo
                    </label>
                    <input
                      type="text"
                      value={formModulo.title}
                      onChange={(e) =>
                        setFormModulo((current) => ({
                          ...current,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Digite o nome do módulo"
                      className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#344054]">
                      Ordem
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formModulo.sortOrder}
                      onChange={(e) =>
                        setFormModulo((current) => ({
                          ...current,
                          sortOrder: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#344054]">
                      Status
                    </label>
                    <select
                      value={formModulo.status}
                      onChange={(e) =>
                        setFormModulo((current) => ({
                          ...current,
                          status: e.target.value as StatusModulo,
                        }))
                      }
                      className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="published">Publicado</option>
                      <option value="archived">Arquivado</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#344054]">
                      Descrição
                    </label>
                    <textarea
                      rows={5}
                      value={formModulo.description}
                      onChange={(e) =>
                        setFormModulo((current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Descreva o módulo"
                      className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={fecharModalNovoModulo}
                    disabled={salvandoModulo}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={salvandoModulo}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {salvandoModulo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {salvandoModulo ? "Salvando..." : "Salvar módulo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {modalNovaAulaAberto ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-4xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#D9E6F5] bg-[#EEF5FB] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#476A8E]">
                    <PlayCircle className="h-3.5 w-3.5" />
                    Nova aula
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">
                    Cadastrar aula
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    {moduloSelecionadoParaAula
                      ? `Cadastre a aula no módulo "${moduloSelecionadoParaAula.title}".`
                      : "Cadastre uma nova aula no módulo selecionado."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModalNovaAula}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                <form onSubmit={salvarNovaAula} className="p-6">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {erroNovaAula ? (
                      <div className="md:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                        <h3 className="text-sm font-semibold text-rose-700">
                          Não foi possível salvar a aula
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-rose-600">
                          {erroNovaAula}
                        </p>
                      </div>
                    ) : null}

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Título da aula
                      </label>
                      <input
                        type="text"
                        value={formAula.title}
                        onChange={(e) =>
                          setFormAula((current) => ({
                            ...current,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Digite o nome da aula"
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Tipo de conteúdo
                      </label>
                      <select
                        value={formAula.contentType}
                        onChange={(e) => onChangeTipoConteudo(e.target.value as TipoConteudo)}
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      >
                        <option value="video">Vídeo</option>
                        <option value="pdf">PDF</option>
                        <option value="audio">Áudio</option>
                        <option value="text">Texto</option>
                        <option value="live">Ao vivo</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Status
                      </label>
                      <select
                        value={formAula.status}
                        onChange={(e) =>
                          setFormAula((current) => ({
                            ...current,
                            status: e.target.value as StatusAula,
                          }))
                        }
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      >
                        <option value="draft">Rascunho</option>
                        <option value="published">Publicado</option>
                        <option value="archived">Arquivado</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Ordem
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formAula.sortOrder}
                        onChange={(e) =>
                          setFormAula((current) => ({
                            ...current,
                            sortOrder: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Duração em segundos
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formAula.durationSec}
                        onChange={(e) =>
                          setFormAula((current) => ({
                            ...current,
                            durationSec: e.target.value,
                          }))
                        }
                        placeholder="Ex.: 600"
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    {formAula.contentType === "video" ? (
                      <>
                        <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#101828]">
                            <Video className="h-4 w-4 text-[#476A8E]" />
                            Origem do vídeo
                          </div>

                          <select
                            value={formAula.sourceMode}
                            onChange={(e) =>
                              setFormAula((current) => ({
                                ...current,
                                sourceMode: e.target.value as SourceMode,
                                externalUrl: "",
                                zoomRecordingId: "",
                                zoomRecordingUrl: "",
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-white px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          >
                            <option value="upload">Upload de vídeo</option>
                            <option value="url">Vídeo por URL</option>
                            <option value="zoom_recording">Vídeo gravado no Zoom</option>
                          </select>
                        </div>

                        {formAula.sourceMode === "upload" ? (
                          <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                            <label className="mb-3 block text-sm font-semibold text-[#344054]">
                              Arquivo de vídeo
                            </label>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="text-sm text-[#667085]">
                                {arquivoConteudoPrincipal
                                  ? `${arquivoConteudoPrincipal.name} • ${formatarTamanho(arquivoConteudoPrincipal.size)}`
                                  : "Nenhum vídeo selecionado."}
                              </div>

                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                                <Upload className="h-4 w-4" />
                                Enviar vídeo
                                <input
                                  type="file"
                                  accept={getAcceptedMimeByContentType("video")}
                                  className="hidden"
                                  onChange={(e) =>
                                    setArquivoConteudoPrincipal(e.target.files?.[0] ?? null)
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        ) : null}

                        {formAula.sourceMode === "url" ? (
                          <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-[#344054]">
                              URL do vídeo
                            </label>
                            <input
                              type="text"
                              value={formAula.externalUrl}
                              onChange={(e) =>
                                setFormAula((current) => ({
                                  ...current,
                                  externalUrl: e.target.value,
                                }))
                              }
                              placeholder="Cole a URL do vídeo"
                              className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                            />
                          </div>
                        ) : null}

                        {formAula.sourceMode === "zoom_recording" ? (
                          <>
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                ID da gravação Zoom
                              </label>
                              <input
                                type="text"
                                value={formAula.zoomRecordingId}
                                onChange={(e) =>
                                  setFormAula((current) => ({
                                    ...current,
                                    zoomRecordingId: e.target.value,
                                  }))
                                }
                                placeholder="Ex.: gravação ou uuid"
                                className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                Link compartilhável da gravação Zoom
                              </label>
                              <input
                                type="text"
                                value={formAula.zoomRecordingUrl}
                                onChange={(e) =>
                                  setFormAula((current) => ({
                                    ...current,
                                    zoomRecordingUrl: e.target.value,
                                  }))
                                }
                                placeholder="Cole o link /rec/share/ com pwd="
                                className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                              />
                            </div>

                            <div className="md:col-span-2 rounded-[18px] border border-[#EAD7B7] bg-[#FBF6ED] p-4 text-sm leading-6 text-[#8B6831]">
                              Cole somente o link compartilhável da gravação do Zoom. O link precisa conter
                              <strong> pwd=</strong>. Não cole texto separado como “Senha: ...”.
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : null}

                    {formAula.contentType === "pdf" ? (
                      <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                        <label className="mb-3 block text-sm font-semibold text-[#344054]">
                          Arquivo PDF da aula
                        </label>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm text-[#667085]">
                            {arquivoConteudoPrincipal
                              ? `${arquivoConteudoPrincipal.name} • ${formatarTamanho(arquivoConteudoPrincipal.size)}`
                              : "Nenhum PDF selecionado."}
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                            <Upload className="h-4 w-4" />
                            Enviar PDF
                            <input
                              type="file"
                              accept={getAcceptedMimeByContentType("pdf")}
                              className="hidden"
                              onChange={(e) =>
                                setArquivoConteudoPrincipal(e.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}

                    {formAula.contentType === "audio" ? (
                      <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                        <label className="mb-3 block text-sm font-semibold text-[#344054]">
                          Arquivo de áudio da aula
                        </label>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm text-[#667085]">
                            {arquivoConteudoPrincipal
                              ? `${arquivoConteudoPrincipal.name} • ${formatarTamanho(arquivoConteudoPrincipal.size)}`
                              : "Nenhum áudio selecionado."}
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                            <Upload className="h-4 w-4" />
                            Enviar áudio
                            <input
                              type="file"
                              accept={getAcceptedMimeByContentType("audio")}
                              className="hidden"
                              onChange={(e) =>
                                setArquivoConteudoPrincipal(e.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}

                    {formAula.contentType === "text" ? (
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-[#344054]">
                          Conteúdo textual da aula
                        </label>
                        <textarea
                          rows={10}
                          value={formAula.contentBody}
                          onChange={(e) =>
                            setFormAula((current) => ({
                              ...current,
                              contentBody: e.target.value,
                            }))
                          }
                          placeholder="Digite aqui o conteúdo da aula em texto"
                          className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                        />
                      </div>
                    ) : null}

                    {formAula.contentType === "live" ? (
                      <>
                        <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#101828]">
                            <Radio className="h-4 w-4 text-[#476A8E]" />
                            Aula ao vivo via Zoom dentro da plataforma
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#667085]">
                            Esta aula será configurada para uso com Zoom como provedor da transmissão ao vivo.
                          </p>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            ID da reunião do Zoom
                          </label>
                          <input
                            type="text"
                            value={formAula.zoomMeetingId}
                            onChange={(e) =>
                              setFormAula((current) => ({
                                ...current,
                                zoomMeetingId: e.target.value,
                              }))
                            }
                            placeholder="Ex.: 123456789"
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Senha / código
                          </label>
                          <input
                            type="text"
                            value={formAula.zoomPasscode}
                            onChange={(e) =>
                              setFormAula((current) => ({
                                ...current,
                                zoomPasscode: e.target.value,
                              }))
                            }
                            placeholder="Ex.: ABC123"
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Link de entrada
                          </label>
                          <input
                            type="text"
                            value={formAula.zoomJoinUrl}
                            onChange={(e) =>
                              setFormAula((current) => ({
                                ...current,
                                zoomJoinUrl: e.target.value,
                              }))
                            }
                            placeholder="Cole o join_url do Zoom"
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Link do host
                          </label>
                          <input
                            type="text"
                            value={formAula.zoomStartUrl}
                            onChange={(e) =>
                              setFormAula((current) => ({
                                ...current,
                                zoomStartUrl: e.target.value,
                              }))
                            }
                            placeholder="Cole o start_url do Zoom"
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Início programado
                          </label>
                          <input
                            type="datetime-local"
                            value={formAula.scheduledStartAt}
                            onChange={(e) =>
                              setFormAula((current) => ({
                                ...current,
                                scheduledStartAt: e.target.value,
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Fim programado
                          </label>
                          <input
                            type="datetime-local"
                            value={formAula.scheduledEndAt}
                            onChange={(e) =>
                              setFormAula((current) => ({
                                ...current,
                                scheduledEndAt: e.target.value,
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>
                      </>
                    ) : null}

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Descrição
                      </label>
                      <textarea
                        rows={5}
                        value={formAula.description}
                        onChange={(e) =>
                          setFormAula((current) => ({
                            ...current,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Descreva a aula"
                        className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                      <div className="flex items-start gap-3">
                        <Paperclip className="mt-0.5 h-4 w-4 text-[#B07A2A]" />
                        <div>
                          <div className="text-sm font-semibold text-[#101828]">
                            Materiais para download
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[#667085]">
                            Os materiais da aula continuam disponíveis pelo botão "Gerenciar materiais" após salvar a aula.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-start gap-3 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                        <input
                          type="checkbox"
                          checked={formAula.isPreview}
                          onChange={(e) =>
                            setFormAula((current) => ({
                              ...current,
                              isPreview: e.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 rounded border-[#D0D5DD] text-[#B07A2A] focus:ring-[#D8BC8B]"
                        />

                        <span className="block">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#101828]">
                            <Sparkles className="h-4 w-4 text-[#B07A2A]" />
                            Marcar como prévia
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-[#667085]">
                            A aula poderá ser tratada como conteúdo de pré-visualização.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={fecharModalNovaAula}
                      disabled={salvandoAula}
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={salvandoAula}
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {salvandoAula ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {salvandoAula ? "Salvando..." : "Salvar aula"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalMateriaisAberto ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-4xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#475467]">
                    <Paperclip className="h-3.5 w-3.5" />
                    Materiais da aula
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">
                    Gerenciar materiais
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    {aulaSelecionadaParaMateriais
                      ? `Cadastre e visualize os materiais da aula "${aulaSelecionadaParaMateriais.title}".`
                      : "Cadastre e visualize os materiais da aula selecionada."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModalMateriais}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="border-b border-[#EEF1F5] p-6 lg:border-b-0 lg:border-r">
                    <h3 className="text-lg font-semibold text-[#101828]">
                      Materiais cadastrados
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      Lista real dos materiais já vinculados à aula selecionada.
                    </p>

                    <div className="mt-5 space-y-3">
                      {materiaisDaAulaSelecionada.length === 0 ? (
                        <div className="rounded-[18px] border border-dashed border-[#DDE3EA] bg-[#FCFCFD] px-4 py-5 text-sm text-[#667085]">
                          Esta aula ainda não possui materiais cadastrados.
                        </div>
                      ) : (
                        materiaisDaAulaSelecionada.map((material, index) => (
                          <div
                            key={material.id}
                            className="rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full border border-[#E4E7EC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#475467]">
                                Material {index + 1}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-[#D9E6F5] bg-[#EEF5FB] px-2.5 py-1 text-[11px] font-medium text-[#476A8E]">
                                {traduzirTipoMaterial(material.asset_type)}
                              </span>
                            </div>

                            <h4 className="mt-3 text-sm font-semibold text-[#101828]">
                              {material.title?.trim() || "Sem título cadastrado"}
                            </h4>

                            <p className="mt-2 break-all text-xs leading-6 text-[#667085]">
                              {material.storage_path}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <MiniInfo label="Ordem" value={String(material.sort_order)} />
                              <MiniInfo label="Tamanho" value={formatarTamanho(material.size_bytes)} />
                              <MiniInfo label="Mime" value={material.mime_type || "—"} />
                              <MiniInfo label="Atualizado" value={formatarData(material.updated_at)} />
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => abrirVisualizacaoMaterial(material)}
                                className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Visualizar
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirEdicaoMaterial(material)}
                                className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirExclusaoMaterial(material)}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <form onSubmit={salvarNovoMaterial} className="p-6">
                    <h3 className="text-lg font-semibold text-[#101828]">
                      Novo material
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      Cadastre um novo material para a aula selecionada.
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                      {erroMaterial ? (
                        <div className="md:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                          <h3 className="text-sm font-semibold text-rose-700">
                            Não foi possível salvar o material
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-rose-600">
                            {erroMaterial}
                          </p>
                        </div>
                      ) : null}

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-[#344054]">
                          Tipo
                        </label>
                        <select
                          value={formMaterial.assetType}
                          onChange={(e) =>
                            setFormMaterial((current) => ({
                              ...current,
                              assetType: e.target.value,
                            }))
                          }
                          className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                        >
                          <option value="pdf">PDF</option>
                          <option value="document">Documento</option>
                          <option value="link">Link</option>
                          <option value="image">Imagem</option>
                          <option value="audio">Áudio</option>
                          <option value="spreadsheet">Planilha</option>
                          <option value="presentation">Apresentação</option>
                          <option value="download">Download</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-[#344054]">
                          Ordem
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={formMaterial.sortOrder}
                          onChange={(e) =>
                            setFormMaterial((current) => ({
                              ...current,
                              sortOrder: e.target.value,
                            }))
                          }
                          placeholder="0"
                          className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-[#344054]">
                          Título
                        </label>
                        <input
                          type="text"
                          value={formMaterial.title}
                          onChange={(e) =>
                            setFormMaterial((current) => ({
                              ...current,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Ex.: Apostila da aula"
                          className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                        />
                      </div>

                      <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                        <label className="mb-3 block text-sm font-semibold text-[#344054]">
                          Arquivo do material
                        </label>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm text-[#667085]">
                            {arquivoMaterial
                              ? `${arquivoMaterial.name} • ${formatarTamanho(arquivoMaterial.size)}`
                              : "Nenhum arquivo selecionado."}
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                            <Upload className="h-4 w-4" />
                            Enviar arquivo
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) =>
                                setArquivoMaterial(e.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={fecharModalMateriais}
                        disabled={salvandoMaterial}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Fechar
                      </button>

                      <button
                        type="submit"
                        disabled={salvandoMaterial}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {salvandoMaterial ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                        {salvandoMaterial ? "Salvando..." : "Salvar material"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {aulaVisualizando ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-3xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#475467]">
                    <Eye className="h-3.5 w-3.5" />
                    Visualização da aula
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">
                    {aulaVisualizando.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAulaVisualizando(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <InfoPill icon={<PlayCircle className="h-4 w-4" />} label="Título" value={aulaVisualizando.title} />
                <InfoPill icon={<FileText className="h-4 w-4" />} label="Tipo" value={traduzirTipoConteudo(aulaVisualizando.content_type)} />
                <InfoPill icon={<Clock3 className="h-4 w-4" />} label="Status" value={traduzirStatus(aulaVisualizando.status)} />
                <InfoPill icon={<LinkIcon className="h-4 w-4" />} label="Origem" value={traduzirSourceMode(aulaVisualizando.source_mode)} />
                <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#98A2B3]">Descrição</p>
                  <p className="mt-2 text-sm leading-6 text-[#101828]">
                    {aulaVisualizando.description?.trim() || "Sem descrição cadastrada para esta aula."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {aulaEditando ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-4xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9B6B22]">
                    <PencilLine className="h-3.5 w-3.5" />
                    Editar aula
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">
                    Editar aula
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    Ajuste todas as informações da aula e salve para sobrescrever o conteúdo atual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fecharEdicaoAula}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                <form onSubmit={salvarEdicaoAula} className="p-6">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {erroEditarAula ? (
                      <div className="md:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                        <h3 className="text-sm font-semibold text-rose-700">
                          Não foi possível salvar a aula
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-rose-600">
                          {erroEditarAula}
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Módulo
                      </label>
                      <select
                        value={formEditarAula.moduleId}
                        onChange={(e) =>
                          setFormEditarAula((current) => ({
                            ...current,
                            moduleId: e.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      >
                        {modulos.map((modulo) => (
                          <option key={modulo.id} value={modulo.id}>
                            {modulo.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Status
                      </label>
                      <select
                        value={formEditarAula.status}
                        onChange={(e) =>
                          setFormEditarAula((current) => ({
                            ...current,
                            status: e.target.value as StatusAula,
                          }))
                        }
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      >
                        <option value="draft">Rascunho</option>
                        <option value="published">Publicado</option>
                        <option value="archived">Arquivado</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Título da aula
                      </label>
                      <input
                        type="text"
                        value={formEditarAula.title}
                        onChange={(e) =>
                          setFormEditarAula((current) => ({
                            ...current,
                            title: e.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Tipo de conteúdo
                      </label>
                      <select
                        value={formEditarAula.contentType}
                        onChange={(e) => onChangeEditarTipoConteudo(e.target.value as TipoConteudo)}
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      >
                        <option value="video">Vídeo</option>
                        <option value="pdf">PDF</option>
                        <option value="audio">Áudio</option>
                        <option value="text">Texto</option>
                        <option value="live">Ao vivo</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Ordem
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formEditarAula.sortOrder}
                        onChange={(e) =>
                          setFormEditarAula((current) => ({
                            ...current,
                            sortOrder: e.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Duração em segundos
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formEditarAula.durationSec}
                        onChange={(e) =>
                          setFormEditarAula((current) => ({
                            ...current,
                            durationSec: e.target.value,
                          }))
                        }
                        placeholder="Ex.: 600"
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    {formEditarAula.contentType === "video" ? (
                      <>
                        <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#101828]">
                            <Video className="h-4 w-4 text-[#476A8E]" />
                            Origem do vídeo
                          </div>

                          <select
                            value={formEditarAula.sourceMode}
                            onChange={(e) =>
                              setFormEditarAula((current) => ({
                                ...current,
                                sourceMode: e.target.value as SourceMode,
                                externalUrl: "",
                                zoomRecordingId: "",
                                zoomRecordingUrl: "",
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-white px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          >
                            <option value="upload">Upload de vídeo</option>
                            <option value="url">Vídeo por URL</option>
                            <option value="zoom_recording">Vídeo gravado no Zoom</option>
                          </select>
                        </div>

                        {formEditarAula.sourceMode === "upload" ? (
                          <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                            <label className="mb-3 block text-sm font-semibold text-[#344054]">
                              Arquivo de vídeo
                            </label>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="text-sm text-[#667085]">
                                {arquivoEditarConteudoPrincipal
                                  ? `${arquivoEditarConteudoPrincipal.name} • ${formatarTamanho(arquivoEditarConteudoPrincipal.size)}`
                                  : aulaEditando.primary_asset_name
                                  ? `Atual: ${aulaEditando.primary_asset_name}`
                                  : "Nenhum vídeo selecionado."}
                              </div>

                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                                <Upload className="h-4 w-4" />
                                Substituir vídeo
                                <input
                                  type="file"
                                  accept={getAcceptedMimeByContentType("video")}
                                  className="hidden"
                                  onChange={(e) =>
                                    setArquivoEditarConteudoPrincipal(e.target.files?.[0] ?? null)
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        ) : null}

                        {formEditarAula.sourceMode === "url" ? (
                          <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-[#344054]">
                              URL do vídeo
                            </label>
                            <input
                              type="text"
                              value={formEditarAula.externalUrl}
                              onChange={(e) =>
                                setFormEditarAula((current) => ({
                                  ...current,
                                  externalUrl: e.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                            />
                          </div>
                        ) : null}

                        {formEditarAula.sourceMode === "zoom_recording" ? (
                          <>
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                ID da gravação Zoom
                              </label>
                              <input
                                type="text"
                                value={formEditarAula.zoomRecordingId}
                                onChange={(e) =>
                                  setFormEditarAula((current) => ({
                                    ...current,
                                    zoomRecordingId: e.target.value,
                                  }))
                                }
                                className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                Link compartilhável da gravação Zoom
                              </label>
                              <input
                                type="text"
                                value={formEditarAula.zoomRecordingUrl}
                                onChange={(e) =>
                                  setFormEditarAula((current) => ({
                                    ...current,
                                    zoomRecordingUrl: e.target.value,
                                  }))
                                }
                                placeholder="Cole o link /rec/share/ com pwd="
                                className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                              />
                            </div>

                            <div className="md:col-span-2 rounded-[18px] border border-[#EAD7B7] bg-[#FBF6ED] p-4 text-sm leading-6 text-[#8B6831]">
                              Cole somente o link compartilhável da gravação do Zoom. O link precisa conter
                              <strong> pwd=</strong>. Não cole texto separado como “Senha: ...”.
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : null}

                    {formEditarAula.contentType === "pdf" ? (
                      <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                        <label className="mb-3 block text-sm font-semibold text-[#344054]">
                          Arquivo PDF da aula
                        </label>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm text-[#667085]">
                            {arquivoEditarConteudoPrincipal
                              ? `${arquivoEditarConteudoPrincipal.name} • ${formatarTamanho(arquivoEditarConteudoPrincipal.size)}`
                              : aulaEditando.primary_asset_name
                              ? `Atual: ${aulaEditando.primary_asset_name}`
                              : "Nenhum PDF selecionado."}
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                            <Upload className="h-4 w-4" />
                            Substituir PDF
                            <input
                              type="file"
                              accept={getAcceptedMimeByContentType("pdf")}
                              className="hidden"
                              onChange={(e) =>
                                setArquivoEditarConteudoPrincipal(e.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}

                    {formEditarAula.contentType === "audio" ? (
                      <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                        <label className="mb-3 block text-sm font-semibold text-[#344054]">
                          Arquivo de áudio da aula
                        </label>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm text-[#667085]">
                            {arquivoEditarConteudoPrincipal
                              ? `${arquivoEditarConteudoPrincipal.name} • ${formatarTamanho(arquivoEditarConteudoPrincipal.size)}`
                              : aulaEditando.primary_asset_name
                              ? `Atual: ${aulaEditando.primary_asset_name}`
                              : "Nenhum áudio selecionado."}
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                            <Upload className="h-4 w-4" />
                            Substituir áudio
                            <input
                              type="file"
                              accept={getAcceptedMimeByContentType("audio")}
                              className="hidden"
                              onChange={(e) =>
                                setArquivoEditarConteudoPrincipal(e.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}

                    {formEditarAula.contentType === "text" ? (
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-[#344054]">
                          Conteúdo textual da aula
                        </label>
                        <textarea
                          rows={10}
                          value={formEditarAula.contentBody}
                          onChange={(e) =>
                            setFormEditarAula((current) => ({
                              ...current,
                              contentBody: e.target.value,
                            }))
                          }
                          className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                        />
                      </div>
                    ) : null}

                    {formEditarAula.contentType === "live" ? (
                      <>
                        <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#101828]">
                            <Radio className="h-4 w-4 text-[#476A8E]" />
                            Aula ao vivo via Zoom dentro da plataforma
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#667085]">
                            Edite os dados da transmissão ao vivo e salve para sobrescrever a configuração atual.
                          </p>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            ID da reunião do Zoom
                          </label>
                          <input
                            type="text"
                            value={formEditarAula.zoomMeetingId}
                            onChange={(e) =>
                              setFormEditarAula((current) => ({
                                ...current,
                                zoomMeetingId: e.target.value,
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Senha / código
                          </label>
                          <input
                            type="text"
                            value={formEditarAula.zoomPasscode}
                            onChange={(e) =>
                              setFormEditarAula((current) => ({
                                ...current,
                                zoomPasscode: e.target.value,
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Link de entrada
                          </label>
                          <input
                            type="text"
                            value={formEditarAula.zoomJoinUrl}
                            onChange={(e) =>
                              setFormEditarAula((current) => ({
                                ...current,
                                zoomJoinUrl: e.target.value,
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Link do host
                          </label>
                          <input
                            type="text"
                            value={formEditarAula.zoomStartUrl}
                            onChange={(e) =>
                              setFormEditarAula((current) => ({
                                ...current,
                                zoomStartUrl: e.target.value,
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Início programado
                          </label>
                          <input
                            type="datetime-local"
                            value={formEditarAula.scheduledStartAt}
                            onChange={(e) =>
                              setFormEditarAula((current) => ({
                                ...current,
                                scheduledStartAt: e.target.value,
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#344054]">
                            Fim programado
                          </label>
                          <input
                            type="datetime-local"
                            value={formEditarAula.scheduledEndAt}
                            onChange={(e) =>
                              setFormEditarAula((current) => ({
                                ...current,
                                scheduledEndAt: e.target.value,
                              }))
                            }
                            className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                          />
                        </div>
                      </>
                    ) : null}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Liberação
                      </label>
                      <input
                        type="datetime-local"
                        value={formEditarAula.releasedAt}
                        onChange={(e) =>
                          setFormEditarAula((current) => ({
                            ...current,
                            releasedAt: e.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-[#344054]">
                        Descrição
                      </label>
                      <textarea
                        rows={5}
                        value={formEditarAula.description}
                        onChange={(e) =>
                          setFormEditarAula((current) => ({
                            ...current,
                            description: e.target.value,
                          }))
                        }
                        className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                      />
                    </div>

                    <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                      <div className="flex items-start gap-3">
                        <Paperclip className="mt-0.5 h-4 w-4 text-[#B07A2A]" />
                        <div>
                          <div className="text-sm font-semibold text-[#101828]">
                            Materiais para download
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[#667085]">
                            Os materiais da aula continuam disponíveis pelo botão "Gerenciar materiais".
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-start gap-3 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                        <input
                          type="checkbox"
                          checked={formEditarAula.isPreview}
                          onChange={(e) =>
                            setFormEditarAula((current) => ({
                              ...current,
                              isPreview: e.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 rounded border-[#D0D5DD] text-[#B07A2A] focus:ring-[#D8BC8B]"
                        />

                        <span className="block">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#101828]">
                            <Sparkles className="h-4 w-4 text-[#B07A2A]" />
                            Marcar como prévia
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-[#667085]">
                            A aula poderá ser tratada como conteúdo de pré-visualização.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={fecharEdicaoAula}
                      disabled={salvandoEdicaoAula}
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoEdicaoAula}
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {salvandoEdicaoAula ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {salvandoEdicaoAula ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {aulaExcluindo ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Excluir aula
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">Confirmar exclusão</h2>
                </div>
                <button type="button" onClick={fecharExclusaoAula} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-6">
                {erroExcluirAula ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4"><p className="text-sm leading-6 text-rose-600">{erroExcluirAula}</p></div> : <div className="rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4 text-sm leading-6 text-[#667085]">Você está prestes a excluir a aula <strong>{aulaExcluindo.title}</strong>.</div>}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={fecharExclusaoAula} disabled={excluindoAula} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70">Cancelar</button>
                  <button type="button" onClick={() => void excluirAulaSelecionada()} disabled={excluindoAula} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70">{excluindoAula ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{excluindoAula ? "Excluindo..." : "Confirmar exclusão"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {materialVisualizando ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-2xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div><div className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#475467]"><Eye className="h-3.5 w-3.5" />Visualização do material</div><h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">{materialVisualizando.title?.trim() || "Sem título cadastrado"}</h2></div>
                <button type="button" onClick={() => setMaterialVisualizando(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <InfoPill icon={<Paperclip className="h-4 w-4" />} label="Tipo" value={traduzirTipoMaterial(materialVisualizando.asset_type)} />
                <InfoPill icon={<BookOpen className="h-4 w-4" />} label="Ordem" value={String(materialVisualizando.sort_order)} />
                <InfoPill icon={<FileText className="h-4 w-4" />} label="Arquivo" value={materialVisualizando.file_name || "—"} />
                <InfoPill icon={<Clock3 className="h-4 w-4" />} label="Tamanho" value={formatarTamanho(materialVisualizando.size_bytes)} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {materialEditando ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-2xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div><div className="inline-flex items-center gap-2 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9B6B22]"><PencilLine className="h-3.5 w-3.5" />Editar material</div><h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">Editar material</h2></div>
                <button type="button" onClick={fecharEdicaoMaterial} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={salvarEdicaoMaterialMeta} className="p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {erroEditarMaterial ? <div className="md:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 p-4"><p className="text-sm leading-6 text-rose-600">{erroEditarMaterial}</p></div> : null}
                  <div><label className="mb-2 block text-sm font-semibold text-[#344054]">Tipo</label><select value={formEditarMaterialMeta.assetType} onChange={(e) => setFormEditarMaterialMeta((current) => ({ ...current, assetType: e.target.value }))} className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"><option value="pdf">PDF</option><option value="document">Documento</option><option value="link">Link</option><option value="image">Imagem</option><option value="audio">Áudio</option><option value="spreadsheet">Planilha</option><option value="presentation">Apresentação</option><option value="download">Download</option></select></div>
                  <div><label className="mb-2 block text-sm font-semibold text-[#344054]">Ordem</label><input type="number" min={0} value={formEditarMaterialMeta.sortOrder} onChange={(e) => setFormEditarMaterialMeta((current) => ({ ...current, sortOrder: e.target.value }))} className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white" /></div>
                  <div className="md:col-span-2"><label className="mb-2 block text-sm font-semibold text-[#344054]">Título</label><input type="text" value={formEditarMaterialMeta.title} onChange={(e) => setFormEditarMaterialMeta((current) => ({ ...current, title: e.target.value }))} className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white" /></div>
                  <div className="md:col-span-2 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4"><label className="mb-3 block text-sm font-semibold text-[#344054]">Substituir arquivo do material</label><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="text-sm text-[#667085]">{arquivoEditarMaterial ? `${arquivoEditarMaterial.name} • ${formatarTamanho(arquivoEditarMaterial.size)}` : materialEditando.file_name ? `Atual: ${materialEditando.file_name}` : "Nenhum novo arquivo selecionado."}</div><label className="inline-flex cursor-pointer items-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]"><Upload className="h-4 w-4" />Enviar arquivo<input type="file" className="hidden" onChange={(e) => setArquivoEditarMaterial(e.target.files?.[0] ?? null)} /></label></div></div>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={fecharEdicaoMaterial} disabled={salvandoEdicaoMaterial} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70">Cancelar</button>
                  <button type="submit" disabled={salvandoEdicaoMaterial} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70">{salvandoEdicaoMaterial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{salvandoEdicaoMaterial ? "Salvando..." : "Salvar alterações"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {materialExcluindo ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/40 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-xl rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] p-6">
                <div><div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />Excluir material</div><h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">Confirmar exclusão</h2></div>
                <button type="button" onClick={fecharExclusaoMaterial} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#101828]"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-6">
                {erroExcluirMaterial ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4"><p className="text-sm leading-6 text-rose-600">{erroExcluirMaterial}</p></div> : <div className="rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4 text-sm leading-6 text-[#667085]">Você está prestes a excluir o material <strong>{materialExcluindo.title?.trim() || materialExcluindo.file_name || "sem título"}</strong>.</div>}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={fecharExclusaoMaterial} disabled={excluindoMaterial} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70">Cancelar</button>
                  <button type="button" onClick={() => void excluirMaterialSelecionado()} disabled={excluindoMaterial} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70">{excluindoMaterial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{excluindoMaterial ? "Excluindo..." : "Confirmar exclusão"}</button>
                </div>
              </div>
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

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[#EEF5FB] p-2 text-[#476A8E]">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#98A2B3]">
            {label}
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-[#101828]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#E7EAF0] bg-[#FCFCFD] px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#98A2B3]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#101828]">{value}</p>
    </div>
  );
}
