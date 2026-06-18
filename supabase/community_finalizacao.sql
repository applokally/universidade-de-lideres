-- Comunidade UNL — ajustes finais de produção

alter table public.community_posts
add column if not exists is_featured boolean not null default false,
add column if not exists allow_comments boolean not null default true,
add column if not exists archived_at timestamptz,
add column if not exists archived_by uuid references auth.users(id) on delete set null,
add column if not exists archive_reason text,
add column if not exists do_not_auto_archive boolean not null default false;

create index if not exists community_posts_status_created_idx
on public.community_posts (status, created_at desc);

create index if not exists community_posts_channel_status_created_idx
on public.community_posts (channel_id, status, created_at desc);

create table if not exists public.community_saved_posts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists community_saved_posts_unique
on public.community_saved_posts (post_id, user_id);

alter table public.community_saved_posts enable row level security;

drop policy if exists "Admins gerenciam salvos da comunidade" on public.community_saved_posts;
create policy "Admins gerenciam salvos da comunidade"
on public.community_saved_posts
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Alunos visualizam próprios posts salvos da comunidade" on public.community_saved_posts;
create policy "Alunos visualizam próprios posts salvos da comunidade"
on public.community_saved_posts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Alunos salvam posts da comunidade" on public.community_saved_posts;
create policy "Alunos salvam posts da comunidade"
on public.community_saved_posts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Alunos removem posts salvos da comunidade" on public.community_saved_posts;
create policy "Alunos removem posts salvos da comunidade"
on public.community_saved_posts
for delete
to authenticated
using (user_id = auth.uid());

create table if not exists public.community_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.community_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.community_notification_deliveries
add column if not exists delivered_at timestamptz not null default now(),
add column if not exists read_at timestamptz,
add column if not exists clicked_at timestamptz,
add column if not exists created_at timestamptz not null default now();

create unique index if not exists community_notification_deliveries_unique
on public.community_notification_deliveries (notification_id, user_id);

create index if not exists community_notification_deliveries_user_read_idx
on public.community_notification_deliveries (user_id, read_at, clicked_at);

alter table public.community_notification_deliveries enable row level security;

drop policy if exists "Admins gerenciam entregas de notificacoes" on public.community_notification_deliveries;
create policy "Admins gerenciam entregas de notificacoes"
on public.community_notification_deliveries
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Alunos visualizam proprias entregas de notificacoes" on public.community_notification_deliveries;
create policy "Alunos visualizam proprias entregas de notificacoes"
on public.community_notification_deliveries
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Alunos criam proprias entregas de notificacoes" on public.community_notification_deliveries;
create policy "Alunos criam proprias entregas de notificacoes"
on public.community_notification_deliveries
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Alunos atualizam proprias entregas de notificacoes" on public.community_notification_deliveries;
create policy "Alunos atualizam proprias entregas de notificacoes"
on public.community_notification_deliveries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.archive_old_community_posts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_count integer;
begin
  update public.community_posts
  set
    status = 'archived',
    archived_at = now(),
    archive_reason = coalesce(archive_reason, 'auto_7_days')
  where coalesce(status, 'pending') not in ('archived', 'deleted')
    and coalesce(is_pinned, false) = false
    and coalesce(is_featured, false) = false
    and coalesce(do_not_auto_archive, false) = false
    and created_at < now() - interval '7 days';

  get diagnostics archived_count = row_count;

  return archived_count;
end;
$$;

create table if not exists public.community_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.community_settings (key, value)
values
  ('auto_archive_days', '7'::jsonb),
  ('allow_student_posts', 'true'::jsonb),
  ('require_post_approval', 'false'::jsonb),
  ('allow_reports', 'true'::jsonb)
on conflict (key) do nothing;

alter table public.community_settings enable row level security;

drop policy if exists "Admins gerenciam configuracoes da comunidade" on public.community_settings;
create policy "Admins gerenciam configuracoes da comunidade"
on public.community_settings
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));
