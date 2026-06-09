"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Compass,
  Grid3X3,
  GraduationCap,
  Layers,
  LogOut,
  Menu,
  PlayCircle,
  Search,
  Star,
  UserRound,
  Video,
  X,
  CheckCircle2,
  Inbox,
  MessageCircle
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type StudentProfile = {
  id: string;
  role: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type SearchResult = {
  id: string;
  title: string;
  type: "trilha" | "curso" | "aula" | "ao-vivo";
  href: string;
  description?: string | null;
  imageUrl?: string;
  meta?: string;
};

type HeaderNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  unread?: boolean;
  type: "system" | "course" | "certificate";
};


type TrailSearchRow = {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
};

type CourseSearchRow = {
  id: string;
  title: string | null;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
};

type LessonSearchRow = {
  id: string;
  title: string | null;
  description: string | null;
  content_body?: string | null;
  content_type: string | null;
  scheduled_start_at: string | null;
  status: string | null;
};


const headerNotifications: HeaderNotification[] = [
  {
    id: "welcome",
    title: "Área do aluno ativa",
    description: "Seu acesso está liberado para acompanhar trilhas, cursos e aulas.",
    href: "/aluno/area",
    unread: true,
    type: "system",
  },
  {
    id: "certificates",
    title: "Certificados",
    description: "Acompanhe a liberação dos seus certificados na área do aluno.",
    href: "/aluno/area/certificados",
    unread: false,
    type: "certificate",
  },
];

const menuItems = [
  { label: "Início", href: "/aluno" },
  { label: "Trilhas", href: "/aluno/trilhas" },
  { label: "Cursos", href: "/aluno/cursos" },
  { label: "Ao vivo", href: "/aluno/ao-vivo" },
  { label: "Certificados", href: "/aluno/area/certificados" },
];

const categoryGroups = [
  {
    title: "Conteúdos",
    items: [
      {
        label: "Trilhas",
        description: "Jornadas completas por nível e objetivo.",
        href: "/aluno/trilhas",
        icon: GraduationCap,
      },
      {
        label: "Cursos",
        description: "Cursos independentes publicados pelo ADM.",
        href: "/aluno/cursos",
        icon: BookOpen,
      },
      {
        label: "Ao vivo",
        description: "Aulas ao vivo e transmissões futuras.",
        href: "/aluno/ao-vivo",
        icon: Video,
      },
    ],
  },
  {
    title: "Explorar",
    items: [
      {
        label: "Mais acessados",
        description: "Conteúdos com maior procura pelos alunos.",
        href: "/aluno/mais-acessados",
        icon: Star,
      },
      {
        label: "Continue assistindo",
        description: "Retome de onde parou.",
        href: "/aluno/continuar-assistindo",
        icon: Clock3,
      },
      {
        label: "Recomendados",
        description: "Conteúdos indicados para seu nível atual.",
        href: "/aluno/recomendados",
        icon: Compass,
      },
    ],
  },
];

