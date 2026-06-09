"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Network,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type StatusTrilha = "draft" | "published" | "archived";
type PreferredCardFormat = "vertical" | "horizontal" | "featured";
type CoverKind = "vertical" | "horizontal" | "featured";

type FormState = {
  title: string;
  shortDescription: string;
  description: string;
  status: StatusTrilha;
  requiredRank: string;
  isFeatured: boolean;
  preferredCardFormat: PreferredCardFormat;
};

type CoverState = {
  file: File | null;
  previewUrl: string | null;
};

type CoversState = Record<CoverKind, CoverState>;

const TRAIL_COVERS_BUCKET = "covers";
const TRAIL_COVERS_FOLDER = "trilhas";

const initialCoverState: CoversState = {
  vertical: {
    file: null,
    previewUrl: null,
  },
  horizontal: {
    file: null,
    previewUrl: null,
  },
  featured: {
    file: null,
    previewUrl: null,
  },
};

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

function traduzirErroBanco(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("duplicate key value") || texto.includes("unique")) {
    return "Já existe uma trilha com este identificador. Altere o nome da trilha e tente novamente.";
  }

  if (texto.includes("row-level security")) {
    return "Seu usuário não tem permissão para cadastrar trilhas.";
  }

  if (texto.includes("auth session missing")) {
    return "Sua sessão não foi encontrada. Entre novamente no painel para continuar.";
  }

  if (texto.includes("bucket")) {
    return "Não foi possível enviar a capa da trilha.";
  }

  return mensagem;
}

function getFileExtension(fileName: string) {
  const partes = fileName.split(".");
  return partes.length > 1 ? partes.pop()!.toLowerCase() : "";
}

function buildCoverStoragePath(slug: string, file: File, kind: CoverKind) {
  const ext = getFileExtension(file.name) || "bin";
  const safeSlug = gerarSlug(slug || "trilha");
  const uniqueId = crypto.randomUUID();

  return `${TRAIL_COVERS_FOLDER}/${safeSlug}-${kind}-${uniqueId}.${ext}`;
}

function formatarTamanho(bytes: number) {
  if (!bytes || bytes <= 0) return "—";

  const unidades = ["B", "KB", "MB", "GB"];
  let valor = bytes;
  let indice = 0;

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }

  return `${valor.toFixed(valor >= 10 || indice === 0 ? 0 : 1)} ${
    unidades[indice]
  }`;
}

function getFormatLabel(format: PreferredCardFormat) {
  if (format === "horizontal") return "Horizontal";
  if (format === "featured") return "Destaque extragrande";
  return "Vertical";
}

function getCoverConfig(kind: CoverKind) {
  if (kind === "horizontal") {
    return {
      label: "Capa horizontal",
      description:
        "Imagem usada em cards horizontais e no hover paisagem do Destaque extragrande.",
      helper: "Recomendado: 1600x900 ou proporção 16:9.",
      previewClass: "h-28 w-44",
    };
  }

  if (kind === "featured") {
    return {
      label: "Capa vertical grande",
      description:
        "Imagem usada no card parado de seções com Destaque extragrande.",
      helper: "Recomendado: 900x1350 ou proporção 2:3.",
      previewClass: "h-36 w-24",
    };
  }

  return {
    label: "Capa vertical",
    description:
      "Imagem usada para cards verticais normais, como Trilhas recomendadas.",
    helper: "Recomendado: 900x1200 ou proporção 3:4.",
    previewClass: "h-36 w-24",
  };
}

function getActiveCoverKinds(format: PreferredCardFormat): CoverKind[] {
  if (format === "featured") return ["featured", "horizontal"];
  if (format === "horizontal") return ["horizontal"];
  return ["vertical"];
}

function cloneInitialCoverState(): CoversState {
  return {
    vertical: {
      file: null,
      previewUrl: null,
    },
    horizontal: {
      file: null,
      previewUrl: null,
    },
    featured: {
      file: null,
      previewUrl: null,
    },
  };
}

