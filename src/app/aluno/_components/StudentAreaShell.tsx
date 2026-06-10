"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ChevronRight,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  User,
} from "lucide-react";
import { StudentHeader } from "./StudentHeader";

const studentAreaMenu = [
  {
    label: "Dashboard",
    href: "/aluno/area",
    activePaths: ["/aluno/area"],
    icon: LayoutDashboard,
  },
  {
    label: "Meus Dados",
    href: "/aluno/area/meus-dados",
    activePaths: ["/aluno/area/meus-dados"],
    icon: User,
  },
  {
    label: "Meus Cursos",
    href: "/aluno/cursos",
    activePaths: ["/aluno/cursos", "/aluno/aulas"],
    icon: BookOpen,
  },
  {
    label: "Minhas Trilhas",
    href: "/aluno/trilhas",
    activePaths: ["/aluno/trilhas"],
    icon: GraduationCap,
  },
  {
    label: "Gamificação",
    href: "/aluno/gamificacao",
    activePaths: ["/aluno/gamificacao"],
    icon: Gamepad2,
  },
  {
    label: "Meus Certificados",
    href: "/aluno/area/certificados",
    activePaths: ["/aluno/area/certificados"],
    icon: Award,
  },
];

type StudentAreaShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function StudentAreaShell({
  eyebrow = "Área do aluno",
  title,
  description,
  children,
}: StudentAreaShellProps) {
  const pathname = usePathname();
  const shouldShowPageHeader = title.trim().toLowerCase() !== "conta ativa";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] pb-[92px] text-white">
      <StudentHeader />

      <aside className="fixed bottom-[76px] left-0 top-[84px] z-20 hidden w-[286px] border-r border-white/10 bg-[#050609] xl:flex xl:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <h2 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-white">
            Área do Aluno
          </h2>

          <div className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-white/52">
            <span className="h-2 w-2 rounded-full bg-[#DBC094]" />
            Conta ativa
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {studentAreaMenu.map((item) => {
            const Icon = item.icon;

            const isActive = item.activePaths.some((activePath) =>
              activePath === "/aluno/area"
                ? pathname === activePath
                : pathname?.startsWith(activePath),
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "group flex min-h-[62px] items-center gap-4 border-b border-white/10 px-6 text-[#DBC094]"
                    : "group flex min-h-[62px] items-center gap-4 border-b border-white/10 px-6 text-white/64 transition hover:bg-[#DBC094] hover:text-black"
                }
              >
                <Icon
                  className={
                    isActive
                      ? "h-[25px] w-[25px] shrink-0 text-[#DBC094]"
                      : "h-[25px] w-[25px] shrink-0 text-white/72 transition group-hover:text-black"
                  }
                  strokeWidth={1.8}
                />

                <span
                  className={
                    isActive
                      ? "min-w-0 flex-1 truncate text-[15px] font-semibold"
                      : "min-w-0 flex-1 truncate text-[15px] font-medium"
                  }
                >
                  {item.label}
                </span>

                <ChevronRight
                  className={
                    isActive
                      ? "h-4 w-4 shrink-0 text-[#DBC094]"
                      : "h-4 w-4 shrink-0 text-white/28 transition group-hover:text-black/70"
                  }
                  strokeWidth={1.8}
                />
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-5">
          <p className="text-[11px] font-medium leading-5 text-white/30">
            Conteúdos, trilhas, conquistas e certificados em um só lugar.
          </p>
        </div>
      </aside>

      <section className="px-5 pb-10 pt-[104px] sm:px-8 lg:px-10 xl:pl-[326px]">
        <div className="mx-auto max-w-[1394px]">
          <aside className="mb-6 overflow-hidden border border-white/10 bg-[#050609] xl:hidden">
            <div className="border-b border-white/10 px-5 py-5">
              <h2 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-white">
                Área do Aluno
              </h2>

              <div className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-white/52">
                <span className="h-2 w-2 rounded-full bg-[#DBC094]" />
                Conta ativa
              </div>
            </div>

            <nav>
              {studentAreaMenu.map((item) => {
                const Icon = item.icon;

                const isActive = item.activePaths.some((activePath) =>
                  activePath === "/aluno/area"
                    ? pathname === activePath
                    : pathname?.startsWith(activePath),
                );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isActive
                        ? "group flex min-h-[58px] items-center gap-4 border-b border-white/10 px-5 text-[#DBC094]"
                        : "group flex min-h-[58px] items-center gap-4 border-b border-white/10 px-5 text-white/64 transition hover:bg-[#DBC094] hover:text-black"
                    }
                  >
                    <Icon
                      className={
                        isActive
                          ? "h-[24px] w-[24px] shrink-0 text-[#DBC094]"
                          : "h-[24px] w-[24px] shrink-0 text-white/72 transition group-hover:text-black"
                      }
                      strokeWidth={1.8}
                    />

                    <span
                      className={
                        isActive
                          ? "min-w-0 flex-1 truncate text-[14px] font-semibold"
                          : "min-w-0 flex-1 truncate text-[14px] font-medium"
                      }
                    >
                      {item.label}
                    </span>

                    <ChevronRight
                      className={
                        isActive
                          ? "h-4 w-4 shrink-0 text-[#DBC094]"
                          : "h-4 w-4 shrink-0 text-white/28 transition group-hover:text-black/70"
                      }
                      strokeWidth={1.8}
                    />
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">
            {shouldShowPageHeader ? (
              <header className="mb-6 px-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#DBC094]">
                  {eyebrow}
                </p>

                <h1 className="mt-2 max-w-[900px] text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[41px]">
                  {title}
                </h1>

                {description ? (
                  <p className="mt-3 max-w-[820px] text-[14px] leading-6 text-white/52">
                    {description}
                  </p>
                ) : null}
              </header>
            ) : null}

            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
