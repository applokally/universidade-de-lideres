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
