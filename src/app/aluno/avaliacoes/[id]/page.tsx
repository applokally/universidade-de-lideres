"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { StudentHeader } from "@/app/aluno/_components/StudentHeader";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Assessment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  scope_type: "course" | "trail" | "lesson";
  min_correct_percentage: number;
  attempts_allowed: number;
  time_limit_minutes: number | null;
  question_order: "fixed" | "random";
  status: string;
  is_active: boolean;
};

type Question = {
  id: string;
  assessment_id: string;
  question_type:
    | "single_choice"
    | "multiple_choice"
    | "short_text"
    | "long_text"
    | "true_false"
    | "scale";
  prompt: string;
  help_text: string | null;
  points: number;
  required: boolean;
  sort_order: number;
};

type Option = {
  id: string;
  question_id: string;
  label: string;
  sort_order: number;
};

type AnswerState = {
  selectedOptionIds: string[];
  textAnswer: string;
  numericAnswer: string;
};

type SubmitResult = {
  attempt_id: string;
  status: string;
  score_points: number;
  max_points: number;
  correct_percentage: number;
};

const mockAssessment: Assessment = {
  id: "mock-course-final",
  title: "Avaliação final do curso",
  description:
    "Modelo visual para validar a experiência do aluno respondendo uma avaliação.",
  instructions:
    "Responda as questões abaixo. Ao finalizar, o sistema mostrará o resultado.",
  scope_type: "course",
  min_correct_percentage: 70,
  attempts_allowed: 3,
  time_limit_minutes: 30,
  question_order: "fixed",
  status: "published",
  is_active: true,
};

const mockQuestions: Question[] = [
  {
    id: "mock-q1",
    assessment_id: "mock-course-final",
    question_type: "single_choice",
    prompt: "Qual atitude melhor representa liderança servidora?",
    help_text: "Escolha a alternativa mais alinhada ao conteúdo.",
    points: 1,
    required: true,
    sort_order: 1,
  },
  {
    id: "mock-q2",
    assessment_id: "mock-course-final",
    question_type: "multiple_choice",
    prompt: "Quais práticas fortalecem uma equipe?",
    help_text: "Você pode marcar mais de uma alternativa.",
    points: 1,
    required: true,
    sort_order: 2,
  },
  {
    id: "mock-q3",
    assessment_id: "mock-course-final",
    question_type: "long_text",
    prompt: "Descreva uma situação em que você aplicaria o que aprendeu.",
    help_text: "Resposta aberta para avaliar reflexão prática.",
    points: 1,
    required: true,
    sort_order: 3,
  },
];

const mockOptions: Option[] = [
  {
    id: "mock-o1",
    question_id: "mock-q1",
    label: "Ouvir, orientar e desenvolver pessoas.",
    sort_order: 1,
  },
  {
    id: "mock-o2",
    question_id: "mock-q1",
    label: "Centralizar decisões para ganhar velocidade.",
    sort_order: 2,
  },
  {
    id: "mock-o3",
    question_id: "mock-q2",
    label: "Feedback claro",
    sort_order: 1,
  },
  {
    id: "mock-o4",
    question_id: "mock-q2",
    label: "Comunicação constante",
    sort_order: 2,
  },
  {
    id: "mock-o5",
    question_id: "mock-q2",
    label: "Ausência de objetivos",
    sort_order: 3,
  },
];

function formatQuestionType(type: Question["question_type"]) {
  if (type === "single_choice") return "Escolha única";
  if (type === "multiple_choice") return "Múltipla escolha";
  if (type === "short_text") return "Resposta curta";
  if (type === "long_text") return "Resposta aberta";
  if (type === "true_false") return "Verdadeiro/Falso";
  return "Escala";
}

function getAnswerCompletion(question: Question, answer: AnswerState | undefined) {
  if (!answer) return false;

  if (["single_choice", "multiple_choice", "true_false"].includes(question.question_type)) {
    return answer.selectedOptionIds.length > 0;
  }

  if (question.question_type === "scale") {
    return answer.numericAnswer.trim().length > 0;
  }

  return answer.textAnswer.trim().length > 0;
}

