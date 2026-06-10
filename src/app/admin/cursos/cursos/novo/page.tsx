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
  Star,
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
    <div className="space-y-7 text-[#141414]">
      <div className="flex w-full flex-col gap-7">
        <section className="border-b border-[#e5e5e5] pb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-3xl">
                <Link
                  href="/admin/cursos"
                  className="inline-flex max-w-full items-center gap-2 text-[14px] font-medium text-[#666b76] transition hover:text-[#141414]"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">Voltar para trilhas e cursos</span>
                </Link>

                <div className="mt-4">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#e2d2b6] bg-[#f3eee5] px-3 py-1 text-[12px] font-medium uppercase tracking-[0.14em] text-[#8a6836]">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Cadastro de curso</span>
                  </div>
                </div>

                <h1 className="mt-5 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
                  Novo curso
                </h1>

                <p className="mt-3 max-w-2xl text-[14px] leading-7 text-[#666b76] md:text-[16px]">
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 py-3 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
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
          className="rounded-[18px] border border-[#e5e5e5] bg-white "
        >
          <div className="grid grid-cols-1 gap-6 p-6 md:p-8">
            {erro ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4">
                <h2 className="text-[14px] font-semibold text-rose-700">
                  Não foi possível salvar o curso
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-rose-600">{erro}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
              <div className="xl:col-span-12">
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
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
                  className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none placeholder:text-[#8a8f9d] transition focus:border-[#DBC094] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
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
                  className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none placeholder:text-[#8a8f9d] transition focus:border-[#DBC094] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Trilha
                </label>

                <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 text-[14px] font-semibold text-[#141414]">
                        <Network className="h-4 w-4 text-[#8a6836]" />
                        Vincular a uma trilha
                      </div>

                      <select
                        value={form.trilhaId}
                        onChange={(e) =>
                          updateField("trilhaId", e.target.value)
                        }
                        disabled={carregandoTrilhas}
                        className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white disabled:cursor-not-allowed disabled:bg-[#F2F4F7]"
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
                      className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-3 text-[14px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f7]"
                    >
                      <Star className="h-4 w-4" />
                      Nova trilha
                    </Link>
                  </div>

                  <p className="mt-3 text-[14px] leading-6 text-[#666b76]">
                    Você pode cadastrar o curso sem trilha ou já vinculá-lo a
                    uma trilha existente.
                  </p>
                </div>
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Modelo de capa do curso
                </label>

                <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                  <p className="mb-4 text-[14px] leading-6 text-[#666b76]">
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
                              ? "border-[#DBC094] bg-[#f3eee5] "
                              : "border-[#e5e5e5] bg-white hover:border-[#DBC094]/70",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "mb-3 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-black",
                              selected
                                ? "border-[#DBC094] bg-[#DBC094] text-black"
                                : "border-[#e5e5e5] bg-white text-[#666b76]",
                            ].join(" ")}
                          >
                            {selected ? "✓" : ""}
                          </span>

                          <strong className="block text-[14px] font-semibold text-[#141414]">
                            {option.title}
                          </strong>
                          <span className="mt-1 block text-[14px] leading-6 text-[#666b76]">
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="xl:col-span-12">
                <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                  <div className="mb-4">
                    <label className="block text-[14px] font-semibold text-[#52525b]">
                      {formatConfig.label}
                    </label>
                    <p className="mt-1 text-[14px] leading-6 text-[#666b76]">
                      {formatConfig.description}
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-[#8a8f9d]">
                      {formatConfig.helper}
                    </p>
                  </div>

                  {cover.file ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex min-w-0 gap-4">
                        <div
                          className={[
                            "flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-white",
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
                            <ImageIcon className="h-6 w-6 text-[#8a8f9d]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-[#141414]">
                            {cover.file.name}
                          </p>
                          <p className="mt-1 text-[14px] text-[#666b76]">
                            {cover.file.type || "Tipo não identificado"}
                          </p>
                          <p className="mt-1 text-[14px] text-[#8a8f9d]">
                            {formatarTamanho(cover.file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[#e5e5e5] bg-white px-4 py-2 text-[14px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f7]">
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
                          className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-2 text-[14px] font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir capa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-[#141414]">
                          Nenhuma imagem selecionada
                        </p>
                        <p className="mt-1 text-[14px] leading-6 text-[#666b76]">
                          O upload abaixo está ativo apenas para o modelo
                          selecionado: {formatConfig.label}.
                        </p>
                      </div>

                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#e2d2b6] bg-[#DBC094] px-4 py-2.5 text-[14px] font-semibold text-black transition hover:brightness-105">
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
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Descrição curta
                </label>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(e) =>
                    updateField("shortDescription", e.target.value)
                  }
                  placeholder="Resumo curto para listagens e destaque"
                  className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none placeholder:text-[#8a8f9d] transition focus:border-[#DBC094] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-12">
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Descrição completa
                </label>
                <textarea
                  rows={6}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Descreva o curso"
                  className="w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 py-3 text-[14px] text-[#141414] outline-none placeholder:text-[#8a8f9d] transition focus:border-[#DBC094] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-4">
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Rank mínimo exigido
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.requiredRank}
                  onChange={(e) => updateField("requiredRank", e.target.value)}
                  placeholder="0"
                  className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none placeholder:text-[#8a8f9d] transition focus:border-[#DBC094] focus:bg-white"
                />
              </div>

              <div className="xl:col-span-4">
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Status visual
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateField("status", e.target.value as StatusCurso)
                  }
                  className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#141414] outline-none transition focus:border-[#DBC094] focus:bg-white"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="xl:col-span-4">
                <label className="mb-2 block text-[14px] font-semibold text-[#52525b]">
                  Exibição
                </label>
                <label className="flex min-h-12 items-start gap-3 rounded-[12px] border border-[#e5e5e5] bg-white p-4">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) =>
                      updateField("isFeatured", e.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-[#e5e5e5] text-[#8a6836] focus:ring-[#DBC094]"
                  />

                  <span className="block">
                    <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#141414]">
                      <Star className="h-4 w-4 text-[#8a6836]" />
                      Marcar como destaque
                    </span>
                    <span className="mt-1 block text-[14px] leading-6 text-[#666b76]">
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