"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AssessmentsAdminNav } from "../_components/AssessmentsAdminNav";
import { Assessment, AssessmentOption, AssessmentQuestion, CatalogItem, getStatusClass, getStatusLabel } from "../_components/assessmentHelpers";
import { loadCourseCatalog, loadLessonCatalog, loadTrailCatalog } from "../_components/catalogLoaders";

type QuestionWithOptions = AssessmentQuestion & { options: AssessmentOption[] };

const questionTypes: Array<{ value: AssessmentQuestion["question_type"]; label: string }> = [
  { value: "single_choice", label: "Escolha única" },
  { value: "multiple_choice", label: "Múltipla escolha" },
  { value: "short_text", label: "Resposta curta" },
  { value: "long_text", label: "Resposta longa" },
  { value: "true_false", label: "Verdadeiro/Falso" },
  { value: "scale", label: "Escala" },
];

export default function AdminAssessmentDetailPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [courses, setCourses] = useState<CatalogItem[]>([]);
  const [trails, setTrails] = useState<CatalogItem[]>([]);
  const [lessons, setLessons] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [message, setMessage] = useState("");

  const loadAssessment = useCallback(async () => {
    setLoading(true);
    const [assessmentResponse, questionsResponse, optionsResponse, loadedCourses, loadedTrails, loadedLessons] = await Promise.all([
      supabase.from("assessments").select("*").eq("id", assessmentId).single(),
      supabase.from("assessment_questions").select("*").eq("assessment_id", assessmentId).order("sort_order", { ascending: true }),
      supabase.from("assessment_question_options").select("*").order("sort_order", { ascending: true }),
      loadCourseCatalog(supabase),
      loadTrailCatalog(supabase),
      loadLessonCatalog(supabase),
    ]);

    if (assessmentResponse.error) {
      setMessage(assessmentResponse.error.message);
      setLoading(false);
      return;
    }

    if (questionsResponse.error) {
      setMessage(questionsResponse.error.message);
      setLoading(false);
      return;
    }

    setCourses(loadedCourses);
    setTrails(loadedTrails);
    setLessons(loadedLessons);
    setAssessment(assessmentResponse.data as Assessment);

    const loadedQuestions = (questionsResponse.data ?? []) as AssessmentQuestion[];
    const loadedOptions = (optionsResponse.data ?? []) as AssessmentOption[];
    const optionsByQuestion = loadedOptions.reduce((acc, option) => {
      const current = acc.get(option.question_id) ?? [];
      current.push(option);
      acc.set(option.question_id, current);
      return acc;
    }, new Map<string, AssessmentOption[]>());

    setQuestions(loadedQuestions.map((question) => ({ ...question, options: optionsByQuestion.get(question.id) ?? [] })));
    setLoading(false);
  }, [assessmentId, supabase]);

  useEffect(() => { void loadAssessment(); }, [loadAssessment]);

  function updateAssessmentLocal(values: Partial<Assessment>) {
    setAssessment((current) => (current ? { ...current, ...values } : current));
  }

  function updateQuestionLocal(questionId: string, values: Partial<AssessmentQuestion>) {
    setQuestions((current) => current.map((question) => question.id === questionId ? { ...question, ...values } : question));
  }

  function updateOptionLocal(questionId: string, optionId: string, values: Partial<AssessmentOption>) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? { ...question, options: question.options.map((option) => option.id === optionId ? { ...option, ...values } : option) }
          : question,
      ),
    );
  }

  async function saveAssessment() {
    if (!assessment) return;
    setSavingAssessment(true);
    const { error } = await supabase.from("assessments").update({
      title: assessment.title,
      description: assessment.description,
      instructions: assessment.instructions,
      scope_type: assessment.scope_type,
      course_id: assessment.scope_type === "course" ? assessment.course_id : null,
      trail_id: assessment.scope_type === "trail" ? assessment.trail_id : null,
      lesson_id: assessment.scope_type === "lesson" ? assessment.lesson_id : null,
      trail_evaluation_mode: assessment.trail_evaluation_mode,
      access_condition: assessment.access_condition,
      min_correct_percentage: assessment.min_correct_percentage,
      certificate_required: assessment.certificate_required,
      attempts_allowed: assessment.attempts_allowed,
      time_limit_minutes: assessment.time_limit_minutes,
      question_order: assessment.question_order,
      show_feedback_after_attempt: assessment.show_feedback_after_attempt,
      show_correct_answers_after_pass: assessment.show_correct_answers_after_pass,
      status: assessment.status,
      is_active: assessment.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", assessment.id);
    setSavingAssessment(false);
    setMessage(error ? error.message : "Avaliação salva.");
  }

  async function addQuestion() {
    const { error } = await supabase.from("assessment_questions").insert({
      assessment_id: assessmentId,
      question_type: "single_choice",
      prompt: "Nova questão",
      points: 1,
      required: true,
      sort_order: questions.length + 1,
    });
    if (error) setMessage(error.message);
    else await loadAssessment();
  }

  async function saveQuestion(question: QuestionWithOptions) {
    const { error } = await supabase.from("assessment_questions").update({
      question_type: question.question_type,
      prompt: question.prompt,
      help_text: question.help_text,
      points: question.points,
      required: question.required,
      sort_order: question.sort_order,
      correct_text_response: question.correct_text_response,
      explanation: question.explanation,
      updated_at: new Date().toISOString(),
    }).eq("id", question.id);
    setMessage(error ? error.message : "Questão salva.");
  }

  async function deleteQuestion(questionId: string) {
    const { error } = await supabase.from("assessment_questions").delete().eq("id", questionId);
    if (error) setMessage(error.message);
    else await loadAssessment();
  }

  async function addOption(questionId: string) {
    const question = questions.find((item) => item.id === questionId);
    const { error } = await supabase.from("assessment_question_options").insert({
      question_id: questionId,
      label: "Nova alternativa",
      is_correct: false,
      sort_order: (question?.options.length ?? 0) + 1,
    });
    if (error) setMessage(error.message);
    else await loadAssessment();
  }

  async function saveOption(option: AssessmentOption) {
    const { error } = await supabase.from("assessment_question_options").update({
      label: option.label,
      is_correct: option.is_correct,
      sort_order: option.sort_order,
    }).eq("id", option.id);
    setMessage(error ? error.message : "Alternativa salva.");
  }

  async function deleteOption(optionId: string) {
    const { error } = await supabase.from("assessment_question_options").delete().eq("id", optionId);
    if (error) setMessage(error.message);
    else await loadAssessment();
  }

  if (loading) {
    return (
      <>
        <AssessmentsAdminNav />
        <div className="flex items-center justify-center gap-3 rounded-[22px] border border-[#e7e9f0] bg-white py-16 text-[14px] text-[#667085]">
          <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" /> Carregando avaliação...
        </div>
      </>
    );
  }

  if (!assessment) {
    return (
      <>
        <AssessmentsAdminNav />
        <div className="rounded-[22px] border border-[#e7e9f0] bg-white p-8 text-[14px] text-[#667085]">Avaliação não encontrada.</div>
      </>
    );
  }

  return (
    <>
      <AssessmentsAdminNav />

      <header className="mb-5">
        <Link href="/admin/avaliacoes" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#667085] transition hover:text-[#1f2230]">
          <ArrowLeft className="h-4 w-4" /> Voltar para avaliações
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Avaliações</p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">Gerenciar avaliação</h1>
          </div>

          <button type="button" onClick={saveAssessment} disabled={savingAssessment} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:opacity-55">
            {savingAssessment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar avaliação
          </button>
        </div>
      </header>

      {message ? <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">{message}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <details open className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span><strong className="block text-[16px] font-semibold text-[#1f2230]">Dados principais</strong><span className="mt-1 block text-[13px] text-[#667085]">Nome, descrição, instruções e status.</span></span>
              <ChevronRight className="h-4 w-4 text-[#9aa1b2]" />
            </summary>

            <div className="space-y-4 border-t border-[#edf0f5] bg-[#fafbfe] p-5">
              <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Título</span><input value={assessment.title} onChange={(e) => updateAssessmentLocal({ title: e.target.value })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]" /></label>
              <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Descrição</span><textarea value={assessment.description ?? ""} onChange={(e) => updateAssessmentLocal({ description: e.target.value })} rows={3} className="mt-2 w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]" /></label>
              <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Instruções</span><textarea value={assessment.instructions ?? ""} onChange={(e) => updateAssessmentLocal({ instructions: e.target.value })} rows={4} className="mt-2 w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]" /></label>
            </div>
          </details>

          <details open className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span><strong className="block text-[16px] font-semibold text-[#1f2230]">Questões</strong><span className="mt-1 block text-[13px] text-[#667085]">Escolha única, múltipla escolha, texto e escala.</span></span>
              <button type="button" onClick={(event) => { event.preventDefault(); void addQuestion(); }} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#DBC094] px-4 text-[13px] font-semibold text-black">
                <Plus className="h-4 w-4" /> Questão
              </button>
            </summary>

            <div className="divide-y divide-[#edf0f5] border-t border-[#edf0f5]">
              {questions.length > 0 ? questions.map((question, index) => (
                <article key={question.id} className="space-y-4 bg-[#fafbfe] p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f0e2] text-[12px] font-semibold text-[#7c5d2f]">{index + 1}</span>
                    <select value={question.question_type} onChange={(e) => updateQuestionLocal(question.id, { question_type: e.target.value as AssessmentQuestion["question_type"] })} className="h-10 rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[13px] text-[#1f2230] outline-none focus:border-[#DBC094]">
                      {questionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <input type="number" min={0} value={question.points} onChange={(e) => updateQuestionLocal(question.id, { points: Number(e.target.value) })} className="h-10 w-[110px] rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[13px] text-[#1f2230] outline-none focus:border-[#DBC094]" title="Pontos" />
                    <button type="button" onClick={() => updateQuestionLocal(question.id, { required: !question.required })} className={["h-10 rounded-[12px] border px-3 text-[12px] font-semibold", question.required ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"].join(" ")}>{question.required ? "Obrigatória" : "Opcional"}</button>
                  </div>

                  <textarea value={question.prompt} onChange={(e) => updateQuestionLocal(question.id, { prompt: e.target.value })} rows={3} placeholder="Digite a pergunta..." className="w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]" />
                  <input value={question.help_text ?? ""} onChange={(e) => updateQuestionLocal(question.id, { help_text: e.target.value })} placeholder="Ajuda ou contexto opcional" className="h-10 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[13px] text-[#1f2230] outline-none focus:border-[#DBC094]" />

                  {["single_choice", "multiple_choice", "true_false", "scale"].includes(question.question_type) ? (
                    <div className="rounded-[16px] border border-[#e2e6ef] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3"><strong className="text-[13px] text-[#3f4658]">Alternativas</strong><button type="button" onClick={() => addOption(question.id)} className="rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[12px] font-semibold text-[#4f5568]">Adicionar alternativa</button></div>
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <div key={option.id} className="flex gap-2">
                            <input value={option.label} onChange={(e) => updateOptionLocal(question.id, option.id, { label: e.target.value })} className="h-10 min-w-0 flex-1 rounded-[12px] border border-[#dfe3ec] px-3 text-[13px] text-[#1f2230] outline-none focus:border-[#DBC094]" />
                            <button type="button" onClick={() => updateOptionLocal(question.id, option.id, { is_correct: !option.is_correct })} className={["h-10 rounded-[12px] border px-3 text-[12px] font-semibold", option.is_correct ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"].join(" ")}>{option.is_correct ? "Correta" : "Marcar"}</button>
                            <button type="button" onClick={() => saveOption(option)} className="h-10 rounded-[12px] bg-[#DBC094] px-3 text-[12px] font-semibold text-black">Salvar</button>
                            <button type="button" onClick={() => deleteOption(option.id)} className="h-10 rounded-[12px] border border-red-100 bg-red-50 px-3 text-red-700"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Resposta esperada ou critério de correção</span><textarea value={question.correct_text_response ?? ""} onChange={(e) => updateQuestionLocal(question.id, { correct_text_response: e.target.value })} rows={3} className="mt-2 w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]" /></label>
                  )}

                  <textarea value={question.explanation ?? ""} onChange={(e) => updateQuestionLocal(question.id, { explanation: e.target.value })} rows={2} placeholder="Feedback ou explicação pós-tentativa" className="w-full resize-none rounded-[14px] border border-[#dfe3ec] bg-white px-3 py-3 text-[13px] leading-5 text-[#1f2230] outline-none focus:border-[#DBC094]" />

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => saveQuestion(question)} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#DBC094] px-4 text-[13px] font-semibold text-black"><Save className="h-4 w-4" /> Salvar questão</button>
                    <button type="button" onClick={() => deleteQuestion(question.id)} className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-red-100 bg-red-50 px-4 text-[13px] font-semibold text-red-700"><Trash2 className="h-4 w-4" /> Excluir</button>
                  </div>
                </article>
              )) : <div className="px-5 py-10 text-center text-[14px] text-[#667085]">Nenhuma questão cadastrada.</div>}
            </div>
          </details>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <strong className="text-[16px] font-semibold text-[#1f2230]">Configurações</strong>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(assessment.status)}`}>{getStatusLabel(assessment.status)}</span>
            </div>

            <div className="space-y-3">
              <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Status</span><select value={assessment.status} onChange={(e) => updateAssessmentLocal({ status: e.target.value as Assessment["status"] })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option><option value="archived">Arquivado</option></select></label>
              <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Escopo</span><select value={assessment.scope_type} onChange={(e) => updateAssessmentLocal({ scope_type: e.target.value as Assessment["scope_type"] })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"><option value="course">Curso</option><option value="trail">Trilha</option><option value="lesson">Aula</option></select></label>

              {assessment.scope_type === "course" ? <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Curso</span><select value={assessment.course_id ?? ""} onChange={(e) => updateAssessmentLocal({ course_id: e.target.value || null })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"><option value="">Selecione</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label> : null}
              {assessment.scope_type === "trail" ? <><label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Trilha</span><select value={assessment.trail_id ?? ""} onChange={(e) => updateAssessmentLocal({ trail_id: e.target.value || null })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"><option value="">Selecione</option>{trails.map((trail) => <option key={trail.id} value={trail.id}>{trail.title}</option>)}</select></label><label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Modelo da trilha</span><select value={assessment.trail_evaluation_mode} onChange={(e) => updateAssessmentLocal({ trail_evaluation_mode: e.target.value as Assessment["trail_evaluation_mode"] })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"><option value="per_course">Avaliação por curso</option><option value="general">Avaliação geral da trilha</option></select></label></> : null}
              {assessment.scope_type === "lesson" ? <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Aula</span><select value={assessment.lesson_id ?? ""} onChange={(e) => updateAssessmentLocal({ lesson_id: e.target.value || null })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"><option value="">Selecione</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label> : null}

              <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Liberação</span><select value={assessment.access_condition} onChange={(e) => updateAssessmentLocal({ access_condition: e.target.value as Assessment["access_condition"] })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]"><option value="after_all_lessons">Após concluir todas as aulas</option><option value="after_course_completion">Após concluir o curso</option><option value="after_trail_completion">Após concluir a trilha</option><option value="after_lesson_completion">Após concluir a aula</option><option value="manual_release">Liberação manual</option></select></label>

              <div className="grid grid-cols-2 gap-3">
                <label><span className="text-[13px] font-semibold text-[#3f4658]">Mínimo %</span><input type="number" min={0} max={100} value={assessment.min_correct_percentage} onChange={(e) => updateAssessmentLocal({ min_correct_percentage: Number(e.target.value) })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]" /></label>
                <label><span className="text-[13px] font-semibold text-[#3f4658]">Tentativas</span><input type="number" min={1} value={assessment.attempts_allowed} onChange={(e) => updateAssessmentLocal({ attempts_allowed: Number(e.target.value) })} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]" /></label>
              </div>

              <label className="block"><span className="text-[13px] font-semibold text-[#3f4658]">Tempo limite</span><input type="number" min={1} value={assessment.time_limit_minutes ?? ""} onChange={(e) => updateAssessmentLocal({ time_limit_minutes: e.target.value ? Number(e.target.value) : null })} placeholder="Sem limite" className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]" /></label>
              {[
                ["Exigir aprovação para certificado", "certificate_required", assessment.certificate_required],
                ["Mostrar feedback ao finalizar", "show_feedback_after_attempt", assessment.show_feedback_after_attempt],
                ["Gabarito apenas após aprovação", "show_correct_answers_after_pass", assessment.show_correct_answers_after_pass],
              ].map(([label, key, checked]) => (
                <label key={String(key)} className="flex items-center justify-between gap-3 rounded-[14px] border border-[#e6eaf1] bg-[#fafbfe] px-4 py-3"><span className="text-[13px] font-semibold text-[#3f4658]">{String(label)}</span><input type="checkbox" checked={Boolean(checked)} onChange={(e) => updateAssessmentLocal({ [String(key)]: e.target.checked } as Partial<Assessment>)} className="h-4 w-4 accent-[#DBC094]" /></label>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
            <strong className="text-[16px] font-semibold text-[#1f2230]">Boas práticas</strong>
            <ul className="mt-3 space-y-2 text-[13px] leading-5 text-[#667085]">
              <li>Use enunciados claros e sem dupla negativa.</li>
              <li>Teste uma ideia por questão.</li>
              <li>Use 3 a 5 alternativas para múltipla escolha.</li>
              <li>Defina o percentual mínimo antes de liberar certificado.</li>
            </ul>
          </section>
        </aside>
      </section>
    </>
  );
}
