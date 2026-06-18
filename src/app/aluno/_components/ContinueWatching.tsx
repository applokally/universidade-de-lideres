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

    // Ajustado para rolar de forma mais responsiva
    const scrollAmount = window.innerWidth > 1024 ? 620 : 300;

    carousel.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  }

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className="relative">
      <div className="px-5 sm:px-8 lg:px-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Continuar assistindo
        </h2>
      </div>

      <div className="group/slider relative w-screen overflow-visible">
        {/* Controle Esquerdo */}
        <button
          type="button"
          onClick={() => scrollCarousel("left")}
          aria-label="Voltar conteúdos"
          className="absolute left-0 top-0 z-40 hidden h-[320px] w-[80px] items-center justify-center bg-gradient-to-r from-[#050609] via-[#050609]/70 to-transparent text-white/50 opacity-0 transition-all hover:text-white hover:opacity-100 group-hover/slider:opacity-100 lg:flex"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-transform hover:scale-110">
            <ChevronLeft size={32} strokeWidth={2} />
          </div>
        </button>

        {/* Carrossel */}
        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 pb-6 pt-2 sm:px-8 lg:px-16 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <article
                  key={`continue-watching-loading-${index}`}
                  className="relative h-[320px] w-[85vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/5 bg-[#0a0b10] shadow-lg sm:w-[480px] xl:w-[600px]"
                >
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-transparent to-white/[0.02]" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="mb-8 h-14 w-14 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-6 w-[60%] rounded-md bg-white/10 animate-pulse" />
                    <div className="mt-3 h-4 w-[40%] rounded-md bg-white/5 animate-pulse" />
                    <div className="mt-8 h-1.5 w-full rounded-full bg-white/5 animate-pulse" />
                  </div>
                </article>
              ))
            : items.map((item) => {
                const progress = Math.max(0, Math.min(100, item.progress || 0));

                return (
                  <Link
                    key={`${item.courseId}-${item.lessonId}`}
                    href={item.href}
                    className="group/card relative h-[320px] w-[85vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/5 bg-[#0a0b10] shadow-lg transition-all duration-300 hover:z-20 hover:scale-[1.02] hover:shadow-2xl hover:border-white/10 sm:w-[480px] xl:w-[600px]"
                  >
                    {item.imageUrl ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover/card:scale-105"
                        style={{ backgroundImage: `url("${item.imageUrl}")` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#DBC094]/40 via-[#5c4728]/20 to-[#0c0905] transition-transform duration-700 ease-out group-hover/card:scale-105" />
                    )}

                    {/* Gradient overlay mais sofisticado para legibilidade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050609] via-[#050609]/80 to-transparent opacity-90" />
                    
                    <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
                      <span
                        className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/30 transition-all duration-300 group-hover/card:scale-110 group-hover/card:bg-[#DBC094]"
                        aria-label="Continuar aula"
                      >
                        <Play size={24} fill="currentColor" className="ml-1" />
                      </span>

                      <div className="min-h-[80px]">
                        <h3 className="line-clamp-2 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
                          {item.title}
                        </h3>

                        <p className="mt-2 line-clamp-1 text-sm font-medium text-white/60">
                          {item.lesson}
                        </p>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-black/40 shadow-inner">
                        <div
                          className="h-full rounded-full bg-[#DBC094] transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>

        {/* Controle Direito */}
        <button
          type="button"
          onClick={() => scrollCarousel("right")}
          aria-label="Avançar conteúdos"
          className="absolute right-0 top-0 z-40 hidden h-[320px] w-[80px] items-center justify-center bg-gradient-to-l from-[#050609] via-[#050609]/70 to-transparent text-white/50 opacity-0 transition-all hover:text-white hover:opacity-100 group-hover/slider:opacity-100 lg:flex"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-transform hover:scale-110">
            <ChevronRight size={32} strokeWidth={2} />
          </div>
        </button>
      </div>
    </section>
  );
}