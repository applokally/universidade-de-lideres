import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  MonitorPlay,
  Pencil,
  Radio,
  UserRound,
} from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LiveStatus = "draft" | "scheduled" | "live" | "ended" | "cancelled";

type LiveItem = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  presenter_name: string | null;
  required_rank: number | null;
  broadcast_type: string | null;
  live_url: string | null;
  embed_code: string | null;
  cta_label: string | null;
  cta_url: string | null;
  has_recording: boolean | null;
  recording_url: string | null;
  sort_order: number | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  status: LiveStatus | null;
  created_at: string | null;
  updated_at: string | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusLabels: Record<LiveStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  live: "Ao vivo",
  ended: "Encerrada",
  cancelled: "Cancelada",
};

const statusClasses: Record<LiveStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  scheduled: "bg-blue-50 text-blue-700",
  live: "bg-emerald-50 text-emerald-700",
  ended: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-50 text-red-700",
};

function normalizeStoragePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^public\//, "")
    .replace(/^covers\//, "")
    .replace(/^course-covers\//, "");
}

function getPublicCoverUrl(path: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!supabaseUrl || !path) return null;

  const normalizedPath = normalizeStoragePath(path);

  if (!normalizedPath) return null;

  return `${supabaseUrl}/storage/v1/object/public/covers/${encodeURI(
    normalizedPath
  ).replace(/%2F/g, "/")}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Não informado";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Data inválida";
  }
}

function translateBroadcastType(value: string | null) {
  const labels: Record<string, string> = {
    external_link: "Link externo",
    embed: "Embed",
    zoom: "Zoom",
    youtube: "YouTube",
    vimeo: "Vimeo",
    other: "Outro",
  };

  return value ? labels[value] ?? value : "Não informado";
}

function getStatusLabel(status: LiveStatus | null) {
  if (!status) return "Sem status";

  return statusLabels[status] ?? status;
}

function getStatusClass(status: LiveStatus | null) {
  if (!status) return "bg-zinc-100 text-zinc-600";

  return statusClasses[status] ?? "bg-zinc-100 text-zinc-600";
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[#e5e5e5] bg-white p-5">
      <div className="flex items-center gap-2 text-[#8a8f9d]">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          {label}
        </p>
      </div>
      <div className="mt-3 text-[15px] font-semibold text-[#141414]">
        {value}
      </div>
    </div>
  );
}

export default async function AdminLiveDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const supabase = await supabaseServer();

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
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const live = data as unknown as LiveItem;
  const coverUrl = getPublicCoverUrl(live.cover_path);

  return (
    <div className="space-y-7 text-[#141414]">
      <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Link
            href="/admin/lives"
            className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-[#666b76] transition hover:text-[#141414]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para lives
          </Link>

          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
            Live
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-[#141414]">
            {live.title}
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#666b76]">
            {live.short_description || "Live cadastrada no ADM."}
          </p>
        </div>

        <Link
          href={`/admin/lives/${live.id}/editar`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#141414] px-5 text-[14px] font-semibold text-white transition hover:bg-[#2a2a2a]"
        >
          <Pencil className="h-4 w-4" />
          Editar live
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white">
          <div className="aspect-[16/9] bg-[#111]">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/60">
                <ImageIcon className="h-8 w-8" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Sem capa
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${getStatusClass(
                  live.status
                )}`}
              >
                {getStatusLabel(live.status)}
              </span>

              {live.is_active ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
                  Ativa
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-semibold text-zinc-600">
                  Inativa
                </span>
              )}

              {live.is_featured ? (
                <span className="rounded-full bg-[#fff7e8] px-3 py-1.5 text-[12px] font-semibold text-[#9a6a1f]">
                  Destaque
                </span>
              ) : null}
            </div>

            <div>
              <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
                Descrição
              </h2>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-7 text-[#666b76]">
                {live.description ||
                  live.short_description ||
                  "Nenhuma descrição completa cadastrada."}
              </p>
            </div>

            {live.live_url || live.cta_url || live.recording_url ? (
              <div className="grid gap-3 md:grid-cols-3">
                {live.live_url ? (
                  <a
                    href={live.live_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e5e5e5] px-4 text-[13px] font-semibold text-[#141414] transition hover:border-[#DBC094]"
                  >
                    Link da live
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}

                {live.cta_url ? (
                  <a
                    href={live.cta_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e5e5e5] px-4 text-[13px] font-semibold text-[#141414] transition hover:border-[#DBC094]"
                  >
                    {live.cta_label || "CTA"}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}

                {live.recording_url ? (
                  <a
                    href={live.recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e5e5e5] px-4 text-[13px] font-semibold text-[#141414] transition hover:border-[#DBC094]"
                  >
                    Gravação
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <InfoCard
            icon={<CalendarClock className="h-4 w-4" />}
            label="Início"
            value={formatDateTime(live.starts_at)}
          />

          <InfoCard
            icon={<CalendarClock className="h-4 w-4" />}
            label="Término previsto"
            value={formatDateTime(live.ends_at)}
          />

          <InfoCard
            icon={<UserRound className="h-4 w-4" />}
            label="Apresentador"
            value={live.presenter_name || "Não informado"}
          />

          <InfoCard
            icon={<Radio className="h-4 w-4" />}
            label="Transmissão"
            value={translateBroadcastType(live.broadcast_type)}
          />

          <InfoCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Configurações"
            value={
              <div className="space-y-1 text-[14px] font-medium text-[#666b76]">
                <p>Slug: {live.slug}</p>
                <p>Rank mínimo: {live.required_rank ?? 0}</p>
                <p>Ordem: {live.sort_order ?? 0}</p>
              </div>
            }
          />
        </aside>
      </section>
    </div>
  );
}
