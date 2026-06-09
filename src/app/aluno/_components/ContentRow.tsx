"use client";

import { Check, ChevronLeft, ChevronRight, Info, Play, Plus, X } from "lucide-react";
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
    padding: "p-5",
    title: "text-[25px] group-hover/card:text-[30px]",
  },
  featured: {
    card: "h-[650px] w-[360px] md:w-[395px] xl:w-[430px]",
    hoverPanel:
      "group-hover/card:h-[430px] group-hover/card:w-[760px] xl:group-hover/card:w-[860px]",
    arrow: "h-[650px]",
    scroll: 900,
    padding: "p-7",
    title: "text-[31px] group-hover/card:text-[38px]",
  },
  horizontal: {
    card: "h-[315px] w-[440px] md:w-[540px] xl:w-[620px] hover:w-[740px]",
    hoverPanel: "",
    arrow: "h-[315px]",
    scroll: 780,
    padding: "p-7",
    title: "text-[26px] group-hover/card:text-[31px]",
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
        className="relative max-h-[90vh] w-full max-w-[860px] overflow-hidden rounded-[28px] border border-white/10 bg-[#101116] text-white shadow-[0_30px_110px_rgba(0,0,0,0.65)]"
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

        <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative min-h-[280px] bg-black lg:min-h-[500px]">
            {item.hoverImageUrl || item.imageUrl ? (
              <img
                src={item.hoverImageUrl || item.imageUrl}
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

            <h3 className="text-[32px] font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[40px]">
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
              Assistir
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


export function ContentRow({ title, items, variant }: ContentRowProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const sizes = cardSizes[variant];
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [savingFavoriteKey, setSavingFavoriteKey] = useState<string | null>(null);
  const [infoItem, setInfoItem] = useState<StudentContentItem | null>(null);

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
      <div className="mb-5 flex items-center gap-5 px-6 sm:px-8 lg:px-10">
        <h2 className="text-[25px] font-black tracking-[-0.045em] text-white sm:text-[30px]">
          {title}
        </h2>

        <button
          type="button"
          className="group hidden items-center gap-1 text-[18px] font-black text-white/88 transition hover:text-[#DBC094] sm:inline-flex"
        >
          Veja mais
          <ChevronRight
            size={22}
            className="transition group-hover:translate-x-1"
          />
        </button>
      </div>

      <div className="group/slider relative w-screen overflow-visible">
        <button
          type="button"
          onClick={() => scrollCarousel("left")}
          aria-label="Voltar conteúdos"
          className={[
            "absolute left-0 top-0 z-40 hidden w-[66px] items-center justify-center bg-gradient-to-r from-black/90 via-black/56 to-transparent text-white opacity-0 transition hover:opacity-100 group-hover/slider:opacity-100 lg:flex",
            sizes.arrow,
          ].join(" ")}
        >
          <ChevronLeft size={42} strokeWidth={2.6} />
        </button>

        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory items-start gap-5 overflow-x-auto overflow-y-visible scroll-smooth px-6 pb-28 sm:px-8 lg:px-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.map((item) => {
            const favoriteKey = getFavoriteKey(item);
            const isFavorite = favoriteKeys.has(favoriteKey);

            return (
            <article
              key={item.id}
              className={[
                "group/card relative shrink-0 snap-start overflow-visible transition-all duration-300 hover:z-50",
                sizes.card,
                variant === "featured" ? "hover:w-[760px] xl:hover:w-[860px]" : "",
              ].join(" ")}
            >
              <div
                className={[
                  "absolute left-0 top-0 overflow-hidden rounded-[16px] bg-[#11141d] shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition-all duration-300 ease-out group-hover/card:rounded-[18px] group-hover/card:shadow-[0_24px_70px_rgba(0,0,0,0.52)]",
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
                        "absolute inset-0 h-full w-full object-cover transition duration-500",
                        variant === "featured"
                          ? item.hoverImageUrl
                            ? "group-hover/card:opacity-0"
                            : "group-hover/card:scale-[1.03]"
                          : "group-hover/card:scale-[1.06]",
                      ].join(" ")}
                    />

                    {variant === "featured" && item.hoverImageUrl ? (
                      <img
                        src={item.hoverImageUrl}
                        alt={`${item.title} - prévia`}
                        className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover/card:scale-[1.03] group-hover/card:opacity-100"
                      />
                    ) : null}
                  </>
                ) : (
                  <div
                    className={[
                      "absolute inset-0 bg-gradient-to-br transition duration-500 group-hover/card:scale-[1.06]",
                      item.accent,
                    ].join(" ")}
                  />
                )}

                <div
                  className={
                    variant === "featured"
                      ? "absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.12),transparent_24%),linear-gradient(90deg,rgba(0,0,0,0.88),rgba(0,0,0,0.36)_44%,rgba(0,0,0,0.18)_68%,rgba(0,0,0,0.70)_100%)]"
                      : variant === "horizontal"
                        ? "absolute inset-0 bg-[radial-gradient(circle_at_74%_28%,rgba(255,255,255,0.14),transparent_24%),linear-gradient(90deg,rgba(0,0,0,0.82),rgba(0,0,0,0.32),rgba(0,0,0,0.66))]"
                        : "absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(255,255,255,0.12),transparent_25%),linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.20)_46%,rgba(0,0,0,0.94)_100%)]"
                  }
                />

                {item.badge ? (
                  <div
                    className={[
                      "absolute right-4 top-4 rounded-[5px] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[-0.02em] text-black transition duration-300",
                      variant === "featured"
                        ? "group-hover/card:opacity-0"
                        : "",
                    ].join(" ")}
                  >
                    {item.badge}
                  </div>
                ) : null}

                <div
                  className={[
                    "relative z-10 flex h-full flex-col justify-end",
                    sizes.padding,
                    variant === "featured"
                      ? "group-hover/card:max-w-[460px] group-hover/card:justify-center"
                      : "",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "max-w-[94%] transition duration-300 group-hover/card:max-w-[590px]",
                      variant === "featured"
                        ? "group-hover/card:max-w-[430px]"
                        : "",
                    ].join(" ")}
                  >
                    <p className="line-clamp-1 text-[12px] font-black uppercase tracking-[0.2em] text-[#f3d49b]">
                      {item.category}
                    </p>

                    <h3
                      className={[
                        "mt-2 line-clamp-2 font-black leading-[1.02] tracking-[-0.05em] text-white transition duration-300",
                        sizes.title,
                      ].join(" ")}
                    >
                      {item.title}
                    </h3>

                    <div className="mt-3 flex items-center gap-2 text-[14px] font-bold text-white/76">
                      <span className="line-clamp-1">{item.level}</span>

                      {item.duration ? (
                        <>
                          <span className="h-1 w-1 shrink-0 rounded-full bg-white/42" />
                          <span className="shrink-0">{item.duration}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 hidden translate-y-2 opacity-0 transition duration-300 group-hover/card:block group-hover/card:translate-y-0 group-hover/card:opacity-100">
                    <p className="max-w-[430px] text-[15px] font-medium leading-[1.5] text-white/78">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="mt-5 hidden items-center gap-2 opacity-0 transition duration-300 group-hover/card:flex group-hover/card:opacity-100">
                    <a
                      href={item.targetUrl || "#"}
                      className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-white px-4 text-[15px] font-black text-black transition hover:bg-white/86"
                    >
                      <Play size={19} fill="currentColor" />
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
                        "inline-flex h-11 w-11 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-70",
                        isFavorite
                          ? "bg-[#DBC094] text-black hover:bg-[#e8cf9e]"
                          : "bg-white/16 text-white hover:bg-white/24",
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
                      {isFavorite ? <Check size={20} /> : <Plus size={22} />}
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setInfoItem(item);
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/16 text-white transition hover:bg-white/24"
                      aria-label="Informações"
                      title="Informações"
                    >
                      <Info size={21} />
                    </button>
                  </div>

                  {typeof item.progress === "number" ? (
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/18">
                      <div
                        className="h-full rounded-full bg-[#DBC094]"
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

        <button
          type="button"
          onClick={() => scrollCarousel("right")}
          aria-label="Avançar conteúdos"
          className={[
            "absolute right-0 top-0 z-40 hidden w-[66px] items-center justify-center bg-gradient-to-l from-black/90 via-black/56 to-transparent text-white opacity-0 transition hover:opacity-100 group-hover/slider:opacity-100 lg:flex",
            sizes.arrow,
          ].join(" ")}
        >
          <ChevronRight size={42} strokeWidth={2.6} />
        </button>
      </div>
      </section>

      {infoItem ? (
        <ContentInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
      ) : null}
    </>
  );
}