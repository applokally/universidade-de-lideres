"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
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
      eyebrow="Perfil"
      title="Meus Dados"
      description="Mantenha seus dados atualizados e gerencie sua conta."
    >
      {loading ? (
        <section className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/5 bg-[#0a0b10]">
          <div className="flex items-center gap-3 text-sm font-medium text-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-[#DBC094]" />
            Carregando seus dados...
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/5 bg-[#0a0b10] p-6 sm:p-8">
          
          {/* --- CABEÇALHO DO PERFIL --- */}
          <div className="flex flex-col gap-6 border-b border-white/5 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              
              <div className="relative">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/5 border border-white/10 text-2xl font-semibold text-[#DBC094]">
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

                <label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#0a0b10] text-white shadow-lg transition-all hover:scale-105 hover:bg-[#DBC094] hover:text-black">
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
                <h2 className="truncate text-2xl font-semibold leading-tight tracking-tight text-white">
                  {studentName}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Edite seus dados principais e senha de acesso.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !user?.id}
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#DBC094] px-6 text-sm font-semibold text-black transition-all hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>

          {/* --- CORPO DO FORMULÁRIO --- */}
          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            
            <section className="space-y-6">
              
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-white/60 sm:w-48 shrink-0">
                  <UserRound className="h-4 w-4 text-[#DBC094]" />
                  Nome completo
                </label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Informe seu nome completo"
                  className="h-11 w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/30 focus:border-[#DBC094] focus:bg-white/10 focus:ring-1 focus:ring-[#DBC094]"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-white/60 sm:w-48 shrink-0">
                  <Mail className="h-4 w-4 text-[#DBC094]" />
                  E-mail
                </label>
                <input
                  value={email}
                  disabled
                  className="h-11 w-full flex-1 cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.02] px-4 text-sm font-medium text-white/40 outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-white/60 sm:w-48 shrink-0">
                  <Phone className="h-4 w-4 text-[#DBC094]" />
                  Telefone
                </label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Informe seu telefone"
                  className="h-11 w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/30 focus:border-[#DBC094] focus:bg-white/10 focus:ring-1 focus:ring-[#DBC094]"
                />
              </div>

              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-start sm:gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-white/60 sm:mt-3 sm:w-48 shrink-0">
                  <KeyRound className="h-4 w-4 text-[#DBC094]" />
                  Segurança
                </label>
                <div className="flex-1 space-y-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Nova senha"
                    autoComplete="new-password"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/30 focus:border-[#DBC094] focus:bg-white/10 focus:ring-1 focus:ring-[#DBC094]"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirmar nova senha"
                    autoComplete="new-password"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/30 focus:border-[#DBC094] focus:bg-white/10 focus:ring-1 focus:ring-[#DBC094]"
                  />
                  <p className="text-xs text-white/40">
                    Preencha estes campos somente se desejar alterar a sua senha atual.
                  </p>
                </div>
              </div>

              {feedback && (
                <div className="mt-6 rounded-xl border border-[#DBC094]/20 bg-[#DBC094]/10 p-4">
                  <p className="text-sm font-medium text-[#DBC094]">
                    {feedback}
                  </p>
                </div>
              )}
            </section>

            {/* --- SIDEBAR DE INFORMAÇÕES --- */}
            <aside className="h-fit rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
                Detalhes da Conta
              </p>

              <div className="mt-5 space-y-5 text-sm">
                <div>
                  <div className="flex items-center gap-2 text-white/50">
                    <ShieldCheck className="h-4 w-4 text-[#DBC094]" />
                    Tipo de acesso
                  </div>
                  <p className="mt-1.5 font-semibold text-white">
                    {accessLevelLabel}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-white/50">
                    <CalendarDays className="h-4 w-4 text-[#DBC094]" />
                    Membro desde
                  </div>
                  <p className="mt-1.5 font-medium text-white">
                    {createdAt}
                  </p>
                </div>
              </div>
            </aside>

          </div>
        </form>
      )}
    </StudentAreaShell>
  );
}