"use client";

import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useRef } from "react";

const watchingItems = [
  {
    title: "Liderança Essencial",
    lesson: "Aula 03 • Clareza na condução do time",
    progress: 42,
    accent: "from-[#DBC094] via-[#5c4728] to-[#0c0905]",
  },
  {
    title: "Comunicação e Influência",
    lesson: "Aula 05 • Comunicação que gera ação",
    progress: 68,
    accent: "from-[#68758a] via-[#252d3d] to-[#07090d]",
  },
  {
    title: "Cultura de Expansão",
    lesson: "Aula 02 • Duplicação com método",
    progress: 15,
    accent: "from-[#b6955e] via-[#3a2b18] to-[#080604]",
  },
  {
    title: "Mentalidade de Líder",
    lesson: "Aula 01 • Construção de postura e direção",
    progress: 28,
    accent: "from-[#9e8456] via-[#352819] to-[#090909]",
  },
  {
    title: "Gestão de Times",
    lesson: "Aula 04 • Como acompanhar evolução",
    progress: 51,
    accent: "from-[#606b7d] via-[#202737] to-[#07080c]",
  },
];

export function ContinueWatching() {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  function scrollCarousel(direction: "left" | "right") {
    const carousel = carouselRef.current;

    if (!carousel) return;

    carousel.scrollBy({
      left: direction === "right" ? 760 : -760,
      behavior: "smooth",
    });
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
          {watchingItems.map((item) => (
            <article
              key={item.title}
              className="group/card relative h-[330px] w-[520px] shrink-0 snap-start overflow-hidden rounded-[16px] bg-[#11141d] shadow-[0_18px_36px_rgba(0,0,0,0.24)] transition duration-300 hover:z-20 hover:scale-[1.018] xl:w-[640px]"
            >
              <div
                className={[
                  "absolute inset-0 bg-gradient-to-br transition duration-500 group-hover/card:scale-[1.05]",
                  item.accent,
                ].join(" ")}
              />

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_28%,rgba(255,255,255,0.18),transparent_25%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.88))]" />

              <div className="relative z-10 flex h-full flex-col justify-end p-7">
                <button
                  type="button"
                  className="mb-10 inline-flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white text-black shadow-[0_10px_26px_rgba(0,0,0,0.24)] transition group-hover/card:scale-110"
                  aria-label="Continuar aula"
                >
                  <Play size={25} fill="currentColor" />
                </button>

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
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </article>
          ))}
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