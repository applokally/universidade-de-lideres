"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  animate,
} from "framer-motion";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const CAMINHO_ALUNO_PADRAO = "/aluno";
const CAMINHO_ADMIN_PADRAO = "/admin";

function sanitizarProximoCaminho(caminho: string | null): string | null {
  if (!caminho) return null;

  const valor = caminho.trim();

  if (!valor.startsWith("/")) return null;
  if (valor.startsWith("//")) return null;
  if (valor.startsWith("/login")) return null;
  if (valor.startsWith("/logout")) return null;

  return valor;
}

function obterPathnameInterno(caminho: string): string {
  try {
    return new URL(caminho, "http://localhost").pathname;
  } catch {
    return caminho;
  }
}

function ehCaminhoAdmin(caminho: string | null): boolean {
  if (!caminho) return false;

  const pathname = obterPathnameInterno(caminho);

  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function ehCaminhoAluno(caminho: string | null): boolean {
  if (!caminho) return false;

  const pathname = obterPathnameInterno(caminho);

  return pathname === "/aluno" || pathname.startsWith("/aluno/");
}

function traduzirErroLogin(mensagem: string): string {
  const texto = mensagem.toLowerCase();

  if (texto.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }

  if (texto.includes("email not confirmed")) {
    return "Seu e-mail ainda não foi confirmado.";
  }

  if (texto.includes("too many requests")) {
    return "Muitas tentativas seguidas. Aguarde um momento e tente novamente.";
  }

  if (texto.includes("network") || texto.includes("fetch")) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

function traduzirBloqueio(valor: string | null): string | null {
  if (valor === "admin_not_allowed") {
    return "Este usuário não tem permissão para acessar o painel administrativo.";
  }

  if (valor === "student_not_approved") {
    return "Seu cadastro ainda não foi aprovado para acessar a área do aluno.";
  }

  return null;
}

function GlowFollowBorderCard({
  children,
  className = "",
  roundedClass = "rounded-[16px]",
  glowSize = 220,
  glowStrength = 1,
}: {
  children: ReactNode;
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
          "--mx": "50%",
          "--my": "50%",
          "--glow-opacity": 0,
        } as CSSProperties
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
  children: ReactNode;
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

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const proximoCaminhoSolicitado = sanitizarProximoCaminho(
    searchParams.get("next"),
  );

  const bloqueioInicial = traduzirBloqueio(searchParams.get("blocked"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(bloqueioInicial);

  async function resolverDestinoAposLogin(userId: string): Promise<string | null> {
    const [{ data: isAdmin }, { data: isApprovedStudent }] = await Promise.all([
      supabase.rpc("is_admin_user", {
        user_id: userId,
      }),
      supabase.rpc("is_approved_student", {
        user_id: userId,
      }),
    ]);

    const usuarioAdmin = isAdmin === true;
    const alunoAprovado = isApprovedStudent === true;

    if (ehCaminhoAdmin(proximoCaminhoSolicitado)) {
      return usuarioAdmin ? proximoCaminhoSolicitado : null;
    }

    if (ehCaminhoAluno(proximoCaminhoSolicitado)) {
      if (alunoAprovado) return proximoCaminhoSolicitado;

      if (usuarioAdmin) return CAMINHO_ADMIN_PADRAO;

      return null;
    }

    if (usuarioAdmin) return CAMINHO_ADMIN_PADRAO;

    if (alunoAprovado) return CAMINHO_ALUNO_PADRAO;

    return null;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const emailNormalizado = email.trim().toLowerCase();

      const { data: loginData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: emailNormalizado,
          password,
        });

      if (signInError) {
        setError(traduzirErroLogin(signInError.message));
        return;
      }

      if (!loginData.user || !loginData.session) {
        setError("Não foi possível iniciar sua sessão. Tente novamente.");
        return;
      }

      const destino = await resolverDestinoAposLogin(loginData.user.id);

      if (!destino) {
        await supabase.auth.signOut();

        if (ehCaminhoAdmin(proximoCaminhoSolicitado)) {
          setError("Este usuário não tem permissão para acessar o painel administrativo.");
        } else if (ehCaminhoAluno(proximoCaminhoSolicitado)) {
          setError("Seu cadastro ainda não foi aprovado para acessar a área do aluno.");
        } else {
          setError("Este usuário ainda não tem permissão ativa para acessar a plataforma.");
        }

        return;
      }

      router.replace(destino);
      router.refresh();
    } catch {
      await supabase.auth.signOut();
      setError("Não foi possível entrar agora. Tente novamente em instantes.");
    } finally {
      setBusy(false);
    }
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

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,560px)_1fr]">
        <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
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
                    Acesso à plataforma
                  </div>

                  <h1 className="mt-5 whitespace-nowrap text-[34px] font-semibold leading-[1] tracking-[-0.04em] text-white sm:text-[40px]">
                    Entrar na plataforma
                  </h1>

                  <p className="mt-4 text-[15px] leading-6 text-white/62">
                    Use seu e-mail e senha para acessar como aluno ou
                    administrador.
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
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        placeholder="Digite seu e-mail"
                        className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-medium text-white/82">
                          Senha
                        </label>

                        <Link
                          href="/recuperar-senha"
                          className="text-sm text-[#DBC094] transition hover:text-white"
                        >
                          Esqueci minha senha
                        </Link>
                      </div>

                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        placeholder="Digite sua senha"
                        className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                      />
                    </div>

                    {error ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[18px] border border-[#DBC094]/18 bg-[#DBC094]/8 px-4 py-3 text-sm text-[#DBC094]"
                      >
                        {error}
                      </motion.div>
                    ) : null}

                    <div className="pt-2">
                      <PremiumPillButton disabled={busy}>
                        {busy ? "Entrando..." : "Acessar plataforma"}
                      </PremiumPillButton>
                    </div>
                  </form>

                  <div className="mt-7 border-t border-white/8 pt-7">
                    <p className="text-[15px] text-white/62">
                      Ainda não tem acesso?{" "}
                      <Link
                        href="/cadastro"
                        className="font-medium text-[#DBC094] transition hover:text-white"
                      >
                        Criar cadastro
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </GlowFollowBorderCard>
          </motion.div>
        </section>

        <section className="relative hidden min-h-screen overflow-hidden lg:block">
          <motion.div
            initial={{ scale: 1.04, opacity: 0.74 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src="/lideres.JPG"
              alt="Universidade de Líderes"
              fill
              priority
              sizes="50vw"
              className="object-cover object-center"
            />
          </motion.div>

          <div className="absolute inset-0 bg-black/38" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.46)_20%,rgba(0,0,0,0.16)_52%,rgba(0,0,0,0.36)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,rgba(219,192,148,0.12),transparent_22%),radial-gradient(circle_at_84%_82%,rgba(219,192,148,0.08),transparent_22%)]" />

          <motion.div
            animate={{
              opacity: [0.16, 0.28, 0.18],
              scale: [1, 1.03, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute right-[9%] top-[9%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(219,192,148,0.12),transparent_62%)] blur-3xl"
          />
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
