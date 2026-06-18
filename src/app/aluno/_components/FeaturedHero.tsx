"use client";

import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Play,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentContentItem } from "../_data/student-content";

type FeaturedHeroProps = {
  items: StudentContentItem[];
};

type FavoriteRecord = {
  content_type: string;
  content_id: string;
};

function getContentType(item: StudentContentItem) {
  return item.contentType || "content";
}

function getContentId(item: StudentContentItem) {
  return item.contentId || item.id;
}

function getFavoriteKey(item: StudentContentItem) {
  return `${getContentType(item)}:${getContentId(item)}`;
}

function getOptionalStringField(item: StudentContentItem, key: string) {
  const value = (item as Record<string, unknown>)[key];

  return typeof value === "string" ? value.trim() : "";
}

function resolveTargetUrl(item: StudentContentItem) {
  const explicitTarget = item.targetUrl?.trim();

  if (explicitTarget && explicitTarget !== "#") return explicitTarget;

  const fallbackTarget =
    getOptionalStringField(item, "url") ||
    getOptionalStringField(item, "href") ||
    getOptionalStringField(item, "link") ||
    getOptionalStringField(item, "route") ||
    getOptionalStringField(item, "path");

  if (fallbackTarget && fallbackTarget !== "#") return fallbackTarget;

  const contentType = getContentType(item).toLowerCase();
  const contentId = getContentId(item);
  const slug =
    getOptionalStringField(item, "slug") ||
    getOptionalStringField(item, "courseSlug") ||
    getOptionalStringField(item, "trailSlug");

  const targetIdentifier = slug || contentId;

  if (!targetIdentifier) return "/aluno";

  if (contentType.includes("lesson") || contentType.includes("aula")) {
    return `/aluno/aulas/${targetIdentifier}`;
  }

  if (
    contentType.includes("course") ||
    contentType.includes("curso") ||
    contentType.includes("trail") ||
    contentType.includes("track") ||
    contentType.includes("trilha")
  ) {
    return `/aluno/trilhas/${targetIdentifier}`;
  }

  return `/aluno/trilhas/${targetIdentifier}`;
}

function buildFavoritePayload(item: StudentContentItem) {
  return {
    content_type: getContentType(item),
    content_id: getContentId(item),
    title: item.title,
    subtitle: item.subtitle || null,
    category: item.category || null,
    duration: item.duration || null,
    level: item.level || null,
    image_url: item.imageUrl || item.mobileImageUrl || null,
    target_url: resolveTargetUrl(item),
  };
}

