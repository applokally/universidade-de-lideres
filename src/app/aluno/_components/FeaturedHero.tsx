"use client";

import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
    target_url: item.targetUrl || null,
  };
}

function ContentInfoModal({
  item,
  onClose,
}: {
  item: StudentContentItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/78 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-[880px] overflow-hidden rounded-[28px] border border-white/10 bg-[#101116] text-white shadow-[0_30px_110px_rgba(0,0,0,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/55 text-white/76 transition hover:border-[#DBC094]/45 hover:text-[#DBC094]"
          aria-label="Fechar informações"
        >
          <X size={20} />
        </button>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[280px] bg-black lg:min-h-[520px]">
            {item.imageUrl || item.mobileImageUrl ? (
              <img
                src={item.imageUrl || item.mobileImageUrl}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className={[
                  "absolute inset-0 bg-gradient-to-br",
                  item.accent,
                ].join(" ")}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/28 to-transparent" />
          </div>

          <div className="flex max-h-[90vh] flex-col overflow-y-auto p-6 sm:p-8">
            <div className="mb-4 inline-flex w-fit rounded-full border border-[#DBC094]/24 bg-[#DBC094]/10 px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.18em] text-[#DBC094]">
              {item.category || "Conteúdo"}
            </div>

            <h3 className="text-[34px] font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[42px]">
              {item.infoTitle || item.title}
            </h3>

            <p className="mt-5 text-[16px] leading-7 text-white/68">
              {item.infoDescription || item.subtitle || "Informações do conteúdo."}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {item.duration ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/38">
                    Duração
                  </div>
                  <div className="mt-2 text-[15px] font-black text-white">
                    {item.duration}
                  </div>
                </div>
              ) : null}

              {item.level ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/38">
                    Nível
                  </div>
                  <div className="mt-2 text-[15px] font-black text-[#DBC094]">
                    {item.level}
                  </div>
                </div>
              ) : null}

              {item.badge ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/38">
                    Destaque
                  </div>
                  <div className="mt-2 text-[15px] font-black text-white">
                    {item.badge}
                  </div>
                </div>
              ) : null}

              {typeof item.progress === "number" ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/38">
                    Progresso
                  </div>
                  <div className="mt-2 text-[15px] font-black text-white">
                    {Math.round(item.progress)}%
                  </div>
                </div>
              ) : null}
            </div>

            <a
              href={item.targetUrl || "#"}
              className="mt-8 inline-flex h-13 w-fit items-center gap-3 rounded-[12px] bg-white px-5 text-[15px] font-black text-black transition hover:bg-white/86"
            >
              <Play size={20} fill="currentColor" />
              {item.buttonLabel || "Assistir"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturedHero({ items }: FeaturedHeroProps) {
  const safeItems = useMemo(() => items.filter(Boolean), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [savingFavoriteKey, setSavingFavoriteKey] = useState<string | null>(null);
  const [infoItem, setInfoItem] = useState<StudentContentItem | null>(null);

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
            (favorite) => `${favorite.content_type}:${favorite.content_id}`
          )
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
      current === safeItems.length - 1 ? 0 : current + 1
    );
  }

  function goToPrevious() {
    if (safeItems.length <= 1) return;

    setActiveIndex((current) =>
      current === 0 ? safeItems.length - 1 : current - 1
    );
  }

  function goToSlide(index: number) {
    setActiveIndex(index);
  }

  useEffect(() => {
    if (safeItems.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) =>
        current === safeItems.length - 1 ? 0 : current + 1
      );
    }, 6500);

    return () => window.clearInterval(interval);
  }, [safeItems.length]);

  if (!activeContent) {
    return null;
  }

  const activeIsFavorite = favoriteKeys.has(getFavoriteKey(activeContent));

  return (
    <>
      <section className="relative min-h-[760px] overflow-hidden pt-[74px]">
        {safeItems.map((content, index) => {
          const isActive = index === activeIndex;
          const desktopImage = content.imageUrl;
          const mobileImage = content.mobileImageUrl || content.imageUrl;

          return (
            <div
              key={content.id}
              className={[
                "absolute inset-0 transition-opacity duration-700 ease-out",
                isActive ? "opacity-100" : "opacity-0",
              ].join(" ")}
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
                  className={[
                    "absolute inset-0 bg-gradient-to-br",
                    content.accent,
                  ].join(" ")}
                />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(90deg,#050609_0%,rgba(5,6,9,0.94)_24%,rgba(5,6,9,0.62)_48%,rgba(5,6,9,0.18)_76%,rgba(5,6,9,0.86)_100%)]" />

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_30%,rgba(255,255,255,0.10),transparent_25%)]" />
            </div>
          );
        })}

        <div className="absolute bottom-0 left-0 right-0 h-[320px] bg-gradient-to-t from-[#050609] via-[#050609]/94 to-transparent" />

        {safeItems.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Banner anterior"
              className="absolute left-0 top-[74px] z-20 hidden h-[calc(100%-74px)] w-[72px] items-center justify-center bg-gradient-to-r from-black/64 via-black/28 to-transparent text-white opacity-0 transition hover:opacity-100 lg:flex"
            >
              <ChevronLeft size={46} strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={goToNext}
              aria-label="Próximo banner"
              className="absolute right-0 top-[74px] z-20 hidden h-[calc(100%-74px)] w-[72px] items-center justify-center bg-gradient-to-l from-black/64 via-black/28 to-transparent text-white opacity-0 transition hover:opacity-100 lg:flex"
            >
              <ChevronRight size={46} strokeWidth={2.5} />
            </button>
          </>
        ) : null}

        <div className="relative z-10 flex min-h-[686px] items-center px-5 sm:px-8 lg:px-10">
          <div
            key={activeContent.id}
            className="max-w-[680px] pt-16 transition-all duration-700 ease-out"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#DBC094]/30 bg-[#DBC094]/12 px-4 py-2 text-[14px] font-bold text-[#f1d7a5] shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#DBC094]" />
              {activeContent.badge ?? "Conteúdo em destaque"}
            </div>

            <h1 className="max-w-[620px] text-[50px] font-black leading-[0.94] tracking-[-0.06em] text-white sm:text-[66px] lg:text-[78px]">
              {activeContent.title}
            </h1>

            <p className="mt-7 max-w-[590px] text-[18px] font-medium leading-[1.55] text-white/78 sm:text-[20px]">
              {activeContent.subtitle}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3 text-[14px] font-bold text-white/82">
              {activeContent.category ? (
                <span className="rounded-full bg-white/14 px-3 py-1.5">
                  {activeContent.category}
                </span>
              ) : null}

              {activeContent.duration ? (
                <span className="rounded-full bg-white/14 px-3 py-1.5">
                  {activeContent.duration}
                </span>
              ) : null}

              {activeContent.level ? (
                <span className="rounded-full bg-[#DBC094] px-3 py-1.5 text-black">
                  {activeContent.level}
                </span>
              ) : null}
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={activeContent.targetUrl || "#"}
                className="inline-flex h-14 items-center gap-3 rounded-[10px] bg-white px-6 text-[17px] font-black text-black transition hover:bg-white/86"
              >
                <Play size={24} fill="currentColor" strokeWidth={2.4} />
                {activeContent.buttonLabel || "Assistir agora"}
              </a>

              <button
                type="button"
                onClick={() => void toggleFavorite(activeContent)}
                disabled={savingFavoriteKey === getFavoriteKey(activeContent)}
                className={[
                  "inline-flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-70",
                  activeIsFavorite
                    ? "bg-[#DBC094] text-black hover:bg-[#e8cf9e]"
                    : "bg-white/18 text-white hover:bg-white/26",
                ].join(" ")}
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
                  <Check size={25} strokeWidth={2.4} />
                ) : (
                  <Plus size={29} strokeWidth={2.2} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setInfoItem(activeContent)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-md transition hover:bg-white/26"
                aria-label="Mais informações"
                title="Mais informações"
              >
                <Info size={25} strokeWidth={2.2} />
              </button>
            </div>

            <div className="mt-7 flex items-center gap-2 text-[15px] font-bold text-white/82">
              <CheckCircle2 size={18} className="text-[#DBC094]" />
              Incluído no seu nível de acesso
            </div>
          </div>
        </div>

        {safeItems.length > 1 ? (
          <div className="absolute bottom-[150px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {safeItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Ir para banner ${index + 1}`}
                className={[
                  "h-2 rounded-full transition-all duration-300",
                  index === activeIndex
                    ? "w-8 bg-white"
                    : "w-2 bg-white/34 hover:bg-white/70",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}
      </section>

      {infoItem ? (
        <ContentInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
      ) : null}
    </>
  );
}
