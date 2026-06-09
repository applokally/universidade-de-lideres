"use client";

import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ContinueWatchingItem = {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  lesson: string;
  href: string;
  progress: number;
  imageUrl: string | null;
  lastWatchedAt: string | null;
};

export function ContinueWatching() {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadContinueWatching() {
      try {
        const response = await fetch(
          "/api/student/lesson-progress?mode=continue-watching",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (isMounted) {
            setItems([]);
          }

          return;
        }

        const data = (await response.json()) as {
          continueWatching?: ContinueWatchingItem[];
        };

        if (isMounted) {
          setItems(data.continueWatching ?? []);
        }
      } catch {
        if (isMounted) {
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadContinueWatching();

    return () => {
      isMounted = false;
    };
  }, []);

  function scrollCarousel(direction: "left" | "right") {
    const carousel = carouselRef.current;

    if (!carousel) return;

    carousel.scrollBy({
      left: direction === "right" ? 760 : -760,
      behavior: "smooth",
    });
  }

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className="relative">
      <div className="px-6 sm:px-8 lg:px-10">
        <h2 className="mb-5 text-[25px] font-black tracking-[-0.045em] text-white sm:text-[30px]">
          Continuar assistindo
        </h2>
      </div>

      <div className="group/slider relative w-screen overflow-visible">
        <button
          type="button"
          onClick={() => scrollCarousel("left")}
          aria-label="Voltar conteúdos"
          className="absolute left-0 top-0 z-40 hidden h-[330px] w-[66px] items-center justify-center bg-gradient-to-r from-black/90 via-black/56 to-transparent text-white opacity-0 transition hover:opacity-100 group-hover/slider:opacity-100 lg:flex"
        >
          <ChevronLeft size={42} strokeWidth={2.6} />
        </button>

        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-2 sm:px-8 lg:px-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <article
                  key={`continue-watching-loading-${index}`}
                  className="relative h-[330px] w-[520px] shrink-0 snap-start overflow-hidden rounded-[16px] bg-[#11141d] shadow-[0_18px_36px_rgba(0,0,0,0.24)] xl:w-[640px]"
                >
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/[0.04] to-white/[0.02]" />
                  <div className="absolute bottom-0 left-0 right-0 p-7">
                    <div className="mb-10 h-[62px] w-[62px] rounded-full bg-white/12" />
                    <div className="h-8 w-[58%] rounded-full bg-white/12" />
                    <div className="mt-4 h-5 w-[42%] rounded-full bg-white/8" />
                    <div className="mt-8 h-1.5 rounded-full bg-white/10" />
                  </div>
                </article>
              ))
            : items.map((item) => {
                const progress = Math.max(0, Math.min(100, item.progress || 0));

                return (
                  <Link
                    key={`${item.courseId}-${item.lessonId}`}
                    href={item.href}
                    className="group/card relative h-[330px] w-[520px] shrink-0 snap-start overflow-hidden rounded-[16px] bg-[#11141d] shadow-[0_18px_36px_rgba(0,0,0,0.24)] transition duration-300 hover:z-20 hover:scale-[1.018] xl:w-[640px]"
                  >
                    {item.imageUrl ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover/card:scale-[1.05]"
                        style={{ backgroundImage: `url("${item.imageUrl}")` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#DBC094] via-[#5c4728] to-[#0c0905] transition duration-500 group-hover/card:scale-[1.05]" />
                    )}

                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_28%,rgba(255,255,255,0.18),transparent_25%),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.90))]" />

                    <div className="relative z-10 flex h-full flex-col justify-end p-7">
                      <span
                        className="mb-10 inline-flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white text-black shadow-[0_10px_26px_rgba(0,0,0,0.24)] transition group-hover/card:scale-110"
                        aria-label="Continuar aula"
                      >
                        <Play size={25} fill="currentColor" />
                      </span>

                      <div className="min-h-[88px]">
                        <h3 className="line-clamp-1 text-[26px] font-black leading-tight tracking-[-0.045em] text-white">
                          {item.title}
                        </h3>

                        <p className="mt-3 line-clamp-1 text-[16px] font-semibold text-white/70">
                          {item.lesson}
                        </p>
                      </div>

                      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/18">
                        <div
                          className="h-full rounded-full bg-[#DBC094]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>

        <button
          type="button"
          onClick={() => scrollCarousel("right")}
          aria-label="Avançar conteúdos"
          className="absolute right-0 top-0 z-40 hidden h-[330px] w-[66px] items-center justify-center bg-gradient-to-l from-black/90 via-black/56 to-transparent text-white opacity-0 transition hover:opacity-100 group-hover/slider:opacity-100 lg:flex"
        >
          <ChevronRight size={42} strokeWidth={2.6} />
        </button>
      </div>
    </section>
  );
}