export function FeaturedHero({ items }: FeaturedHeroProps) {
  const router = useRouter();
  const safeItems = useMemo(() => items.filter(Boolean), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [savingFavoriteKey, setSavingFavoriteKey] = useState<string | null>(
    null,
  );

  const activeContent = safeItems[activeIndex];

  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      try {
        const response = await fetch("/api/student/favorites", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          favorites?: FavoriteRecord[];
        };

        const keys = new Set(
          (data.favorites ?? []).map(
            (favorite) => `${favorite.content_type}:${favorite.content_id}`,
          ),
        );

        if (isMounted) {
          setFavoriteKeys(keys);
        }
      } catch {
        if (isMounted) {
          setFavoriteKeys(new Set());
        }
      }
    }

    void loadFavorites();

    return () => {
      isMounted = false;
    };
  }, []);

  async function toggleFavorite(item: StudentContentItem) {
    const key = getFavoriteKey(item);

    if (savingFavoriteKey) return;

    setSavingFavoriteKey(key);

    try {
      const response = await fetch("/api/student/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle",
          ...buildFavoritePayload(item),
        }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as { saved?: boolean };

      setFavoriteKeys((current) => {
        const next = new Set(current);

        if (data.saved) {
          next.add(key);
        } else {
          next.delete(key);
        }

        return next;
      });
    } finally {
      setSavingFavoriteKey(null);
    }
  }

  function goToNext() {
    if (safeItems.length <= 1) return;

    setActiveIndex((current) =>
      current === safeItems.length - 1 ? 0 : current + 1,
    );
  }

  function goToPrevious() {
    if (safeItems.length <= 1) return;

    setActiveIndex((current) =>
      current === 0 ? safeItems.length - 1 : current - 1,
    );
  }


  function openPrimaryContent(item: StudentContentItem) {
    const targetUrl = resolveTargetUrl(item);

    if (!targetUrl) return;

    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      window.location.href = targetUrl;
      return;
    }

    router.push(targetUrl);
  }

  useEffect(() => {
    if (safeItems.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) =>
        current === safeItems.length - 1 ? 0 : current + 1,
      );
    }, 6500);

    return () => window.clearInterval(interval);
  }, [safeItems.length]);

  if (!activeContent) {
    return null;
  }

  const activeTargetUrl = resolveTargetUrl(activeContent);
  const activeIsFavorite = favoriteKeys.has(getFavoriteKey(activeContent));

  return (
    <section className="relative min-h-[720px] overflow-hidden pt-[74px]">
      {/* --- BACKGROUNDS E TRANSIÇÕES --- */}
      {safeItems.map((content, index) => {
        const isActive = index === activeIndex;
        const desktopImage = content.imageUrl;
        const mobileImage = content.mobileImageUrl || content.imageUrl;

        return (
          <div
            key={content.id}
            className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ease-out ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          >
            {desktopImage ? (
              <>
                <img
                  src={desktopImage}
                  alt={content.title}
                  className="absolute inset-0 hidden h-full w-full object-cover object-center sm:block"
                />

                {mobileImage ? (
                  <img
                    src={mobileImage}
                    alt={content.title}
                    className="absolute inset-0 h-full w-full object-cover object-center sm:hidden"
                  />
                ) : null}
              </>
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${content.accent}`}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-[#050609] via-[#050609]/80 to-transparent sm:w-[85%]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_30%,rgba(255,255,255,0.05),transparent_35%)]" />
          </div>
        );
      })}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[280px] bg-gradient-to-t from-[#050609] via-[#050609]/90 to-transparent" />

      {/* --- CONTROLES LATERAIS --- */}
      {safeItems.length > 1 ? (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Banner anterior"
            className="absolute left-4 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/70 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/45 hover:text-white lg:flex"
          >
            <ChevronLeft size={28} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Próximo banner"
            className="absolute right-4 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/70 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/45 hover:text-white lg:flex"
          >
            <ChevronRight size={28} strokeWidth={2} />
          </button>
        </>
      ) : null}

      {/* --- CONTEÚDO PRINCIPAL (TEXTOS E BOTÕES) --- */}
      <div className="relative z-10 flex min-h-[646px] items-center px-5 sm:px-8 lg:px-16">
        <div
          key={activeContent.id}
          className="max-w-[720px] pb-14 pt-14 transition-all duration-1000 ease-out animate-in fade-in slide-in-from-left-8 sm:pb-16 lg:pb-12"
        >
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[#DBC094]/20 bg-[#DBC094]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#DBC094] backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DBC094] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#DBC094]" />
            </span>
            {activeContent.badge ?? "Em destaque"}
          </div>

          <h1 className="max-w-[700px] text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[64px]">
            {activeContent.title}
          </h1>

          <p className="mt-6 max-w-[600px] text-base leading-relaxed text-white/60 sm:text-lg">
            {activeContent.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-medium text-white/80">
            {activeContent.category ? (
              <span className="rounded-md bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                {activeContent.category}
              </span>
            ) : null}

            {activeContent.duration ? (
              <span className="rounded-md bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                {activeContent.duration}
              </span>
            ) : null}

            {activeContent.level ? (
              <span className="rounded-md border border-[#DBC094]/20 bg-[#DBC094]/10 px-3 py-1.5 text-[#DBC094] backdrop-blur-sm">
                {activeContent.level}
              </span>
            ) : null}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => openPrimaryContent(activeContent)}
              disabled={!activeTargetUrl}
              className="inline-flex h-12 items-center gap-3 rounded-xl bg-white px-8 text-sm font-semibold text-black shadow-lg shadow-white/10 transition-all hover:scale-[1.02] hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 sm:h-14 sm:text-base"
            >
              <Play size={20} fill="currentColor" strokeWidth={2.4} />
              {activeContent.buttonLabel || "Assistir agora"}
            </button>

            <button
              type="button"
              onClick={() => void toggleFavorite(activeContent)}
              disabled={savingFavoriteKey === getFavoriteKey(activeContent)}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition-all hover:scale-[1.05] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-14 ${
                activeIsFavorite
                  ? "bg-[#DBC094] text-black shadow-lg shadow-[#DBC094]/20"
                  : "border border-white/10 bg-white/10 text-white hover:bg-white/20"
              }`}
              aria-label={
                activeIsFavorite
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"
              }
              title={
                activeIsFavorite
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"
              }
            >
              {activeIsFavorite ? (
                <Check size={24} strokeWidth={2.5} />
              ) : (
                <Plus size={24} strokeWidth={2} />
              )}
            </button>
          </div>

          <div className="mt-9 flex items-center gap-2 text-sm font-medium text-white/50">
            <CheckCircle2 size={16} className="text-[#DBC094]" />
            Incluído no seu nível de acesso
          </div>
        </div>
      </div>

    </section>
  );
}
