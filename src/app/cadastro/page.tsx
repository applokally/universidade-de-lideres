"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  animate,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

function SuccessModal({
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/82 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[520px]"
          >
            <GlowFollowBorderCard
              roundedClass="rounded-[30px]"
              className="overflow-hidden"
              glowSize={320}
              glowStrength={1.2}
            >
              <div className="relative rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.018)_100%)] p-7 text-center shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-9">
                <div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_top_left,rgba(219,192,148,0.08),transparent_26%)]" />

                <div className="relative z-10">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#DBC094]/25 bg-[#DBC094]/10 text-2xl text-[#DBC094]">
                    ✓
                  </div>

                  <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-white sm:text-[32px]">
                    Cadastro enviado
                  </h2>

                  <p className="mx-auto mt-4 max-w-[360px] text-[15px] leading-7 text-white/66 sm:text-[16px]">
                    Parabéns, os seus dados foram enviados com sucesso, em breve
                    será aprovado!
                  </p>

                  <div className="mt-7">
                    <GlowFollowBorderCard
                      roundedClass="rounded-full"
                      className="inline-block"
                      glowSize={190}
                      glowStrength={1.18}
                    >
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-[#DBC094]/16 bg-[#DBC094]/10 px-6 py-3 text-[15px] font-medium text-[#DBC094] transition hover:bg-[#DBC094]/14 hover:text-[#f1dbb7]"
                      >
                        Fechar
                      </button>
                    </GlowFollowBorderCard>
                  </div>
                </div>
              </div>
            </GlowFollowBorderCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  mmnLogin: string;
  leaderName: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  mmnLogin: "",
  leaderName: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSuccessClose() {
    setSuccessOpen(false);
    router.push("/login");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const fullAddress = [
      form.street.trim(),
      form.number.trim(),
      form.neighborhood.trim(),
      form.city.trim(),
      form.state.trim(),
      form.zipCode.trim(),
    ]
      .filter(Boolean)
      .join(", ");

    const payload = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      requested_password: form.password,
      mmn_login: form.mmnLogin.trim(),
      leader_name: form.leaderName.trim(),
      street: form.street.trim(),
      number: form.number.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip_code: form.zipCode.trim(),
      full_address: fullAddress,
      status: "pending",
    };

    const { error: signUpError } = await supabase.auth.signUp({
      email: payload.email,
      password: form.password,
      options: {
        data: {
          full_name: payload.full_name,
          first_name: payload.first_name,
          last_name: payload.last_name,
          phone: payload.phone,
          role: "member",
        },
      },
    });

    if (signUpError) {
      console.error("Supabase auth signUp error:", {
        message: signUpError.message,
        status: signUpError.status,
        name: signUpError.name,
      });

      setBusy(false);

      const message = signUpError.message.toLowerCase();

      if (message.includes("already") || message.includes("registered")) {
        setError(
          "Este e-mail já possui login cadastrado. Acesse a tela de login ou aguarde a aprovação do seu cadastro."
        );
        return;
      }

      setError(signUpError.message || "Não foi possível criar o login do aluno.");
      return;
    }

    const { error: insertError } = await supabase
      .from("student_registration_requests")
      .insert(payload);

    await supabase.auth.signOut();

    setBusy(false);

    if (insertError) {
      console.error("Supabase insert error:", {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });

      if (insertError.code === "23505") {
        setError(
          "Seu login foi criado e já existe uma solicitação pendente com este e-mail e login MMN. Aguarde a aprovação."
        );
        return;
      }

      setError(insertError.message || "O login foi criado, mas não foi possível enviar a solicitação de aprovação.");
      return;
    }

    setForm(initialFormState);
    setSuccessOpen(true);
  }

  return (
    <>
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
            className="w-full max-w-[760px]"
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
              glowSize={320}
              glowStrength={1.12}
            >
              <div className="relative rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.016)_100%)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
                <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(219,192,148,0.07),transparent_26%)]" />
                <div className="absolute inset-0 rounded-[32px] bg-[linear-gradient(90deg,rgba(219,192,148,0.03)_0%,transparent_24%,transparent_76%,rgba(219,192,148,0.018)_100%)]" />

                <div className="relative z-10">
                  <div className="inline-flex rounded-full border border-[#DBC094]/22 bg-[#DBC094]/8 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#DBC094]">
                    Área do aluno
                  </div>

                  <h1 className="mt-5 text-[32px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-[40px]">
                    Criar Cadastro
                  </h1>

                  <p className="mt-4 max-w-[640px] text-[15px] leading-7 text-white/62 sm:text-[16px]">
                    Crie o seu cadastro para ter acesso à Universidade de Líderes,
                    preencha os mesmos dados e informações cadastrados na empresa
                    de produtos da nossa parceria, após enviar as suas
                    informações, iremos aprovar o seu cadastro.
                  </p>

                  <form onSubmit={onSubmit} className="mt-8 space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/82">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={(e) => updateField("firstName", e.target.value)}
                          required
                          placeholder="Digite seu nome"
                          className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/82">
                          Sobrenome
                        </label>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={(e) => updateField("lastName", e.target.value)}
                          required
                          placeholder="Digite seu sobrenome"
                          className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/82">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => updateField("phone", e.target.value)}
                          required
                          placeholder="Digite seu telefone"
                          className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/82">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          autoComplete="email"
                          required
                          placeholder="Digite seu e-mail"
                          className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/82">
                          Senha
                        </label>
                        <input
                          type="password"
                          value={form.password}
                          onChange={(e) => updateField("password", e.target.value)}
                          autoComplete="new-password"
                          required
                          minLength={6}
                          placeholder="Crie sua senha"
                          className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/82">
                          Login MMN
                        </label>
                        <input
                          type="text"
                          value={form.mmnLogin}
                          onChange={(e) => updateField("mmnLogin", e.target.value)}
                          required
                          placeholder="Digite seu login MMN"
                          className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/82">
                        Nome do seu líder
                      </label>
                      <input
                        type="text"
                        value={form.leaderName}
                        onChange={(e) => updateField("leaderName", e.target.value)}
                        required
                        placeholder="Digite o nome do seu líder"
                        className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                      />
                    </div>

                    <div className="border-t border-white/8 pt-5">
                      <div className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-[#DBC094]">
                        Endereço completo
                      </div>

                      <div className="grid gap-5 md:grid-cols-[1.5fr_0.5fr]">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-white/82">
                            Logradouro
                          </label>
                          <input
                            type="text"
                            value={form.street}
                            onChange={(e) => updateField("street", e.target.value)}
                            required
                            placeholder="Digite o logradouro"
                            className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-white/82">
                            Número
                          </label>
                          <input
                            type="text"
                            value={form.number}
                            onChange={(e) => updateField("number", e.target.value)}
                            required
                            placeholder="Nº"
                            className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-white/82">
                            Bairro
                          </label>
                          <input
                            type="text"
                            value={form.neighborhood}
                            onChange={(e) =>
                              updateField("neighborhood", e.target.value)
                            }
                            required
                            placeholder="Digite seu bairro"
                            className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-white/82">
                            Cidade
                          </label>
                          <input
                            type="text"
                            value={form.city}
                            onChange={(e) => updateField("city", e.target.value)}
                            required
                            placeholder="Digite sua cidade"
                            className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-white/82">
                            Estado
                          </label>
                          <input
                            type="text"
                            value={form.state}
                            onChange={(e) => updateField("state", e.target.value)}
                            required
                            placeholder="UF"
                            className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white uppercase outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-white/82">
                            CEP
                          </label>
                          <input
                            type="text"
                            value={form.zipCode}
                            onChange={(e) => updateField("zipCode", e.target.value)}
                            required
                            placeholder="Digite o CEP"
                            className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-5 text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/45 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(219,192,148,0.08)]"
                          />
                        </div>
                      </div>
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

                    <div className="pt-2">
                      <PremiumPillButton disabled={busy}>
                        {busy ? "Enviando cadastro..." : "Cadastrar"}
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
                        href="/recuperar-senha"
                        className="font-medium text-[#DBC094] transition hover:text-white"
                      >
                        Esqueci minha senha
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </GlowFollowBorderCard>
          </motion.div>
        </section>
      </main>

      <SuccessModal isOpen={successOpen} onClose={handleSuccessClose} />
    </>
  );
}