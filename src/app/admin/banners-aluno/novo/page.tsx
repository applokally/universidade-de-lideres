"use client";

import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type StudentBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  category: string | null;
  duration: string | null;
  level_name: string | null;
  button_label: string;
  image_url: string | null;
  mobile_image_url: string | null;
  target_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type BannerFormState = {
  title: string;
  subtitle: string;
  badge: string;
  category: string;
  duration: string;
  level_name: string;
  button_label: string;
  target_url: string;
  sort_order: string;
  is_active: boolean;
  image_url: string;
  mobile_image_url: string;
};

const initialFormState: BannerFormState = {
  title: "",
  subtitle: "",
  badge: "",
  category: "",
  duration: "",
  level_name: "",
  button_label: "Assistir agora",
  target_url: "",
  sort_order: "0",
  is_active: true,
  image_url: "",
  mobile_image_url: "",
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function normalizeNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildFilePath(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const cleanExtension = extension.replace(/[^a-z0-9]/g, "") || "webp";

  return `student-banners/${crypto.randomUUID()}.${cleanExtension}`;
}

function getBannerIdFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("id") ?? "";
}

export default function NewStudentBannerPage() {
  const [bannerId, setBannerId] = useState("");
  const [form, setForm] = useState<BannerFormState>(initialFormState);
  const [loadingBanner, setLoadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = useMemo(() => Boolean(bannerId), [bannerId]);

  useEffect(() => {
    const id = getBannerIdFromUrl();
    setBannerId(id);
  }, []);

  useEffect(() => {
    async function loadBanner() {
      if (!bannerId) return;

      setLoadingBanner(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("student_banners")
        .select("*")
        .eq("id", bannerId)
        .maybeSingle();

      if (error) {
        setErrorMessage(`Erro ao carregar banner: ${error.message}`);
        setLoadingBanner(false);
        return;
      }

      if (!data) {
        setErrorMessage("Banner não encontrado.");
        setLoadingBanner(false);
        return;
      }

      const banner = data as StudentBanner;

      setForm({
        title: banner.title ?? "",
        subtitle: banner.subtitle ?? "",
        badge: banner.badge ?? "",
        category: banner.category ?? "",
        duration: banner.duration ?? "",
        level_name: banner.level_name ?? "",
        button_label: banner.button_label ?? "Assistir agora",
        target_url: banner.target_url ?? "",
        sort_order: String(banner.sort_order ?? 0),
        is_active: banner.is_active,
        image_url: banner.image_url ?? "",
        mobile_image_url: banner.mobile_image_url ?? "",
      });

      setLoadingBanner(false);
    }

    loadBanner();
  }, [bannerId]);

  function updateFormField<K extends keyof BannerFormState>(
    field: K,
    value: BannerFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    field: "image_url" | "mobile_image_url"
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");
    setErrorMessage("");

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Envie apenas arquivos de imagem.");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("A imagem deve ter no máximo 8MB.");
      event.target.value = "";
      return;
    }

    if (field === "image_url") {
      setUploadingDesktop(true);
    } else {
      setUploadingMobile(true);
    }

    const filePath = buildFilePath(file);

    const { error } = await supabase.storage
      .from("student-banners")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      setErrorMessage(`Erro ao enviar imagem: ${error.message}`);
      setUploadingDesktop(false);
      setUploadingMobile(false);
      event.target.value = "";
      return;
    }

    const { data } = supabase.storage
      .from("student-banners")
      .getPublicUrl(filePath);

    updateFormField(field, data.publicUrl);

    setUploadingDesktop(false);
    setUploadingMobile(false);
    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!form.title.trim()) {
      setErrorMessage("Informe o título do banner.");
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      subtitle: normalizeNullable(form.subtitle),
      badge: normalizeNullable(form.badge),
      category: normalizeNullable(form.category),
      duration: normalizeNullable(form.duration),
      level_name: normalizeNullable(form.level_name),
      button_label: form.button_label.trim() || "Assistir agora",
      image_url: normalizeNullable(form.image_url),
      mobile_image_url: normalizeNullable(form.mobile_image_url),
      target_url: normalizeNullable(form.target_url),
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active,
    };

    if (isEditing) {
      const { error } = await supabase
        .from("student_banners")
        .update(payload)
        .eq("id", bannerId);

      if (error) {
        setErrorMessage(`Erro ao atualizar banner: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Banner atualizado com sucesso.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("student_banners").insert(payload);

    if (error) {
      setErrorMessage(`Erro ao cadastrar banner: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Banner cadastrado com sucesso.");
    setForm(initialFormState);
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="mb-8">
        <Link
          href="/admin/banners-aluno"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#202431]"
        >
          <ArrowLeft size={18} />
          Voltar para Banner Principal
        </Link>

        <span className="mb-3 inline-flex items-center rounded-full border border-[#DBC094]/35 bg-[#DBC094]/12 px-4 py-2 text-sm font-semibold text-[#8b6b35]">
          Área do aluno
        </span>

        <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-[#202431] sm:text-[42px]">
          {isEditing ? "Editar banner" : "Cadastrar novo banner"}
        </h1>

        <p className="mt-3 max-w-[760px] text-[16px] leading-7 text-[#667085]">
          Preencha as informações do banner principal exibido na home da área do
          aluno.
        </p>
      </div>

      {message ? (
        <div className="mb-5 flex items-center gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={20} />
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-5 rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {loadingBanner ? (
        <div className="flex min-h-[460px] items-center justify-center rounded-[26px] border border-[#e7e9f0] bg-white">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#667085]">
            <Loader2 size={18} className="animate-spin" />
            Carregando banner...
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-[26px] border border-[#e7e9f0] bg-white p-5 shadow-[0_20px_60px_rgba(31,34,48,0.06)] sm:p-6"
        >
          <div className="grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                Título *
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateFormField("title", event.target.value)}
                placeholder="Ex: Liderança Essencial"
                className="h-12 w-full rounded-[14px] border border-[#dfe3ec] bg-white px-4 text-[15px] text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                Subtítulo
              </span>
              <textarea
                value={form.subtitle}
                onChange={(event) =>
                  updateFormField("subtitle", event.target.value)
                }
                placeholder="Descrição curta que aparece no banner"
                rows={4}
                className="w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-4 py-3 text-[15px] leading-6 text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                  Selo
                </span>
                <input
                  type="text"
                  value={form.badge}
                  onChange={(event) =>
                    updateFormField("badge", event.target.value)
                  }
                  placeholder="Novo conteúdo"
                  className="h-12 w-full rounded-[14px] border border-[#dfe3ec] bg-white px-4 text-[15px] text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                  Categoria
                </span>
                <input
                  type="text"
                  value={form.category}
                  onChange={(event) =>
                    updateFormField("category", event.target.value)
                  }
                  placeholder="Trilha"
                  className="h-12 w-full rounded-[14px] border border-[#dfe3ec] bg-white px-4 text-[15px] text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                  Duração
                </span>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(event) =>
                    updateFormField("duration", event.target.value)
                  }
                  placeholder="8 aulas"
                  className="h-12 w-full rounded-[14px] border border-[#dfe3ec] bg-white px-4 text-[15px] text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                  Nível
                </span>
                <input
                  type="text"
                  value={form.level_name}
                  onChange={(event) =>
                    updateFormField("level_name", event.target.value)
                  }
                  placeholder="Executivo"
                  className="h-12 w-full rounded-[14px] border border-[#dfe3ec] bg-white px-4 text-[15px] text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                  Texto do botão
                </span>
                <input
                  type="text"
                  value={form.button_label}
                  onChange={(event) =>
                    updateFormField("button_label", event.target.value)
                  }
                  placeholder="Assistir agora"
                  className="h-12 w-full rounded-[14px] border border-[#dfe3ec] bg-white px-4 text-[15px] text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                  Ordem
                </span>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) =>
                    updateFormField("sort_order", event.target.value)
                  }
                  className="h-12 w-full rounded-[14px] border border-[#dfe3ec] bg-white px-4 text-[15px] text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3b4151]">
                Link de destino
              </span>
              <input
                type="text"
                value={form.target_url}
                onChange={(event) =>
                  updateFormField("target_url", event.target.value)
                }
                placeholder="/aluno/trilhas/lideranca-essencial"
                className="h-12 w-full rounded-[14px] border border-[#dfe3ec] bg-white px-4 text-[15px] text-[#202431] outline-none transition placeholder:text-[#9aa1b2] focus:border-[#DBC094]"
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-2">
              <ImageUploadBox
                title="Imagem desktop"
                description="Recomendado: 1920x820 ou maior."
                value={form.image_url}
                uploading={uploadingDesktop}
                onUpload={(event) => uploadImage(event, "image_url")}
              />

              <ImageUploadBox
                title="Imagem mobile"
                description="Opcional. Recomendado: 900x1200."
                value={form.mobile_image_url}
                uploading={uploadingMobile}
                onUpload={(event) => uploadImage(event, "mobile_image_url")}
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-[16px] border border-[#e4e7ef] bg-[#fafbfe] px-4 py-3">
              <div>
                <span className="block text-sm font-semibold text-[#3b4151]">
                  Banner ativo
                </span>
                <span className="mt-1 block text-xs text-[#8a91a3]">
                  Apenas banners ativos aparecem na área do aluno.
                </span>
              </div>

              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateFormField("is_active", event.target.checked)
                }
                className="h-5 w-5 accent-[#DBC094]"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/banners-aluno"
                className="inline-flex h-[52px] items-center justify-center rounded-[15px] border border-[#e4e7ef] bg-white px-5 text-[15px] font-bold text-[#343a49] transition hover:bg-[#f6f7fb]"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={saving || uploadingDesktop || uploadingMobile}
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[15px] bg-[#DBC094] px-5 text-[15px] font-bold text-black transition hover:bg-[#cfb27a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isEditing ? (
                  <Save size={18} />
                ) : (
                  <Plus size={18} />
                )}
                {isEditing ? "Salvar alterações" : "Cadastrar banner"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function ImageUploadBox({
  title,
  description,
  value,
  uploading,
  onUpload,
}: {
  title: string;
  description: string;
  value: string;
  uploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#d6dbe6] bg-[#fafbfe] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#3b4151]">{title}</p>
          <p className="mt-1 text-xs text-[#8a91a3]">{description}</p>
        </div>

        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[12px] bg-[#202431] px-4 text-sm font-semibold text-white transition hover:bg-black">
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ImagePlus size={16} />
          )}
          Enviar
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </div>

      {value ? (
        <div className="overflow-hidden rounded-[14px] border border-[#e5e7ee] bg-white">
          <img
            src={value}
            alt={title}
            className="h-[190px] w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-[190px] items-center justify-center rounded-[14px] border border-[#e5e7ee] bg-white text-sm font-medium text-[#9aa1b2]">
          Nenhuma imagem enviada
        </div>
      )}
    </div>
  );
}