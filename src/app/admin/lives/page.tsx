import Link from "next/link";
import {
  CalendarClock,
  CircleHelp,
  Eye,
  Image as ImageIcon,
  MonitorPlay,
  Pencil,
  Plus,
  Radio,
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
  cover_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  presenter_name: string | null;
  broadcast_type: string | null;
  status: LiveStatus | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  created_at: string | null;
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
  if (!value) return "Sem data";

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

export default async function AdminLivesPage() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("lives")
    .select(
      [
        "id",
        "title",
        "slug",
        "short_description",
        "cover_path",
        "starts_at",
        "ends_at",
        "presenter_name",
        "broadcast_type",
        "status",
        "is_active",
        "is_featured",
        "created_at",
      ].join(",")
    )
    .order("starts_at", { ascending: false });

  const lives = ((data ?? []) as unknown as LiveItem[]).filter(Boolean);
  const activeCount = lives.filter((live) => live.is_active).length;
  const liveNowCount = lives.filter((live) => live.status === "live").length;
  const scheduledCount = lives.filter(
    (live) => live.status === "scheduled"
  ).length;

  return (
    <div className="space-y-7 text-[#141414]">
      <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
            Experiência
          </p>

          <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-[#141414]">
            Lives
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#666b76]">
            Gerencie as transmissões ao vivo exibidas na área do aluno, com
            capa, descrição, horário, status, link, embed ou Zoom.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/lives/guia"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#dfe3ec] bg-white px-5 text-[14px] font-semibold"
          >
            <CircleHelp className="h-4 w-4" />
            Como configurar
          </Link>
          <Link
            href="/admin/lives/nova"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#141414] px-5 text-[14px] font-semibold text-white transition hover:bg-[#2a2a2a]"
          >
            <Plus className="h-4 w-4" />
            Nova live
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[18px] border border-[#e5e5e5] bg-white p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
            Cadastradas
          </p>
          <strong className="mt-3 block text-[32px] font-semibold">
            {lives.length}
          </strong>
        </div>

        <div className="rounded-[18px] border border-[#e5e5e5] bg-white p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
            Ativas
          </p>
          <strong className="mt-3 block text-[32px] font-semibold">
            {activeCount}
          </strong>
        </div>

        <div className="rounded-[18px] border border-[#e5e5e5] bg-white p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
            Ao vivo / agendadas
          </p>
          <strong className="mt-3 block text-[32px] font-semibold">
            {liveNowCount + scheduledCount}
          </strong>
        </div>
      </section>

      {error ? (
        <div className="rounded-[18px] border border-red-100 bg-red-50 p-5 text-[14px] text-red-700">
          Não foi possível carregar as lives: {error.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-[#e5e5e5] bg-white">
        <div className="grid grid-cols-[110px_1fr_170px_150px_150px] gap-4 border-b border-[#efefef] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
          <span>Capa</span>
          <span>Live</span>
          <span>Data</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </div>

        {lives.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f6f6f6] text-[#8a8f9d]">
              <MonitorPlay className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#141414]">
                Nenhuma live cadastrada
              </p>
              <p className="mt-1 text-[14px] text-[#666b76]">
                Cadastre a primeira transmissão para exibir na área do aluno.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#efefef]">
            {lives.map((live) => {
              const coverUrl = getPublicCoverUrl(live.cover_path);

              return (
                <article
                  key={live.id}
                  className="grid grid-cols-[110px_1fr_170px_150px_150px] gap-4 px-6 py-5"
                >
                  <div className="h-[68px] overflow-hidden rounded-[12px] bg-[#111]">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                        Sem capa
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[16px] font-semibold tracking-[-0.02em] text-[#141414]">
                        {live.title}
                      </h2>

                      {live.is_featured ? (
                        <span className="rounded-full bg-[#fff7e8] px-2.5 py-1 text-[11px] font-semibold text-[#9a6a1f]">
                          Destaque
                        </span>
                      ) : null}

                      {live.is_active ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Ativa
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                          Inativa
                        </span>
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#666b76]">
                      {live.short_description || "Sem descrição curta."}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#8a8f9d]">
                      <span className="inline-flex items-center gap-1">
                        <Radio className="h-3.5 w-3.5" />
                        {translateBroadcastType(live.broadcast_type)}
                      </span>

                      {live.presenter_name ? (
                        <span>Com {live.presenter_name}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center text-[13px] leading-5 text-[#666b76]">
                    <CalendarClock className="mr-2 h-4 w-4 text-[#8a8f9d]" />
                    {formatDateTime(live.starts_at)}
                  </div>

                  <div className="flex items-center">
                    <span
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${getStatusClass(
                        live.status
                      )}`}
                    >
                      {getStatusLabel(live.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/lives/${live.id}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#e5e5e5] text-[#666b76] transition hover:border-[#DBC094] hover:text-[#141414]"
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>

                    <Link
                      href={`/admin/lives/${live.id}/editar`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#e5e5e5] text-[#666b76] transition hover:border-[#DBC094] hover:text-[#141414]"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
