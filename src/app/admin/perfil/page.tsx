"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  user_metadata?: Record<string, unknown>;
};

type AdminProfile = {
  id: string;
  role: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AdminProfilePage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(
    null,
  );

  async function loadProfile() {
    setLoading(true);
    setFeedback("");
    setFeedbackType(null);

    try {
      const response = await fetch("/api/admin/profile", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as {
        user?: AdminUser | null;
        profile?: AdminProfile | null;
        message?: string;
      } | null;

      if (!response.ok || !data?.user) {
        setFeedback(
          data?.message || "Não foi possível carregar o perfil do administrador.",
        );
        setFeedbackType("error");
        return;
      }

      const loadedUser = data.user;
      const loadedProfile = data.profile ?? null;

      setUser(loadedUser);
      setProfile(loadedProfile);
      setFullName(
        loadedProfile?.full_name?.trim() ||
          String(loadedUser.user_metadata?.full_name ?? "").trim(),
      );
      setPhone(loadedProfile?.phone ?? "");
      setAvatarPreview(loadedProfile?.avatar_url ?? "");
      setAvatarFile(null);
    } catch {
      setFeedback("Não foi possível carregar o perfil do administrador.");
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setAvatarFile(file);

    if (!file) {
      setAvatarPreview(profile?.avatar_url ?? "");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFeedback("");
    setFeedbackType(null);

    if (!fullName.trim()) {
      setFeedback("Informe o nome do administrador.");
      setFeedbackType("error");
      return;
    }

    if ((newPassword || confirmPassword) && newPassword !== confirmPassword) {
      setFeedback("A confirmação da senha não confere.");
      setFeedbackType("error");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setFeedback("A nova senha deve ter pelo menos 6 caracteres.");
      setFeedbackType("error");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("full_name", fullName.trim());
      formData.append("phone", phone.trim());

      if (newPassword || confirmPassword) {
        formData.append("new_password", newPassword);
        formData.append("confirm_password", confirmPassword);
      }

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        user?: AdminUser | null;
        profile?: AdminProfile | null;
        password_updated?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !data?.profile) {
        setFeedback(
          data?.message || "Não foi possível atualizar o perfil do administrador.",
        );
        setFeedbackType("error");
        return;
      }

      setUser(data.user ?? null);
      setProfile(data.profile);
      setFullName(data.profile.full_name ?? "");
      setPhone(data.profile.phone ?? "");
      setAvatarPreview(data.profile.avatar_url ?? "");
      setAvatarFile(null);
      setNewPassword("");
      setConfirmPassword("");

      window.dispatchEvent(
        new CustomEvent("admin-profile-updated", {
          detail: {
            profile: data.profile,
          },
        }),
      );

      setFeedback(
        data.password_updated
          ? "Perfil e senha atualizados com sucesso."
          : "Perfil atualizado com sucesso.",
      );
      setFeedbackType("success");
    } catch {
      setFeedback("Não foi possível atualizar o perfil do administrador.");
      setFeedbackType("error");
    } finally {
      setSaving(false);
    }
  }

  const displayName =
    fullName.trim() || profile?.full_name?.trim() || "Administrador";

  return (
    <div className="space-y-7">
      <section className="border-b border-[#e5e5e5] pb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
          Conta do administrador
        </p>

        <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
          Meu perfil
        </h1>

        <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
          Gerencie seus dados pessoais, foto de perfil e segurança da conta.
        </p>
      </section>

      {loading ? (
        <section className="flex min-h-[360px] items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="flex items-center gap-3 text-[14px] font-medium text-[#646a78]">
            <Loader2 className="h-5 w-5 animate-spin text-[#b58b4c]" />
            Carregando perfil...
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
            <div className="flex flex-col gap-6 border-b border-[#eceef3] p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
              <div className="flex min-w-0 items-center gap-5">
                <div className="relative shrink-0">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#f4ead9] bg-[#dbc094] text-[24px] font-semibold text-[#2b241a]">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPreview}
                        alt={`Foto de ${displayName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(displayName)
                    )}
                  </div>

                  <label
                    htmlFor="admin-avatar"
                    className="absolute -bottom-1 -right-1 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-[#1f2230] text-white shadow-sm transition hover:bg-[#b58b4c]"
                    title="Alterar foto"
                  >
                    <Camera className="h-4 w-4" />
                  </label>

                  <input
                    id="admin-avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-[24px] font-semibold tracking-[-0.03em] text-[#1f2230]">
                    {displayName}
                  </h2>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#f7f0e2] px-3 py-1.5 text-[13px] font-semibold text-[#8a6836]">
                    <ShieldCheck className="h-4 w-4" />
                    Administrador
                  </div>

                  <p className="mt-3 text-[13px] text-[#747986]">
                    JPG, PNG ou WEBP com até 10MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-8 p-6 lg:grid-cols-2 lg:p-8">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f7f0e2] text-[#9a743b]">
                    <UserRound className="h-5 w-5" />
                  </span>

                  <div>
                    <h3 className="text-[18px] font-semibold text-[#1f2230]">
                      Dados pessoais
                    </h3>
                    <p className="text-[13px] text-[#747986]">
                      Informações exibidas na conta administrativa.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-semibold text-[#464b59]">
                      Nome completo
                    </span>

                    <div className="flex h-12 items-center gap-3 rounded-[12px] border border-[#dfe2e8] bg-white px-4 transition focus-within:border-[#b58b4c]">
                      <UserRound className="h-4 w-4 shrink-0 text-[#8b91a0]" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Nome do administrador"
                        className="h-full w-full bg-transparent text-[14px] text-[#1f2230] outline-none placeholder:text-[#a5a9b4]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[13px] font-semibold text-[#464b59]">
                      Telefone
                    </span>

                    <div className="flex h-12 items-center gap-3 rounded-[12px] border border-[#dfe2e8] bg-white px-4 transition focus-within:border-[#b58b4c]">
                      <Phone className="h-4 w-4 shrink-0 text-[#8b91a0]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Telefone de contato"
                        className="h-full w-full bg-transparent text-[14px] text-[#1f2230] outline-none placeholder:text-[#a5a9b4]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[13px] font-semibold text-[#464b59]">
                      E-mail
                    </span>

                    <div className="flex h-12 items-center gap-3 rounded-[12px] border border-[#e4e6eb] bg-[#f7f8fa] px-4">
                      <Mail className="h-4 w-4 shrink-0 text-[#8b91a0]" />
                      <input
                        type="email"
                        value={user?.email ?? ""}
                        readOnly
                        className="h-full w-full cursor-not-allowed bg-transparent text-[14px] text-[#6d7280] outline-none"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-6 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f7f0e2] text-[#9a743b]">
                    <KeyRound className="h-5 w-5" />
                  </span>

                  <div>
                    <h3 className="text-[18px] font-semibold text-[#1f2230]">
                      Segurança
                    </h3>
                    <p className="text-[13px] text-[#747986]">
                      Deixe os campos vazios para manter a senha atual.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-semibold text-[#464b59]">
                      Nova senha
                    </span>

                    <div className="flex h-12 items-center gap-3 rounded-[12px] border border-[#dfe2e8] bg-white px-4 transition focus-within:border-[#b58b4c]">
                      <KeyRound className="h-4 w-4 shrink-0 text-[#8b91a0]" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Mínimo de 6 caracteres"
                        autoComplete="new-password"
                        className="h-full w-full bg-transparent text-[14px] text-[#1f2230] outline-none placeholder:text-[#a5a9b4]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[13px] font-semibold text-[#464b59]">
                      Confirmar nova senha
                    </span>

                    <div className="flex h-12 items-center gap-3 rounded-[12px] border border-[#dfe2e8] bg-white px-4 transition focus-within:border-[#b58b4c]">
                      <KeyRound className="h-4 w-4 shrink-0 text-[#8b91a0]" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Digite novamente a nova senha"
                        autoComplete="new-password"
                        className="h-full w-full bg-transparent text-[14px] text-[#1f2230] outline-none placeholder:text-[#a5a9b4]"
                      />
                    </div>
                  </label>

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <div className="rounded-[12px] border border-[#eceef3] bg-[#fafafa] p-4">
                      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8b91a0]">
                        <CalendarDays className="h-4 w-4" />
                        Conta criada
                      </div>
                      <p className="mt-2 text-[14px] font-semibold text-[#343844]">
                        {formatDate(user?.created_at)}
                      </p>
                    </div>

                    <div className="rounded-[12px] border border-[#eceef3] bg-[#fafafa] p-4">
                      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8b91a0]">
                        <ShieldCheck className="h-4 w-4" />
                        Acesso
                      </div>
                      <p className="mt-2 text-[14px] font-semibold text-[#343844]">
                        Administrador
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-[#eceef3] bg-[#fafafa] px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
              <div className="min-h-6">
                {feedback ? (
                  <div
                    className={`flex items-center gap-2 text-[13px] font-medium ${
                      feedbackType === "success"
                        ? "text-[#247a4d]"
                        : "text-[#b33b3b]"
                    }`}
                  >
                    {feedbackType === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {feedback}
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#1f2230] px-6 text-[14px] font-semibold text-white transition hover:bg-[#b58b4c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
