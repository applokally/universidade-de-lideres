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

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <section className="px-5 pb-16 pt-[92px] sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1720px] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-[92px] xl:h-[calc(100vh-112px)]">
            <div className="h-full overflow-hidden rounded-[26px] border border-white/10 bg-[#101116]">
              <div className="border-b border-white/10 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                  Universidade de Líderes
                </p>

                <h2 className="mt-2 text-[25px] font-black leading-tight tracking-[-0.05em] text-white">
                  Área do Aluno
                </h2>

                <p className="mt-2 text-[13px] leading-5 text-white/46">
                  Acompanhe seus dados, cursos, trilhas, progresso, conquistas e certificados.
                </p>
              </div>

              <nav className="grid gap-2 p-3">
                {studentAreaMenu.map((item) => {
                  const Icon = item.icon;

                  const isActive = item.activePaths.some((activePath) =>
                    activePath === "/aluno/area"
                      ? pathname === activePath
                      : pathname?.startsWith(activePath)
                  );

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        isActive
                          ? "group flex items-center justify-between gap-3 rounded-[16px] border border-[#DBC094]/42 bg-[#DBC094]/14 px-3 py-3 text-[#DBC094]"
                          : "group flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-white/[0.025] px-3 py-3 text-white/62 transition hover:border-[#DBC094]/35 hover:bg-white/[0.055] hover:text-[#DBC094]"
                      }
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={
                            isActive
                              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DBC094] text-black"
                              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/68 transition group-hover:bg-[#DBC094] group-hover:text-black"
                          }
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </span>

                        <span className="truncate text-[14px] font-black">
                          {item.label}
                        </span>
                      </span>

                      <ChevronRight
                        className={
                          isActive
                            ? "h-4 w-4 text-[#DBC094]"
                            : "h-4 w-4 text-white/28 transition group-hover:text-[#DBC094]"
                        }
                      />
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="mb-6 rounded-[28px] border border-white/10 bg-[#101116] p-5 sm:p-7">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                {eyebrow}
              </p>

              <h1 className="mt-3 max-w-[900px] text-[34px] font-black leading-[1.02] tracking-[-0.06em] text-white sm:text-[46px]">
                {title}
              </h1>

              {description ? (
                <p className="mt-4 max-w-[820px] text-[15px] leading-7 text-white/58">
                  {description}
                </p>
              ) : null}
            </header>

            {children}
          </div>
        </div>
      </section>
    </main>
  );
}