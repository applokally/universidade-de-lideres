-- Avaliações UNL — área do aluno, respostas e correção
-- Execute no Supabase SQL Editor após o arquivo supabase/avaliacoes_modulo.sql.

create table if not exists public.assessment_manual_releases (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  released_by uuid references auth.users(id) on delete set null,
  released_at timestamptz not null default now(),
  note text,
  unique (assessment_id, user_id)
);

alter table public.assessment_manual_releases enable row level security;

drop policy if exists "Admins gerenciam liberacoes de avaliacao" on public.assessment_manual_releases;
create policy "Admins gerenciam liberacoes de avaliacao"
on public.assessment_manual_releases
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Alunos visualizam proprias liberacoes de avaliacao" on public.assessment_manual_releases;
create policy "Alunos visualizam proprias liberacoes de avaliacao"
on public.assessment_manual_releases
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Alunos visualizam alternativas de avaliacoes publicadas" on public.assessment_question_options;

create or replace view public.assessment_question_options_public as
select
  options.id,
  options.question_id,
  options.label,
  options.sort_order
from public.assessment_question_options options;

grant select on public.assessment_question_options_public to authenticated;

create or replace function public.assessment_submit_attempt(
  p_assessment_id uuid,
  p_answers jsonb
)
returns table (
  attempt_id uuid,
  status text,
  score_points numeric,
  max_points numeric,
  correct_percentage numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_assessment public.assessments%rowtype;
  v_attempts_count integer;
  v_attempt_id uuid;
  v_question public.assessment_questions%rowtype;
  v_answer jsonb;
  v_selected_option_ids uuid[];
  v_correct_option_ids uuid[];
  v_text_answer text;
  v_numeric_answer numeric;
  v_is_correct boolean;
  v_points_awarded numeric;
  v_score numeric := 0;
  v_max numeric := 0;
  v_percentage numeric := 0;
  v_final_status text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select *
    into v_assessment
  from public.assessments
  where id = p_assessment_id
    and is_active = true
    and status = 'published'
  limit 1;

  if not found then
    raise exception 'Avaliação indisponível.';
  end if;

  select count(*)
    into v_attempts_count
  from public.assessment_attempts
  where assessment_id = p_assessment_id
    and user_id = v_user_id
    and status in ('submitted', 'passed', 'failed');

  if v_attempts_count >= v_assessment.attempts_allowed then
    raise exception 'Limite de tentativas atingido.';
  end if;

  insert into public.assessment_attempts (
    assessment_id,
    user_id,
    status,
    started_at
  )
  values (
    p_assessment_id,
    v_user_id,
    'in_progress',
    now()
  )
  returning id into v_attempt_id;

  for v_question in
    select *
    from public.assessment_questions
    where assessment_id = p_assessment_id
    order by sort_order asc
  loop
    v_answer := null;
    v_selected_option_ids := '{}'::uuid[];
    v_correct_option_ids := '{}'::uuid[];
    v_text_answer := null;
    v_numeric_answer := null;
    v_is_correct := null;
    v_points_awarded := 0;

    v_max := v_max + coalesce(v_question.points, 0);

    select answer_item
      into v_answer
    from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) answer_item
    where answer_item->>'question_id' = v_question.id::text
    limit 1;

    if v_answer is not null then
      select coalesce(array_agg(value::uuid order by value), '{}'::uuid[])
        into v_selected_option_ids
      from jsonb_array_elements_text(coalesce(v_answer->'selected_option_ids', '[]'::jsonb)) value;

      v_text_answer := nullif(trim(coalesce(v_answer->>'text_answer', '')), '');

      if nullif(trim(coalesce(v_answer->>'numeric_answer', '')), '') is not null then
        v_numeric_answer := (v_answer->>'numeric_answer')::numeric;
      end if;
    end if;

    if v_question.question_type in ('single_choice', 'multiple_choice', 'true_false', 'scale') then
      select coalesce(array_agg(id order by id), '{}'::uuid[])
        into v_correct_option_ids
      from public.assessment_question_options
      where question_id = v_question.id
        and is_correct = true;

      if cardinality(v_correct_option_ids) > 0 then
        v_is_correct := v_selected_option_ids = v_correct_option_ids;
        if v_is_correct then
          v_points_awarded := coalesce(v_question.points, 0);
        end if;
      end if;
    elsif v_question.question_type in ('short_text', 'long_text') then
      if nullif(trim(coalesce(v_question.correct_text_response, '')), '') is not null then
        v_is_correct :=
          lower(trim(coalesce(v_text_answer, ''))) =
          lower(trim(coalesce(v_question.correct_text_response, '')));

        if v_is_correct then
          v_points_awarded := coalesce(v_question.points, 0);
        end if;
      end if;
    end if;

    v_score := v_score + coalesce(v_points_awarded, 0);

    insert into public.assessment_answers (
      attempt_id,
      question_id,
      selected_option_ids,
      text_answer,
      numeric_answer,
      is_correct,
      points_awarded,
      graded_at
    )
    values (
      v_attempt_id,
      v_question.id,
      coalesce(v_selected_option_ids, '{}'::uuid[]),
      v_text_answer,
      v_numeric_answer,
      v_is_correct,
      coalesce(v_points_awarded, 0),
      case when v_is_correct is null then null else now() end
    );
  end loop;

  if v_max > 0 then
    v_percentage := round((v_score / v_max) * 100, 2);
  else
    v_percentage := 0;
  end if;

  v_final_status :=
    case
      when v_percentage >= v_assessment.min_correct_percentage then 'passed'
      else 'failed'
    end;

  update public.assessment_attempts
  set
    status = v_final_status,
    score_points = v_score,
    max_points = v_max,
    correct_percentage = v_percentage,
    submitted_at = now(),
    graded_at = now()
  where id = v_attempt_id;

  return query
  select
    v_attempt_id as attempt_id,
    v_final_status as status,
    v_score as score_points,
    v_max as max_points,
    v_percentage as correct_percentage;
end;
$$;

grant execute on function public.assessment_submit_attempt(uuid, jsonb) to authenticated;
