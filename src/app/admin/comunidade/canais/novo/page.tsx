"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Save,
  Upload,
  X,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Visibility = "all" | "rank";

type FormState = {
  name: string;
  description: string;
  visibility: Visibility;
  requiredRank: string;
  sortOrder: string;
  isActive: boolean;
  allowMemberPosts: boolean;
};

type CoverState = {
  file: File | null;
  previewUrl: string | null;
};

const COMMUNITY_COVERS_BUCKET = "covers";
const COMMUNITY_COVERS_FOLDER = "community/channels";

const inputClass =
  "h-12 w-full rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]";

const textareaClass =
  "min-h-[130px] w-full resize-y rounded-[10px] border border-[#e5e5e5] bg-white px-4 py-3 text-[14px] leading-6 text-[#141414] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]";

const labelClass = "mb-2 block text-[14px] font-semibold text-[#52525b]";

function gerarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFileExtension(fileName: string) {
  const partes = fileName.split(".");
  return partes.length > 1 ? partes.pop()!.toLowerCase() : "";
}

function buildCoverStoragePath(name: string, file: File) {
  const ext = getFileExtension(file.name) || "bin";
  const safeSlug = gerarSlug(name || "canal");
  const uniqueId = crypto.randomUUID();

  return `${COMMUNITY_COVERS_FOLDER}/${safeSlug}-${uniqueId}.${ext}`;
}

function traduzirErroBanco(message: string) {
  const texto = message.toLowerCase();

  if (texto.includes("row-level security") || texto.includes("permission")) {
    return "Seu usuário não tem permissão para cadastrar canais.";
  }

  if (texto.includes("duplicate key value") || texto.includes("unique")) {
    return "Já existe um canal com este nome.";
  }

  if (texto.includes("violates check constraint")) {
    return "Revise as informações do canal antes de salvar.";
  }

  return "Não foi possível salvar o canal.";
}

