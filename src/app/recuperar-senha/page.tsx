"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  animate,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function GlowFollowBorderCard({
  children,
  className = "",
  roundedClass = "rounded-[16px]",
  glowSize = 220,
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
            0.09 * glowStrength
          }) 24%, rgba(219,192,148,0.04) 42%, transparent 70%)`,
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

function AmbientGlow() {
  const x = useMotionValue(18);
  const y = useMotionValue(24);
  const background = useMotionTemplate`radial-gradient(circle at ${x}% ${y}%, rgba(219,192,148,0.13), transparent 18%)`;

  useEffect(() => {
    const controlsX = animate(x, [18, 74, 58, 18], {
      duration: 14,
      repeat: Infinity,
      ease: "easeInOut",
    });

    const controlsY = animate(y, [24, 18, 72, 24], {
      duration: 16,
      repeat: Infinity,
      ease: "easeInOut",
    });

    return () => {
      controlsX.stop();
      controlsY.stop();
    };
  }, [x, y]);

  return <motion.div style={{ background }} className="absolute inset-0" />;
}

function PremiumPillButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <GlowFollowBorderCard
      roundedClass="rounded-full"
      className="inline-block w-full"
      glowSize={230}
      glowStrength={1.22}
    >
      <motion.button
        type="submit"
        disabled={disabled}
        whileHover={{ y: -1, scale: 1.01 }}
        whileTap={{ scale: 0.988 }}
        className="group relative w-full overflow-hidden rounded-full border border-[#DBC094]/18 bg-[linear-gradient(180deg,rgba(219,192,148,0.12)_0%,rgba(219,192,148,0.08)_100%)] px-[8px] py-[8px] shadow-[0_10px_34px_rgba(0,0,0,0.34)] transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_50%,rgba(219,192,148,0.16),transparent_28%)]" />

        <motion.div
          initial={{ x: "-130%" }}
          whileHover={{ x: "130%" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-y-0 left-[-20%] w-[36%] rotate-[18deg] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.12)_35%,rgba(255,255,255,0.48)_50%,rgba(255,255,255,0.12)_65%,transparent_100%)] blur-[2px]"
        />

        <div className="relative flex min-h-[58px] items-center justify-center px-6">
          <span className="text-[16px] font-medium text-[#DBC094] transition duration-300 group-hover:text-[#f1dbb7] sm:text-[17px]">
            {children}
          </span>
        </div>
      </motion.button>
    </GlowFollowBorderCard>
  );
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/redefinir-senha`
        : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined
    );

    setBusy(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(
      "Enviamos o link de recuperação para o seu e-mail. Verifique sua caixa de entrada e spam."
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-black" />

      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(219,192,148,0.04)_0%,transparent_22%,transparent_78%,rgba(219,192,148,0.04)_100%)]" />
      <AmbientGlow />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[500px]"
        >
          <div className="mb-8 flex justify-center">
            <Link href="/" className="inline-flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Universidade de Líderes"
                width={250}
                height={100}
                priority
                className="h-auto w-[170px] object-contain sm:w-[220px]"
              />
            </Link>
          </div>

          <GlowFollowBorderCard
            roundedClass="rounded-[32px]"
            className="overflow-hidden"
            glowSize={300}
            glowStrength={1.12}
          >
            <div className="relative rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.016)_100%)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
              <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(219,192,148,0.07),transparent_26%)]" />
              <div className="absolute inset-0 rounded-[32px] bg-[linear-gradient(90deg,rgba(219,192,148,0.03)_0%,transparent_24%,transparent_76%,rgba(219,192,148,0.018)_100%)]" />

              <div className="relative z-10">
                <div className="inline-flex rounded-full border border-[#DBC094]/22 bg-[#DBC094]/8 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#DBC094]">
                  Recuperação de acesso
                </div>

                <h1 className="mt-5 text-[32px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-[38px]">
                  Esqueci minha senha
                </h1>

                <p className="mt-4 max-w-[410px] text-[15px] leading-7 text-white/62 sm:text-[16px]">
                  Informe o e-mail vinculado à sua conta para receber o link de
                  redefinição de senha.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/82">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      placeholder="Digite seu e-mail"
                      className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                    />
                  </div>

                  {error ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    >
                      {error}
                    </motion.div>
                  ) : null}

                  {success ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[18px] border border-[#DBC094]/18 bg-[#DBC094]/8 px-4 py-3 text-sm text-[#DBC094]"
                    >
                      {success}
                    </motion.div>
                  ) : null}

                  <div className="pt-2">
                    <PremiumPillButton disabled={busy}>
                      {busy ? "Enviando link..." : "Enviar link de recuperação"}
                    </PremiumPillButton>
                  </div>
                </form>

                <div className="mt-7 border-t border-white/8 pt-7">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-white/62">
                    <Link
                      href="/login"
                      className="font-medium text-[#DBC094] transition hover:text-white"
                    >
                      Voltar para login
                    </Link>

                    <span className="text-white/20">•</span>

                    <Link
                      href="/cadastro"
                      className="font-medium text-[#DBC094] transition hover:text-white"
                    >
                      Criar cadastro
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </GlowFollowBorderCard>
        </motion.div>
      </section>
    </main>
  );
}