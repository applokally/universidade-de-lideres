"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type NavChild = {
  label: string;
  href: string;
  icon: string;
};

type NavGroup = {
  label: string;
  icon: string;
  children?: NavChild[];
};

const navGroups: NavGroup[] = [
  {
    label: "Painel",
    icon: "▦",
    children: [{ label: "Visão geral", href: "/admin", icon: "⌂" }],
  },
  {
    label: "Alunos",
    icon: "◔",
    children: [
      { label: "Cadastros pendentes", href: "/admin/cadastros", icon: "📝" },
      { label: "Alunos ativos", href: "/admin/alunos", icon: "👥" },
      { label: "Níveis e permissões", href: "/admin/niveis", icon: "🔐" },
    ],
  },
  {
    label: "Cursos",
    icon: "▣",
    children: [
      { label: "Trilhas e cursos", href: "/admin/cursos", icon: "📚" },
      { label: "Módulos e aulas", href: "/admin/aulas", icon: "🎓" },
    ],
  },
  {
    label: "Área do aluno",
    icon: "▶",
    children: [
      { label: "Banner Principal", href: "/admin/banners-aluno", icon: "🖼️" },
      { label: "Categorias/Cards", href: "/admin/home-aluno", icon: "🏠" },
    ],
  },
  {
    label: "Experiência",
    icon: "✦",
    children: [
      { label: "Lives", href: "/admin/lives", icon: "🎥" },
      { label: "Comunidade", href: "/admin/comunidade", icon: "💬" },
      { label: "Gamificação", href: "/admin/gamificacao", icon: "🏆" },
    ],
  },
  {
    label: "Acadêmico",
    icon: "✓",
    children: [
      { label: "Avaliações", href: "/admin/avaliacoes", icon: "📋" },
      { label: "Certificados", href: "/admin/certificados", icon: "📜" },
      { label: "Assinaturas", href: "/admin/assinaturas", icon: "💳" },
    ],
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isGroupActive(pathname: string, group: NavGroup) {
  return group.children?.some((child) => pathname === child.href) ?? false;
}

function SidebarGroup({
  group,
  pathname,
  collapsed,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = isGroupActive(pathname, group);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (collapsed) {
    return (
      <div className="mb-3 flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-[14px] border transition",
            active
              ? "border-[#DBC094]/40 bg-[#DBC094] text-black"
              : "border-[#e6e6e6] bg-white text-[#676b78] hover:border-[#DBC094]/24 hover:text-[#1d2230]"
          )}
          title={group.label}
        >
          <span className="text-base">{group.icon}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between rounded-[14px] border px-4 py-3 text-left transition",
          active
            ? "border-[#DBC094]/32 bg-[#DBC094]/14 text-[#1d2230]"
            : "border-[#ececf2] bg-white text-[#3e4353] hover:border-[#DBC094]/24 hover:bg-[#faf8f4]"
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-base",
              active
                ? "bg-[#DBC094] text-black"
                : "bg-[#f5f6fb] text-[#7e8496]"
            )}
          >
            {group.icon}
          </span>
          <span className="text-[15px] font-medium">{group.label}</span>
        </div>

        <span
          className={cn(
            "text-sm text-[#7d8190] transition-transform",
            open ? "rotate-180" : ""
          )}
        >
          ˅
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && group.children ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-2 border-l border-[#ececf2] pl-4">
              {group.children.map((child) => {
                const childActive = pathname === child.href;

                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onNavigate}
                    className={cn(
                      "mb-1.5 flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] transition",
                      childActive
                        ? "bg-[#f7f0e2] text-[#7b5a28]"
                        : "text-[#666c7c] hover:bg-[#f6f7fb] hover:text-[#1e2230]"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-[14px]",
                        childActive
                          ? "bg-[#DBC094]/22 text-[#7b5a28]"
                          : "bg-[#f3f4f8] text-[#8a90a2]"
                      )}
                    >
                      {child.icon}
                    </span>
                    <span>{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HeaderIconButton({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f3f4f8] text-[#4a4f60] transition hover:bg-[#ebeef6] hover:text-[#1e2230]"
    >
      {children}
    </button>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-[#1f2230]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "hidden border-r border-[#e9ebf2] bg-white transition-all duration-300 lg:flex lg:flex-col",
            collapsed ? "w-[92px]" : "w-[312px]"
          )}
        >
          <div className="flex h-[82px] items-center border-b border-[#eef0f5] px-5">
            <div
              className={cn(
                "flex w-full items-center",
                collapsed ? "justify-center" : "justify-between gap-4"
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
                    collapsed ? "w-[48px]" : "w-[148px]"
                  )}
                />
              </Link>

              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f5f6fb] text-[#5f6475] transition hover:bg-[#eceff6] hover:text-[#1f2230]"
                >
                  ←
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            {collapsed ? (
              <div className="mb-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#f5f6fb] text-[#5f6475] transition hover:bg-[#eceff6] hover:text-[#1f2230]"
                >
                  →
                </button>
              </div>
            ) : null}

            {!collapsed ? (
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#8b90a2]">
                Módulos
              </div>
            ) : null}

            <nav>
              {navGroups.map((group) => (
                <SidebarGroup
                  key={group.label}
                  group={group}
                  pathname={pathname}
                  collapsed={collapsed}
                />
              ))}
            </nav>
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
                >
                  ☰
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
                <HeaderIconButton title="Tema">☼</HeaderIconButton>
                <HeaderIconButton title="Mensagens">✉</HeaderIconButton>
                <HeaderIconButton title="Notificações">🔔</HeaderIconButton>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((current) => !current)}
                    className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#f3f4f8]"
                  >
                    <Image
                      src="/lideres.jpg"
                      alt="Administrador"
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
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
                          <Image
                            src="/lideres.jpg"
                            alt="Administrador"
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-full object-cover"
                          />
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
                            { label: "Meu perfil", icon: "👤" },
                            { label: "Mensagens", icon: "✉" },
                            { label: "Configurações", icon: "⚙" },
                            { label: "Sair", icon: "⏻" },
                          ].map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[15px] text-[#4f5568] transition hover:bg-[#f6f7fb] hover:text-[#1f2230]"
                            >
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f8] text-[#6d7386]">
                                {item.icon}
                              </span>
                              {item.label}
                            </button>
                          ))}
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
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto px-4 py-5">
                <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#8b90a2]">
                  Módulos
                </div>

                <nav>
                  {navGroups.map((group) => (
                    <SidebarGroup
                      key={group.label}
                      group={group}
                      pathname={pathname}
                      collapsed={false}
                      onNavigate={() => setMobileSidebarOpen(false)}
                    />
                  ))}
                </nav>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}