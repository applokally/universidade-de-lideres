"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { StudentContentItem } from "../_data/student-content";

type FeaturedHeroProps = {
  items: StudentContentItem[];
};

export function FeaturedHero({ items }: FeaturedHeroProps) {
  const safeItems = useMemo(() => items.filter(Boolean), [items]);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeContent = safeItems[activeIndex];

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

  return (
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
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-md transition hover:bg-white/26"
              aria-label="Adicionar à lista"
            >
              <Plus size={29} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-md transition hover:bg-white/26"
              aria-label="Mais informações"
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
  );
}