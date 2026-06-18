export type Assessment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  scope_type: "course" | "trail" | "lesson";
  course_id: string | null;
  trail_id: string | null;
  lesson_id: string | null;
  trail_evaluation_mode: "per_course" | "general";
  access_condition: "after_all_lessons" | "after_course_completion" | "after_trail_completion" | "after_lesson_completion" | "manual_release";
  min_correct_percentage: number;
  certificate_required: boolean;
  attempts_allowed: number;
  time_limit_minutes: number | null;
  question_order: "fixed" | "random";
  show_feedback_after_attempt: boolean;
  show_correct_answers_after_pass: boolean;
  status: "draft" | "published" | "paused" | "archived";
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AssessmentQuestion = {
  id: string;
  assessment_id: string;
  question_type: "single_choice" | "multiple_choice" | "short_text" | "long_text" | "true_false" | "scale";
  prompt: string;
  help_text: string | null;
  points: number;
  required: boolean;
  sort_order: number;
  correct_text_response: string | null;
  explanation: string | null;
};

export type AssessmentOption = {
  id: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  sort_order: number;
};

export type CatalogItem = {
  id: string;
  title: string;
};

export type AssessmentAttempt = {
  id: string;
  assessment_id: string;
  user_id: string;
  status: string;
  score_points: number;
  max_points: number;
  correct_percentage: number;
  started_at: string;
  submitted_at: string | null;
  graded_at: string | null;
};

export function formatDate(value: string | null | undefined) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getStatusLabel(status: string | null | undefined) {
  if (status === "draft") return "Rascunho";
  if (status === "published") return "Publicado";
  if (status === "paused") return "Pausado";
  if (status === "archived") return "Arquivado";
  if (status === "passed") return "Aprovado";
  if (status === "failed") return "Reprovado";
  if (status === "submitted") return "Enviado";
  if (status === "in_progress") return "Em andamento";
  return status || "Rascunho";
}

export function getStatusClass(status: string | null | undefined) {
  if (status === "published" || status === "passed") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "draft" || status === "submitted" || status === "in_progress") return "border-amber-100 bg-amber-50 text-amber-700";
  if (status === "paused" || status === "archived") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "failed") return "border-red-100 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function getScopeLabel(scope: string | null | undefined) {
  if (scope === "course") return "Curso";
  if (scope === "trail") return "Trilha";
  if (scope === "lesson") return "Aula";
  return "Curso";
}

export function getConditionLabel(condition: string | null | undefined) {
  if (condition === "after_all_lessons") return "Após concluir todas as aulas";
  if (condition === "after_course_completion") return "Após concluir o curso";
  if (condition === "after_trail_completion") return "Após concluir a trilha";
  if (condition === "after_lesson_completion") return "Após concluir a aula";
  if (condition === "manual_release") return "Liberação manual";
  return "Após concluir todas as aulas";
}

export function getQuestionTypeLabel(type: string | null | undefined) {
  if (type === "single_choice") return "Escolha única";
  if (type === "multiple_choice") return "Múltipla escolha";
  if (type === "short_text") return "Resposta curta";
  if (type === "long_text") return "Resposta longa";
  if (type === "true_false") return "Verdadeiro/Falso";
  if (type === "scale") return "Escala";
  return "Escolha única";
}

export function getItemTitle(row: Record<string, unknown>) {
  const candidates = [row.title, row.name, row.nome, row.titulo, row.label, row.slug];
  const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return String(found || "Sem título");
}
