import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Layers3,
  Lock,
  MessageCircle,
  MessagesSquare,
  UsersRound,
} from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CommunityChannel = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  is_locked: boolean | null;
  visibility: string | null;
  required_rank: number | null;
};

type CommunityPost = {
  id: string;
  status: string | null;
};

type CommunityComment = {
  id: string;
  status: string | null;
};

type CommunityNotification = {
  id: string;
  status: string | null;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const tones = {
    neutral: "bg-[#f3f4f8] text-[#666b76]",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-[#fff7e8] text-[#9a6a1f]",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function StatLine({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ElementType;
}) {
  return (
    <div className="flex items-center justify-between rounded-[16px] bg-[#f8f9fc] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-[#9b7539]" strokeWidth={1.8} />
        <span className="truncate text-[14px] font-medium text-[#666b76]">
          {label}
        </span>
      </div>

      <strong className="text-[18px] font-semibold text-[#141414]">
        {formatNumber(value)}
      </strong>
    </div>
  );
}

export default async function AdminCanalComunidadeDetalhePage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [channelResponse, postsResponse, notificationsResponse] =
    await Promise.all([
      supabase
        .from("community_channels")
        .select(
          "id,name,description,is_active,is_locked,visibility,required_rank"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("community_posts")
        .select("id,status")
        .eq("channel_id", id)
        .limit(500),
      supabase
        .from("community_notifications")
        .select("id,status")
        .eq("channel_id", id)
        .limit(500),
    ]);

  if (channelResponse.error || !channelResponse.data) {
    notFound();
  }

  const channel = channelResponse.data as unknown as CommunityChannel;
  const posts = (postsResponse.data ?? []) as unknown as CommunityPost[];
  const notifications =
    (notificationsResponse.data ?? []) as unknown as CommunityNotification[];

  const publishedPosts = posts.filter((post) => post.status === "published").length;
  const sentNotifications = notifications.filter(
    (notification) => notification.status === "sent"
  ).length;

  let publishedComments = 0;

  if (posts.length > 0) {
    const postIds = posts.map((post) => post.id);

    const { data } = await supabase
      .from("community_comments")
      .select("id,status")
      .in("post_id", postIds)
      .limit(500);

    const comments = (data ?? []) as unknown as CommunityComment[];

    publishedComments = comments.filter(
      (comment) => comment.status === "published"
    ).length;
  }

  return (
    <div className="space-y-7 text-[#141414]">
      <section className="border-b border-[#e5e5e5] pb-7">
        <Link
          href="/admin/comunidade"
          className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-[#666b76] transition hover:text-[#141414]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para comunidade
        </Link>

        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
          Canal da comunidade
        </p>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-[#141414]">
              {channel.name}
            </h1>

            {channel.description ? (
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#666b76]">
                {channel.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {channel.is_active ? (
              <StatusBadge tone="success">Ativo</StatusBadge>
            ) : (
              <StatusBadge>Inativo</StatusBadge>
            )}

            {channel.is_locked ? (
              <StatusBadge tone="warning">Publicação restrita</StatusBadge>
            ) : (
              <StatusBadge>Publicação aberta</StatusBadge>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[24px] border border-[#e5e7ef] bg-white shadow-[0_18px_50px_rgba(18,24,40,0.04)]">
          <div className="border-b border-[#eef0f5] px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
              Canal
            </p>
            <h2 className="mt-2 text-[21px] font-semibold tracking-[-0.03em]">
              Informações
            </h2>
          </div>

          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4 rounded-[16px] bg-[#f8f9fc] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <UsersRound className="h-4 w-4 shrink-0 text-[#9b7539]" />
                <span className="truncate text-[14px] font-medium text-[#666b76]">
                  Visibilidade
                </span>
              </div>

              <strong className="text-[14px] font-semibold text-[#141414]">
                {channel.visibility === "rank"
                  ? `A partir do nível ${channel.required_rank ?? 0}`
                  : "Todos os assinantes"}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[16px] bg-[#f8f9fc] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Lock className="h-4 w-4 shrink-0 text-[#9b7539]" />
                <span className="truncate text-[14px] font-medium text-[#666b76]">
                  Publicações
                </span>
              </div>

              <strong className="text-[14px] font-semibold text-[#141414]">
                {channel.is_locked
                  ? "Somente administração"
                  : "Assinantes podem publicar"}
              </strong>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-[#e5e7ef] bg-white p-6 shadow-[0_18px_50px_rgba(18,24,40,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
              Movimento
            </p>

            <h2 className="mt-2 text-[21px] font-semibold tracking-[-0.03em]">
              Atividade do canal
            </h2>

            <div className="mt-5 space-y-3">
              <StatLine
                label="Posts publicados"
                value={publishedPosts}
                icon={MessagesSquare}
              />
              <StatLine
                label="Comentários ativos"
                value={publishedComments}
                icon={MessageCircle}
              />
              <StatLine
                label="Avisos enviados"
                value={sentNotifications}
                icon={Bell}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e5e7ef] bg-white p-6 shadow-[0_18px_50px_rgba(18,24,40,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f7f2e8] text-[#9b7539]">
                <Layers3 className="h-5 w-5" strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
                  Organização
                </p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">
                  Canal pronto para uso
                </h2>
              </div>
            </div>

            <p className="mt-4 text-[14px] leading-7 text-[#666b76]">
              Este canal já pode ser usado para agrupar publicações e conversas
              dentro da comunidade.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
