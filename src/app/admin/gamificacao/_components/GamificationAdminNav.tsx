"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Gift,
  LayoutDashboard,
  ListChecks,
  Medal,
  Target,
  Trophy,
} from "lucide-react";

const tabs = [
  { label: "Visão geral", href: "/admin/gamificacao", icon: LayoutDashboard },
  { label: "Regras", href: "/admin/gamificacao/regras", icon: ListChecks },
  { label: "Desafios", href: "/admin/gamificacao/desafios", icon: Target },
  { label: "Ranking", href: "/admin/gamificacao/ranking", icon: Trophy },
  { label: "Recompensas", href: "/admin/gamificacao/recompensas", icon: Gift },
  { label: "Resgates", href: "/admin/gamificacao/resgates", icon: Award },
  { label: "Conquistas", href: "/admin/gamificacao/conquistas", icon: Medal },
];

export function GamificationAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/admin/gamificacao" && pathname?.startsWith(`${item.href}/`));

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
