"use client";

import { Check, ChevronLeft, ChevronRight, Play, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StudentContentItem } from "../_data/student-content";

type ContentRowProps = {
  title: string;
  items: StudentContentItem[];
  variant: "vertical" | "featured" | "horizontal";
};

const cardSizes = {
  vertical: {
    card: "h-[430px] w-[292px] md:w-[310px] xl:w-[328px] hover:w-[570px]",
    hoverPanel: "",
    arrow: "h-[430px]",
    scroll: 700,
    padding: "p-6",
    title: "text-xl sm:text-2xl group-hover/card:text-3xl",
  },
  featured: {
    card: "h-[650px] w-[360px] md:w-[395px] xl:w-[430px]",
    hoverPanel:
      "group-hover/card:h-[430px] group-hover/card:w-[760px] xl:group-hover/card:w-[860px]",
    arrow: "h-[650px]",
    scroll: 900,
    padding: "p-8",
    title: "text-2xl sm:text-3xl group-hover/card:text-4xl",
  },
  horizontal: {
    card: "h-[315px] w-[440px] md:w-[540px] xl:w-[620px] hover:w-[740px]",
    hoverPanel: "",
    arrow: "h-[315px]",
    scroll: 780,
    padding: "p-6 sm:p-8",
    title: "text-xl sm:text-2xl group-hover/card:text-3xl",
  },
} satisfies Record<
  ContentRowProps["variant"],
  {
    card: string;
    arrow: string;
    scroll: number;
    padding: string;
    title: string;
    hoverPanel?: string;
  }
>;

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
    image_url: item.imageUrl || item.hoverImageUrl || null,
    target_url: item.targetUrl || null,
  };
}

