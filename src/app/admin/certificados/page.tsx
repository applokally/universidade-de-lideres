"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  CheckCircle2,
  FileImage,
  Loader2,
  RefreshCcw,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";

type CertificateScope = "general" | "course" | "trail";

type CertificateTemplate = {
  id: string;
  title: string;
  description: string | null;
  image_path: string;
  image_url: string | null;
  scope_type: CertificateScope;
  course_id: string | null;
  trail_id: string | null;
  workload_hours: number | null;
  is_active: boolean;
  position_config: unknown;
  created_at: string;
  updated_at: string;
};

type CourseOption = {
  id: string;
  title: string;
  slug: string | null;
  status: string | null;
};

type FeedbackTone = "default" | "error" | "success";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatScope(scope: CertificateScope) {
  if (scope === "course") return "Curso";
  if (scope === "trail") return "Trilha";
  return "Geral";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getCourseTitle(courses: CourseOption[], courseId: string | null) {
  if (!courseId) return null;

  return courses.find((course) => course.id === courseId)?.title ?? null;
}

export default function AdminCertificadosPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("default");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scopeType, setScopeType] = useState<CertificateScope>("course");
  const [courseId, setCourseId] = useState("");
  const [workloadHours, setWorkloadHours] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.is_active),
    [templates],
  );

  const courseTemplates = useMemo(
    () => templates.filter((template) => template.scope_type === "course"),
    [templates],
  );

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    setFeedbackTone("default");

    try {
      const response = await fetch("/api/admin/certificados", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as {
        templates?: CertificateTemplate[];
        courses?: CourseOption[];
        error?: string;
      } | null;

      if (!response.ok) {
        setFeedback(data?.error || "Não foi possível carregar certificados.");
        setFeedbackTone("error");
        return;
      }

      setTemplates(data?.templates ?? []);
      setCourses(data?.courses ?? []);
    } catch (error) {
      console.error("Erro ao carregar certificados:", error);
      setFeedback("Não foi possível carregar certificados.");
      setFeedbackTone("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function showFeedback(message: string, tone: FeedbackTone = "default") {
    setFeedback(message);
    setFeedbackTone(tone);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    showFeedback("", "default");

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("scope_type", scopeType);
      formData.set("course_id", scopeType === "course" ? courseId : "");
      formData.set("trail_id", "");
      formData.set("workload_hours", workloadHours);

      if (imageFile) {
        formData.set("image", imageFile);
      }

      const response = await fetch("/api/admin/certificados", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        showFeedback(
          data?.error || "Não foi possível cadastrar o certificado.",
          "error",
        );
        return;
      }

      setTitle("");
      setDescription("");
      setScopeType("course");
      setCourseId("");
      setWorkloadHours("");
      setImageFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      showFeedback(data?.message || "Modelo de certificado cadastrado.", "success");
      await loadTemplates();
    } catch (error) {
      console.error("Erro ao cadastrar certificado:", error);
      showFeedback("Não foi possível cadastrar o certificado.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTemplate(template: CertificateTemplate) {
    setUpdatingId(template.id);
    showFeedback("", "default");

    try {
      const response = await fetch("/api/admin/certificados", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: template.id,
          is_active: !template.is_active,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        showFeedback(
          data?.error || "Não foi possível atualizar o certificado.",
          "error",
        );
        return;
      }

      showFeedback(data?.message || "Certificado atualizado.", "success");
      await loadTemplates();
    } catch (error) {
      console.error("Erro ao atualizar certificado:", error);
      showFeedback("Não foi possível atualizar o certificado.", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteTemplate(template: CertificateTemplate) {
    const confirmed = window.confirm(
      `Excluir o modelo "${template.title}"? Ele será removido da lista do ADM, mas ficará preservado no banco para auditoria.`,
    );

    if (!confirmed) return;

    setDeletingId(template.id);
    showFeedback("", "default");

    try {
      const response = await fetch("/api/admin/certificados", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: template.id,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        showFeedback(
          data?.error || "Não foi possível excluir o certificado.",
          "error",
        );
        return;
      }

      showFeedback(data?.message || "Modelo de certificado excluído.", "success");
      await loadTemplates();
    } catch (error) {
      console.error("Erro ao excluir certificado:", error);
      showFeedback("Não foi possível excluir o certificado.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1480px] gap-6 overflow-hidden">
      <section>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.32em] text-[#8b90a2]">
              Módulo acadêmico
            </p>

            <h1 className="mt-3 text-[46px] font-semibold leading-none tracking-[-0.055em] text-[#11131a]">
              Certificados
            </h1>

            <p className="mt-5 max-w-[860px] text-[18px] leading-7 text-[#555c70]">
              Cadastre os modelos oficiais de certificado. O posicionamento dos
              campos é feito em uma tela própria de edição visual.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadTemplates()}
            disabled={loading}
            className="inline-flex h-[60px] shrink-0 items-center justify-center gap-3 rounded-[14px] bg-[#DFC491] px-7 text-[16px] font-semibold text-black transition hover:bg-[#d3b77f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCcw className="h-5 w-5" />
            )}
            Atualizar lista
          </button>
        </div>

        <div className="mt-9 border-t border-[#d9dde7]" />

        <div className="mt-9 overflow-hidden rounded-[22px] border border-[#dfe3ec] bg-white">
          <div className="grid md:grid-cols-3">
            <div className="border-b border-[#e5e8ef] p-7 md:border-b-0 md:border-r">
              <p className="text-[16px] font-medium text-[#555c70]">
                Modelos cadastrados
              </p>
              <p className="mt-5 text-[45px] font-semibold leading-none tracking-[-0.055em] text-[#11131a]">
                {templates.length}
              </p>
            </div>

            <div className="border-b border-[#e5e8ef] p-7 md:border-b-0 md:border-r">
              <p className="text-[16px] font-medium text-[#555c70]">
                Modelos ativos
              </p>
              <p className="mt-5 text-[45px] font-semibold leading-none tracking-[-0.055em] text-[#11131a]">
                {activeTemplates.length}
              </p>
            </div>

            <div className="p-7">
              <p className="text-[16px] font-medium text-[#555c70]">
                Vinculados a cursos
              </p>
              <p className="mt-5 text-[45px] font-semibold leading-none tracking-[-0.055em] text-[#11131a]">
                {courseTemplates.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {feedback ? (
        <div
          className={cn(
            "rounded-[16px] border px-5 py-4 text-[14px] font-semibold",
            feedbackTone === "error" && "border-red-200 bg-red-50 text-red-700",
            feedbackTone === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-700",
            feedbackTone === "default" &&
              "border-[#e7d9bd] bg-[#f9f1e2] text-[#7b5d2e]",
          )}
        >
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-[#e8ebf2] bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f7f0e2] text-[#9b7539]">
              <Upload className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.035em] text-[#1f2230]">
                Cadastrar modelo
              </h2>
              <p className="mt-1 text-[14px] text-[#656b7a]">
                Use a imagem final do certificado.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-[#4f5568]">
                Nome do modelo
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Certificado padrão do curso"
                className="h-11 rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] px-4 text-[15px] text-[#1f2230] outline-none transition placeholder:text-[#9aa0af] focus:border-[#DBC094]/60 focus:bg-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-[#4f5568]">
                Descrição
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Observação interna para o ADM"
                className="min-h-[88px] resize-none rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] px-4 py-3 text-[15px] leading-6 text-[#1f2230] outline-none transition placeholder:text-[#9aa0af] focus:border-[#DBC094]/60 focus:bg-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-[#4f5568]">
                Aplicação
              </span>
              <select
                value={scopeType}
                onChange={(event) => {
                  const value = event.target.value as CertificateScope;
                  setScopeType(value);

                  if (value !== "course") {
                    setCourseId("");
                  }
                }}
                className="h-11 rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] px-4 text-[15px] text-[#1f2230] outline-none transition focus:border-[#DBC094]/60 focus:bg-white"
              >
                <option value="course">Curso específico</option>
                <option value="general">Modelo geral</option>
              </select>
            </label>

            {scopeType === "course" ? (
              <label className="grid gap-2">
                <span className="text-[13px] font-semibold text-[#4f5568]">
                  Curso
                </span>
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="h-11 rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] px-4 text-[15px] text-[#1f2230] outline-none transition focus:border-[#DBC094]/60 focus:bg-white"
                >
                  <option value="">Selecione um curso</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-[#4f5568]">
                Carga horária padrão
              </span>
              <input
                value={workloadHours}
                onChange={(event) => setWorkloadHours(event.target.value)}
                placeholder="Ex: 40"
                inputMode="decimal"
                className="h-11 rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] px-4 text-[15px] text-[#1f2230] outline-none transition placeholder:text-[#9aa0af] focus:border-[#DBC094]/60 focus:bg-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-[#4f5568]">
                Imagem do certificado
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(event) =>
                  setImageFile(event.target.files?.[0] ?? null)
                }
                className="block w-full rounded-[12px] border border-[#dfe3ec] bg-[#f7f8fc] px-4 py-3 text-[14px] text-[#4f5568] file:mr-4 file:rounded-[10px] file:border-0 file:bg-[#DFC491] file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-black"
              />

              {imageFile ? (
                <p className="text-[13px] font-medium text-[#656b7a]">
                  Arquivo selecionado: {imageFile.name}
                </p>
              ) : null}
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DFC491] px-5 text-[14px] font-semibold text-black transition hover:bg-[#d3b77f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Cadastrar certificado
            </button>
          </div>
        </form>

        <section className="rounded-[24px] border border-[#e8ebf2] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9b7539]">
                Modelos cadastrados
              </p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[#1f2230]">
                Certificados disponíveis
              </h2>
              <p className="mt-2 max-w-[680px] text-[14px] leading-6 text-[#656b7a]">
                Para posicionar os campos, abra o editor visual do modelo.
              </p>
            </div>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-[20px] border border-dashed border-[#dfe3ec] bg-[#fafbfe]">
                <div className="flex items-center gap-3 text-[15px] font-medium text-[#656b7a]">
                  <Loader2 className="h-5 w-5 animate-spin text-[#9b7539]" />
                  Carregando certificados...
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#dfe3ec] bg-[#fafbfe] px-5 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#f7f0e2] text-[#9b7539]">
                  <Award className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-[20px] font-semibold tracking-tight text-[#1f2230]">
                  Nenhum modelo cadastrado
                </h3>
                <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#656b7a]">
                  Cadastre o primeiro modelo usando a imagem oficial do
                  certificado.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e8ebf2] overflow-hidden rounded-[20px] border border-[#e8ebf2]">
                {templates.map((template) => {
                  const linkedCourseTitle = getCourseTitle(courses, template.course_id);

                  return (
                    <article
                      key={template.id}
                      className="grid gap-4 bg-white p-4 transition hover:bg-[#fbfcff] lg:grid-cols-[170px_minmax(0,1fr)_180px] lg:items-center"
                    >
                      <div className="overflow-hidden rounded-[14px] border border-[#e2e5ee] bg-white">
                        {template.image_url ? (
                          <img
                            src={template.image_url}
                            alt={template.title}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center text-[#9b7539]">
                            <FileImage className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]",
                              template.is_active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700",
                            )}
                          >
                            {template.is_active ? "Ativo" : "Inativo"}
                          </span>

                          <span className="inline-flex rounded-full border border-[#e7d9bd] bg-[#f9f1e2] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9b7539]">
                            {formatScope(template.scope_type)}
                          </span>
                        </div>

                        <h3 className="mt-3 truncate text-[18px] font-semibold tracking-[-0.025em] text-[#1f2230]">
                          {template.title}
                        </h3>

                        {template.description ? (
                          <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-[#656b7a]">
                            {template.description}
                          </p>
                        ) : null}

                        <p className="mt-2 text-[13px] text-[#8b90a2]">
                          Curso: {linkedCourseTitle ?? "não vinculado"} • Carga
                          horária:{" "}
                          {template.workload_hours
                            ? `${template.workload_hours}h`
                            : "não definida"}{" "}
                          • Criado em {formatDate(template.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/admin/certificados/${template.id}/editar`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[#DFC491] px-4 text-[14px] font-semibold text-black transition hover:bg-[#d3b77f]"
                        >
                          <Settings2 className="h-4 w-4" />
                          Editar campos
                        </Link>

                        {template.image_url ? (
                          <a
                            href={template.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#dfe3ec] bg-white px-4 text-[14px] font-semibold text-[#4f5568] transition hover:border-[#DBC094]/60 hover:text-[#1f2230]"
                          >
                            Visualizar arte
                          </a>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void toggleTemplate(template)}
                          disabled={updatingId === template.id}
                          className={cn(
                            "inline-flex h-10 items-center justify-center rounded-[12px] px-4 text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                            template.is_active
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-emerald-600 text-white hover:bg-emerald-700",
                          )}
                        >
                          {updatingId === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : template.is_active ? (
                            "Desativar"
                          ) : (
                            "Ativar"
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteTemplate(template)}
                          disabled={deletingId === template.id}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-red-200 bg-red-50 px-4 text-[14px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Excluir
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