function getProfileInitials(profile: StudentProfile | null) {
  const name = profile?.full_name?.trim();

  if (!name) return "";

  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "";

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function withAvatarCacheBust(url: string | null | undefined) {
  if (!url) return "";

  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}v=${Date.now()}`;
}

function resolveCoverUrl(path: string | null | undefined) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!supabaseUrl) return "";

  const cleanPath = path.replace(/^\/+/, "");

  return `${supabaseUrl}/storage/v1/object/public/covers/${cleanPath}`;
}

function getTrailCover(item: TrailSearchRow) {
  return (
    item.cover_horizontal_path ||
    item.cover_featured_path ||
    item.cover_vertical_path ||
    item.cover_path
  );
}

function getCourseCover(item: CourseSearchRow) {
  return (
    item.cover_horizontal_path ||
    item.cover_featured_path ||
    item.cover_vertical_path ||
    item.cover_path
  );
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLiveLesson(lesson: LessonSearchRow) {
  const type = String(lesson.content_type ?? "").toLowerCase();

  return (
    type.includes("live") ||
    type.includes("ao_vivo") ||
    type.includes("ao-vivo") ||
    Boolean(lesson.scheduled_start_at)
  );
}

function getLessonMeta(lesson: LessonSearchRow) {
  if (isLiveLesson(lesson)) return "Ao vivo";

  const type = String(lesson.content_type ?? "").toLowerCase();

  if (type.includes("video")) return "Vídeo Aula";
  if (type.includes("audio")) return "Aula em Áudio";
  if (type.includes("text")) return "Aula em Texto";
  if (type.includes("ppt") || type.includes("power")) return "Aula em Slides";

  return "Aula";
}

function getSearchFallbackIcon(type: SearchResult["type"]) {
  if (type === "trilha") return GraduationCap;
  if (type === "curso") return BookOpen;
  if (type === "ao-vivo") return Video;

  return PlayCircle;
}

export function StudentHeader() {
  const pathname = usePathname();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const savedMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [savedMenuOpen, setSavedMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 24);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/student/profile", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          profile?: StudentProfile | null;
        };

        if (!active) return;

        const loadedProfile = data.profile ?? null;

        setProfile(loadedProfile);
        setAvatarUrl(withAvatarCacheBust(loadedProfile?.avatar_url));
      } catch {
        if (!active) return;

        setProfile(null);
        setAvatarUrl("");
      }
    }

    void loadProfile();

    function handleProfileUpdated(event: Event) {
      const customEvent = event as CustomEvent<{
        profile?: StudentProfile | null;
      }>;

      const updatedProfile = customEvent.detail?.profile ?? null;

      if (updatedProfile) {
        setProfile(updatedProfile);
        setAvatarUrl(withAvatarCacheBust(updatedProfile.avatar_url));
        return;
      }

      void loadProfile();
    }

    window.addEventListener("student-profile-updated", handleProfileUpdated);

    return () => {
      active = false;
      window.removeEventListener("student-profile-updated", handleProfileUpdated);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }

      if (categoryMenuRef.current && !categoryMenuRef.current.contains(target)) {
        setCategoryMenuOpen(false);
      }

      if (savedMenuRef.current && !savedMenuRef.current.contains(target)) {
        setSavedMenuOpen(false);
      }

      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(target)
      ) {
        setNotificationMenuOpen(false);
      }

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setCategoryMenuOpen(false);
        setSavedMenuOpen(false);
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [searchOpen]);

  useEffect(() => {
    let active = true;
    const normalizedTerm = normalizeSearchText(searchTerm);

    if (normalizedTerm.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    async function searchContent() {
      setSearching(true);

      try {
        const supabase = supabaseBrowser();
        const pattern = `%${searchTerm.trim()}%`;

        const [trailsResponse, coursesResponse, lessonsResponse] = await Promise.all([
          supabase
            .from("course_categories")
            .select(
              "id,title,slug,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,status"
            )
            .or(`title.ilike.${pattern},description.ilike.${pattern}`)
            .eq("status", "published")
            .limit(5),
          supabase
            .from("courses")
            .select(
              "id,title,slug,short_description,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,status"
            )
            .or(`title.ilike.${pattern},short_description.ilike.${pattern},description.ilike.${pattern}`)
            .eq("status", "published")
            .limit(5),
          supabase
            .from("lessons")
            .select("id,title,description,content_body,content_type,scheduled_start_at,status")
            .or(`title.ilike.${pattern},description.ilike.${pattern},content_body.ilike.${pattern}`)
            .eq("status", "published")
            .limit(8),
        ]);

        if (!active) return;

        const trailResults: SearchResult[] = ((trailsResponse.data ?? []) as TrailSearchRow[]).map(
          (trail) => ({
            id: trail.id,
            title: trail.title ?? "Trilha",
            type: "trilha",
            href: trail.slug ? `/aluno/trilhas/${trail.slug}` : "/aluno/trilhas",
            description: trail.description,
            imageUrl: resolveCoverUrl(getTrailCover(trail)),
            meta: "Trilha",
          }),
        );

        const courseResults: SearchResult[] = ((coursesResponse.data ?? []) as CourseSearchRow[]).map(
          (course) => ({
            id: course.id,
            title: course.title ?? "Curso",
            type: "curso",
            href: course.slug ? `/aluno/cursos` : "/aluno/cursos",
            description: course.short_description ?? course.description,
            imageUrl: resolveCoverUrl(getCourseCover(course)),
            meta: "Curso",
          }),
        );

        const lessonResults: SearchResult[] = ((lessonsResponse.data ?? []) as LessonSearchRow[]).map(
          (lesson) => {
            const live = isLiveLesson(lesson);

            return {
              id: lesson.id,
              title: lesson.title ?? "Aula",
              type: live ? "ao-vivo" : "aula",
              href: `/aluno/aulas/${lesson.id}`,
              description: lesson.description,
              imageUrl: "",
              meta: getLessonMeta(lesson),
            };
          },
        );

        setSearchResults(
          [...trailResults, ...courseResults, ...lessonResults].slice(0, 10),
        );
      } catch {
        if (!active) return;
        setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }

    const timeout = window.setTimeout(() => {
      void searchContent();
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [searchTerm]);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      const supabase = supabaseBrowser();

      await supabase.auth.signOut();

      window.location.href = "/login";
    } catch {
      setSigningOut(false);
      window.location.href = "/login";
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstResult = searchResults[0];

    if (firstResult) {
      window.location.href = firstResult.href;
      return;
    }

    const query = searchTerm.trim();

    if (query) {
      window.location.href = `/aluno/busca?q=${encodeURIComponent(query)}`;
    }
  }

  function isMenuItemActive(href: string) {
    if (!pathname) return false;

    if (href === "/aluno") {
      return pathname === "/aluno";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function closeFloatingMenus() {
    setCategoryMenuOpen(false);
    setSavedMenuOpen(false);
    setProfileMenuOpen(false);
    setNotificationMenuOpen(false);
  }

  const initials = getProfileInitials(profile);

  return (
    <header
      className={[
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#050609]/96 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          : "bg-gradient-to-b from-black/80 via-black/35 to-transparent",
      ].join(" ")}
    >
      <div className="flex h-[74px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-7">
          <Link href="/aluno" className="shrink-0" aria-label="Área do aluno">
            <Image
              src="/logo.png"
              alt="Universidade de Líderes"
              width={156}
              height={54}
              priority
              className="h-auto w-[118px] object-contain sm:w-[138px] lg:w-[156px]"
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-[10px] px-4 py-2 text-[15px] font-semibold transition",
                  isMenuItemActive(item.href)
                    ? "bg-[#DBC094] text-black shadow-[0_10px_28px_rgba(219,192,148,0.18)]"
                    : "text-white/76 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-white">
          <div ref={searchRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => {
                closeFloatingMenus();
                setNotificationMenuOpen(false);
                setSearchOpen((current) => !current);
              }}
              className="h-10 w-10 items-center justify-center rounded-full text-white/86 transition hover:bg-white/12 hover:text-white sm:inline-flex"
              aria-label="Buscar"
              aria-expanded={searchOpen}
            >
              <Search size={21} strokeWidth={2.3} />
            </button>

            {searchOpen ? (
              <div className="absolute right-0 top-[calc(100%+12px)] w-[min(680px,calc(100vw-40px))] overflow-hidden rounded-[22px] border border-white/10 bg-[#101116]/98 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <form onSubmit={handleSearchSubmit} className="border-b border-white/10 p-3">
                  <div className="flex h-12 items-center gap-3 rounded-[14px] border border-white/10 bg-black/30 px-4">
                    <Search className="h-5 w-5 text-[#DBC094]" />

                    <input
                      ref={searchInputRef}
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar trilha, curso, aula ou live..."
                      className="h-full flex-1 bg-transparent text-[14px] font-bold text-white outline-none placeholder:text-white/28"
                    />

                    {searchTerm ? (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                        aria-label="Limpar busca"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="max-h-[520px] overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {searchTerm.trim().length < 2 ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-5">
                      <p className="text-[13px] font-black text-white">
                        Digite pelo menos 2 caracteres.
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-white/42">
                        Pesquise por trilhas, cursos, aulas e lives publicadas.
                      </p>
                    </div>
                  ) : searching ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-5 text-[13px] font-bold text-white/50">
                      Buscando conteúdos...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="grid gap-3">
                      {searchResults.map((result) => {
                        const FallbackIcon = getSearchFallbackIcon(result.type);

                        return (
                          <Link
                            key={`${result.type}-${result.id}`}
                            href={result.href}
                            onClick={() => setSearchOpen(false)}
                            className="group grid gap-4 rounded-[18px] border border-white/8 bg-white/[0.035] p-3 transition hover:border-[#DBC094]/42 hover:bg-white/[0.07] sm:grid-cols-[150px_minmax(0,1fr)]"
                          >
                            <div className="relative aspect-video overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#2d2414,#050609)]">
                              {result.imageUrl ? (
                                <img
                                  src={result.imageUrl}
                                  alt={result.title}
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <FallbackIcon className="h-9 w-9 text-[#DBC094]" />
                                </div>
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            </div>

                            <div className="min-w-0 py-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#DBC094] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">
                                  {result.meta ?? result.type}
                                </span>

                                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/32">
                                  {result.type}
                                </span>
                              </div>

                              <h3 className="mt-2 line-clamp-2 text-[16px] font-black leading-[1.08] tracking-[-0.035em] text-white group-hover:text-[#DBC094]">
                                {result.title}
                              </h3>

                              <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-white/46">
                                {result.description ||
                                  "Conteúdo disponível na área do aluno."}
                              </p>

                              <span className="mt-3 inline-flex items-center gap-2 text-[12px] font-black text-[#DBC094]">
                                Acessar conteúdo
                                <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-5">
                      <p className="text-[13px] font-black text-white">
                        Nenhum conteúdo encontrado.
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-white/42">
                        Tente buscar por outro termo.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={categoryMenuRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => {
                closeFloatingMenus();
                setSearchOpen(false);
                setCategoryMenuOpen((current) => !current);
              }}
              onMouseEnter={() => {
                setSearchOpen(false);
                setSavedMenuOpen(false);
                setProfileMenuOpen(false);
                setCategoryMenuOpen(true);
              }}
              className="h-10 w-10 items-center justify-center rounded-full text-white/86 transition hover:bg-white/12 hover:text-white sm:inline-flex"
              aria-label="Categorias"
              aria-expanded={categoryMenuOpen}
            >
              <Grid3X3 size={20} strokeWidth={2.3} />
            </button>

            {categoryMenuOpen ? (
              <div
                onMouseLeave={() => setCategoryMenuOpen(false)}
                className="absolute right-0 top-[calc(100%+12px)] w-[min(760px,calc(100vw-40px))] overflow-hidden rounded-[22px] border border-white/10 bg-[#101116]/98 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                <div className="grid gap-0 md:grid-cols-2">
                  {categoryGroups.map((group, groupIndex) => (
                    <div
                      key={group.title}
                      className={
                        groupIndex === 0
                          ? "border-b border-white/10 p-4 md:border-b-0 md:border-r"
                          : "p-4"
                      }
                    >
                      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                        {group.title}
                      </p>

                      <div className="grid gap-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setCategoryMenuOpen(false)}
                              className="group flex items-center gap-3 rounded-[15px] px-3 py-3 transition hover:bg-white/8"
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/64 transition group-hover:bg-[#DBC094] group-hover:text-black">
                                <Icon className="h-5 w-5" />
                              </span>

                              <span className="min-w-0">
                                <span className="block text-[14px] font-black text-white group-hover:text-[#DBC094]">
                                  {item.label}
                                </span>
                                <span className="mt-0.5 block text-[12px] leading-5 text-white/40">
                                  {item.description}
                                </span>
                              </span>

                              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-white/24 transition group-hover:text-[#DBC094]" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={savedMenuRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => {
                closeFloatingMenus();
                setSearchOpen(false);
                setNotificationMenuOpen(false);
                setSavedMenuOpen((current) => !current);
              }}
              onMouseEnter={() => {
                setSearchOpen(false);
                setCategoryMenuOpen(false);
                setProfileMenuOpen(false);
                setSavedMenuOpen(true);
              }}
              className="h-10 w-10 items-center justify-center rounded-full text-white/86 transition hover:bg-white/12 hover:text-white md:inline-flex"
              aria-label="Salvos"
              aria-expanded={savedMenuOpen}
            >
              <Bookmark size={20} strokeWidth={2.3} />
            </button>

            {savedMenuOpen ? (
              <div
                onMouseLeave={() => setSavedMenuOpen(false)}
                className="absolute right-0 top-[calc(100%+12px)] w-[320px] overflow-hidden rounded-[20px] border border-white/10 bg-[#101116]/98 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                <div className="border-b border-white/10 px-4 py-4">
                  <p className="text-[13px] font-black text-white">
                    Meus salvos
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-white/42">
                    Trilhas, aulas e conteúdos favoritados pelo aluno.
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/aluno/minha-lista"
                    onClick={() => setSavedMenuOpen(false)}
                    className="group flex items-center gap-3 rounded-[14px] px-3 py-3 transition hover:bg-white/8"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DBC094] text-black">
                      <Bookmark className="h-5 w-5" />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-[13px] font-black text-white group-hover:text-[#DBC094]">
                        Abrir minha lista
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-5 text-white/40">
                        Ver todos os conteúdos salvos.
                      </span>
                    </span>
                  </Link>

                  <div className="mt-2 rounded-[14px] border border-white/8 bg-black/20 px-3 py-4">
                    <div className="flex items-center gap-3">
                      <Layers className="h-5 w-5 text-[#DBC094]" />
                      <div>
                        <p className="text-[12px] font-black text-white">
                          Nenhum item salvo ainda
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-white/38">
                          Quando o aluno favoritar trilhas ou aulas, elas aparecerão aqui.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div ref={notificationMenuRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSavedMenuOpen(false);
                setProfileMenuOpen(false);
                setNotificationMenuOpen((current) => !current);
              }}
              onMouseEnter={() => {
                setSearchOpen(false);
                setSavedMenuOpen(false);
                setProfileMenuOpen(false);
                setNotificationMenuOpen(true);
              }}
              className="relative h-10 w-10 items-center justify-center rounded-full text-white/86 transition hover:bg-white/12 hover:text-white md:inline-flex"
              aria-label="Notificações"
              aria-expanded={notificationMenuOpen}
            >
              <Bell size={20} strokeWidth={2.3} />

              {headerNotifications.some((item) => item.unread) ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#DBC094] shadow-[0_0_14px_rgba(219,192,148,0.85)]" />
              ) : null}
            </button>

            {notificationMenuOpen ? (
              <div
                onMouseLeave={() => setNotificationMenuOpen(false)}
                className="absolute right-0 top-[calc(100%+12px)] w-[360px] overflow-hidden rounded-[20px] border border-white/10 bg-[#101116]/98 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4">
                  <div>
                    <p className="text-[13px] font-black text-white">
                      Notificações
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-white/42">
                      Atualizações importantes da sua área do aluno.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#DBC094]/12 px-2.5 py-1 text-[11px] font-black text-[#DBC094]">
                    {headerNotifications.filter((item) => item.unread).length} nova(s)
                  </span>
                </div>

                <div className="max-h-[360px] overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {headerNotifications.length > 0 ? (
                    <div className="grid gap-1">
                      {headerNotifications.map((item) => {
                        const Icon =
                          item.type === "certificate"
                            ? CheckCircle2
                            : item.type === "course"
                              ? BookOpen
                              : MessageCircle;

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setNotificationMenuOpen(false)}
                            className="group flex items-start gap-3 rounded-[15px] px-3 py-3 transition hover:bg-white/8"
                          >
                            <span
                              className={
                                item.unread
                                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DBC094] text-black"
                                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/58"
                              }
                            >
                              <Icon className="h-5 w-5" />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-[13px] font-black text-white group-hover:text-[#DBC094]">
                                  {item.title}
                                </span>

                                {item.unread ? (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#DBC094]" />
                                ) : null}
                              </span>

                              <span className="mt-1 line-clamp-2 block text-[12px] leading-5 text-white/42">
                                {item.description}
                              </span>
                            </span>

                            <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-white/24 transition group-hover:translate-x-1 group-hover:text-[#DBC094]" />
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-[16px] border border-white/8 bg-black/20 px-4 py-8 text-center">
                      <Inbox className="h-8 w-8 text-[#DBC094]" />

                      <p className="mt-3 text-[13px] font-black text-white">
                        Nenhuma notificação
                      </p>

                      <p className="mt-1 text-[12px] leading-5 text-white/42">
                        Novas mensagens e avisos aparecerão aqui.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div
            ref={profileMenuRef}
            className="relative"
            onMouseEnter={() => {
              setSearchOpen(false);
              setCategoryMenuOpen(false);
              setSavedMenuOpen(false);
              setProfileMenuOpen(true);
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setCategoryMenuOpen(false);
                setSavedMenuOpen(false);
                setNotificationMenuOpen(false);
                setProfileMenuOpen((current) => !current);
              }}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#DBC094] to-[#8a6f3d] text-black shadow-[0_10px_28px_rgba(219,192,148,0.22)] ring-1 ring-white/20 transition hover:scale-[1.03]"
              aria-label="Abrir menu do perfil"
              aria-expanded={profileMenuOpen}
              title={profile?.full_name?.trim() || "Perfil"}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.full_name?.trim() || "Perfil do aluno"}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarUrl("")}
                />
              ) : initials ? (
                <span className="text-[13px] font-black tracking-[-0.02em]">
                  {initials}
                </span>
              ) : (
                <UserRound size={21} strokeWidth={2.4} />
              )}
            </button>

            {profileMenuOpen ? (
              <div
                onMouseLeave={() => setProfileMenuOpen(false)}
                className="absolute right-0 top-[calc(100%+12px)] w-[220px] overflow-hidden rounded-[18px] border border-white/10 bg-[#101116]/98 shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              >
                <div className="border-b border-white/10 px-4 py-4">
                  <p className="truncate text-[13px] font-black text-white">
                    {profile?.full_name?.trim() || "Aluno"}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/42">
                    Área do aluno
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/aluno/area/meus-dados"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-[13px] px-3 py-3 text-[13px] font-black text-white/74 transition hover:bg-white/8 hover:text-[#DBC094]"
                  >
                    <UserRound className="h-4 w-4" />
                    Meu perfil
                  </Link>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 rounded-[13px] px-3 py-3 text-left text-[13px] font-black text-white/74 transition hover:bg-red-500/12 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    {signingOut ? "Saindo..." : "Sair"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/12 hover:text-white lg:hidden"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? (
              <X size={24} strokeWidth={2.4} />
            ) : (
              <Menu size={24} strokeWidth={2.4} />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-white/10 bg-[#050609]/98 px-5 pb-5 pt-3 shadow-[0_22px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden">
          <nav className="grid gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={[
                  "rounded-[12px] px-4 py-3 text-[15px] font-semibold transition",
                  isMenuItemActive(item.href)
                    ? "bg-[#DBC094] text-black"
                    : "text-white/76 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/aluno/minha-lista"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-[12px] px-4 py-3 text-[15px] font-semibold text-white/76 transition hover:bg-white/10 hover:text-white"
            >
              Minha lista
            </Link>

            <Link
              href="/aluno/notificacoes"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-[12px] px-4 py-3 text-[15px] font-semibold text-white/76 transition hover:bg-white/10 hover:text-white"
            >
              Notificações
            </Link>

            <Link
              href="/aluno/area/meus-dados"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-[12px] px-4 py-3 text-[15px] font-semibold text-white/76 transition hover:bg-white/10 hover:text-white"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#DBC094] to-[#8a6f3d] text-black">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile?.full_name?.trim() || "Perfil do aluno"}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarUrl("")}
                  />
                ) : initials ? (
                  <span className="text-[11px] font-black">{initials}</span>
                ) : (
                  <UserRound size={17} strokeWidth={2.4} />
                )}
              </span>
              Meu perfil
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-3 rounded-[12px] px-4 py-3 text-left text-[15px] font-semibold text-white/76 transition hover:bg-red-500/12 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-5 w-5" />
              {signingOut ? "Saindo..." : "Sair"}
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