export function ContentRow({ title, items, variant }: ContentRowProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const sizes = cardSizes[variant];
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [savingFavoriteKey, setSavingFavoriteKey] = useState<string | null>(null);

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

  function scrollCarousel(direction: "left" | "right") {
    const carousel = carouselRef.current;

    if (!carousel) return;

    carousel.scrollBy({
      left: direction === "right" ? sizes.scroll : -sizes.scroll,
      behavior: "smooth",
    });
  }

  return (
    <>
      <section className="relative">
        <div className="mb-6 flex items-end justify-between px-5 sm:px-8 lg:px-16">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>

          <button
            type="button"
            className="group hidden items-center gap-1.5 text-sm font-semibold text-white/60 transition-colors hover:text-[#DBC094] sm:inline-flex"
          >
            Veja mais
            <ChevronRight
              size={18}
              strokeWidth={2.5}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </div>

        <div className="group/slider relative w-screen overflow-visible">
          {/* Seta Esquerda */}
          <button
            type="button"
            onClick={() => scrollCarousel("left")}
            aria-label="Voltar conteúdos"
            className={[
              "absolute left-0 top-0 z-40 hidden w-[80px] items-center justify-center bg-gradient-to-r from-[#050609] via-[#050609]/70 to-transparent text-white/50 opacity-0 transition-all hover:text-white hover:opacity-100 group-hover/slider:opacity-100 lg:flex",
              sizes.arrow,
            ].join(" ")}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-transform hover:scale-110">
              <ChevronLeft size={32} strokeWidth={2} />
            </div>
          </button>

          {/* Carrossel */}
          <div
            ref={carouselRef}
            className="flex snap-x snap-mandatory items-start gap-5 overflow-x-auto overflow-y-visible scroll-smooth px-5 pb-20 sm:px-8 lg:px-16 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {items.map((item) => {
              const favoriteKey = getFavoriteKey(item);
              const isFavorite = favoriteKeys.has(favoriteKey);

              return (
                <article
                  key={item.id}
                  className={[
                    "group/card relative shrink-0 snap-start overflow-visible transition-all duration-500 ease-out hover:z-50",
                    sizes.card,
                    variant === "featured" ? "hover:w-[760px] xl:hover:w-[860px]" : "",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "absolute left-0 top-0 overflow-hidden rounded-2xl border border-white/5 bg-[#0a0b10] shadow-lg transition-all duration-500 ease-out group-hover/card:border-white/10 group-hover/card:shadow-2xl",
                      "h-full w-full",
                      variant === "featured" ? sizes.hoverPanel : "",
                    ].join(" ")}
                  >
                    {item.imageUrl ? (
                      <>
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className={[
                            "absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out",
                            variant === "featured"
                              ? item.hoverImageUrl
                                ? "group-hover/card:opacity-0"
                                : "group-hover/card:scale-105"
                              : "group-hover/card:scale-105",
                          ].join(" ")}
                        />

                        {variant === "featured" && item.hoverImageUrl ? (
                          <img
                            src={item.hoverImageUrl}
                            alt={`${item.title} - prévia`}
                            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-out group-hover/card:scale-105 group-hover/card:opacity-100"
                          />
                        ) : null}
                      </>
                    ) : (
                      <div
                        className={[
                          "absolute inset-0 bg-gradient-to-br transition-transform duration-700 ease-out group-hover/card:scale-105",
                          item.accent,
                        ].join(" ")}
                      />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050609] via-[#050609]/60 to-transparent" />
                    
                    {/* Sombra lateral */}
                    {variant !== "vertical" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#050609]/80 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
                    )}

                    {item.badge ? (
                      <div
                        className={[
                          "absolute right-4 top-4 rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md transition-opacity duration-300",
                          variant === "featured"
                            ? "group-hover/card:opacity-0"
                            : "",
                        ].join(" ")}
                      >
                        {item.badge}
                      </div>
                    ) : null}

                    {/* Conteúdo de Texto e Botões */}
                    <div
                      className={[
                        "relative z-10 flex h-full flex-col justify-end",
                        sizes.padding,
                        variant === "featured"
                          ? "group-hover/card:max-w-[500px] group-hover/card:justify-center"
                          : "",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "max-w-[94%] transition-all duration-500 ease-out group-hover/card:max-w-[590px]",
                          variant === "featured"
                            ? "group-hover/card:max-w-[480px]"
                            : "",
                        ].join(" ")}
                      >
                        <p className="line-clamp-1 text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
                          {item.category}
                        </p>

                        <h3
                          className={[
                            "mt-2 line-clamp-2 font-bold leading-tight tracking-tight text-white transition-all duration-500 ease-out",
                            sizes.title,
                          ].join(" ")}
                        >
                          {item.title}
                        </h3>

                        <div className="mt-3 flex items-center gap-2.5 text-xs font-semibold text-white/70">
                          <span className="line-clamp-1">{item.level}</span>

                          {item.duration ? (
                            <>
                              <span className="h-1 w-1 shrink-0 rounded-full bg-white/30" />
                              <span className="shrink-0">{item.duration}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {/* Descrição que aparece no Hover */}
                      <div className="mt-4 hidden translate-y-4 opacity-0 transition-all duration-500 delay-75 group-hover/card:block group-hover/card:translate-y-0 group-hover/card:opacity-100">
                        <p className="max-w-[480px] text-sm leading-relaxed text-white/70">
                          {item.subtitle}
                        </p>
                      </div>

                      {/* Botões que aparecem no Hover */}
                      <div className="mt-6 hidden items-center gap-3 opacity-0 transition-all duration-500 delay-100 group-hover/card:flex group-hover/card:opacity-100">
                        <a
                          href={item.targetUrl || "#"}
                          className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black shadow-lg transition-all hover:scale-[1.02] hover:bg-white/90 active:scale-95"
                        >
                          <Play size={18} fill="currentColor" strokeWidth={2.5} />
                          Assistir
                        </a>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void toggleFavorite(item);
                          }}
                          disabled={savingFavoriteKey === favoriteKey}
                          className={[
                            "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 backdrop-blur-md transition-all hover:scale-[1.05] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
                            isFavorite
                              ? "border-[#DBC094]/20 bg-[#DBC094] text-black shadow-lg shadow-[#DBC094]/20"
                              : "bg-black/40 text-white hover:bg-white/20",
                          ].join(" ")}
                          aria-label={
                            isFavorite
                              ? "Remover dos favoritos"
                              : "Adicionar aos favoritos"
                          }
                          title={
                            isFavorite
                              ? "Remover dos favoritos"
                              : "Adicionar aos favoritos"
                          }
                        >
                          {isFavorite ? (
                            <Check size={20} strokeWidth={2.5} />
                          ) : (
                            <Plus size={22} strokeWidth={2} />
                          )}
                        </button>
                      </div>

                      {/* Barra de Progresso */}
                      {typeof item.progress === "number" ? (
                        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-black/40 shadow-inner">
                          <div
                            className="h-full rounded-full bg-[#DBC094] transition-all duration-500 ease-out"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Seta Direita */}
          <button
            type="button"
            onClick={() => scrollCarousel("right")}
            aria-label="Avançar conteúdos"
            className={[
              "absolute right-0 top-0 z-40 hidden w-[80px] items-center justify-center bg-gradient-to-l from-[#050609] via-[#050609]/70 to-transparent text-white/50 opacity-0 transition-all hover:text-white hover:opacity-100 group-hover/slider:opacity-100 lg:flex",
              sizes.arrow,
            ].join(" ")}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-transform hover:scale-110">
              <ChevronRight size={32} strokeWidth={2} />
            </div>
          </button>
        </div>
      </section>
    </>
  );
}