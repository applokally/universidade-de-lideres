"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Trilhas", href: "#trilhas" },
  { label: "Ser Parte", href: "#ser-parte" },
  { label: "Contato", href: "#contato" },
];

const capabilityItems = [
  { label: "WEB", className: "text-[#DBC094]" },
  { label: "ANDROIDE", className: "text-[#DBC094]" },
  { label: "iOS", className: "text-[#DBC094] normal-case" },
];

type CarouselCourseItem = {
  id: string;
  title: string;
  image: string;
};

const fallbackCarouselItems: CarouselCourseItem[] = [
  {
    id: "fallback-1",
    title: "Universidade de Líderes",
    image: "/vVvkgclzheKHprmYgDW5JnmZr1Q.avif",
  },
];

const COURSE_COVERS_BUCKET = "covers";

const tutors = [
  {
    id: "karina",
    name: "Karina Biribilli",
    role: "Líder MMN",
    image: "/biribilli_home.jpg",
    quote:
      "Karina construiu uma trajetória sólida no MMN, combinando visão estratégica, liderança prática e capacidade real de formar equipes com consistência e resultado. Seu método une clareza, posicionamento e execução no mundo real.",
  },
  {
    id: "leandro",
    name: "Leandro Morales",
    role: "Líder MMN",
    image: "/morales.jpeg",
    quote:
      "Leandro desenvolveu sua autoridade no MMN com foco em crescimento sustentável, cultura de equipe e comunicação de alta influência. Sua experiência prática ajuda a transformar conhecimento em ação e ação em expansão.",
  },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 42 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 1.15,
      delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const zoomOutImage = {
  hidden: { opacity: 0, scale: 1.16 },
  show: (delay = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1.75,
      delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const sectionFade = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.95,
      delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function GlowFollowBorderCard({
  children,
  className = "",
  roundedClass = "rounded-[16px]",
  glowSize = 180,
  glowStrength = 1,
}: {
  children: React.ReactNode;
  className?: string;
  roundedClass?: string;
  glowSize?: number;
  glowStrength?: number;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--glow-opacity", "1");
  };

  const handleLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--glow-opacity", "0");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`group relative ${roundedClass} ${className}`}
      style={
        {
          ["--mx" as any]: "50%",
          ["--my" as any]: "50%",
          ["--glow-opacity" as any]: 0,
        } as React.CSSProperties
      }
    >
      <div className={`absolute inset-0 border border-white/8 ${roundedClass}`} />

      <div
        className={`pointer-events-none absolute inset-0 ${roundedClass}`}
        style={{
          opacity: "var(--glow-opacity)",
          background: `radial-gradient(${glowSize}px circle at var(--mx) var(--my), rgba(219,192,148,${
            0.18 * glowStrength
          }) 0%, rgba(219,192,148,${
            0.08 * glowStrength
          }) 22%, rgba(219,192,148,0.03) 40%, transparent 68%)`,
          transition: "opacity 220ms ease",
        }}
      />

      <div
        className={`pointer-events-none absolute inset-0 ${roundedClass}`}
        style={{
          padding: "1px",
          opacity: "var(--glow-opacity)",
          background: `radial-gradient(${glowSize}px circle at var(--mx) var(--my), rgba(219,192,148,${
            0.95 * glowStrength
          }) 0%, rgba(219,192,148,${
            0.45 * glowStrength
          }) 22%, rgba(219,192,148,0.18) 42%, transparent 72%)`,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          transition: "opacity 220ms ease",
          filter: "blur(0.2px)",
        }}
      />

      <div className={`relative z-10 ${roundedClass}`}>{children}</div>
    </div>
  );
}

function MobileMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <motion.div
      initial={false}
      animate={
        isOpen
          ? { opacity: 1, pointerEvents: "auto" as const }
          : { opacity: 0, pointerEvents: "none" as const }
      }
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-[95] bg-black/95 backdrop-blur-xl md:hidden"
    >
      <div className="flex h-full flex-col px-6 pb-8 pt-24">
        <div className="mb-10 flex items-center justify-between">
          <span className="text-sm uppercase tracking-[0.32em] text-white/40">
            Menu
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/35 hover:text-white"
          >
            Fechar
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-4">
          {navItems.map((item, index) => (
            <motion.a
              key={item.label}
              href={item.href}
              onClick={onClose}
              initial={{ opacity: 0, y: 18 }}
              animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{
                duration: 0.45,
                delay: isOpen ? 0.08 + index * 0.06 : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="border-b border-white/10 pb-4 text-[28px] font-semibold tracking-[-0.03em] text-white"
            >
              {item.label}
            </motion.a>
          ))}
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{
            duration: 0.45,
            delay: isOpen ? 0.34 : 0,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mt-8"
        >
          <Link
            href="/login"
            onClick={onClose}
            className="inline-flex w-full items-center justify-between rounded-full bg-[#DBC094] px-5 py-4 text-sm font-medium text-black"
          >
            Acessar
            <span className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
              →
            </span>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-[90]"
      >
        <div className="mx-auto max-w-[1720px] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="relative flex h-[74px] items-center justify-between rounded-full border border-white/8 bg-black/45 px-3 backdrop-blur-xl">
            <Link
              href="#home"
              className="flex items-center"
              aria-label="Diamond Network Pro"
            >
              <Image
                src="/logo.png"
                alt="Diamond Network Pro"
                width={170}
                height={58}
                priority
                className="h-auto w-[110px] object-contain sm:w-[130px] lg:w-[150px]"
              />
            </Link>

            <GlowFollowBorderCard
              roundedClass="rounded-full"
              className="hidden md:block"
              glowSize={180}
              glowStrength={1.05}
            >
              <nav className="hidden items-center rounded-full bg-white/[0.06] p-1 md:flex">
                {navItems.map((item, index) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className={[
                      "rounded-full px-7 py-3 text-[15px] font-medium transition duration-300",
                      index === 0
                        ? "bg-white text-black"
                        : "text-white/65 hover:bg-[rgba(219,192,148,0.18)] hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </GlowFollowBorderCard>

            <GlowFollowBorderCard
              roundedClass="rounded-full"
              className="hidden md:inline-block"
              glowSize={170}
              glowStrength={1.15}
            >
              <Link
                href="/login"
                className="hidden items-center gap-3 rounded-full bg-[#DBC094] pl-5 pr-1 py-1 text-[15px] font-medium text-black transition duration-300 hover:scale-[1.01] md:inline-flex"
              >
                Acessar
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-lg text-white">
                  →
                </span>
              </Link>
            </GlowFollowBorderCard>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white md:hidden"
              aria-label="Abrir menu"
            >
              <span className="space-y-1">
                <span className="block h-[2px] w-4 bg-white" />
                <span className="block h-[2px] w-4 bg-white/70" />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <MobileMenu isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

function ScrollIndicator() {
  return (
    <motion.a
      href="#trilhas"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 1,
        delay: 1.2,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="absolute bottom-[6.6%] left-1/2 z-30 hidden -translate-x-1/2 lg:flex"
      aria-label="Rolar para baixo"
    >
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#DBC094] bg-transparent"
      >
        <motion.span
          animate={{ y: [0, 6, 0], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="text-[24px] leading-none text-[#DBC094]"
        >
          ↓
        </motion.span>
      </motion.div>
    </motion.a>
  );
}

function HeroPhoneImage({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/agencia/hero-phone.png?v=3"
      alt="Celular sobre a rocha"
      width={1700}
      height={2200}
      priority
      unoptimized
      className={className}
    />
  );
}

function HeroDesktop() {
  return (
    <div className="absolute inset-0 hidden lg:block">
      <motion.div
        custom={0}
        initial="hidden"
        animate="show"
        variants={zoomOutImage}
        className="absolute inset-0"
      >
        <Image
          src="/agencia/hero-bg.avif"
          alt="Fundo escuro com feixes de luz"
          fill
          priority
          className="object-cover object-center opacity-[0.96]"
        />
      </motion.div>

      <div className="absolute inset-0 bg-black/18" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-transparent to-black/20" />

      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="absolute inset-x-[24%] bottom-[8%] h-[150px] rounded-full bg-white/[0.03] blur-[130px]" />

      <div className="relative z-10 mx-auto h-full max-w-[1720px] px-4 pt-24 sm:px-6 lg:px-8">
        <motion.div
          custom={0.16}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="absolute left-[7.2%] top-[34.2%] z-20 w-[29vw] max-w-[510px] min-w-[400px]"
        >
          <h1 className="text-center font-semibold uppercase leading-[0.86] tracking-[-0.095em] text-white">
            <span className="block text-[clamp(56px,5.3vw,110px)]">Conteúdos</span>
            <span className="block text-[clamp(56px,5.3vw,110px)]">Exclusivos</span>
          </h1>

          <motion.div
            custom={0.26}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-6 text-left text-[clamp(18px,1.25vw,24px)] font-medium leading-[1.35] tracking-[-0.03em] text-[#DBC094]"
          >
            <span className="block">Treinamentos e materiais para você</span>
            <span className="block">chegar ao sucesso no MMN!</span>
          </motion.div>
        </motion.div>

        <motion.div
          custom={0.08}
          initial="hidden"
          animate="show"
          variants={zoomOutImage}
          className="absolute left-1/2 bottom-[-1.2%] z-30 w-[37.62vw] max-w-[738px] min-w-[531px] -translate-x-1/2"
        >
          <HeroPhoneImage className="h-auto w-full object-contain drop-shadow-[0_36px_96px_rgba(0,0,0,0.72)]" />
        </motion.div>

        <motion.div
          custom={0.24}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="absolute right-[5.3%] top-[39.8%] z-20 text-right text-[clamp(22px,1.52vw,32px)] font-medium tracking-[-0.05em] text-white"
        >
          acesse na
        </motion.div>

        <motion.div
          custom={0.32}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="absolute right-[5.3%] top-[47.2%] z-20 flex flex-col items-end gap-[0.95vw] text-right"
        >
          {capabilityItems.map((item) => (
            <div
              key={item.label}
              className={`text-[clamp(26px,2.15vw,46px)] font-medium uppercase leading-[0.94] tracking-[-0.05em] ${item.className}`}
            >
              {item.label}
            </div>
          ))}
        </motion.div>

        <motion.div
          custom={0.4}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="absolute right-[5.1%] bottom-[0.4%] z-10 text-[clamp(120px,10.8vw,228px)] font-semibold leading-none tracking-[-0.08em] text-[#DBC094]/20"
        >
          2026
        </motion.div>

        <ScrollIndicator />
      </div>
    </div>
  );
}

function HeroMobile() {
  return (
    <div className="absolute inset-0 lg:hidden">
      <motion.div
        custom={0}
        initial="hidden"
        animate="show"
        variants={zoomOutImage}
        className="absolute inset-0"
      >
        <Image
          src="/agencia/hero-bg.avif"
          alt="Fundo escuro com feixes de luz"
          fill
          priority
          className="object-cover object-center opacity-[0.96]"
        />
      </motion.div>

      <div className="absolute inset-0 bg-black/22" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-transparent to-black/20" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1720px] flex-col px-4 pb-10 pt-28 sm:px-6">
        <motion.div
          custom={0.16}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="text-center"
        >
          <h1 className="font-semibold uppercase leading-[0.88] tracking-[-0.095em] text-white">
            <span className="block text-[38px] sm:text-[50px]">Conteúdos</span>
            <span className="block text-[38px] sm:text-[50px]">Exclusivos</span>
          </h1>

          <motion.div
            custom={0.26}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-4 text-left text-[16px] font-medium leading-[1.35] tracking-[-0.03em] text-[#DBC094] sm:text-[18px]"
          >
            <span className="block">Treinamentos e materiais para você</span>
            <span className="block">chegar ao sucesso no MMN!</span>
          </motion.div>
        </motion.div>

        <motion.div
          custom={0.08}
          initial="hidden"
          animate="show"
          variants={zoomOutImage}
          className="mx-auto mt-6 w-[81%] max-w-[414px]"
        >
          <HeroPhoneImage className="h-auto w-full object-contain drop-shadow-[0_36px_96px_rgba(0,0,0,0.72)]" />
        </motion.div>

        <motion.a
          href="#trilhas"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 1.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto mt-4 flex"
          aria-label="Rolar para baixo"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[#DBC094] bg-transparent"
          >
            <motion.span
              animate={{ y: [0, 6, 0], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="text-[22px] leading-none text-[#DBC094]"
            >
              ↓
            </motion.span>
          </motion.div>
        </motion.a>

        <motion.div
          custom={0.24}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-4 text-right text-[22px] font-medium tracking-[-0.05em] text-white"
        >
          acesse na
        </motion.div>

        <motion.div
          custom={0.32}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-5 flex flex-col items-end gap-2 text-right"
        >
          {capabilityItems.map((item) => (
            <div
              key={item.label}
              className={`text-[30px] font-medium uppercase leading-[0.92] tracking-[-0.05em] ${item.className}`}
            >
              {item.label}
            </div>
          ))}
        </motion.div>

        <motion.div
          custom={0.4}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-8 text-right text-[86px] font-semibold leading-none tracking-[-0.08em] text-[#DBC094]/20"
        >
          2026
        </motion.div>
      </div>
    </div>
  );
}

function HeroScene({
  scale,
  y,
  opacity,
  blackoutOpacity,
}: {
  scale: MotionValue<number>;
  y: MotionValue<number>;
  opacity: MotionValue<number>;
  blackoutOpacity: MotionValue<number>;
}) {
  return (
    <motion.div
      style={{ scale, y, opacity, transformOrigin: "center center" }}
      className="relative h-full w-full"
    >
      <HeroDesktop />
      <HeroMobile />

      <motion.div
        style={{ opacity: blackoutOpacity }}
        className="pointer-events-none absolute inset-0 z-[60] bg-black"
      />
    </motion.div>
  );
}


function getCourseCoverUrl(path: string | null) {
  if (!path) return "/vVvkgclzheKHprmYgDW5JnmZr1Q.avif";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.replace(/^\/+/, "");

  if (cleanPath.startsWith("public/")) {
    return `/${cleanPath.replace(/^public\//, "")}`;
  }

  const supabase = supabaseBrowser();
  const { data } = supabase.storage
    .from(COURSE_COVERS_BUCKET)
    .getPublicUrl(cleanPath.replace(/^covers\//, ""));

  return data.publicUrl || "/vVvkgclzheKHprmYgDW5JnmZr1Q.avif";
}

function buildLoopedCarouselItems(items: CarouselCourseItem[]) {
  const baseItems = items.length > 0 ? items : fallbackCarouselItems;
  const repeated: CarouselCourseItem[] = [];

  while (repeated.length < 16) {
    repeated.push(...baseItems);
  }

  return repeated.slice(0, 16).map((item, index) => ({
    ...item,
    loopId: `${item.id}-${index}`,
  }));
}

function InfiniteCarouselRow({
  items,
  reverse = false,
  duration = 34,
}: {
  items: CarouselCourseItem[];
  reverse?: boolean;
  duration?: number;
}) {
  const repeated = useMemo(() => buildLoopedCarouselItems(items), [items]);

  return (
    <div className="relative overflow-hidden py-1.5">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20"
        style={{
          width: "min(26vw, 360px)",
          background:
            "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.82) 22%, rgba(0,0,0,0.52) 50%, rgba(0,0,0,0.18) 76%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-20"
        style={{
          width: "min(26vw, 360px)",
          background:
            "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.82) 22%, rgba(0,0,0,0.52) 50%, rgba(0,0,0,0.18) 76%, rgba(0,0,0,0) 100%)",
        }}
      />

      <motion.div
        animate={{
          x: reverse ? ["-50%", "0%"] : ["0%", "-50%"],
        }}
        transition={{
          duration,
          ease: [0.42, 0, 0.58, 1],
          repeat: Infinity,
        }}
        className="flex w-max gap-3 lg:gap-4"
      >
        {repeated.map((item, index) => (
          <div
            key={item.loopId}
            className="relative h-[200px] w-[146px] shrink-0 overflow-hidden rounded-[20px] border border-white/7 bg-white/[0.02] sm:h-[228px] sm:w-[164px] lg:h-[252px] lg:w-[182px]"
          >
            <Image
              src={item.image}
              alt={item.title || `Curso ${index + 1}`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-black/[0.04]" />

            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="line-clamp-2 text-[13px] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[14px]">
                {item.title}
              </p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function LeadersPortalSection({
  contentY,
  contentOpacity,
  carouselItems,
}: {
  contentY: MotionValue<number>;
  contentOpacity: MotionValue<number>;
  carouselItems: CarouselCourseItem[];
}) {
  return (
    <section
      id="trilhas"
      className="relative z-40 -mt-[100vh] h-[200vh] bg-transparent"
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-transparent text-white">
        <div
          className="absolute inset-x-0 top-0 z-[1]"
          style={{
            height: "clamp(180px, 24vh, 250px)",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 18%, rgba(0,0,0,0.2) 36%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0.72) 76%, rgba(0,0,0,1) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 top-[clamp(180px,24vh,250px)] z-[1] bg-black" />

        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="relative z-[2] mx-auto max-w-[1720px] px-4 pt-[12vh] sm:px-6 lg:px-8 lg:pt-[13vh]"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7 text-center lg:mb-8"
          >
            <h2 className="mx-auto max-w-[920px] text-balance text-[17px] font-medium tracking-[-0.045em] text-[#DBC094] sm:text-[23px] lg:text-[31px]">
              O MAIOR PORTAL DE FORMAÇÃO DE LÍDERES DO MUNDO
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 1.2,
              delay: 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="space-y-3 lg:space-y-4"
          >
            <InfiniteCarouselRow items={carouselItems} duration={42} />
            <InfiniteCarouselRow items={carouselItems} reverse duration={45} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function TutorsSection() {
  const [activeTutorId, setActiveTutorId] = useState<
    (typeof tutors)[number]["id"]
  >("karina");
  const activeTutor =
    tutors.find((tutor) => tutor.id === activeTutorId) ?? tutors[0];

  return (
    <>
      <section
        id="idealizadores"
        className="relative overflow-hidden bg-black px-4 pb-14 pt-16 text-white sm:px-6 lg:px-8 lg:pb-20 lg:pt-20"
      >
        <div className="absolute inset-0 z-0">
          <Image
            src="/HtbB34sFMlId7A1hElSRnTAjLsc.avif"
            alt="Fundo do bloco de idealizadores"
            fill
            priority
            className="object-cover object-center opacity-[0.32]"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_40%,rgba(255,255,255,0.04),transparent_28%)]" />
        </div>

        <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.08]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.9) 1.15px, transparent 1.15px)",
              backgroundSize: "12px 12px",
              maskImage:
                "linear-gradient(to bottom right, transparent 4%, black 22%, black 74%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom right, transparent 4%, black 22%, black 74%, transparent 100%)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute right-[-10%] top-[14%] z-[1] h-[480px] w-[780px] rounded-full bg-[radial-gradient(circle,rgba(219,192,148,0.08),transparent_65%)] blur-3xl" />
        <div className="pointer-events-none absolute left-[-8%] bottom-[8%] z-[1] h-[300px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-[1720px]">
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionFade}
            className="mb-8 text-center lg:mb-10"
          >
            <h2 className="mx-auto max-w-[920px] text-balance text-[17px] font-medium tracking-[-0.045em] text-[#DBC094] sm:text-[23px] lg:text-[31px]">
              Criado por treinadores oficiais
            </h2>
          </motion.div>

          <div className="grid items-center gap-8 lg:grid-cols-[0.64fr_1.36fr] lg:gap-12">
            <motion.div
              custom={0.08}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={sectionFade}
              className="relative"
            >
              <GlowFollowBorderCard
                roundedClass="rounded-[28px]"
                className="overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
                glowSize={260}
                glowStrength={1.25}
              >
                <div className="m-px relative overflow-hidden rounded-[27px] bg-white/[0.23]">
                  <div className="relative aspect-[0.88/1.08]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTutor.id}
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={activeTutor.image}
                          alt={activeTutor.name}
                          fill
                          className="object-cover opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/8 to-transparent" />
                        <div className="absolute inset-0 bg-white/[0.10]" />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/82 to-transparent px-6 pb-7 pt-20 text-center sm:px-8">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${activeTutor.id}-info`}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <h3 className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[42px]">
                          {activeTutor.name}
                        </h3>
                        <p className="mt-3 text-[22px] text-white/82 sm:text-[24px]">
                          {activeTutor.role}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </GlowFollowBorderCard>
            </motion.div>

            <motion.div
              custom={0.16}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={sectionFade}
              className="relative"
            >
              <div className="relative max-w-[1040px]">
                <div className="pointer-events-none absolute -left-[4%] top-[12%] hidden h-[240px] w-[240px] rounded-full border border-white/12 lg:block" />
                <div className="pointer-events-none absolute -left-[1.2%] top-[18%] hidden h-[140px] w-[140px] rounded-full border border-white/12 lg:block" />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeTutor.id}-quote`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h2 className="max-w-[980px] text-[clamp(29px,3.65vw,74px)] font-semibold uppercase leading-[0.96] tracking-[-0.075em] text-white">
                      <span className="text-white">{activeTutor.name}</span>{" "}
                      <span className="text-white/96">
                        mostra na prática como
                      </span>{" "}
                      <span className="text-[#DBC094]">
                        construir liderança,
                      </span>{" "}
                      <span className="text-[#DBC094]">
                        visão e crescimento real
                      </span>{" "}
                      <span className="text-white">no MMN.</span>
                    </h2>

                    <p className="mt-6 max-w-[920px] text-[17px] leading-8 text-white/64 sm:text-[18px]">
                      {activeTutor.quote}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  {tutors.map((tutor) => {
                    const isActive = tutor.id === activeTutor.id;

                    return (
                      <motion.button
                        key={tutor.id}
                        type="button"
                        onClick={() => setActiveTutorId(tutor.id)}
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="rounded-[16px]"
                      >
                        <GlowFollowBorderCard
                          roundedClass="rounded-[16px]"
                          className={[
                            "overflow-hidden transition",
                            isActive ? "bg-white/[0.06]" : "bg-white/[0.025]",
                          ].join(" ")}
                          glowSize={150}
                          glowStrength={1}
                        >
                          <div className="flex items-center gap-3 pr-4">
                            <div className="relative h-[58px] w-[58px] overflow-hidden rounded-[12px]">
                              <Image
                                src={tutor.image}
                                alt={tutor.name}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="text-left">
                              <div
                                className={[
                                  "text-[14px] font-medium transition",
                                  isActive ? "text-white" : "text-white/72",
                                ].join(" ")}
                              >
                                {tutor.name}
                              </div>
                              <div className="text-[12px] text-white/42">
                                {tutor.role}
                              </div>
                            </div>
                          </div>
                        </GlowFollowBorderCard>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}

function HowToJoinSection() {
  return (
    <section
      id="ser-parte"
      className="relative overflow-hidden bg-black px-4 pb-18 pt-16 text-white sm:px-6 lg:px-8 lg:pb-24 lg:pt-22"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(219,192,148,0.10),transparent_32%),radial-gradient(circle_at_82%_68%,rgba(219,192,148,0.08),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.015)_0%,rgba(0,0,0,0)_40%,rgba(255,255,255,0.015)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1720px]">
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionFade}
          className="mx-auto mb-10 max-w-[1040px] text-center"
        >
          <h2 className="text-[clamp(34px,4.3vw,86px)] font-semibold uppercase leading-[0.94] tracking-[-0.075em] text-white">
            Como fazer <span className="text-[#DBC094]">parte</span>
          </h2>

          <p className="mx-auto mt-5 max-w-[980px] text-[16px] leading-8 text-white/64 sm:text-[18px]">
            Para ter acesso à Universidade de Líderes, o primeiro passo é fazer
            o seu cadastro gratuito e desbloquear acesso aos melhores produtos
            cosméticos e capilares com{" "}
            <span className="text-[#DBC094]">50% de desconto</span>.
            Depois disso, basta seguir o fluxo de ativação e informar seu login
            para receber o link oficial de cadastro aqui na plataforma.
          </p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-3">
          <motion.div
            custom={0.06}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={sectionFade}
          >
            <GlowFollowBorderCard
              roundedClass="rounded-[28px]"
              className="h-full bg-white/[0.03]"
              glowSize={220}
              glowStrength={1.18}
            >
              <div className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.02)_100%)] p-6 sm:p-7">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#DBC094]/35 bg-[#DBC094]/10 text-[18px] font-semibold text-[#DBC094]">
                  1
                </div>

                <h3 className="text-[26px] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[30px]">
                  Realizar cadastro
                </h3>

                <p className="mt-4 text-[15px] leading-7 text-white/66 sm:text-[16px]">
                  Comece com o seu cadastro gratuito para entrar no processo de
                  ativação e acessar a estrutura inicial.
                </p>

                <div className="mt-auto pt-8">
                  <GlowFollowBorderCard
                    roundedClass="rounded-full"
                    className="inline-block"
                    glowSize={170}
                    glowStrength={1.1}
                  >
                    <Link
                      href="/cadastro"
                      className="inline-flex items-center gap-3 rounded-full bg-[#DBC094] pl-5 pr-1 py-1 text-[15px] font-medium text-black transition duration-300 hover:scale-[1.02]"
                    >
                      Fazer cadastro
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-lg text-white">
                        →
                      </span>
                    </Link>
                  </GlowFollowBorderCard>
                </div>
              </div>
            </GlowFollowBorderCard>
          </motion.div>

          <motion.div
            custom={0.12}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={sectionFade}
          >
            <GlowFollowBorderCard
              roundedClass="rounded-[28px]"
              className="h-full bg-white/[0.03]"
              glowSize={220}
              glowStrength={1.18}
            >
              <div className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.02)_100%)] p-6 sm:p-7">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#DBC094]/35 bg-[#DBC094]/10 text-[18px] font-semibold text-[#DBC094]">
                  2
                </div>

                <h3 className="text-[26px] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[30px]">
                  Ativar o cadastro
                </h3>

                <p className="mt-4 text-[15px] leading-7 text-white/66 sm:text-[16px]">
                  Faça o seu pedido de ativação com valor mínimo de{" "}
                  <span className="text-[#DBC094]">R$150,00</span> em produtos,
                  aproveitando os{" "}
                  <span className="text-[#DBC094]">50% de desconto</span>.
                </p>

                <div className="mt-8 rounded-[22px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="mb-2 text-sm text-white/45">
                    Ativação mínima primeiro pedido
                  </div>
                  <div className="text-[22px] font-semibold tracking-[-0.04em] text-white">
                    R$150,00 em produtos
                  </div>
                </div>
              </div>
            </GlowFollowBorderCard>
          </motion.div>

          <motion.div
            custom={0.18}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={sectionFade}
          >
            <GlowFollowBorderCard
              roundedClass="rounded-[28px]"
              className="h-full bg-white/[0.03]"
              glowSize={220}
              glowStrength={1.18}
            >
              <div className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.02)_100%)] p-6 sm:p-7">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#DBC094]/35 bg-[#DBC094]/10 text-[18px] font-semibold text-[#DBC094]">
                  3
                </div>

                <h3 className="text-[26px] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[30px]">
                  Informar login no WhatsApp
                </h3>

                <p className="mt-4 text-[15px] leading-7 text-white/66 sm:text-[16px]">
                  Depois da confirmação, envie seu login pelo WhatsApp. Assim
                  que validado, você receberá o link para se cadastrar aqui na
                  nossa plataforma.
                </p>

                <div className="mt-auto pt-8">
                  <GlowFollowBorderCard
                    roundedClass="rounded-full"
                    className="inline-block"
                    glowSize={170}
                    glowStrength={1.1}
                  >
                    <motion.a
                      href="#"
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      className="inline-flex items-center gap-3 rounded-full bg-[#DBC094]/10 px-5 py-3 text-[15px] font-medium text-[#DBC094] transition hover:bg-[#DBC094]/14"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DBC094]/40 bg-black/50 text-sm">
                        ✆
                      </span>
                      Enviar login no WhatsApp
                    </motion.a>
                  </GlowFollowBorderCard>
                </div>
              </div>
            </GlowFollowBorderCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [isRegistered, setIsRegistered] = useState<"nao" | "sim">("nao");

  return (
    <section
      id="contato"
      className="relative overflow-hidden bg-black px-4 pb-18 pt-16 text-white sm:px-6 lg:px-8 lg:pb-24 lg:pt-22"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(219,192,148,0.10),transparent_34%),radial-gradient(circle_at_82%_62%,rgba(219,192,148,0.08),transparent_32%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1720px]">
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionFade}
          className="mx-auto mb-10 max-w-[1080px] text-center"
        >
          <h2 className="text-[clamp(34px,4.3vw,86px)] font-semibold uppercase leading-[0.94] tracking-[-0.075em] text-white">
            Entre em <span className="text-[#DBC094]">contato</span>
          </h2>

          <p className="mx-auto mt-5 max-w-[940px] text-[16px] leading-8 text-white/64 sm:text-[18px]">
            Preencha o formulário para falar com a nossa equipe e receber as
            orientações corretas para acessar a Universidade de Líderes.
          </p>
        </motion.div>

        <div className="grid items-start gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:gap-14">
          <motion.div
            custom={0.08}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
            variants={sectionFade}
          >
            <GlowFollowBorderCard
              roundedClass="rounded-[32px]"
              className="bg-white/[0.03]"
              glowSize={260}
              glowStrength={1.22}
            >
              <div className="rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.018)_100%)] p-6 sm:p-8 lg:p-9">
                <form className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-white/58">
                        Nome
                      </label>
                      <input
                        type="text"
                        className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.045]"
                        placeholder="Digite seu nome"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/58">
                        Sobrenome
                      </label>
                      <input
                        type="text"
                        className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.045]"
                        placeholder="Digite seu sobrenome"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-white/58">
                        E-mail
                      </label>
                      <input
                        type="email"
                        className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.045]"
                        placeholder="Digite seu e-mail"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/58">
                        Cidade
                      </label>
                      <input
                        type="text"
                        className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.045]"
                        placeholder="Digite sua cidade"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/58">
                      Já desenvolve algum projeto?
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setIsRegistered("sim")}
                        className={[
                          "flex h-14 items-center justify-center rounded-[18px] border text-sm font-medium transition",
                          isRegistered === "sim"
                            ? "border-[#DBC094]/45 bg-[#DBC094]/12 text-[#DBC094]"
                            : "border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.05]",
                        ].join(" ")}
                      >
                        Sim
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRegistered("nao")}
                        className={[
                          "flex h-14 items-center justify-center rounded-[18px] border text-sm font-medium transition",
                          isRegistered === "nao"
                            ? "border-[#DBC094]/45 bg-[#DBC094]/12 text-[#DBC094]"
                            : "border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.05]",
                        ].join(" ")}
                      >
                        Não
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isRegistered === "sim" ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: 10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 6 }}
                        transition={{
                          duration: 0.35,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="grid gap-4 overflow-hidden"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm text-white/58">
                              Login
                            </label>
                            <input
                              type="text"
                              className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.045]"
                              placeholder="Digite seu login"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-white/58">
                              Quem é o seu Líder
                            </label>
                            <input
                              type="text"
                              className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.045]"
                              placeholder="Digite o nome do seu líder"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-white/58">
                            Você está ativo ou não?
                          </label>
                          <select className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition focus:border-[#DBC094]/45 focus:bg-white/[0.045]">
                            <option value="" className="bg-black text-white">
                              Selecionar
                            </option>
                            <option value="ativo" className="bg-black text-white">
                              Ativo
                            </option>
                            <option
                              value="nao-ativo"
                              className="bg-black text-white"
                            >
                              Não ativo
                            </option>
                          </select>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <div className="pt-4">
                    <GlowFollowBorderCard
                      roundedClass="rounded-full"
                      className="inline-block"
                      glowSize={170}
                      glowStrength={1.12}
                    >
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.985 }}
                        className="inline-flex items-center gap-3 rounded-full bg-[#DBC094] pl-5 pr-1 py-1 text-[15px] font-medium text-black transition duration-300"
                      >
                        Enviar
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-lg text-white">
                          →
                        </span>
                      </motion.button>
                    </GlowFollowBorderCard>
                  </div>
                </form>
              </div>
            </GlowFollowBorderCard>
          </motion.div>

          <motion.div
            custom={0.14}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
            variants={sectionFade}
            className="relative"
          >
            <div className="relative min-h-[460px] md:min-h-[520px] lg:min-h-[560px]">
              <div className="relative z-10 max-w-[430px] pt-3">
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/55">
                  suporte
                </div>

                <h3 className="mt-6 text-[34px] font-semibold uppercase leading-[0.94] tracking-[-0.065em] text-white sm:text-[52px]">
                  Fale com a nossa equipe
                </h3>

                <p className="mt-4 text-[15px] leading-7 text-white/66 sm:text-[16px]">
                  Envie seus dados e receba a orientação correta para ativação,
                  acesso e cadastro na plataforma.
                </p>

                <div className="mt-8 space-y-5">
                  <div>
                    <div className="text-sm text-white/45">Telefone</div>
                    <div className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">
                      +55 (35) 99999-9999
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-white/45">E-mail</div>
                    <div className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white break-all">
                      contato@universidadedelideres.com
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute right-[-4%] top-[2%] h-[95%] w-[62%] md:right-0 md:w-[58%] lg:top-0 lg:h-full lg:w-[58%]">
                <Image
                  src="/agencia/hero-phone.png?v=3"
                  alt="Celular"
                  fill
                  unoptimized
                  className="object-contain object-right drop-shadow-[0_40px_120px_rgba(0,0,0,0.78)]"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.a
          href="#home"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-16 right-5 z-[90] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/72 backdrop-blur-md transition hover:border-[#DBC094]/35 hover:text-[#DBC094] sm:bottom-5"
          aria-label="Voltar ao topo"
        >
          ↑
        </motion.a>
      ) : null}
    </AnimatePresence>
  );
}

export default function Page() {
  const heroSectionRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: heroSectionRef,
    offset: ["start start", "end end"],
  });

  const heroScaleRaw = useTransform(scrollYProgress, [0.01, 0.78], [1, 0.9]);
  const heroYRaw = useTransform(scrollYProgress, [0.01, 0.78], [0, -32]);
  const heroOpacityRaw = useTransform(scrollYProgress, [0.01, 0.78], [1, 0.86]);

  const blockTwoYRaw = useTransform(scrollYProgress, [0.34, 0.8], [96, 0]);
  const blockTwoOpacityRaw = useTransform(
    scrollYProgress,
    [0.34, 0.72],
    [0.72, 1]
  );

  const heroBlackoutOpacityRaw = useTransform(
    scrollYProgress,
    [0.01, 0.125],
    [0, 1]
  );

  const heroScale = useSpring(heroScaleRaw, {
    stiffness: 54,
    damping: 22,
    mass: 1.02,
  });

  const heroY = useSpring(heroYRaw, {
    stiffness: 54,
    damping: 22,
    mass: 1.02,
  });

  const heroOpacity = useSpring(heroOpacityRaw, {
    stiffness: 54,
    damping: 22,
    mass: 1.02,
  });

  const heroBlackoutOpacity = useSpring(heroBlackoutOpacityRaw, {
    stiffness: 64,
    damping: 24,
    mass: 1,
  });

  const blockTwoY = useSpring(blockTwoYRaw, {
    stiffness: 48,
    damping: 20,
    mass: 1.08,
  });

  const blockTwoOpacity = useSpring(blockTwoOpacityRaw, {
    stiffness: 48,
    damping: 20,
    mass: 1.08,
  });

  const [courseCarouselItems, setCourseCarouselItems] =
    useState<CarouselCourseItem[]>(fallbackCarouselItems);

  useEffect(() => {
    let isMounted = true;

    async function carregarCursosDoCarrossel() {
      const supabase = supabaseBrowser();

      const { data, error } = await supabase
        .from("courses")
        .select(
          [
            "id",
            "title",
            "cover_path",
            "cover_vertical_path",
            "cover_horizontal_path",
            "cover_featured_path",
            "preferred_card_format",
            "status",
          ].join(",")
        )
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(12);

      if (error || !data) return;

      const items = ((data ?? []) as unknown as Array<{
        id: string;
        title: string | null;
        cover_path: string | null;
        cover_vertical_path: string | null;
        cover_horizontal_path: string | null;
        cover_featured_path: string | null;
        preferred_card_format: string | null;
      }>)
        .map((course) => {
          const imagePath =
            course.cover_featured_path ||
            course.cover_vertical_path ||
            course.cover_horizontal_path ||
            course.cover_path;

          return {
            id: course.id,
            title: course.title?.trim() || "Curso sem título",
            image: getCourseCoverUrl(imagePath),
          };
        })
        .filter((item) => item.title && item.image);

      if (isMounted && items.length > 0) {
        setCourseCarouselItems(items);
      }
    }

    void carregarCursosDoCarrossel();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main id="home" className="scroll-smooth bg-black pt-[98px] text-white">
      <Header />

      <section
        ref={heroSectionRef}
        className="relative h-[200vh] bg-black text-white"
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <HeroScene
            scale={heroScale}
            y={heroY}
            opacity={heroOpacity}
            blackoutOpacity={heroBlackoutOpacity}
          />
        </div>
      </section>

      <LeadersPortalSection
        contentY={blockTwoY}
        contentOpacity={blockTwoOpacity}
        carouselItems={courseCarouselItems}
      />

      <TutorsSection />

      <HowToJoinSection />

      <ContactSection />


      <BackToTopButton />
    </main>
  );
}