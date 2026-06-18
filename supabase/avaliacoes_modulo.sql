-- Módulo de Avaliações UNL
-- Execute no Supabase SQL Editor antes de aplicar as telas.

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  instructions text,
  scope_type text not null default 'course'
    check (scope_type in ('course', 'trail', 'lesson')),
  course_id uuid,
  trail_id uuid,
  lesson_id uuid,
  trail_evaluation_mode text not null default 'per_course'
    check (trail_evaluation_mode in ('per_course', 'general')),
  access_condition text not null default 'after_all_lessons'
    check (access_condition in ('after_all_lessons', 'after_course_completion', 'after_trail_completion', 'after_lesson_completion', 'manual_release')),
  min_correct_percentage integer not null default 70
    check (min_correct_percentage >= 0 and min_correct_percentage <= 100),
  certificate_required boolean not null default true,
  attempts_allowed integer not null default 3 check (attempts_allowed >= 1),
  time_limit_minutes integer,
  question_order text not null default 'fixed' check (question_order in ('fixed', 'random')),
  show_feedback_after_attempt boolean not null default true,
  show_correct_answers_after_pass boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'archived')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessments_scope_idx on public.assessments (scope_type, course_id, trail_id, lesson_id);
create index if not exists assessments_status_idx on public.assessments (status, is_active);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_type text not null default 'single_choice'
    check (question_type in ('single_choice', 'multiple_choice', 'short_text', 'long_text', 'true_false', 'scale')),
  prompt text not null,
  help_text text,
  points integer not null default 1 check (points >= 0),
  required boolean not null default true,
  sort_order integer not null default 0,
  correct_text_response text,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessment_questions_assessment_idx on public.assessment_questions (assessment_id, sort_order);

create table if not exists public.assessment_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists assessment_question_options_question_idx on public.assessment_question_options (question_id, sort_order);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'passed', 'failed', 'cancelled')),
  score_points numeric not null default 0,
  max_points numeric not null default 0,
  correct_percentage numeric not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists assessment_attempts_assessment_idx on public.assessment_attempts (assessment_id, created_at desc);
create index if not exists assessment_attempts_user_idx on public.assessment_attempts (user_id, created_at desc);

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  text_answer text,
  numeric_answer numeric,
  is_correct boolean,
  points_awarded numeric not null default 0,
  graded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists assessment_answers_attempt_idx on public.assessment_answers (attempt_id);

alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_question_options enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;

drop policy if exists "Admins gerenciam avaliacoes" on public.assessments;
create policy "Admins gerenciam avaliacoes" on public.assessments for all to authenticated
using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));

drop policy if exists "Alunos visualizam avaliacoes publicadas" on public.assessments;
create policy "Alunos visualizam avaliacoes publicadas" on public.assessments for select to authenticated
using (is_active = true and status = 'published');

drop policy if exists "Admins gerenciam questoes" on public.assessment_questions;
create policy "Admins gerenciam questoes" on public.assessment_questions for all to authenticated
using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));

drop policy if exists "Alunos visualizam questoes de avaliacoes publicadas" on public.assessment_questions;
create policy "Alunos visualizam questoes de avaliacoes publicadas" on public.assessment_questions for select to authenticated
using (exists (select 1 from public.assessments a where a.id = assessment_questions.assessment_id and a.is_active = true and a.status = 'published'));

drop policy if exists "Admins gerenciam alternativas" on public.assessment_question_options;
create policy "Admins gerenciam alternativas" on public.assessment_question_options for all to authenticated
using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));

drop policy if exists "Alunos visualizam alternativas de avaliacoes publicadas" on public.assessment_question_options;
create policy "Alunos visualizam alternativas de avaliacoes publicadas" on public.assessment_question_options for select to authenticated
using (
  exists (
    select 1 from public.assessment_questions q
    join public.assessments a on a.id = q.assessment_id
    where q.id = assessment_question_options.question_id
      and a.is_active = true
      and a.status = 'published'
  )
);

drop policy if exists "Admins visualizam tentativas" on public.assessment_attempts;
create policy "Admins visualizam tentativas" on public.assessment_attempts for all to authenticated
using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));

drop policy if exists "Alunos gerenciam proprias tentativas" on public.assessment_attempts;
create policy "Alunos gerenciam proprias tentativas" on public.assessment_attempts for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Admins visualizam respostas" on public.assessment_answers;
create policy "Admins visualizam respostas" on public.assessment_answers for all to authenticated
using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));

drop policy if exists "Alunos gerenciam proprias respostas" on public.assessment_answers;
create policy "Alunos gerenciam proprias respostas" on public.assessment_answers for all to authenticated
using (exists (select 1 from public.assessment_attempts at where at.id = assessment_answers.attempt_id and at.user_id = auth.uid()))
with check (exists (select 1 from public.assessment_attempts at where at.id = assessment_answers.attempt_id and at.user_id = auth.uid()));
