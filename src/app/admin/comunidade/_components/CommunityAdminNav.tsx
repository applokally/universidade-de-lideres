"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  Flag,
  MessageCircle,
  Settings,
  Tags,
} from "lucide-react";

const tabs = [
  { label: "Visão geral", href: "/admin/comunidade", icon: MessageCircle },
  { label: "Canais", href: "/admin/comunidade/canais/novo", icon: Tags },
  { label: "Publicações", href: "/admin/comunidade/publicacoes", icon: FileText },
  { label: "Comentários", href: "/admin/comunidade/comentarios", icon: MessageCircle },
  { label: "Denúncias", href: "/admin/comunidade/denuncias", icon: Flag },
  { label: "Notificações", href: "/admin/comunidade/notificacoes", icon: Bell },
  { label: "Configurações", href: "/admin/comunidade/configuracoes", icon: Settings },
];

export function CommunityAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/admin/comunidade" && pathname?.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition",
              active
                ? "border-[#d8bb80] bg-[#f7f0e2] text-[#6f5124]"
                : "border-[#e3e6ee] bg-white text-[#596174] hover:border-[#d8bb80]/70 hover:text-[#1f2230]",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
