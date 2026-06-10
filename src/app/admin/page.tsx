import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  UserCheck,
  Users,
} from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CountFilter = (query: any) => any;

type CourseRow = {
  id: string;
  title: string | null;
  status: string | null;
};

type LessonRow = {
  id: string;
  title: string | null;
  status: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
};

async function getCount(table: string, filter?: CountFilter) {
  try {
    const supabase = await supabaseServer();
    let query = (supabase as any)
      .from(table)
      .select("*", { count: "exact", head: true });

    if (filter) query = filter(query);

    const { count, error } = await query;

    if (error) return 0;

    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getRows<T>(table: string, select: string, limit = 4) {
  try {
    const supabase = await supabaseServer();

    const { data, error } = await (supabase as any)
      .from(table)
      .select(select)
      .limit(limit);

    if (error || !data) return [];

    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  });
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "sem status";

  const normalized = status.toLowerCase();

  if (normalized === "published") return "publicado";
  if (normalized === "draft") return "rascunho";
  if (normalized === "archived") return "arquivado";
  if (normalized === "active") return "ativo";
  if (normalized === "inactive") return "inativo";

  return status;
}

function getDisplayName(profile: ProfileRow) {
  return profile.full_name?.trim() || "Aluno sem nome informado";
}

function StatusDot({ status }: { status: "positive" | "warning" }) {
  return (
    <span
      className={[
        "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
        status === "warning" ? "bg-[#b91c1c]" : "bg-[#DBC094]",
      ].join(" ")}
    />
  );
}

export default async function AdminPage() {
  const [
    studentsCount,
    adminsCount,
    trailsCount,
    coursesCount,
    publishedCoursesCount,
    draftCoursesCount,
    modulesCount,
    lessonsCount,
    publishedLessonsCount,
    draftLessonsCount,
    recentCourses,
    recentLessons,
    recentProfiles,
  ] = await Promise.all([
    getCount("profiles", (query) => query.eq("role", "member")),
    getCount("profiles", (query) => query.in("role", ["admin", "super_admin"])),
    getCount("course_categories"),
    getCount("courses"),
    getCount("courses", (query) => query.eq("status", "published")),
    getCount("courses", (query) => query.neq("status", "published")),
    getCount("course_modules"),
    getCount("lessons"),
    getCount("lessons", (query) => query.eq("status", "published")),
    getCount("lessons", (query) => query.neq("status", "published")),
    getRows<CourseRow>("courses", "id,title,status", 4),
    getRows<LessonRow>("lessons", "id,title,status", 4),
    getRows<ProfileRow>("profiles", "id,full_name,role,created_at", 4),
  ]);

  const metrics = [
    {
      label: "Alunos cadastrados",
      value: studentsCount,
      detail: "perfis de aluno",
      href: "/admin/alunos",
    },
    {
      label: "Trilhas cadastradas",
      value: trailsCount,
      detail: "categorias/trilhas",
      href: "/admin/cursos",
    },
    {
      label: "Cursos publicados",
      value: publishedCoursesCount,
      detail: `${formatNumber(coursesCount)} no total`,
      href: "/admin/cursos",
    },
    {
      label: "Aulas publicadas",
      value: publishedLessonsCount,
      detail: `${formatNumber(lessonsCount)} no total`,
      href: "/admin/aulas",
    },
  ];

  const pendingItems = [
    {
      title: "Cursos em revisão",
      description:
        "Cursos que ainda não estão publicados e precisam de revisão administrativa.",
      value: draftCoursesCount,
      action: "Revisar cursos",
      href: "/admin/cursos",
      icon: BookOpen,
    },
    {
      title: "Aulas em revisão",
      description:
        "Aulas cadastradas que ainda não estão publicadas para os alunos.",
      value: draftLessonsCount,
      action: "Revisar aulas",
      href: "/admin/aulas",
      icon: FileText,
    },
    {
      title: "Módulos cadastrados",
      description:
        "Estrutura total de módulos organizada dentro dos cursos da plataforma.",
      value: modulesCount,
      action: "Gerenciar módulos",
      href: "/admin/cursos",
      icon: GraduationCap,
    },
  ];

  const quickActions = [
    {
      label: "Gerenciar cursos",
      href: "/admin/cursos",
      icon: BookOpen,
    },
    {
      label: "Gerenciar aulas",
      href: "/admin/aulas",
      icon: GraduationCap,
    },
    {
      label: "Cadastros",
      href: "/admin/cadastros",
      icon: UserCheck,
    },
    {
      label: "Alunos ativos",
      href: "/admin/alunos",
      icon: Users,
    },
  ];

  const updates = [
    ...recentCourses.map((course) => ({
      title: course.title || "Curso sem título",
      description: `Curso cadastrado com status: ${formatStatus(course.status)}.`,
      href: "/admin/cursos",
      status: course.status === "published" ? "positive" : "warning",
    })),
    ...recentLessons.map((lesson) => ({
      title: lesson.title || "Aula sem título",
      description: `Aula cadastrada com status: ${formatStatus(lesson.status)}.`,
      href: "/admin/aulas",
      status: lesson.status === "published" ? "positive" : "warning",
    })),
    ...recentProfiles.map((profile) => ({
      title: getDisplayName(profile),
      description: `Perfil cadastrado como ${profile.role || "sem tipo definido"}.`,
      href: "/admin/alunos",
      status: profile.role === "member" ? "positive" : "warning",
    })),
  ].slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
            Painel administrativo
          </p>

          <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
            Visão geral
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
            Acompanhe os dados reais da plataforma e acesse rapidamente as principais áreas de gestão.
          </p>
        </div>

        <Link
          href="/admin/cadastros"
          className="inline-flex h-12 items-center justify-center gap-3 self-start rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 lg:self-auto"
        >
          Abrir cadastros
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
        <div className="grid divide-y divide-[#e5e5e5] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Link
              key={metric.label}
              href={metric.href}
              className="group flex items-center justify-between gap-4 p-5 transition hover:bg-[#f7f7f7]"
            >
              <div>
                <p className="text-[13px] font-medium text-[#666b76]">
                  {metric.label}
                </p>

                <div className="mt-3 flex items-end gap-3">
                  <strong className="text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
                    {formatNumber(metric.value)}
                  </strong>

                  <span className="pb-1 text-[12px] font-medium text-[#8a8f9d]">
                    {metric.detail}
                  </span>
                </div>
              </div>

              <ArrowUpRight className="h-4 w-4 shrink-0 text-[#b89a65] opacity-0 transition group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#e5e5e5] px-5 py-4">
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                Operação da plataforma
              </h2>

              <p className="mt-1 text-[13px] text-[#767b87]">
                Dados reais para acompanhamento administrativo.
              </p>
            </div>

            <Clock3 className="h-5 w-5 text-[#DBC094]" />
          </div>

          <div className="divide-y divide-[#ededed]">
            {pendingItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_120px_190px] lg:items-center"
                >
                  <div className="flex min-w-0 gap-4">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#b89a65]" />

                    <div className="min-w-0">
                      <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#171717]">
                        {item.title}
                      </h3>

                      <p className="mt-1 max-w-2xl text-[14px] leading-6 text-[#666b76]">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-left lg:text-center">
                    <strong className="text-[26px] font-semibold leading-none tracking-[-0.04em] text-[#141414]">
                      {formatNumber(item.value)}
                    </strong>
                  </div>

                  <Link
                    href={item.href}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#e2d2b6] px-4 text-[13px] font-semibold text-[#7a5a27] transition hover:bg-[#DBC094] hover:text-black"
                  >
                    {item.action}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="border-b border-[#e5e5e5] px-5 py-4">
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
              Atalhos rápidos
            </h2>

            <p className="mt-1 text-[13px] text-[#767b87]">
              Ações frequentes do administrador.
            </p>
          </div>

          <div className="divide-y divide-[#ededed]">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex min-h-[64px] items-center gap-4 px-5 transition hover:bg-[#f7f7f7]"
                >
                  <Icon className="h-5 w-5 shrink-0 text-[#b89a65]" />

                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#2f333d]">
                    {action.label}
                  </span>

                  <ArrowUpRight className="h-4 w-4 text-[#9a9fae] transition group-hover:text-[#b89a65]" />
                </Link>
              );
            })}
          </div>

          <div className="border-t border-[#e5e5e5] px-5 py-4">
            <p className="text-[12px] font-medium text-[#767b87]">
              Administradores cadastrados
            </p>

            <p className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-[#141414]">
              {formatNumber(adminsCount)}
            </p>
          </div>
        </aside>
      </section>

      <section className="rounded-[18px] border border-[#e5e5e5] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#e5e5e5] px-5 py-4">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
              Registros recentes
            </h2>

            <p className="mt-1 text-[13px] text-[#767b87]">
              Conteúdos e perfis carregados diretamente do banco de dados.
            </p>
          </div>

          <CheckCircle2 className="h-5 w-5 text-[#DBC094]" />
        </div>

        <div className="divide-y divide-[#ededed]">
          {updates.length > 0 ? (
            updates.map((item) => (
              <Link
                key={`${item.href}-${item.title}-${item.description}`}
                href={item.href}
                className="grid gap-3 px-5 py-4 transition hover:bg-[#f7f7f7] md:grid-cols-[1fr_120px] md:items-center"
              >
                <div className="flex min-w-0 gap-3">
                  <StatusDot status={item.status as "positive" | "warning"} />

                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-[#171717]">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-[14px] leading-6 text-[#666b76]">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="text-[13px] font-medium text-[#8a8f9d] md:text-right">
                  Ver detalhes
                </div>
              </Link>
            ))
          ) : (
            <div className="px-5 py-8 text-[14px] text-[#666b76]">
              Nenhum registro encontrado no banco de dados.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
