"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bell,
  BookOpen,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MonitorPlay,
  ShieldCheck,
  Trophy,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type NavChild = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  children: NavChild[];
};

const navGroups: NavGroup[] = [
  {
    label: "Painel",
    children: [
      {
        label: "Visão geral",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Alunos",
    children: [
      {
        label: "Cadastros pendentes",
        href: "/admin/cadastros",
        icon: UserCheck,
      },
      {
        label: "Alunos ativos",
        href: "/admin/alunos",
        icon: Users,
      },
      {
        label: "Níveis e permissões",
        href: "/admin/niveis",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "Cursos",
    children: [
      {
        label: "Trilhas e cursos",
        href: "/admin/cursos",
        icon: BookOpen,
      },
      {
        label: "Módulos e aulas",
        href: "/admin/aulas",
        icon: Award,
      },
    ],
  },
  {
    label: "Área do aluno",
    children: [
      {
        label: "Banner principal",
        href: "/admin/banners-aluno",
        icon: MonitorPlay,
      },
      {
        label: "Categorias/Cards",
        href: "/admin/home-aluno",
        icon: Home,
      },
    ],
  },
  {
    label: "Experiência",
    children: [
      {
        label: "Lives",
        href: "/admin/lives",
        icon: MonitorPlay,
      },
      {
        label: "Comunidade",
        href: "/admin/comunidade",
        icon: MessageCircle,
      },
      {
        label: "Gamificação",
        href: "/admin/gamificacao",
        icon: Trophy,
      },
    ],
  },
  {
    label: "Acadêmico",
    children: [
      {
        label: "Avaliações",
        href: "/admin/avaliacoes",
        icon: FileText,
      },
      {
        label: "Certificados",
        href: "/admin/certificados",
        icon: Award,
      },
      {
        label: "Assinaturas",
        href: "/admin/assinaturas",
        icon: CreditCard,
      },
    ],
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isChildActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavigation({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav>
      {navGroups.map((group) => (
        <div key={group.label} className="border-b border-[#e9ebf2] py-4">
          {!collapsed ? (
            <p className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b90a2]">
              {group.label}
            </p>
          ) : null}

          <div>
            {group.children.map((child) => {
              const Icon = child.icon;
              const active = isChildActive(pathname, child.href);

              if (collapsed) {
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onNavigate}
                    title={child.label}
                    className={cn(
                      "group mx-auto flex h-[54px] w-[54px] items-center justify-center border-b border-transparent text-[#707789] transition last:border-b-0 hover:bg-[#DBC094] hover:text-black",
                      active ? "text-[#9b7539]" : "",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[23px] w-[23px] transition",
                        active
                          ? "text-[#9b7539]"
                          : "text-[#707789] group-hover:text-black",
                      )}
                      strokeWidth={1.8}
                    />
                  </Link>
                );
              }

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex min-h-[58px] items-center gap-4 border-t border-[#eef0f5] px-5 text-[15px] transition first:border-t-0",
                    active
                      ? "text-[#9b7539]"
                      : "text-[#51586b] hover:bg-[#DBC094] hover:text-black",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[23px] w-[23px] shrink-0 transition",
                      active
                        ? "text-[#9b7539]"
                        : "text-[#7d8494] group-hover:text-black",
                    )}
                    strokeWidth={1.8}
                  />

                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {child.label}
                  </span>

                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 transition",
                      active
                        ? "text-[#9b7539]"
                        : "text-[#a3a8b5] group-hover:text-black/65",
                    )}
                    strokeWidth={1.8}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function HeaderIconButton({
  children,
  title,
  href,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f3f4f8] text-[#4a4f60] transition hover:bg-[#ebeef6] hover:text-[#1e2230]";

  if (href) {
    return (
      <Link href={href} title={title} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" title={title} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-[#1f2230]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "hidden border-r border-[#e9ebf2] bg-white transition-all duration-300 lg:flex lg:flex-col",
            collapsed ? "w-[92px]" : "w-[312px]",
          )}
        >
          <div className="flex h-[82px] items-center border-b border-[#eef0f5] px-5">
            <div
              className={cn(
                "flex w-full items-center",
                collapsed ? "justify-center" : "justify-between gap-4",
              )}
            >
              <Link href="/" className="inline-flex items-center">
                <Image
                  src="/logo.png"
                  alt="Universidade de Líderes"
                  width={150}
                  height={52}
                  priority
                  className={cn(
                    "h-auto object-contain",
                    collapsed ? "w-[48px]" : "w-[148px]",
                  )}
                />
              </Link>

              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f5f6fb] text-[#5f6475] transition hover:bg-[#eceff6] hover:text-[#1f2230]"
                  aria-label="Recolher menu"
                  title="Recolher menu"
                >
                  ←
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {collapsed ? (
              <div className="border-b border-[#e9ebf2] py-4">
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="mx-auto flex h-[54px] w-[54px] items-center justify-center bg-[#f5f6fb] text-[#5f6475] transition hover:bg-[#DBC094] hover:text-black"
                  aria-label="Expandir menu"
                  title="Expandir menu"
                >
                  →
                </button>
              </div>
            ) : null}

            <SidebarNavigation pathname={pathname} collapsed={collapsed} />
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[#e9ebf2] bg-white">
            <div className="flex h-[82px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#f3f4f8] text-[#505567] lg:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="relative hidden w-full max-w-[430px] sm:block">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7e8396]">
                    ⌕
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar aluno, curso, aula..."
                    className="h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] pl-12 pr-4 text-[15px] text-[#1f2230] outline-none transition placeholder:text-[#8d92a4] focus:border-[#DBC094]/42 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">

                <HeaderIconButton title="Notificações" href="/admin/cadastros">
                  <Bell className="h-5 w-5" />
                </HeaderIconButton>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((current) => !current)}
                    className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#f3f4f8] text-[13px] font-semibold text-[#1f2230]"
                    aria-label="Abrir perfil"
                  >
                    AD
                  </button>

                  <AnimatePresence>
                    {profileOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="absolute right-0 top-[calc(100%+12px)] w-[310px] overflow-hidden rounded-[20px] border border-[#e6eaf1] bg-white shadow-[0_18px_42px_rgba(31,34,48,0.12)]"
                      >
                        <div className="m-4 flex items-center gap-4 rounded-[16px] bg-[#f7f0e2] p-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DBC094] text-[15px] font-semibold text-black">
                            AD
                          </div>

                          <div>
                            <div className="text-[18px] font-semibold text-[#1f2230]">
                              Administrador
                            </div>
                            <div className="mt-1 text-sm text-[#667085]">
                              Universidade de Líderes
                            </div>
                          </div>
                        </div>

                        <div className="px-3 pb-3">
                          {[
                            {
                              label: "Meu perfil",
                              href: "/admin/perfil",
                              icon: User,
                            },
                            {
                              label: "Mensagens",
                              href: "/admin/comunidade",
                              icon: MessageCircle,
                            },
                            {
                              label: "Configurações",
                              href: "/admin/configuracoes",
                              icon: ShieldCheck,
                            },
                          ].map((item) => {
                            const Icon = item.icon;

                            return (
                              <Link
                                key={item.label}
                                href={item.href}
                                className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[15px] text-[#4f5568] transition hover:bg-[#f6f7fb] hover:text-[#1f2230]"
                              >
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f8] text-[#6d7386]">
                                  <Icon className="h-4 w-4" />
                                </span>
                                {item.label}
                              </Link>
                            );
                          })}

                          <Link
                            href="/login"
                            className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[15px] text-[#4f5568] transition hover:bg-[#f6f7fb] hover:text-[#1f2230]"
                          >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f8] text-[#6d7386]">
                              ×
                            </span>
                            Sair
                          </Link>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <AnimatePresence>
        {mobileSidebarOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/28 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />

            <motion.aside
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-y-0 left-0 z-[121] w-[312px] border-r border-[#e9ebf2] bg-white lg:hidden"
            >
              <div className="flex h-[82px] items-center justify-between border-b border-[#eef0f5] px-5">
                <Image
                  src="/logo.png"
                  alt="Universidade de Líderes"
                  width={150}
                  height={52}
                  priority
                  className="h-auto w-[148px] object-contain"
                />

                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f5f6fb] text-[#5f6475]"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="h-[calc(100vh-82px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <SidebarNavigation
                  pathname={pathname}
                  collapsed={false}
                  onNavigate={() => setMobileSidebarOpen(false)}
                />
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
