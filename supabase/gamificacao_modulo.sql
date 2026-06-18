create table if not exists public.gamification_point_rules (
  id uuid primary key default gen_random_uuid(),
  event_type text not null unique,
  title text not null,
  description text,
  points integer not null default 0,
  daily_limit integer,
  monthly_limit integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gamification_point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  points integer not null,
  reference_type text,
  reference_id uuid,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists gamification_point_ledger_once_per_reference
on public.gamification_point_ledger (user_id, event_type, reference_type, reference_id)
where reference_id is not null;

create index if not exists gamification_point_ledger_user_created_idx
on public.gamification_point_ledger (user_id, created_at desc);

create table if not exists public.gamification_rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_required integer not null default 0,
  reward_type text not null default 'benefit',
  image_path text,
  stock integer,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gamification_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.gamification_rewards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points_spent integer not null default 0,
  status text not null default 'pending',
  admin_note text,
  redeemed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create table if not exists public.gamification_badges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  icon text,
  requirement_type text not null default 'points',
  requirement_value integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gamification_user_badges (
  id uuid primary key default gen_random_uuid(),
  badge_id uuid not null references public.gamification_badges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references auth.users(id) on delete set null,
  unique (badge_id, user_id)
);

create or replace function public.gamification_award_points(
  p_user_id uuid,
  p_event_type text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.gamification_point_rules%rowtype;
  v_daily_count integer;
  v_monthly_count integer;
  v_id uuid;
begin
  select * into v_rule
  from public.gamification_point_rules
  where event_type = p_event_type and is_active = true
  limit 1;

  if not found then return null; end if;

  if v_rule.daily_limit is not null then
    select count(*) into v_daily_count
    from public.gamification_point_ledger
    where user_id = p_user_id and event_type = p_event_type
      and created_at >= date_trunc('day', now());
    if v_daily_count >= v_rule.daily_limit then return null; end if;
  end if;

  if v_rule.monthly_limit is not null then
    select count(*) into v_monthly_count
    from public.gamification_point_ledger
    where user_id = p_user_id and event_type = p_event_type
      and created_at >= date_trunc('month', now());
    if v_monthly_count >= v_rule.monthly_limit then return null; end if;
  end if;

  insert into public.gamification_point_ledger(user_id,event_type,points,reference_type,reference_id,description,metadata)
  values (p_user_id,p_event_type,v_rule.points,p_reference_type,p_reference_id,coalesce(p_description,v_rule.title),coalesce(p_metadata,'{}'::jsonb))
  on conflict do nothing
  returning id into v_id;

  return v_id;
end;
$$;

alter table public.gamification_point_rules enable row level security;
alter table public.gamification_point_ledger enable row level security;
alter table public.gamification_rewards enable row level security;
alter table public.gamification_reward_redemptions enable row level security;
alter table public.gamification_badges enable row level security;
alter table public.gamification_user_badges enable row level security;

drop policy if exists "Admins gerenciam regras de gamificacao" on public.gamification_point_rules;
create policy "Admins gerenciam regras de gamificacao" on public.gamification_point_rules for all to authenticated using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));
drop policy if exists "Alunos visualizam regras ativas de gamificacao" on public.gamification_point_rules;
create policy "Alunos visualizam regras ativas de gamificacao" on public.gamification_point_rules for select to authenticated using (is_active = true);

drop policy if exists "Admins gerenciam pontuacao" on public.gamification_point_ledger;
create policy "Admins gerenciam pontuacao" on public.gamification_point_ledger for all to authenticated using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));
drop policy if exists "Alunos visualizam propria pontuacao" on public.gamification_point_ledger;
create policy "Alunos visualizam propria pontuacao" on public.gamification_point_ledger for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins gerenciam recompensas" on public.gamification_rewards;
create policy "Admins gerenciam recompensas" on public.gamification_rewards for all to authenticated using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));
drop policy if exists "Alunos visualizam recompensas ativas" on public.gamification_rewards;
create policy "Alunos visualizam recompensas ativas" on public.gamification_rewards for select to authenticated using (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));

drop policy if exists "Admins gerenciam resgates" on public.gamification_reward_redemptions;
create policy "Admins gerenciam resgates" on public.gamification_reward_redemptions for all to authenticated using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));
drop policy if exists "Alunos visualizam proprios resgates" on public.gamification_reward_redemptions;
create policy "Alunos visualizam proprios resgates" on public.gamification_reward_redemptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "Alunos criam proprios resgates" on public.gamification_reward_redemptions;
create policy "Alunos criam proprios resgates" on public.gamification_reward_redemptions for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Admins gerenciam conquistas" on public.gamification_badges;
create policy "Admins gerenciam conquistas" on public.gamification_badges for all to authenticated using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));
drop policy if exists "Alunos visualizam conquistas ativas" on public.gamification_badges;
create policy "Alunos visualizam conquistas ativas" on public.gamification_badges for select to authenticated using (is_active = true);

drop policy if exists "Admins gerenciam conquistas dos alunos" on public.gamification_user_badges;
create policy "Admins gerenciam conquistas dos alunos" on public.gamification_user_badges for all to authenticated using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));
drop policy if exists "Alunos visualizam proprias conquistas" on public.gamification_user_badges;
create policy "Alunos visualizam proprias conquistas" on public.gamification_user_badges for select to authenticated using (user_id = auth.uid());

insert into public.gamification_point_rules(event_type,title,description,points,daily_limit,monthly_limit,sort_order) values
('lesson_completed','Aula concluída','Aluno concluiu uma aula publicada.',10,null,null,10),
('course_completed','Curso concluído','Aluno finalizou um curso completo.',80,null,null,20),
('trail_completed','Trilha concluída','Aluno finalizou uma trilha completa.',150,null,null,30),
('live_attended','Participou de live','Aluno participou de uma aula ao vivo.',25,null,null,40),
('community_post_created','Publicou na comunidade','Aluno criou uma publicação válida na comunidade.',5,3,60,50),
('community_comment_created','Comentou na comunidade','Aluno comentou em uma publicação.',2,10,200,60),
('community_like_received','Recebeu curtida','Publicação ou comentário recebeu curtida.',1,20,400,70),
('assessment_passed','Avaliação aprovada','Aluno foi aprovado em uma avaliação.',50,null,null,80),
('daily_streak','Sequência diária','Aluno manteve uma rotina de estudo.',15,1,31,90)
on conflict (event_type) do update set title=excluded.title,description=excluded.description,points=excluded.points,daily_limit=excluded.daily_limit,monthly_limit=excluded.monthly_limit,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.gamification_rewards(title,description,points_required,reward_type,stock,is_active) values
('Certificado de destaque','Destaque especial para alunos com alta participação.',500,'certificate_highlight',null,true),
('Mentoria coletiva prioritária','Prioridade para participar de uma mentoria coletiva.',800,'mentorship',50,true),
('Selo de líder engajado','Selo especial exibido no perfil do aluno.',300,'badge',null,true)
on conflict do nothing;

insert into public.gamification_badges(title,description,icon,requirement_type,requirement_value,sort_order,is_active) values
('Primeiros passos','Concluiu as primeiras atividades na plataforma.','sparkles','points',100,10,true),
('Aluno engajado','Alcançou 500 pontos de participação.','flame','points',500,20,true),
('Líder em formação','Alcançou 1.000 pontos na jornada.','trophy','points',1000,30,true),
('Voz da comunidade','Participou ativamente da comunidade.','message-circle','community',50,40,true)
on conflict do nothing;
