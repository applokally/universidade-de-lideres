"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  Loader2,
  MonitorPlay,
  Save,
  Upload,
  X,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type LiveStatus = "draft" | "scheduled" | "live" | "ended" | "cancelled";

type BroadcastType =
  | "external_link"
  | "embed"
  | "zoom"
  | "youtube"
  | "vimeo"
  | "other";

type LiveItem = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  starts_at: string;
  ends_at: string | null;
  presenter_name: string | null;
  required_rank: number;
  broadcast_type: BroadcastType;
  live_url: string | null;
  zoom_sdk_enabled: boolean | null;
  zoom_meeting_number: string | null;
  zoom_passcode: string | null;
  zoom_role: number | null;
  zoom_join_mode: string | null;
  embed_code: string | null;
  cta_label: string | null;
  cta_url: string | null;
  has_recording: boolean;
  recording_url: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  status: LiveStatus;
  created_at: string;
  updated_at: string;
};

type PaginaProps = {
  params: Promise<{
    id: string;
  }>;
};

type FormState = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  startsDate: string;
  startsTime: string;
  endsDate: string;
  endsTime: string;
  presenterName: string;
  requiredRank: string;
  broadcastType: BroadcastType;
  liveUrl: string;
  zoomSdkEnabled: boolean;
  zoomMeetingNumber: string;
  zoomPasscode: string;
  zoomRole: string;
  zoomJoinMode: string;
  embedCode: string;
  ctaLabel: string;
  ctaUrl: string;
  hasRecording: boolean;
  recordingUrl: string;
  sortOrder: string;
  isFeatured: boolean;
  isActive: boolean;
  status: LiveStatus;
};

type CoverState = {
  file: File | null;
  previewUrl: string | null;
};

const LIVE_COVERS_BUCKET = "covers";
const LIVE_COVERS_FOLDER = "lives";

const statusOptions: Array<{ value: LiveStatus; label: string }> = [
  { value: "draft", label: "Rascunho" },
  { value: "scheduled", label: "Agendada" },
  { value: "live", label: "Ao vivo" },
  { value: "ended", label: "Encerrada" },
  { value: "cancelled", label: "Cancelada" },
];

const broadcastOptions: Array<{ value: BroadcastType; label: string }> = [
  { value: "external_link", label: "Link externo" },
  { value: "embed", label: "Embed" },
  { value: "zoom", label: "Zoom" },
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "other", label: "Outro" },
];

const inputClass =
  "h-12 w-full rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]";

const textareaClass =
  "min-h-[120px] w-full resize-y rounded-[10px] border border-[#e5e5e5] bg-white px-4 py-3 text-[14px] leading-6 text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]";

const labelClass = "mb-2 block text-[14px] font-semibold text-[#52525b]";

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

function getFileExtension(fileName: string) {
  const partes = fileName.split(".");
  return partes.length > 1 ? partes.pop()!.toLowerCase() : "";
}

function buildCoverStoragePath(slug: string, file: File) {
  const ext = getFileExtension(file.name) || "bin";
  const safeSlug = gerarSlug(slug || "live");
  const uniqueId = crypto.randomUUID();

  return `${LIVE_COVERS_FOLDER}/${safeSlug}-${uniqueId}.${ext}`;
}

