"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AssessmentsAdminNav } from "../_components/AssessmentsAdminNav";
import { CatalogItem } from "../_components/assessmentHelpers";
import { loadCourseCatalog, loadLessonCatalog, loadTrailCatalog } from "../_components/catalogLoaders";

export default function AdminNewAssessmentPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [courses, setCourses] = useState<CatalogItem[]>([]);
  const [trails, setTrails] = useState<CatalogItem[]>([]);
  const [lessons, setLessons] = useState<CatalogItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scopeType, setScopeType] = useState<"course" | "trail" | "lesson">("course");
  const [courseId, setCourseId] = useState("");
  const [trailId, setTrailId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [trailEvaluationMode, setTrailEvaluationMode] = useState<"per_course" | "general">("per_course");
  const [accessCondition, setAccessCondition] = useState("after_all_lessons");
  const [minCorrectPercentage, setMinCorrectPercentage] = useState(70);
  const [attemptsAllowed, setAttemptsAllowed] = useState(3);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [certificateRequired, setCertificateRequired] = useState(true);
  const [questionOrder, setQuestionOrder] = useState<"fixed" | "random">("fixed");
  const [showFeedbackAfterAttempt, setShowFeedbackAfterAttempt] = useState(true);
  const [showCorrectAnswersAfterPass, setShowCorrectAnswersAfterPass] = useState(false);

  useEffect(() => {
    async function loadCatalogs() {
      const [loadedCourses, loadedTrails, loadedLessons] = await Promise.all([
        loadCourseCatalog(supabase),
        loadTrailCatalog(supabase),
        loadLessonCatalog(supabase),
      ]);

      setCourses(loadedCourses);
      setTrails(loadedTrails);
      setLessons(loadedLessons);
      setCourseId(loadedCourses[0]?.id ?? "");
      setTrailId(loadedTrails[0]?.id ?? "");
      setLessonId(loadedLessons[0]?.id ?? "");
    }

    void loadCatalogs();
  }, [supabase]);

  async function createAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("Informe o título da avaliação.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: userResponse } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        scope_type: scopeType,
        course_id: scopeType === "course" ? courseId || null : null,
        trail_id: scopeType === "trail" ? trailId || null : null,
        lesson_id: scopeType === "lesson" ? lessonId || null : null,
        trail_evaluation_mode: trailEvaluationMode,
        access_condition: accessCondition,
        min_correct_percentage: minCorrectPercentage,
        certificate_required: certificateRequired,
        attempts_allowed: attemptsAllowed,
        time_limit_minutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
        question_order: questionOrder,
        show_feedback_after_attempt: showFeedbackAfterAttempt,
        show_correct_answers_after_pass: showCorrectAnswersAfterPass,
        status: "draft",
        is_active: true,
        created_by: userResponse.user?.id ?? null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/admin/avaliacoes/${data.id}`);
  }

  return (
    <>
      <AssessmentsAdminNav />

      <header className="mb-5">
        <Link href="/admin/avaliacoes" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#667085] transition hover:text-[#1f2230]">
          <ArrowLeft className="h-4 w-4" />
          Voltar para avaliações
        </Link>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Avaliações</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">Nova avaliação</h1>
        <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#667085]">
          Defina escopo, liberação, tentativas e regra mínima para certificado.
        </p>
      </header>

      {message ? <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">{message}</div> : null}

      <form onSubmit={createAssessment} className="grid gap-5 rounded-[22px] border border-[#e7e9f0] bg-white p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Avaliação final do curso" className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]" />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">Descrição</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-[14px] border border-[#dfe3ec] px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]" />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">Instruções para o aluno</span>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} placeholder="Explique objetivo, tentativas, nota mínima e regras." className="mt-2 w-full resize-none rounded-[14px] border border-[#dfe3ec] px-3 py-3 text-[14px] leading-6 text-[#1f2230] outline-none focus:border-[#DBC094]" />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="text-[13px] font-semibold text-[#3f4658]">Escopo</span>
              <select value={scopeType} onChange={(e) => setScopeType(e.target.value as "course" | "trail" | "lesson")} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]">
                <option value="course">Curso</option>
                <option value="trail">Trilha</option>
                <option value="lesson">Aula</option>
              </select>
            </label>

            {scopeType === "course" ? (
              <label className="md:col-span-2">
                <span className="text-[13px] font-semibold text-[#3f4658]">Curso</span>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]">
                  <option value="">Selecione</option>
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
              </label>
            ) : null}

            {scopeType === "trail" ? (
              <label className="md:col-span-2">
                <span className="text-[13px] font-semibold text-[#3f4658]">Trilha</span>
                <select value={trailId} onChange={(e) => setTrailId(e.target.value)} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]">
                  <option value="">Selecione</option>
                  {trails.map((trail) => <option key={trail.id} value={trail.id}>{trail.title}</option>)}
                </select>
              </label>
            ) : null}

            {scopeType === "lesson" ? (
              <label className="md:col-span-2">
                <span className="text-[13px] font-semibold text-[#3f4658]">Aula</span>
                <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]">
                  <option value="">Selecione</option>
                  {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                </select>
              </label>
            ) : null}
          </div>

          {scopeType === "trail" ? (
            <label className="block">
              <span className="text-[13px] font-semibold text-[#3f4658]">Avaliação da trilha</span>
              <select value={trailEvaluationMode} onChange={(e) => setTrailEvaluationMode(e.target.value as "per_course" | "general")} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]">
                <option value="per_course">Uma avaliação por curso da trilha</option>
                <option value="general">Avaliação geral da trilha</option>
              </select>
            </label>
          ) : null}
        </section>

        <aside className="space-y-4 rounded-[18px] border border-[#edf0f5] bg-[#fafbfe] p-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">Liberação para o aluno</span>
            <select value={accessCondition} onChange={(e) => setAccessCondition(e.target.value)} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]">
              <option value="after_all_lessons">Após concluir todas as aulas</option>
              <option value="after_course_completion">Após concluir o curso</option>
              <option value="after_trail_completion">Após concluir a trilha</option>
              <option value="after_lesson_completion">Após concluir a aula</option>
              <option value="manual_release">Liberação manual</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-[13px] font-semibold text-[#3f4658]">Mínimo %</span>
              <input type="number" min={0} max={100} value={minCorrectPercentage} onChange={(e) => setMinCorrectPercentage(Number(e.target.value))} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]" />
            </label>
            <label>
              <span className="text-[13px] font-semibold text-[#3f4658]">Tentativas</span>
              <input type="number" min={1} value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(Number(e.target.value))} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]" />
            </label>
          </div>

          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">Tempo limite em minutos</span>
            <input type="number" min={1} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} placeholder="Sem limite" className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]" />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-[#3f4658]">Ordem das questões</span>
            <select value={questionOrder} onChange={(e) => setQuestionOrder(e.target.value as "fixed" | "random")} className="mt-2 h-11 w-full rounded-[12px] border border-[#dfe3ec] bg-white px-3 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094]">
              <option value="fixed">Fixa</option>
              <option value="random">Aleatória</option>
            </select>
          </label>

          {[
            ["Exigir aprovação para certificado", certificateRequired, setCertificateRequired],
            ["Mostrar feedback ao finalizar", showFeedbackAfterAttempt, setShowFeedbackAfterAttempt],
            ["Mostrar gabarito somente se aprovado", showCorrectAnswersAfterPass, setShowCorrectAnswersAfterPass],
          ].map(([label, checked, onChange]) => (
            <label key={String(label)} className="flex items-center justify-between gap-3 rounded-[14px] border border-[#e6eaf1] bg-white px-4 py-3">
              <span className="text-[13px] font-semibold text-[#3f4658]">{String(label)}</span>
              <input type="checkbox" checked={Boolean(checked)} onChange={(e) => (onChange as (value: boolean) => void)(e.target.checked)} className="h-4 w-4 accent-[#DBC094]" />
            </label>
          ))}

          <button type="submit" disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:opacity-55">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Criar avaliação
          </button>
        </aside>
      </form>
    </>
  );
}