export default function NovaTrilhaPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [form, setForm] = useState<FormState>({
    title: "",
    shortDescription: "",
    description: "",
    status: "draft",
    requiredRank: "0",
    isFeatured: false,
    preferredCardFormat: "vertical",
  });

  const [covers, setCovers] = useState<CoversState>(cloneInitialCoverState);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const slugGerado = useMemo(() => gerarSlug(form.title), [form.title]);
  const activeCoverKinds = useMemo(
    () => getActiveCoverKinds(form.preferredCardFormat),
    [form.preferredCardFormat]
  );

  useEffect(() => {
    return () => {
      Object.values(covers).forEach((cover) => {
        if (cover.previewUrl) {
          URL.revokeObjectURL(cover.previewUrl);
        }
      });
    };
  }, [covers]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetCovers() {
    Object.values(covers).forEach((cover) => {
      if (cover.previewUrl) {
        URL.revokeObjectURL(cover.previewUrl);
      }
    });

    setCovers(cloneInitialCoverState());
  }

  function handleChangeFormat(value: PreferredCardFormat) {
    resetCovers();

    setForm((current) => ({
      ...current,
      preferredCardFormat: value,
      isFeatured: value === "featured" ? true : current.isFeatured,
    }));

    setErro(null);
  }

  function handleSelecionarCapa(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: CoverKind
  ) {
    const arquivo = event.target.files?.[0] ?? null;

    if (!arquivo) {
      return;
    }

    const tiposPermitidos = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErro("Envie uma imagem válida em PNG, JPG ou WEBP para a capa.");
      event.target.value = "";
      return;
    }

    setCovers((current) => {
      const currentPreview = current[kind].previewUrl;

      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }

      return {
        ...current,
        [kind]: {
          file: arquivo,
          previewUrl: URL.createObjectURL(arquivo),
        },
      };
    });

    setErro(null);
    event.target.value = "";
  }

  function removerCapaSelecionada(kind: CoverKind) {
    setCovers((current) => {
      const currentPreview = current[kind].previewUrl;

      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }

      return {
        ...current,
        [kind]: {
          file: null,
          previewUrl: null,
        },
      };
    });
  }

  function validarFormulario() {
    if (!form.title.trim()) {
      return "Informe o nome da trilha.";
    }

    if (!slugGerado) {
      return "Informe um nome válido para gerar o identificador da trilha.";
    }

    const rank = Number(form.requiredRank);

    if (Number.isNaN(rank) || rank < 0) {
      return "Informe um rank mínimo válido.";
    }

    return null;
  }

  async function uploadCoverIfNeeded(
    kind: CoverKind
  ): Promise<string | null> {
    const coverFile = covers[kind].file;

    if (!coverFile) {
      return null;
    }

    const storagePath = buildCoverStoragePath(slugGerado, coverFile, kind);

    const { error } = await supabase.storage
      .from(TRAIL_COVERS_BUCKET)
      .upload(storagePath, coverFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: coverFile.type,
      });

    if (error) {
      throw error;
    }

    return storagePath;
  }

  async function removerCapasEnviadas(paths: Array<string | null>) {
    const validPaths = paths.filter(Boolean) as string[];

    if (validPaths.length === 0) return;

    await supabase.storage.from(TRAIL_COVERS_BUCKET).remove(validPaths);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setSalvando(true);
    setErro(null);

    const uploadedPaths: Array<string | null> = [];

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        throw new Error("Auth session missing!");
      }

      const coverVerticalPath =
        form.preferredCardFormat === "vertical"
          ? await uploadCoverIfNeeded("vertical")
          : null;
      uploadedPaths.push(coverVerticalPath);

      const coverHorizontalPath =
        form.preferredCardFormat === "horizontal" ||
        form.preferredCardFormat === "featured"
          ? await uploadCoverIfNeeded("horizontal")
          : null;
      uploadedPaths.push(coverHorizontalPath);

      const coverFeaturedPath =
        form.preferredCardFormat === "featured"
          ? await uploadCoverIfNeeded("featured")
          : null;
      uploadedPaths.push(coverFeaturedPath);

      const fallbackCoverPath =
        coverFeaturedPath ||
        coverVerticalPath ||
        coverHorizontalPath ||
        null;

      const payload = {
        slug: slugGerado,
        title: form.title.trim(),
        description:
          form.description.trim() || form.shortDescription.trim() || null,
        cover_path: fallbackCoverPath,
        cover_vertical_path: coverVerticalPath,
        cover_horizontal_path: coverHorizontalPath,
        cover_featured_path: coverFeaturedPath,
        preferred_card_format: form.preferredCardFormat,
        required_rank: Number(form.requiredRank),
        status: form.status,
        is_featured:
          form.preferredCardFormat === "featured" ? true : form.isFeatured,
      };

      const { error: insertError } = await supabase
        .from("course_categories")
        .insert(payload);

      if (insertError) {
        await removerCapasEnviadas(uploadedPaths);
        throw insertError;
      }

      router.replace("/admin/cursos");
      router.refresh();
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar a trilha.";

      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[#111827]">
      <div className="flex w-full flex-col gap-6">
        <section className="rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-3xl">
                <Link
                  href="/admin/cursos"
                  className="inline-flex max-w-full items-center gap-2 text-sm font-medium text-[#667085] transition hover:text-[#101828]"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">Voltar para trilhas e cursos</span>
                </Link>

                <div className="mt-4">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#EAD7B7] bg-[#FBF6ED] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9B6B22]">
                    <Network className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Cadastro de trilha</span>
                  </div>
                </div>

                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#101828] md:text-4xl">
                  Nova trilha
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#667085] md:text-base">
                  Cadastre uma nova trilha e escolha o modelo de capa. Para
                  Destaque extragrande, envie uma capa vertical grande para o
                  card parado e uma capa horizontal para o hover paisagem.
                </p>
              </div>

              <div className="flex w-full shrink-0 xl:w-auto xl:justify-end">
                <button
                  type="submit"
                  form="form-nova-trilha"
                  disabled={salvando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  {salvando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {salvando ? "Salvando..." : "Salvar trilha"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <form
          id="form-nova-trilha"
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
        >
          <div className="grid grid-cols-1 gap-6 p-6 md:p-8">
            {erro ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                <h2 className="text-sm font-semibold text-rose-700">
                  Não foi possível salvar a trilha
                </h2>
                <p className="mt-2 text-sm leading-6 text-rose-600">{erro}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Nome da trilha
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Digite o nome da trilha"
                  className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Identificador da trilha
                </label>
                <input
                  type="text"
                  value={slugGerado}
                  readOnly
                  className="h-12 w-full rounded-[16px] border border-[#E4E7EC] bg-[#F9FAFB] px-4 text-sm text-[#667085] outline-none"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Resumo curto
                </label>
                <textarea
                  rows={3}
                  value={form.shortDescription}
                  onChange={(e) =>
                    updateField("shortDescription", e.target.value)
                  }
                  placeholder="Escreva um resumo curto da trilha"
                  className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Descrição
                </label>
                <textarea
                  rows={6}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Descreva a trilha"
                  className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Modelo de capa da trilha
                </label>

                <div className="rounded-[20px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                  <p className="mb-4 text-sm leading-6 text-[#667085]">
                    Selecione o modelo visual da trilha. Para Destaque
                    extragrande, serão liberados dois uploads: vertical grande e
                    horizontal.
                  </p>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {(
                      [
                        {
                          value: "vertical",
                          title: "Vertical",
                          description:
                            "Para cards verticais normais, como Trilhas recomendadas.",
                        },
                        {
                          value: "horizontal",
                          title: "Horizontal",
                          description:
                            "Para cards horizontais, como fileiras largas.",
                        },
                        {
                          value: "featured",
                          title: "Destaque extragrande",
                          description:
                            "Card vertical parado e hover paisagem na Home do aluno.",
                        },
                      ] as Array<{
                        value: PreferredCardFormat;
                        title: string;
                        description: string;
                      }>
                    ).map((option) => {
                      const selected =
                        form.preferredCardFormat === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChangeFormat(option.value)}
                          className={[
                            "rounded-[18px] border p-4 text-left transition",
                            selected
                              ? "border-[#D8BC8B] bg-[#FBF6ED] shadow-[0_12px_28px_rgba(216,188,139,0.18)]"
                              : "border-[#E7EAF0] bg-white hover:border-[#D8BC8B]/70",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "mb-3 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black",
                              selected
                                ? "border-[#D8BC8B] bg-[#D8BC8B] text-black"
                                : "border-[#D0D5DD] bg-white text-[#667085]",
                            ].join(" ")}
                          >
                            {selected ? "✓" : ""}
                          </span>

                          <strong className="block text-sm font-semibold text-[#101828]">
                            {option.title}
                          </strong>
                          <span className="mt-1 block text-sm leading-6 text-[#667085]">
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-[16px] border border-[#EAD7B7] bg-[#FBF6ED] p-4">
                    <p className="text-sm font-semibold text-[#7A551C]">
                      Modelo selecionado: {getFormatLabel(form.preferredCardFormat)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#8A6A3F]">
                      {form.preferredCardFormat === "featured"
                        ? "Envie a capa vertical grande para o card parado e a capa horizontal para o hover paisagem."
                        : "O upload abaixo ficará ativo somente para o modelo selecionado."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-12">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {activeCoverKinds.map((kind) => {
                    const coverConfig = getCoverConfig(kind);
                    const cover = covers[kind];

                    return (
                      <div
                        key={kind}
                        className="rounded-[20px] border border-[#E7EAF0] bg-[#FCFCFD] p-4"
                      >
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-[#344054]">
                            {coverConfig.label}
                          </label>
                          <p className="mt-1 text-sm leading-6 text-[#667085]">
                            {coverConfig.description}
                          </p>
                          <p className="mt-1 text-xs font-medium text-[#98A2B3]">
                            {coverConfig.helper}
                          </p>
                        </div>

                        {cover.file ? (
                          <div className="flex flex-col gap-4">
                            <div className="flex min-w-0 gap-4">
                              <div
                                className={[
                                  "flex shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[#E4E7EC] bg-white",
                                  coverConfig.previewClass,
                                ].join(" ")}
                              >
                                {cover.previewUrl ? (
                                  <img
                                    src={cover.previewUrl}
                                    alt={`Prévia ${coverConfig.label}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-[#98A2B3]" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#101828]">
                                  {cover.file.name}
                                </p>
                                <p className="mt-1 text-sm text-[#667085]">
                                  {cover.file.type || "Tipo não identificado"}
                                </p>
                                <p className="mt-1 text-sm text-[#98A2B3]">
                                  {formatarTamanho(cover.file.size)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[#E4E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]">
                                <Upload className="h-4 w-4" />
                                Substituir capa
                                <input
                                  type="file"
                                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                  onChange={(event) =>
                                    handleSelecionarCapa(event, kind)
                                  }
                                  className="hidden"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => removerCapaSelecionada(kind)}
                                className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir capa
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[#101828]">
                                Nenhuma imagem selecionada
                              </p>
                              <p className="mt-1 text-sm leading-6 text-[#667085]">
                                Upload ativo para: {coverConfig.label}.
                              </p>
                            </div>

                            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                              <Upload className="h-4 w-4" />
                              Enviar capa
                              <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                onChange={(event) =>
                                  handleSelecionarCapa(event, kind)
                                }
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="xl:col-span-4">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Rank mínimo exigido
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.requiredRank}
                  onChange={(e) => updateField("requiredRank", e.target.value)}
                  placeholder="0"
                  className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-4">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Status visual
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateField("status", e.target.value as StatusTrilha)
                  }
                  className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="xl:col-span-4">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Exibição
                </label>
                <label className="flex min-h-12 items-start gap-3 rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) =>
                      updateField("isFeatured", e.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-[#D0D5DD] text-[#B07A2A] focus:ring-[#D8BC8B]"
                  />

                  <span className="block">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#101828]">
                      <Sparkles className="h-4 w-4 text-[#B07A2A]" />
                      Marcar como destaque
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#667085]">
                      Este campo ajuda a organizar a prioridade de exibição no
                      sistema.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}