function traduzirErroBanco(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("row-level security")) {
    return "Seu usuário não tem permissão para editar esta live.";
  }

  if (texto.includes("duplicate key value") || texto.includes("unique")) {
    return "Já existe uma live com este identificador.";
  }

  if (texto.includes("violates check constraint")) {
    return "Algum campo da live não atende às regras da tabela.";
  }

  if (texto.includes("bucket")) {
    return "Não foi possível enviar a capa da live.";
  }

  return mensagem;
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

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateToInputDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function dateToInputTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function montarDataHoraIso(data: string, hora: string) {
  if (!data || !hora) return null;

  const date = new Date(`${data}T${hora}:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
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

  const storagePath = cleanPath.replace(/^covers\//, "");
  const supabase = supabaseBrowser();

  const { data } = supabase.storage
    .from(LIVE_COVERS_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

function buildFormFromLive(live: LiveItem): FormState {
  return {
    title: live.title ?? "",
    slug: live.slug ?? "",
    shortDescription: live.short_description ?? "",
    description: live.description ?? "",
    startsDate: dateToInputDate(live.starts_at),
    startsTime: dateToInputTime(live.starts_at),
    endsDate: dateToInputDate(live.ends_at),
    endsTime: dateToInputTime(live.ends_at),
    presenterName: live.presenter_name ?? "",
    requiredRank: String(live.required_rank ?? 0),
    broadcastType: live.broadcast_type || "external_link",
    liveUrl: live.live_url ?? "",
    zoomSdkEnabled: Boolean(live.zoom_sdk_enabled),
    zoomMeetingNumber: live.zoom_meeting_number ?? "",
    zoomPasscode: live.zoom_passcode ?? "",
    zoomRole: String(live.zoom_role ?? 0),
    zoomJoinMode: live.zoom_join_mode ?? "embedded",
    embedCode: live.embed_code ?? "",
    ctaLabel: live.cta_label ?? "",
    ctaUrl: live.cta_url ?? "",
    hasRecording: Boolean(live.has_recording),
    recordingUrl: live.recording_url ?? "",
    sortOrder: String(live.sort_order ?? 0),
    isFeatured: Boolean(live.is_featured),
    isActive: Boolean(live.is_active),
    status: live.status || "draft",
  };
}

export default function AdminEditarLivePage({ params }: PaginaProps) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [liveId, setLiveId] = useState("");
  const [live, setLive] = useState<LiveItem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [cover, setCover] = useState<CoverState>({
    file: null,
    previewUrl: null,
  });

  const [form, setForm] = useState<FormState>({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    startsDate: "",
    startsTime: "",
    endsDate: "",
    endsTime: "",
    presenterName: "",
    requiredRank: "0",
    broadcastType: "zoom",
    liveUrl: "",
    zoomSdkEnabled: true,
    zoomMeetingNumber: "",
    zoomPasscode: "",
    zoomRole: "0",
    zoomJoinMode: "embedded",
    embedCode: "",
    ctaLabel: "",
    ctaUrl: "",
    hasRecording: false,
    recordingUrl: "",
    sortOrder: "0",
    isFeatured: false,
    isActive: true,
    status: "draft",
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

      setLiveId(resolved.id);
    }

    void resolverParams();

    return () => {
      ativo = false;
    };
  }, [params]);

  async function carregarLive(id: string) {
    if (!id) return;

    setCarregando(true);
    setErro(null);

    try {
      const { data, error } = await supabase
        .from("lives")
        .select(
          [
            "id",
            "title",
            "slug",
            "short_description",
            "description",
            "cover_path",
            "starts_at",
            "ends_at",
            "presenter_name",
            "required_rank",
            "broadcast_type",
            "live_url",
            "zoom_sdk_enabled",
            "zoom_meeting_number",
            "zoom_passcode",
            "zoom_role",
            "zoom_join_mode",
            "embed_code",
            "cta_label",
            "cta_url",
            "has_recording",
            "recording_url",
            "sort_order",
            "is_featured",
            "is_active",
            "status",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Live não encontrada.");

      const liveNormalizada = data as unknown as LiveItem;

      const liveFinal: LiveItem = {
        ...liveNormalizada,
        required_rank: Number(liveNormalizada.required_rank ?? 0),
        sort_order: Number(liveNormalizada.sort_order ?? 0),
        is_featured: Boolean(liveNormalizada.is_featured),
        is_active: Boolean(liveNormalizada.is_active),
        has_recording: Boolean(liveNormalizada.has_recording),
        zoom_sdk_enabled: Boolean(liveNormalizada.zoom_sdk_enabled),
        zoom_role: Number(liveNormalizada.zoom_role ?? 0),
        zoom_join_mode: liveNormalizada.zoom_join_mode ?? "embedded",
      };

      setLive(liveFinal);
      setForm(buildFormFromLive(liveFinal));
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível carregar a live.";

      setErro(mensagem);
      setLive(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (!liveId) return;

    void carregarLive(liveId);
  }, [liveId]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
    }));
  }

  function handleSlugChange(value: string) {
    updateField("slug", gerarSlug(value));
  }

  function handleSelecionarCapa(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0] ?? null;

    if (!arquivo) return;

    const tiposPermitidos = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErro("Envie uma imagem válida em PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    setCover({
      file: arquivo,
      previewUrl: URL.createObjectURL(arquivo),
    });

    setErro(null);
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

  function validarFormulario() {
    const title = form.title.trim();
    const slug = gerarSlug(form.slug || form.title);
    const requiredRank = Number(form.requiredRank);
    const sortOrder = Number(form.sortOrder);

    if (!title) return "Informe o título da live.";
    if (!slug) return "Informe um identificador válido para a live.";

    if (!form.startsDate || !form.startsTime) {
      return "Informe a data e o horário de início da live.";
    }

    if (Number.isNaN(requiredRank) || requiredRank < 0) {
      return "Informe um nível/rank mínimo válido.";
    }

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      return "Informe uma ordem de exibição válida.";
    }

    const startsAt = montarDataHoraIso(form.startsDate, form.startsTime);
    const endsAt =
      form.endsDate && form.endsTime
        ? montarDataHoraIso(form.endsDate, form.endsTime)
        : null;

    if (!startsAt) {
      return "Informe uma data de início válida.";
    }

    if ((form.endsDate && !form.endsTime) || (!form.endsDate && form.endsTime)) {
      return "Para o término previsto, informe data e horário.";
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return "O término previsto precisa ser depois do início.";
    }

    const isZoomSdk = form.broadcastType === "zoom" && form.zoomSdkEnabled;

    if (isZoomSdk && !form.zoomMeetingNumber.replace(/\s+/g, "").trim()) {
      return "Informe o número da reunião Zoom para usar o SDK.";
    }

    if (
      form.broadcastType === "embed" &&
      !form.embedCode.trim() &&
      !form.liveUrl.trim()
    ) {
      return "Informe o embed ou o link da transmissão.";
    }

    if (!isZoomSdk && form.broadcastType !== "embed" && !form.liveUrl.trim()) {
      return "Informe o link da transmissão ou ative o Zoom SDK.";
    }

    if (form.hasRecording && !form.recordingUrl.trim()) {
      return "Informe o link da gravação ou desative a opção de gravação.";
    }

    return null;
  }

  async function uploadCoverIfNeeded(slug: string): Promise<string | null> {
    if (!cover.file) return null;

    const storagePath = buildCoverStoragePath(slug, cover.file);

    const { error } = await supabase.storage
      .from(LIVE_COVERS_BUCKET)
      .upload(storagePath, cover.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: cover.file.type,
      });

    if (error) throw error;

    return storagePath;
  }

  async function salvarLive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!live) return;

    const erroValidacao = validarFormulario();

    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setSalvando(true);
    setErro(null);

    let uploadedCoverPath: string | null = null;

    try {
      const slugFinal = gerarSlug(form.slug || form.title);
      const startsAt = montarDataHoraIso(form.startsDate, form.startsTime);
      const endsAt =
        form.endsDate && form.endsTime
          ? montarDataHoraIso(form.endsDate, form.endsTime)
          : null;

      uploadedCoverPath = await uploadCoverIfNeeded(slugFinal);

      const { error } = await supabase
        .from("lives")
        .update({
          title: form.title.trim(),
          slug: slugFinal,
          short_description: form.shortDescription.trim() || null,
          description: form.description.trim() || null,
          cover_path: uploadedCoverPath || live.cover_path || null,
          starts_at: startsAt,
          ends_at: endsAt,
          presenter_name: form.presenterName.trim() || null,
          required_rank: Number(form.requiredRank),
          broadcast_type: form.broadcastType,
          live_url: form.liveUrl.trim() || null,
          zoom_sdk_enabled: form.broadcastType === "zoom" ? form.zoomSdkEnabled : false,
          zoom_meeting_number:
            form.broadcastType === "zoom" && form.zoomSdkEnabled
              ? form.zoomMeetingNumber.replace(/\s+/g, "").trim() || null
              : null,
          zoom_passcode:
            form.broadcastType === "zoom" && form.zoomSdkEnabled
              ? form.zoomPasscode.trim() || null
              : null,
          zoom_role:
            form.broadcastType === "zoom" && form.zoomSdkEnabled
              ? Number(form.zoomRole) || 0
              : 0,
          zoom_join_mode:
            form.broadcastType === "zoom" && form.zoomSdkEnabled
              ? form.zoomJoinMode || "embedded"
              : "embedded",
          embed_code: form.embedCode.trim() || null,
          cta_label: form.ctaLabel.trim() || null,
          cta_url: form.ctaUrl.trim() || null,
          has_recording: form.hasRecording,
          recording_url: form.hasRecording
            ? form.recordingUrl.trim() || null
            : null,
          sort_order: Number(form.sortOrder),
          is_featured: form.isFeatured,
          is_active: form.isActive,
          status: form.status,
        })
        .eq("id", live.id);

      if (error) throw error;

      if (cover.previewUrl) {
        URL.revokeObjectURL(cover.previewUrl);
      }

      router.push(`/admin/lives/${live.id}`);
      router.refresh();
    } catch (error) {
      if (uploadedCoverPath) {
        await supabase.storage.from(LIVE_COVERS_BUCKET).remove([
          uploadedCoverPath,
        ]);
      }

      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar as alterações da live.";

      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  const currentCoverUrl = cover.previewUrl || getPublicCoverUrl(live?.cover_path ?? null);

  return (
    <div className="space-y-7 text-[#141414]">
      <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Link
            href={liveId ? `/admin/lives/${liveId}` : "/admin/lives"}
            className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-[#666b76] transition hover:text-[#141414]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para visualização
          </Link>

          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
            Live
          </p>

          <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
            Editar live
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
            Atualize os dados da transmissão ao vivo.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={liveId ? `/admin/lives/${liveId}` : "/admin/lives"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
          >
            <Eye className="h-4 w-4" />
            Visualizar
          </Link>

          <button
            type="submit"
            form="editar-live-form"
            disabled={salvando || carregando || !live}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar alterações
          </button>
        </div>
      </section>

      {erro ? (
        <section className="rounded-[14px] border border-rose-200 bg-rose-50 p-5">
          <h2 className="text-[14px] font-semibold text-rose-700">
            Não foi possível continuar
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-rose-600">{erro}</p>
        </section>
      ) : null}

      {carregando ? (
        <section className="flex items-center justify-center gap-3 rounded-[18px] border border-[#e5e5e5] bg-white px-5 py-14 text-[14px] font-semibold text-[#666b76]">
          <Loader2 className="h-5 w-5 animate-spin text-[#8a6836]" />
          Carregando live...
        </section>
      ) : null}

      {!carregando && live ? (
        <form
          id="editar-live-form"
          onSubmit={salvarLive}
          className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white"
        >
          <div className="border-b border-[#e5e5e5] px-5 py-4">
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
              Dados da live
            </h2>
          </div>

          <div className="space-y-0">
            <section className="grid grid-cols-1 gap-5 border-b border-[#ededed] p-5 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <label className={labelClass}>Título da live</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-4">
                <label className={labelClass}>Identificador</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-12">
                <label className={labelClass}>Descrição curta</label>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(event) =>
                    updateField("shortDescription", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-12">
                <label className={labelClass}>Descrição completa</label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  className={textareaClass}
                />
              </div>

              <div className="xl:col-span-6">
                <label className={labelClass}>Professor/apresentador</label>
                <input
                  type="text"
                  value={form.presenterName}
                  onChange={(event) =>
                    updateField("presenterName", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-3">
                <label className={labelClass}>Nível/rank mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={form.requiredRank}
                  onChange={(event) =>
                    updateField("requiredRank", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-3">
                <label className={labelClass}>Ordem</label>
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(event) =>
                    updateField("sortOrder", event.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 border-b border-[#ededed] p-5 xl:grid-cols-12">
              <div className="xl:col-span-4">
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value as LiveStatus)
                  }
                  className={inputClass}
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-4">
                <label className={labelClass}>Data de início</label>
                <input
                  type="date"
                  value={form.startsDate}
                  onChange={(event) =>
                    updateField("startsDate", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-4">
                <label className={labelClass}>Horário de início</label>
                <input
                  type="time"
                  value={form.startsTime}
                  onChange={(event) =>
                    updateField("startsTime", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-6">
                <label className={labelClass}>Data de término previsto</label>
                <input
                  type="date"
                  value={form.endsDate}
                  onChange={(event) =>
                    updateField("endsDate", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-6">
                <label className={labelClass}>
                  Horário de término previsto
                </label>
                <input
                  type="time"
                  value={form.endsTime}
                  onChange={(event) =>
                    updateField("endsTime", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-6">
                <label className={labelClass}>Visibilidade</label>
                <button
                  type="button"
                  onClick={() => updateField("isActive", !form.isActive)}
                  className="flex h-12 w-full items-center justify-between rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-left text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094]"
                >
                  <span>{form.isActive ? "Ativa" : "Inativa"}</span>
                  <span
                    className={`h-5 w-9 rounded-full p-0.5 transition ${
                      form.isActive ? "bg-[#DBC094]" : "bg-[#d4d4d8]"
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white transition ${
                        form.isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
              </div>

              <div className="xl:col-span-6">
                <label className={labelClass}>Destaque</label>
                <button
                  type="button"
                  onClick={() => updateField("isFeatured", !form.isFeatured)}
                  className="flex h-12 w-full items-center justify-between rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-left text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094]"
                >
                  <span>{form.isFeatured ? "Sim" : "Não"}</span>
                  <span
                    className={`h-5 w-9 rounded-full p-0.5 transition ${
                      form.isFeatured ? "bg-[#DBC094]" : "bg-[#d4d4d8]"
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white transition ${
                        form.isFeatured ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 border-b border-[#ededed] p-5 xl:grid-cols-12">
              <div className="xl:col-span-4">
                <label className={labelClass}>Tipo de transmissão</label>
                <select
                  value={form.broadcastType}
                  onChange={(event) => {
                    const nextType = event.target.value as BroadcastType;
                    setForm((current) => ({
                      ...current,
                      broadcastType: nextType,
                      zoomSdkEnabled:
                        nextType === "zoom" ? current.zoomSdkEnabled || true : false,
                    }));
                  }}
                  className={inputClass}
                >
                  {broadcastOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-8">
                <label className={labelClass}>Link externo da transmissão</label>
                <input
                  type="url"
                  value={form.liveUrl}
                  onChange={(event) =>
                    updateField("liveUrl", event.target.value)
                  }
                  placeholder={
                    form.broadcastType === "zoom" && form.zoomSdkEnabled
                      ? "Opcional. O aluno entrará pelo SDK."
                      : "https://..."
                  }
                  className={inputClass}
                />
              </div>

              {form.broadcastType === "zoom" ? (
                <div className="xl:col-span-12">
                  <div className="grid grid-cols-1 gap-5 rounded-[14px] border border-[#e7dcc8] bg-[#fffaf1] p-4 xl:grid-cols-12">
                    <div className="xl:col-span-12">
                      <button
                        type="button"
                        onClick={() =>
                          updateField("zoomSdkEnabled", !form.zoomSdkEnabled)
                        }
                        className="flex h-12 w-full items-center justify-between rounded-[10px] border border-[#e5d6bd] bg-white px-4 text-left text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094]"
                      >
                        <span>Usar Zoom Meeting SDK dentro da área do aluno</span>
                        <span
                          className={`h-5 w-9 rounded-full p-0.5 transition ${
                            form.zoomSdkEnabled ? "bg-[#DBC094]" : "bg-[#d4d4d8]"
                          }`}
                        >
                          <span
                            className={`block h-4 w-4 rounded-full bg-white transition ${
                              form.zoomSdkEnabled
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    <div className="xl:col-span-5">
                      <label className={labelClass}>Número da reunião Zoom</label>
                      <input
                        type="text"
                        value={form.zoomMeetingNumber}
                        onChange={(event) =>
                          updateField("zoomMeetingNumber", event.target.value)
                        }
                        placeholder="Ex: 12345678900"
                        disabled={!form.zoomSdkEnabled}
                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#f6f7f9]`}
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <label className={labelClass}>Senha/passcode da reunião</label>
                      <input
                        type="text"
                        value={form.zoomPasscode}
                        onChange={(event) =>
                          updateField("zoomPasscode", event.target.value)
                        }
                        placeholder="Se houver"
                        disabled={!form.zoomSdkEnabled}
                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#f6f7f9]`}
                      />
                    </div>

                    <div className="xl:col-span-3">
                      <label className={labelClass}>Papel no Zoom</label>
                      <select
                        value={form.zoomRole}
                        onChange={(event) =>
                          updateField("zoomRole", event.target.value)
                        }
                        disabled={!form.zoomSdkEnabled}
                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#f6f7f9]`}
                      >
                        <option value="0">Aluno/participante</option>
                        <option value="1">Host</option>
                      </select>
                    </div>

                    <input type="hidden" value={form.zoomJoinMode} readOnly />

                    <p className="xl:col-span-12 text-[13px] leading-5 text-[#8a6a33]">
                      Para o aluno, a entrada não é automática. A live exibirá o
                      botão Participar e abrirá o Zoom dentro do portal usando o
                      Meeting SDK.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="xl:col-span-12">
                <label className={labelClass}>Código embed</label>
                <textarea
                  value={form.embedCode}
                  onChange={(event) =>
                    updateField("embedCode", event.target.value)
                  }
                  className={textareaClass}
                />
              </div>

              <div className="xl:col-span-6">
                <label className={labelClass}>Texto do botão/CTA</label>
                <input
                  type="text"
                  value={form.ctaLabel}
                  onChange={(event) =>
                    updateField("ctaLabel", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="xl:col-span-6">
                <label className={labelClass}>Link do botão/CTA</label>
                <input
                  type="url"
                  value={form.ctaUrl}
                  onChange={(event) =>
                    updateField("ctaUrl", event.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 border-b border-[#ededed] p-5 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <label className={labelClass}>Capa principal</label>

                <div className="flex flex-col gap-4 rounded-[12px] border border-[#e5e5e5] bg-white p-4 sm:flex-row sm:items-center">
                  <div
                    className="flex h-32 w-full items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-[#d8dce5] bg-[#f6f7f9] bg-cover bg-center text-[#8a8f9d] sm:w-52"
                    style={
                      currentCoverUrl
                        ? { backgroundImage: `url(${currentCoverUrl})` }
                        : undefined
                    }
                  >
                    {!currentCoverUrl ? <ImageIcon className="h-7 w-7" /> : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    {cover.file ? (
                      <div>
                        <p className="truncate text-[14px] font-semibold text-[#141414]">
                          {cover.file.name}
                        </p>
                        <p className="mt-1 text-[13px] text-[#8a8f9d]">
                          {formatarTamanho(cover.file.size)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[14px] leading-6 text-[#666b76]">
                        Selecione uma nova imagem somente se quiser substituir a
                        capa atual.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]">
                        <Upload className="h-4 w-4" />
                        Selecionar capa
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleSelecionarCapa}
                          className="hidden"
                        />
                      </label>

                      {cover.file ? (
                        <button
                          type="button"
                          onClick={removerCapaSelecionada}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-rose-200 hover:text-rose-700"
                        >
                          <X className="h-4 w-4" />
                          Remover
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-7">
                <label className={labelClass}>Gravação</label>

                <div className="grid grid-cols-1 gap-5 rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                  <button
                    type="button"
                    onClick={() =>
                      updateField("hasRecording", !form.hasRecording)
                    }
                    className="flex h-12 w-full items-center justify-between rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-left text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094]"
                  >
                    <span>
                      {form.hasRecording
                        ? "Disponibilizar como gravação"
                        : "Não disponibilizar gravação"}
                    </span>
                    <span
                      className={`h-5 w-9 rounded-full p-0.5 transition ${
                        form.hasRecording ? "bg-[#DBC094]" : "bg-[#d4d4d8]"
                      }`}
                    >
                      <span
                        className={`block h-4 w-4 rounded-full bg-white transition ${
                          form.hasRecording ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>

                  <div>
                    <label className={labelClass}>Link da gravação</label>
                    <input
                      type="url"
                      value={form.recordingUrl}
                      onChange={(event) =>
                        updateField("recordingUrl", event.target.value)
                      }
                      disabled={!form.hasRecording}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#f6f7f9] disabled:text-[#8a8f9d]`}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href={`/admin/lives/${live.id}`}
                className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MonitorPlay className="h-4 w-4" />
                )}
                Salvar alterações
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}