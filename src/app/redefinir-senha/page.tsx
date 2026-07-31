"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasRecoverySession(Boolean(data.session));
      setChecking(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("A confirmação não confere com a nova senha.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setMessage(
        "Não foi possível redefinir a senha. O link pode ter expirado; solicite um novo.",
      );
      return;
    }

    setDone(true);
    setMessage("Senha redefinida com sucesso. Você já pode entrar.");
    window.setTimeout(() => router.replace("/login"), 1800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
      <section className="w-full max-w-[500px] rounded-[30px] border border-white/10 bg-white/[0.035] p-7 shadow-2xl sm:p-9">
        <Link href="/" className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Universidade de Líderes"
            width={220}
            height={84}
            className="h-auto w-[190px]"
            priority
          />
        </Link>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DBC094]/12 text-[#DBC094]">
          {done ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <LockKeyhole className="h-6 w-6" />
          )}
        </div>
        <h1 className="mt-5 text-[34px] font-semibold tracking-[-0.04em]">
          Criar nova senha
        </h1>

        {checking ? (
          <div className="mt-8 flex items-center gap-3 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-[#DBC094]" />
            Validando seu link seguro...
          </div>
        ) : !hasRecoverySession ? (
          <div className="mt-7">
            <p className="rounded-[16px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Este link é inválido ou expirou. Solicite um novo link de
              recuperação.
            </p>
            <Link
              href="/recuperar-senha"
              className="mt-5 inline-flex rounded-full bg-[#DBC094] px-6 py-3 font-semibold text-black"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-white/75">Nova senha</span>
              <input
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-5 outline-none focus:border-[#DBC094]/60"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-white/75">
                Confirmar nova senha
              </span>
              <input
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-5 outline-none focus:border-[#DBC094]/60"
              />
            </label>

            {message ? (
              <p
                className={`rounded-[16px] border px-4 py-3 text-sm ${
                  done
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    : "border-red-400/20 bg-red-400/10 text-red-100"
                }`}
              >
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving || done}
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#DBC094] font-semibold text-black transition hover:bg-[#ead5b2] disabled:opacity-60"
            >
              {saving ? "Salvando..." : done ? "Senha alterada" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
