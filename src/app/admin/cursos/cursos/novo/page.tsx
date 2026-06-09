"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Network,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type StatusCurso = "draft" | "published" | "archived";
type PreferredCardFormat = "vertical" | "horizontal" | "featured";

type FormState = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  status: StatusCurso;
  requiredRank: string;
  isFeatured: boolean;
  trilhaId: string;
  preferredCardFormat: PreferredCardFormat;
};

type CoverState = {
  file: File | null;
  previewUrl: string | null;
};

type TrilhaOption = {
  id: string;
  title: string;
  slug: string;
};

const COURSE_COVERS_BUCKET = "covers";
const COURSE_COVERS_FOLDER = "courses";

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
    return "Já existe um curso com este identificador. Altere o slug e tente novamente.";
  }

  if (texto.includes("row-level security")) {
    return "Seu usuário não tem permissão para cadastrar cursos.";
  }

  if (texto.includes("violates foreign key constraint")) {
    return "Não foi possível vincular o curso à trilha selecionada.";
  }

  if (texto.includes("auth session missing")) {
    return "Sua sessão não foi encontrada. Entre novamente no painel para continuar.";
  }

  if (texto.includes("bucket")) {
    return "Não foi possível enviar a capa do curso.";
  }

  return mensagem;
}

function getFileExtension(fileName: string) {
  const partes = fileName.split(".");
  return partes.length > 1 ? partes.pop()!.toLowerCase() : "";
}

