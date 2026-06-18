"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  FileText,
  Flag,
  MessageCircle,
  Plus,
  Tags,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CommunityAdminNav } from "./_components/CommunityAdminNav";

type Metrics = {
  channels: number;
  posts: number;
  pendingPosts: number;
  comments: number;
  reports: number;
  notifications: number;
};

const actions = [
  {
    title: "Publicações",
    description: "Gerencie posts de alunos e publicações oficiais.",
    href: "/admin/comunidade/publicacoes",
    icon: FileText,
  },
  {
    title: "Nova publicação",
    description: "Publique avisos, desafios, mentorias e materiais.",
    href: "/admin/comunidade/publicacoes/nova",
    icon: Plus,
  },
  {
    title: "Comentários",
    description: "Acompanhe respostas e modere conversas.",
    href: "/admin/comunidade/comentarios",
    icon: MessageCircle,
  },
  {
    title: "Denúncias",
    description: "Analise conteúdos reportados pelos alunos.",
    href: "/admin/comunidade/denuncias",
    icon: Flag,
  },
  {
    title: "Notificações",
    description: "Envie comunicados para a comunidade.",
    href: "/admin/comunidade/notificacoes",
    icon: Bell,
  },
  {
    title: "Canais",
    description: "Crie e ajuste salas de conversa.",
    href: "/admin/comunidade/canais/novo",
    icon: Tags,
  },
];

export default function AdminComunidadePage() {
  const [metrics, setMetrics] = useState<Metrics>({
    channels: 0,
    posts: 0,
    pendingPosts: 0,
    comments: 0,
    reports: 0,
    notifications: 0,
  });

  const supabase = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    async function loadMetrics() {
      const [
        channels,
        posts,
        pendingPosts,
        comments,
        reports,
        notifications,
      ] = await Promise.all([
        supabase.from("community_channels").select("id", { count: "exact", head: true }),
        supabase.from("community_posts").select("id", { count: "exact", head: true }),
        supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("community_comments").select("id", { count: "exact", head: true }),
        supabase
          .from("community_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase.from("community_notifications").select("id", { count: "exact", head: true }),
      ]);

      setMetrics({
        channels: channels.count ?? 0,
        posts: posts.count ?? 0,
        pendingPosts: pendingPosts.count ?? 0,
        comments: comments.count ?? 0,
        reports: reports.count ?? 0,
        notifications: notifications.count ?? 0,
      });
    }

    void loadMetrics();
  }, [supabase]);

  return (
    <>
      <CommunityAdminNav />

      <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
            Comunidade
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em] text-[#1f2230]">
            Gestão da comunidade
          </h1>
          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">
            Gerencie canais, publicações, comentários, denúncias e notificações que alimentam a área do aluno.
          </p>
        </div>

        <Link
          href="/admin/comunidade/publicacoes/nova"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
        >
          <Plus className="h-4 w-4" />
          Nova publicação
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Canais", metrics.channels],
          ["Publicações", metrics.posts],
          ["Pendentes", metrics.pendingPosts],
          ["Comentários", metrics.comments],
          ["Denúncias abertas", metrics.reports],
          ["Notificações", metrics.notifications],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[18px] border border-[#e7e9f0] bg-white px-5 py-4"
          >
            <p className="text-[12px] font-medium text-[#697386]">{label}</p>
            <strong className="mt-2 block text-[28px] font-semibold tracking-[-0.04em] text-[#1f2230]">
              {value}
            </strong>
          </div>
        ))}
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-[22px] border border-[#e7e9f0] bg-white p-5 transition hover:border-[#d8bb80] hover:shadow-[0_18px_44px_rgba(31,34,48,0.08)]"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f7f0e2] text-[#7c5d2f] transition group-hover:bg-[#DBC094] group-hover:text-black">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <strong className="block text-[17px] font-semibold text-[#1f2230]">
                    {action.title}
                  </strong>
                  <span className="mt-1 block text-[13px] leading-5 text-[#667085]">
                    {action.description}
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </>
  );
}
