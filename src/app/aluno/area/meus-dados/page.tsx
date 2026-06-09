"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { StudentAreaShell } from "../../_components/StudentAreaShell";

type StudentUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  user_metadata?: Record<string, unknown>;
};

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";

  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Não informado";
  }
}

function getStudentName(user: StudentUser | null, profile: ProfileRow | null) {
  return (
    profile?.full_name?.trim() ||
    String(user?.user_metadata?.full_name ?? "").trim() ||
    user?.email ||
    "Aluno"
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "A";

  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function StudentDataPage() {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [accessLevelLabel, setAccessLevelLabel] = useState("Executivo");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function loadStudentData() {
    setLoading(true);
    setFeedback("");

    const response = await fetch("/api/student/profile", {
      method: "GET",
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as {
      user?: StudentUser | null;
      profile?: ProfileRow | null;
      access_level?: string | null;
      access_level_label?: string | null;
      error?: string;
    } | null;

    const loadedUser = data?.user ?? null;
    const loadedProfile = data?.profile ?? null;

    setUser(loadedUser);
    setProfile(loadedProfile);
    setAccessLevelLabel(data?.access_level_label || "Executivo");
    setFullName(
      loadedProfile?.full_name?.trim() ||
        String(loadedUser?.user_metadata?.full_name ?? "").trim() ||
        "",
    );
    setPhone(loadedProfile?.phone ?? "");
    setAvatarPreview(loadedProfile?.avatar_url ?? "");
    setAvatarFile(null);
    setNewPassword("");
    setConfirmPassword("");

    if (!loadedUser?.id) {
      setFeedback("Não foi possível identificar sua sessão de aluno.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStudentData();
  }, []);

  const studentName = useMemo(() => getStudentName(user, profile), [user, profile]);
  const email = user?.email ?? "Não informado";
  const createdAt = formatDate(user?.created_at);

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

    setSaving(true);
    setFeedback("");

    if ((newPassword || confirmPassword) && newPassword !== confirmPassword) {
      setSaving(false);
      setFeedback("A confirmação da senha não confere.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setSaving(false);
      setFeedback("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("phone", phone);

    if (newPassword || confirmPassword) {
      formData.append("new_password", newPassword);
      formData.append("confirm_password", confirmPassword);
    }

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    const response = await fetch("/api/student/profile", {
      method: "PATCH",
      body: formData,
    });

    const data = (await response.json().catch(() => null)) as {
      user?: StudentUser | null;
      profile?: ProfileRow | null;
      access_level?: string | null;
      access_level_label?: string | null;
      password_updated?: boolean;
      error?: string;
      message?: string;
    } | null;

    setSaving(false);

    if (!response.ok || data?.error) {
      setFeedback(data?.message || "Não foi possível atualizar seus dados.");
      return;
    }

    const updatedProfile = data?.profile ?? null;

    setUser(data?.user ?? null);
    setProfile(updatedProfile);
    setAccessLevelLabel(data?.access_level_label || "Executivo");
    setAvatarPreview(updatedProfile?.avatar_url ?? "");
    setAvatarFile(null);
    setNewPassword("");
    setConfirmPassword("");

    window.dispatchEvent(
      new CustomEvent("student-profile-updated", {
        detail: {
          profile: updatedProfile,
        },
      }),
    );

    setFeedback(
      data?.password_updated
        ? "Dados atualizados e senha alterada com sucesso."
        : "Dados atualizados com sucesso.",
    );
  }

  return (
    <StudentAreaShell
      eyebrow="Status"
      title="Conta ativa"
      description="Mantenha seus dados atualizados. O e-mail e o tipo de acesso são informações de autenticação e não podem ser alterados nesta tela."
    >
      {loading ? (
        <section className="flex min-h-[360px] items-center justify-center rounded-[26px] border border-white/10 bg-[#101116]">
          <div className="flex items-center gap-3 text-[14px] font-bold text-white/62">
            <Loader2 className="h-5 w-5 animate-spin text-[#DBC094]" />
            Carregando seus dados...
          </div>
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
        >
          <section className="rounded-[26px] border border-white/10 bg-[#101116] px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#DBC094] text-[24px] font-black text-black">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={studentName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(studentName)
                  )}
                </div>

                <label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white text-black shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition hover:bg-[#DBC094]">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                  Perfil do aluno
                </p>

                <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.045em] text-white sm:text-[34px]">
                  {studentName}
                </h2>

                <p className="mt-2 text-[14px] leading-6 text-white/50">
                  Atualize seus dados principais, foto de perfil e senha de acesso.
                </p>
              </div>
            </div>

            <div className="mt-7 border-t border-white/10">
              <div className="grid gap-0">
                <div className="grid gap-3 border-b border-white/10 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                  <div className="flex items-center gap-2 text-[13px] font-black text-white/52">
                    <UserRound className="h-4 w-4 text-[#DBC094]" />
                    Nome completo
                  </div>

                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Informe seu nome completo"
                    className="h-11 rounded-[13px] border border-white/10 bg-black/22 px-4 text-[14px] font-bold text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/60"
                  />
                </div>

                <div className="grid gap-3 border-b border-white/10 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                  <div className="flex items-center gap-2 text-[13px] font-black text-white/52">
                    <Mail className="h-4 w-4 text-[#DBC094]" />
                    E-mail
                  </div>

                  <input
                    value={email}
                    disabled
                    className="h-11 cursor-not-allowed rounded-[13px] border border-white/10 bg-white/[0.035] px-4 text-[14px] font-bold text-white/50 outline-none"
                  />
                </div>

                <div className="grid gap-3 border-b border-white/10 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                  <div className="flex items-center gap-2 text-[13px] font-black text-white/52">
                    <Phone className="h-4 w-4 text-[#DBC094]" />
                    Telefone
                  </div>

                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Informe seu telefone"
                    className="h-11 rounded-[13px] border border-white/10 bg-black/22 px-4 text-[14px] font-bold text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/60"
                  />
                </div>

                <div className="grid gap-3 border-b border-white/10 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                  <div className="flex items-center gap-2 text-[13px] font-black text-white/52">
                    <ShieldCheck className="h-4 w-4 text-[#DBC094]" />
                    Tipo de acesso
                  </div>

                  <input
                    value={accessLevelLabel}
                    disabled
                    className="h-11 cursor-not-allowed rounded-[13px] border border-white/10 bg-white/[0.035] px-4 text-[14px] font-bold text-[#DBC094] outline-none"
                  />
                </div>

                <div className="grid gap-3 border-b border-white/10 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
                  <div className="flex items-center gap-2 pt-2 text-[13px] font-black text-white/52">
                    <KeyRound className="h-4 w-4 text-[#DBC094]" />
                    Alterar senha
                  </div>

                  <div className="grid gap-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Nova senha"
                      autoComplete="new-password"
                      className="h-11 rounded-[13px] border border-white/10 bg-black/22 px-4 text-[14px] font-bold text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/60"
                    />

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirmar nova senha"
                      autoComplete="new-password"
                      className="h-11 rounded-[13px] border border-white/10 bg-black/22 px-4 text-[14px] font-bold text-white outline-none transition placeholder:text-white/28 focus:border-[#DBC094]/60"
                    />

                    <p className="text-[12px] leading-5 text-white/36">
                      Preencha estes campos somente se quiser alterar sua senha.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                  <div className="flex items-center gap-2 text-[13px] font-black text-white/52">
                    <CalendarDays className="h-4 w-4 text-[#DBC094]" />
                    Cadastro
                  </div>

                  <input
                    value={createdAt}
                    disabled
                    className="h-11 cursor-not-allowed rounded-[13px] border border-white/10 bg-white/[0.035] px-4 text-[14px] font-bold text-white/50 outline-none"
                  />
                </div>
              </div>
            </div>

            {feedback ? (
              <p className="mt-5 rounded-[16px] border border-[#DBC094]/20 bg-[#DBC094]/10 px-4 py-3 text-[13px] font-bold text-[#DBC094]">
                {feedback}
              </p>
            ) : null}
          </section>

          <aside className="rounded-[26px] border border-white/10 bg-[#101116] px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DBC094] text-black">
                <BadgeCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DBC094]">
                  Edição do perfil
                </p>

                <h2 className="text-[21px] font-black tracking-[-0.04em] text-white">
                  Salvar alterações
                </h2>
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-6 text-white/48">
              Após alterar nome, telefone, foto ou senha, clique no botão abaixo para gravar suas informações.
            </p>

            <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-4 text-[13px]">
                <span className="text-white/48">Sessão</span>
                <span className="font-black text-[#DBC094]">
                  {user?.id ? "ativa" : "não identificada"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-[13px]">
                <span className="text-white/48">Perfil</span>
                <span className="font-black text-white">
                  {profile ? "encontrado" : "novo perfil"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-[13px]">
                <span className="text-white/48">Acesso</span>
                <span className="font-black text-[#DBC094]">
                  {accessLevelLabel}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !user?.id}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[13px] font-black text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </aside>
        </form>
      )}
    </StudentAreaShell>
  );
}