function ToggleField({
  label,
  checked,
  onChange,
  enabledText,
  disabledText,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  enabledText: string;
  disabledText: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex h-12 w-full items-center justify-between rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-left text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094]"
    >
      <span>
        <span className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
          {label}
        </span>
        <span className="mt-0.5 block text-[14px] text-[#52525b]">
          {checked ? enabledText : disabledText}
        </span>
      </span>

      <span
        className={`h-5 w-9 rounded-full p-0.5 transition ${
          checked ? "bg-[#DBC094]" : "bg-[#d4d4d8]"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function AdminNovoCanalComunidadePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [cover, setCover] = useState<CoverState>({
    file: null,
    previewUrl: null,
  });

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    visibility: "all",
    requiredRank: "0",
    sortOrder: "0",
    isActive: true,
    allowMemberPosts: true,
  });

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSelecionarCapa(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0] ?? null;

    if (!arquivo) return;

    const tiposPermitidos = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErro("Envie uma imagem em PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (arquivo.size > 8 * 1024 * 1024) {
      setErro("A capa pode ter no máximo 8 MB.");
      event.target.value = "";
      return;
    }

    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    setCover({
      file: arquivo,
      previewUrl: URL.createObjectURL(arquivo),
    });

    setErro(null);
    event.target.value = "";
  }

  function removerCapaSelecionada() {
    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    setCover({
      file: null,
      previewUrl: null,
    });
  }

  function validarFormulario() {
    const name = form.name.trim();
    const slug = gerarSlug(name);
    const requiredRank = Number(form.requiredRank);
    const sortOrder = Number(form.sortOrder);

    if (!name) return "Informe o nome do canal.";
    if (!slug) return "Informe um nome válido para o canal.";

    if (form.visibility === "rank") {
      if (Number.isNaN(requiredRank) || requiredRank < 1) {
        return "Informe o nível mínimo para este canal.";
      }
    }

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      return "Informe uma ordem de exibição válida.";
    }

    return null;
  }

  async function uploadCoverIfNeeded(): Promise<string | null> {
    if (!cover.file) return null;

    const storagePath = buildCoverStoragePath(form.name, cover.file);

    const { error } = await supabase.storage
      .from(COMMUNITY_COVERS_BUCKET)
      .upload(storagePath, cover.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: cover.file.type,
      });

    if (error) throw error;

    return storagePath;
  }

  async function salvarCanal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const erroValidacao = validarFormulario();

    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setSalvando(true);
    setErro(null);

    let uploadedCoverPath: string | null = null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      uploadedCoverPath = await uploadCoverIfNeeded();

      const { error } = await supabase.from("community_channels").insert({
        name: form.name.trim(),
        slug: gerarSlug(form.name),
        description: form.description.trim() || null,
        cover_path: uploadedCoverPath,
        sort_order: Number(form.sortOrder),
        is_active: form.isActive,
        is_locked: !form.allowMemberPosts,
        visibility: form.visibility,
        required_rank:
          form.visibility === "rank" ? Number(form.requiredRank) : 0,
        created_by: user?.id ?? null,
      });

      if (error) throw error;

      if (cover.previewUrl) {
        URL.revokeObjectURL(cover.previewUrl);
      }

      router.push("/admin/comunidade");
      router.refresh();
    } catch (error) {
      if (uploadedCoverPath) {
        await supabase.storage
          .from(COMMUNITY_COVERS_BUCKET)
          .remove([uploadedCoverPath]);
      }

      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar o canal.";

      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-7 text-[#141414]">
      <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Link
            href="/admin/comunidade"
            className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-[#666b76] transition hover:text-[#141414]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para comunidade
          </Link>

          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
            Comunidade
          </p>

          <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
            Novo canal
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
            Crie um espaço de conversa para assinantes acompanharem temas,
            conteúdos e avisos importantes.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/admin/comunidade"
            className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            form="novo-canal-form"
            disabled={salvando}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar canal
          </button>
        </div>
      </section>

      <form
        id="novo-canal-form"
        onSubmit={salvarCanal}
        className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white"
      >
        <div className="border-b border-[#e5e5e5] px-5 py-4">
          <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
            Informações do canal
          </h2>
        </div>

        {erro ? (
          <div className="border-b border-[#e5e5e5] p-5">
            <div className="rounded-[12px] border border-rose-200 bg-rose-50 p-4">
              <h3 className="text-[14px] font-semibold text-rose-700">
                Não foi possível salvar
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-rose-600">
                {erro}
              </p>
            </div>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-5 border-b border-[#ededed] p-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <label className={labelClass}>Nome do canal</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Ex: Liderança e gestão"
              className={inputClass}
            />
          </div>

          <div className="xl:col-span-4">
            <label className={labelClass}>Ordem de exibição</label>
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) => updateField("sortOrder", event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="xl:col-span-12">
            <label className={labelClass}>Descrição</label>
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Explique o objetivo deste canal para os assinantes."
              className={textareaClass}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 border-b border-[#ededed] p-5 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <label className={labelClass}>Capa do canal</label>

            <div className="flex flex-col gap-4 rounded-[12px] border border-[#e5e5e5] bg-white p-4 sm:flex-row sm:items-center">
              <div
                className="flex h-32 w-full items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-[#d8dce5] bg-[#f6f7f9] bg-cover bg-center text-[#8a8f9d] sm:w-52"
                style={
                  cover.previewUrl
                    ? { backgroundImage: `url(${cover.previewUrl})` }
                    : undefined
                }
              >
                {!cover.previewUrl ? <ImageIcon className="h-7 w-7" /> : null}
              </div>

              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#52525b]">
                  Imagem de apresentação
                </p>
                <p className="mt-1 text-[13px] leading-5 text-[#737987]">
                  Use uma imagem horizontal em PNG, JPG ou WEBP.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]">
                    <Upload className="h-4 w-4" />
                    Selecionar capa
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleSelecionarCapa}
                      className="hidden"
                    />
                  </label>

                  {cover.file ? (
                    <button
                      type="button"
                      onClick={removerCapaSelecionada}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-rose-200 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:col-span-7 xl:grid-cols-2">
            <div>
              <label className={labelClass}>Visibilidade</label>
              <select
                value={form.visibility}
                onChange={(event) =>
                  updateField("visibility", event.target.value as Visibility)
                }
                className={inputClass}
              >
                <option value="all">Todos os assinantes</option>
                <option value="rank">Somente a partir de um nível</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Nível mínimo</label>
              <input
                type="number"
                min="0"
                value={form.requiredRank}
                onChange={(event) =>
                  updateField("requiredRank", event.target.value)
                }
                disabled={form.visibility === "all"}
                className={`${inputClass} disabled:bg-[#f5f6fb] disabled:text-[#9aa0ae]`}
              />
            </div>

            <div className="xl:col-span-2">
              <ToggleField
                label="Status"
                checked={form.isActive}
                onChange={() => updateField("isActive", !form.isActive)}
                enabledText="Canal ativo"
                disabledText="Canal inativo"
              />
            </div>

            <div className="xl:col-span-2">
              <ToggleField
                label="Publicações"
                checked={form.allowMemberPosts}
                onChange={() =>
                  updateField("allowMemberPosts", !form.allowMemberPosts)
                }
                enabledText="Assinantes podem publicar"
                disabledText="Somente administração publica"
              />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