function buildCoverStoragePath(
  slug: string,
  file: File,
  format: PreferredCardFormat
) {
  const ext = getFileExtension(file.name) || "bin";
  const safeSlug = gerarSlug(slug || "curso");
  const uniqueId = crypto.randomUUID();

  return `${COURSE_COVERS_FOLDER}/${safeSlug}-${format}-${uniqueId}.${ext}`;
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

function getFormatConfig(format: PreferredCardFormat) {
  if (format === "horizontal") {
    return {
      label: "Capa horizontal",
      description:
        "Use este formato para cards horizontais, como fileiras largas ou conteúdos em formato paisagem.",
      helper: "Recomendado: 1600x900 ou proporção 16:9.",
      previewClass: "h-28 w-44",
    };
  }

  if (format === "featured") {
    return {
      label: "Capa vertical grande",
      description:
        "Use este formato apenas para cursos que entrarão em seções de Destaque extragrande.",
      helper: "Recomendado: 900x1350 ou proporção 2:3.",
      previewClass: "h-36 w-24",
    };
  }

  return {
    label: "Capa vertical",
    description:
      "Use este formato para cards verticais normais, como Trilhas recomendadas.",
    helper: "Recomendado: 900x1200 ou proporção 3:4.",
    previewClass: "h-36 w-24",
  };
}

export default function NovoCursoPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [form, setForm] = useState<FormState>({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    status: "draft",
    requiredRank: "0",
    isFeatured: false,
    trilhaId: "",
    preferredCardFormat: "vertical",
  });

  const [cover, setCover] = useState<CoverState>({
    file: null,
    previewUrl: null,
  });

  const [touchedSlug, setTouchedSlug] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregandoTrilhas, setCarregandoTrilhas] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [trilhas, setTrilhas] = useState<TrilhaOption[]>([]);

  const slugSugerido = useMemo(() => gerarSlug(form.title), [form.title]);
  const formatConfig = getFormatConfig(form.preferredCardFormat);

  useEffect(() => {
    return () => {
      if (cover.previewUrl) {
        URL.revokeObjectURL(cover.previewUrl);
      }
    };
  }, [cover.previewUrl]);

  useEffect(() => {
    async function carregarTrilhas() {
      setCarregandoTrilhas(true);
      setErro(null);

      try {
        const { data, error } = await supabase
          .from("course_categories")
          .select("id, title, slug")
          .order("title", { ascending: true });

        if (error) {
          throw error;
        }

        setTrilhas((data as TrilhaOption[]) || []);
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? traduzirErroBanco(error.message)
            : "Não foi possível carregar as trilhas.";

        setErro(mensagem);
        setTrilhas([]);
      } finally {
        setCarregandoTrilhas(false);
      }
    }

    void carregarTrilhas();
  }, [supabase]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleChangeFormat(value: PreferredCardFormat) {
    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    setCover({
      file: null,
      previewUrl: null,
    });

    setForm((current) => ({
      ...current,
      preferredCardFormat: value,
    }));

    setErro(null);
  }

  function handleSelecionarCapa(event: React.ChangeEvent<HTMLInputElement>) {
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

    if (cover.previewUrl) {
      URL.revokeObjectURL(cover.previewUrl);
    }

    const preview = URL.createObjectURL(arquivo);

    setCover({
      file: arquivo,
      previewUrl: preview,
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
    if (!form.title.trim()) {
      return "Informe o nome do curso.";
    }

    const slugFinal = (touchedSlug ? form.slug : slugSugerido).trim();

    if (!slugFinal) {
      return "Informe um identificador válido para o curso.";
    }

    const rank = Number(form.requiredRank);

    if (Number.isNaN(rank) || rank < 0) {
      return "Informe um rank mínimo válido.";
    }

    return null;
  }

  async function uploadCoverIfNeeded(slug: string): Promise<string | null> {
    if (!cover.file) {
      return null;
    }

    const storagePath = buildCoverStoragePath(
      slug,
      cover.file,
      form.preferredCardFormat
    );

    const { error } = await supabase.storage
      .from(COURSE_COVERS_BUCKET)
      .upload(storagePath, cover.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: cover.file.type,
      });

    if (error) {
      throw error;
    }

    return storagePath;
  }

  async function removerCursoSeNecessario(courseId: string) {
    await supabase.from("courses").delete().eq("id", courseId);
  }

  async function removerCapaEnviada(path: string | null) {
    if (!path) return;

    await supabase.storage.from(COURSE_COVERS_BUCKET).remove([path]);
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

    let uploadedCoverPath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("Auth session missing!");
      }

      const slugFinal = (touchedSlug ? form.slug : slugSugerido).trim();
      const statusFinal = form.status;
      const agoraIso = new Date().toISOString();

      uploadedCoverPath = await uploadCoverIfNeeded(slugFinal);

      const payload = {
        slug: slugFinal,
        title: form.title.trim(),
        short_description: form.shortDescription.trim() || null,
        description: form.description.trim() || null,
        cover_path: uploadedCoverPath,
        cover_vertical_path:
          form.preferredCardFormat === "vertical" ? uploadedCoverPath : null,
        cover_horizontal_path:
          form.preferredCardFormat === "horizontal" ? uploadedCoverPath : null,
        cover_featured_path:
          form.preferredCardFormat === "featured" ? uploadedCoverPath : null,
        preferred_card_format: form.preferredCardFormat,
        status: statusFinal,
        required_rank: Number(form.requiredRank),
        is_featured: form.isFeatured,
        published_at: statusFinal === "published" ? agoraIso : null,
        created_by: user.id,
      };

      const { data, error: insertError } = await supabase
        .from("courses")
        .insert(payload)
        .select("id")
        .single();

      if (insertError || !data?.id) {
        await removerCapaEnviada(uploadedCoverPath);
        throw insertError || new Error("Não foi possível criar o curso.");
      }

      if (form.trilhaId) {
        const { error: mapError } = await supabase
          .from("course_category_map")
          .insert({
            course_id: data.id,
            category_id: form.trilhaId,
          });

        if (mapError) {
          await removerCapaEnviada(uploadedCoverPath);
          await removerCursoSeNecessario(data.id);
          throw mapError;
        }
      }

      router.push(`/admin/cursos/${data.id}`);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? traduzirErroBanco(error.message)
          : "Não foi possível salvar o curso.";

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
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#D9E6F5] bg-[#EEF5FB] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#476A8E]">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Cadastro de curso</span>
                  </div>
                </div>

                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#101828] md:text-4xl">
                  Novo curso
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#667085] md:text-base">
                  Cadastre um novo curso e escolha apenas um modelo de capa.
                  O formato selecionado define como o curso será exibido nos
                  cards da Home do aluno.
                </p>
              </div>

              <div className="flex w-full shrink-0 xl:w-auto xl:justify-end">
                <button
                  type="submit"
                  form="form-novo-curso"
                  disabled={salvando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#EAD7B7] bg-[#D8BC8B] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  {salvando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {salvando ? "Salvando..." : "Salvar curso"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <form
          id="form-novo-curso"
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-[#E7EAF0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
        >
          <div className="grid grid-cols-1 gap-6 p-6 md:p-8">
            {erro ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                <h2 className="text-sm font-semibold text-rose-700">
                  Não foi possível salvar o curso
                </h2>
                <p className="mt-2 text-sm leading-6 text-rose-600">{erro}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Nome do curso
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateField("title", value);

                    if (!touchedSlug) {
                      updateField("slug", gerarSlug(value));
                    }
                  }}
                  placeholder="Digite o nome do curso"
                  className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Identificador do curso
                </label>
                <input
                  type="text"
                  value={touchedSlug ? form.slug : slugSugerido}
                  onChange={(e) => {
                    setTouchedSlug(true);
                    updateField("slug", gerarSlug(e.target.value));
                  }}
                  placeholder="exemplo-de-curso"
                  className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Trilha
                </label>

                <div className="rounded-[18px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#101828]">
                        <Network className="h-4 w-4 text-[#B07A2A]" />
                        Vincular a uma trilha
                      </div>

                      <select
                        value={form.trilhaId}
                        onChange={(e) =>
                          updateField("trilhaId", e.target.value)
                        }
                        disabled={carregandoTrilhas}
                        className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-white px-4 text-sm text-[#101828] outline-none transition focus:border-[#D8BC8B] focus:bg-white disabled:cursor-not-allowed disabled:bg-[#F2F4F7]"
                      >
                        <option value="">
                          {carregandoTrilhas
                            ? "Carregando trilhas..."
                            : "Sem trilha"}
                        </option>

                        {trilhas.map((trilha) => (
                          <option key={trilha.id} value={trilha.id}>
                            {trilha.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Link
                      href="/admin/cursos/trilhas/nova"
                      className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[#E4E7EC] bg-white px-4 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
                    >
                      <Sparkles className="h-4 w-4" />
                      Nova trilha
                    </Link>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#667085]">
                    Você pode cadastrar o curso sem trilha ou já vinculá-lo a
                    uma trilha existente.
                  </p>
                </div>
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Modelo de capa do curso
                </label>

                <div className="rounded-[20px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                  <p className="mb-4 text-sm leading-6 text-[#667085]">
                    Selecione apenas um modelo de capa. Ao trocar o modelo, a
                    imagem selecionada anteriormente será removida para evitar
                    uso de múltiplas capas no mesmo cadastro.
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
                          title: "Vertical grande",
                          description:
                            "Somente para seções de Destaque extragrande.",
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
                </div>
              </div>

              <div className="xl:col-span-12">
                <div className="rounded-[20px] border border-[#E7EAF0] bg-[#FCFCFD] p-4">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-[#344054]">
                      {formatConfig.label}
                    </label>
                    <p className="mt-1 text-sm leading-6 text-[#667085]">
                      {formatConfig.description}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#98A2B3]">
                      {formatConfig.helper}
                    </p>
                  </div>

                  {cover.file ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex min-w-0 gap-4">
                        <div
                          className={[
                            "flex shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[#E4E7EC] bg-white",
                            formatConfig.previewClass,
                          ].join(" ")}
                        >
                          {cover.previewUrl ? (
                            <img
                              src={cover.previewUrl}
                              alt={`Prévia ${formatConfig.label}`}
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
                            onChange={handleSelecionarCapa}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={removerCapaSelecionada}
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
                          O upload abaixo está ativo apenas para o modelo
                          selecionado: {formatConfig.label}.
                        </p>
                      </div>

                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-[#EAD7B7] bg-[#D8BC8B] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:brightness-[1.02]">
                        <Upload className="h-4 w-4" />
                        Enviar capa
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                          onChange={handleSelecionarCapa}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Descrição curta
                </label>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(e) =>
                    updateField("shortDescription", e.target.value)
                  }
                  placeholder="Resumo curto para listagens e destaque"
                  className="h-12 w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Descrição completa
                </label>
                <textarea
                  rows={6}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Descreva o curso"
                  className="w-full rounded-[16px] border border-[#DDE3EA] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] transition focus:border-[#D8BC8B] focus:bg-white"
                />
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
                    updateField("status", e.target.value as StatusCurso)
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