export default function AlunoAssessmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assessmentId = params.id;
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);

  const loadAssessment = useCallback(async () => {
    setLoading(true);
    setMessage("");

    if (assessmentId.startsWith("mock-")) {
      setAssessment(mockAssessment);
      setQuestions(mockQuestions);
      setOptions(mockOptions);
      setLoading(false);
      return;
    }

    const [assessmentResponse, questionsResponse] = await Promise.all([
      supabase
        .from("assessments")
        .select("id,title,description,instructions,scope_type,min_correct_percentage,attempts_allowed,time_limit_minutes,question_order,status,is_active")
        .eq("id", assessmentId)
        .eq("status", "published")
        .eq("is_active", true)
        .single(),
      supabase
        .from("assessment_questions")
        .select("id,assessment_id,question_type,prompt,help_text,points,required,sort_order")
        .eq("assessment_id", assessmentId)
        .order("sort_order", { ascending: true }),
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

    const loadedQuestions = (questionsResponse.data ?? []) as Question[];

    const questionIds = loadedQuestions.map((question) => question.id);

    const optionsResponse = questionIds.length
      ? await supabase
          .from("assessment_question_options_public")
          .select("id,question_id,label,sort_order")
          .in("question_id", questionIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

    if (optionsResponse.error) {
      const fallbackOptionsResponse = questionIds.length
        ? await supabase
            .from("assessment_question_options")
            .select("id,question_id,label,sort_order")
            .in("question_id", questionIds)
            .order("sort_order", { ascending: true })
        : { data: [], error: null };

      setOptions((fallbackOptionsResponse.data ?? []) as Option[]);
    } else {
      setOptions((optionsResponse.data ?? []) as Option[]);
    }

    setAssessment(assessmentResponse.data as Assessment);
    setQuestions(loadedQuestions);
    setLoading(false);
  }, [assessmentId, supabase]);

  useEffect(() => {
    void loadAssessment();
  }, [loadAssessment]);

  const currentQuestion = questions[currentIndex];
  const optionsByQuestion = useMemo(() => {
    return options.reduce((acc, option) => {
      const current = acc.get(option.question_id) ?? [];
      current.push(option);
      acc.set(option.question_id, current);
      return acc;
    }, new Map<string, Option[]>());
  }, [options]);

  const completedRequired = questions.filter((question) =>
    question.required ? getAnswerCompletion(question, answers[question.id]) : true,
  ).length;
  const progress = questions.length
    ? Math.round((completedRequired / questions.length) * 100)
    : 0;
  const canSubmit =
    questions.length > 0 &&
    questions.every((question) =>
      question.required ? getAnswerCompletion(question, answers[question.id]) : true,
    );

  function updateAnswer(questionId: string, values: Partial<AnswerState>) {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        selectedOptionIds: current[questionId]?.selectedOptionIds ?? [],
        textAnswer: current[questionId]?.textAnswer ?? "",
        numericAnswer: current[questionId]?.numericAnswer ?? "",
        ...values,
      },
    }));
  }

  function toggleOption(question: Question, optionId: string) {
    const current = answers[question.id]?.selectedOptionIds ?? [];

    if (question.question_type === "multiple_choice") {
      updateAnswer(question.id, {
        selectedOptionIds: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      });
      return;
    }

    updateAnswer(question.id, {
      selectedOptionIds: [optionId],
    });
  }

  async function submitAssessment() {
    if (!assessment || submitting || !canSubmit) return;

    setSubmitting(true);
    setMessage("");

    if (assessment.id.startsWith("mock-")) {
      setResult({
        attempt_id: "mock",
        status: "passed",
        score_points: questions.length,
        max_points: questions.length,
        correct_percentage: 100,
      });
      setSubmitting(false);
      return;
    }

    const payload = questions.map((question) => {
      const answer = answers[question.id] ?? {
        selectedOptionIds: [],
        textAnswer: "",
        numericAnswer: "",
      };

      return {
        question_id: question.id,
        selected_option_ids: answer.selectedOptionIds,
        text_answer: answer.textAnswer,
        numeric_answer: answer.numericAnswer,
      };
    });

    const { data, error } = await supabase.rpc("assessment_submit_attempt", {
      p_assessment_id: assessment.id,
      p_answers: payload,
    });

    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const firstResult = Array.isArray(data) ? (data[0] as SubmitResult | undefined) : null;

    if (firstResult) {
      setResult(firstResult);
    }
  }

  function renderAnswer(question: Question) {
    const answer = answers[question.id];
    const questionOptions = optionsByQuestion.get(question.id) ?? [];

    if (question.question_type === "single_choice" || question.question_type === "multiple_choice" || question.question_type === "true_false") {
      return (
        <div className="mt-8 space-y-3">
          {questionOptions.map((option) => {
            const selected = answer?.selectedOptionIds.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleOption(question, option.id)}
                className={[
                  "flex w-full items-center gap-3 border px-4 py-4 text-left text-[15px] leading-6 transition",
                  selected
                    ? "border-[#DBC094] bg-[#DBC094]/12 text-white"
                    : "border-white/10 bg-white/[0.025] text-white/62 hover:border-[#DBC094]/42 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-[#DBC094] bg-[#DBC094]" : "border-white/20",
                  ].join(" ")}
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-black" /> : null}
                </span>
                {option.label}
              </button>
            );
          })}

          {!questionOptions.length ? (
            <p className="text-[13px] text-[#DBC094]">
              Esta questão ainda não possui alternativas cadastradas no ADM.
            </p>
          ) : null}
        </div>
      );
    }

    if (question.question_type === "scale") {
      return (
        <div className="mt-8 flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = answer?.numericAnswer === String(value);

            return (
              <button
                key={value}
                type="button"
                onClick={() => updateAnswer(question.id, { numericAnswer: String(value) })}
                className={[
                  "flex h-12 w-12 items-center justify-center rounded-full border text-[15px] font-black transition",
                  selected
                    ? "border-[#DBC094] bg-[#DBC094] text-black"
                    : "border-white/10 bg-white/[0.025] text-white/52 hover:border-[#DBC094]/42 hover:text-white",
                ].join(" ")}
              >
                {value}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <textarea
        value={answer?.textAnswer ?? ""}
        onChange={(event) => updateAnswer(question.id, { textAnswer: event.target.value })}
        rows={question.question_type === "short_text" ? 4 : 8}
        placeholder="Digite sua resposta..."
        className="mt-8 w-full resize-none border border-white/10 bg-white/[0.025] px-5 py-4 text-[15px] leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#DBC094]/60"
      />
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050609] text-white">
        <StudentHeader />
        <section className="mx-auto flex min-h-screen max-w-[980px] items-center justify-center px-5 pt-[84px]">
          <div className="flex items-center gap-3 text-[14px] text-white/52">
            <Loader2 className="h-4 w-4 animate-spin text-[#DBC094]" />
            Carregando avaliação...
          </div>
        </section>
      </main>
    );
  }

  if (!assessment || !currentQuestion) {
    return (
      <main className="min-h-screen bg-[#050609] text-white">
        <StudentHeader />
        <section className="mx-auto max-w-[980px] px-5 pt-[112px]">
          <Link
            href="/aluno/avaliacoes"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/46 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="mt-8 border-y border-white/10 py-12">
            <p className="text-[22px] font-black text-white">Avaliação indisponível</p>
            <p className="mt-2 text-[14px] text-white/44">
              Ela pode estar bloqueada, pausada ou sem questões cadastradas.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (result) {
    const passed = result.status === "passed";

    return (
      <main className="min-h-screen bg-[#050609] text-white">
        <StudentHeader />

        <section className="mx-auto flex min-h-screen max-w-[760px] flex-col justify-center px-5 pt-[84px]">
          <div className="border-y border-white/10 py-12 text-center">
            {passed ? (
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
            ) : (
              <XCircle className="mx-auto h-14 w-14 text-red-300" />
            )}

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
              Resultado
            </p>

            <h1 className="mt-3 text-[42px] font-black tracking-[-0.06em] text-white">
              {passed ? "Aprovado" : "Tente novamente"}
            </h1>

            <p className="mt-3 text-[15px] leading-7 text-white/52">
              Você alcançou {Number(result.correct_percentage).toFixed(0)}%. O mínimo desta avaliação é {assessment.min_correct_percentage}%.
            </p>

            <div className="mx-auto mt-8 h-3 max-w-[420px] overflow-hidden rounded-full bg-white/10">
              <div
                className={passed ? "h-full bg-emerald-300" : "h-full bg-[#DBC094]"}
                style={{
                  width: `${Math.min(100, Number(result.correct_percentage))}%`,
                }}
              />
            </div>

            <Link
              href="/aluno/avaliacoes"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-[#DBC094] px-6 text-[13px] font-black text-black transition hover:brightness-105"
            >
              Voltar para avaliações
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050609] text-white">
      <StudentHeader />

      <section className="mx-auto max-w-[1080px] px-5 pb-16 pt-[112px] sm:px-8 lg:px-10">
        <Link
          href="/aluno/avaliacoes"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/46 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para avaliações
        </Link>

        <header className="mt-7 border-b border-white/10 pb-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#DBC094]">
                Questionário
              </p>

              <h1 className="mt-3 max-w-[760px] text-[34px] font-black leading-[1.02] tracking-[-0.055em] text-white sm:text-[48px]">
                {assessment.title}
              </h1>

              {assessment.instructions ? (
                <p className="mt-4 max-w-[760px] text-[14px] leading-7 text-white/50">
                  {assessment.instructions}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[12px] font-bold text-white/48">
              <Clock3 className="h-4 w-4 text-[#DBC094]" />
              {assessment.time_limit_minutes
                ? `${assessment.time_limit_minutes} min`
                : "Sem limite"}
            </div>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#DBC094] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        {message ? (
          <div className="mt-5 rounded-[18px] border border-[#DBC094]/20 bg-[#DBC094]/8 px-4 py-3 text-[13px] text-[#DBC094]">
            {message}
          </div>
        ) : null}

        <section className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[112px]">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/32">
                Questões
              </p>

              <div className="mt-4 space-y-2">
                {questions.map((question, index) => {
                  const answered = getAnswerCompletion(question, answers[question.id]);
                  const active = index === currentIndex;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={[
                        "flex w-full items-center justify-between gap-3 border px-4 py-3 text-left transition",
                        active
                          ? "border-[#DBC094] bg-[#DBC094]/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-white/46 hover:text-white",
                      ].join(" ")}
                    >
                      <span className="text-[13px] font-bold">
                        Questão {index + 1}
                      </span>
                      {answered ? (
                        <CheckCircle2 className="h-4 w-4 text-[#DBC094]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <article>
            <div className="border-b border-white/10 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#DBC094]/22 bg-[#DBC094]/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#DBC094]">
                  Questão {currentIndex + 1} de {questions.length}
                </span>
                <span className="text-[12px] text-white/34">
                  {formatQuestionType(currentQuestion.question_type)} • {currentQuestion.points} ponto(s)
                </span>
              </div>

              <h2 className="mt-5 text-[30px] font-black leading-[1.15] tracking-[-0.05em] text-white">
                {currentQuestion.prompt}
              </h2>

              {currentQuestion.help_text ? (
                <p className="mt-3 text-[14px] leading-6 text-white/44">
                  {currentQuestion.help_text}
                </p>
              ) : null}
            </div>

            {renderAnswer(currentQuestion)}

            <footer className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
              <button
                type="button"
                onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
                disabled={currentIndex === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-[13px] font-black text-white/58 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#DBC094] px-6 text-[13px] font-black text-black transition hover:brightness-105"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitAssessment}
                  disabled={!canSubmit || submitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#DBC094] px-6 text-[13px] font-black text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Finalizar avaliação
                </button>
              )}
            </footer>
          </article>
        </section>
      </section>
    </main>
  );
}
