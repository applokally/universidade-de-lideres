begin;

-- Remove overlapping legacy constraints. Their intersection rejected valid PDF
-- lessons and several material types that the current UI already supports.
alter table public.lessons
  drop constraint if exists lessons_content_type_check,
  drop constraint if exists lessons_content_type_check_v2;

alter table public.lessons
  add constraint lessons_content_type_check
  check (content_type = any (array['video', 'text', 'pdf', 'audio', 'live']));

alter table public.lesson_assets
  drop constraint if exists lesson_assets_asset_type_check,
  drop constraint if exists lesson_assets_asset_type_check_v2;

alter table public.lesson_assets
  add constraint lesson_assets_asset_type_check
  check (
    asset_type = any (
      array[
        'pdf',
        'document',
        'link',
        'image',
        'audio',
        'spreadsheet',
        'presentation',
        'download',
        'other'
      ]
    )
  );

-- Community media and moderation settings.
alter table public.community_comments
  add column if not exists image_path text;

alter table public.community_posts
  drop constraint if exists community_posts_status_check;

alter table public.community_posts
  add constraint community_posts_status_check
  check (status = any (array['published', 'pending', 'hidden', 'deleted', 'archived']));

insert into public.community_settings (key, value)
values
  ('allow_student_comments', 'true'::jsonb),
  ('require_comment_approval', 'false'::jsonb),
  ('allow_media_uploads', 'true'::jsonb),
  (
    'community_rules',
    to_jsonb(
      'Participe com respeito, mantenha as conversas relacionadas ao aprendizado e não publique dados pessoais ou conteúdo ofensivo.'::text
    )
  )
on conflict (key) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'community_settings'
      and policyname = 'Students view community settings'
  ) then
    create policy "Students view community settings"
      on public.community_settings for select
      to authenticated
      using (true);
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Resumable uploads still obey the bucket limit. Keep enough room for long
-- training videos while the platform-wide Supabase plan limit remains in force.
update storage.buckets
set file_size_limit = 2147483648
where id = 'lesson-content';

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users read community media'
  ) then
    create policy "Authenticated users read community media"
      on storage.objects for select
      to authenticated
      using (bucket_id = 'community-media');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload own community media'
  ) then
    create policy "Users upload own community media"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'community-media'
        and (storage.foldername(name))[2] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users manage own community media'
  ) then
    create policy "Users manage own community media"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'community-media'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      with check (
        bucket_id = 'community-media'
        and (storage.foldername(name))[2] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users delete own community media'
  ) then
    create policy "Users delete own community media"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'community-media'
        and (storage.foldername(name))[2] = auth.uid()::text
      );
  end if;
end
$$;

-- Configurable challenges. Student progress is calculated from the existing
-- immutable point ledger, so no duplicate progress state can drift.
create table if not exists public.gamification_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null,
  target_count integer not null default 1 check (target_count > 0),
  points_reward integer not null default 0 check (points_reward >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamification_challenges_period_check
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists gamification_challenges_active_period_idx
  on public.gamification_challenges (is_active, starts_at, ends_at, sort_order);

drop trigger if exists set_gamification_challenges_updated_at
  on public.gamification_challenges;
create trigger set_gamification_challenges_updated_at
  before update on public.gamification_challenges
  for each row execute function public.set_updated_at();

alter table public.gamification_challenges enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gamification_challenges'
      and policyname = 'Admins manage gamification challenges'
  ) then
    create policy "Admins manage gamification challenges"
      on public.gamification_challenges
      to authenticated
      using (public.is_admin_user(auth.uid()))
      with check (public.is_admin_user(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gamification_challenges'
      and policyname = 'Students view active gamification challenges'
  ) then
    create policy "Students view active gamification challenges"
      on public.gamification_challenges for select
      to authenticated
      using (
        is_active = true
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now())
      );
  end if;
end
$$;

grant select, insert, update, delete on public.gamification_challenges to authenticated;

create unique index if not exists gamification_challenge_reward_once_idx
  on public.gamification_point_ledger (user_id, event_type, reference_id)
  where event_type = 'challenge_completed' and reference_id is not null;

create or replace function public.award_completed_gamification_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge_record public.gamification_challenges%rowtype;
  event_count integer;
begin
  if new.event_type = 'challenge_completed' then
    return new;
  end if;

  for challenge_record in
    select *
    from public.gamification_challenges
    where is_active = true
      and event_type = new.event_type
      and (starts_at is null or starts_at <= new.created_at)
      and (ends_at is null or ends_at >= new.created_at)
  loop
    select count(*)::integer
      into event_count
    from public.gamification_point_ledger
    where user_id = new.user_id
      and event_type = challenge_record.event_type
      and (challenge_record.starts_at is null or created_at >= challenge_record.starts_at)
      and (challenge_record.ends_at is null or created_at <= challenge_record.ends_at);

    if event_count >= challenge_record.target_count then
      insert into public.gamification_point_ledger (
        user_id,
        event_type,
        points,
        reference_type,
        reference_id,
        description,
        metadata
      )
      values (
        new.user_id,
        'challenge_completed',
        challenge_record.points_reward,
        'challenge',
        challenge_record.id,
        'Desafio concluído: ' || challenge_record.title,
        jsonb_build_object('challenge_id', challenge_record.id)
      )
      on conflict (user_id, event_type, reference_id)
        where event_type = 'challenge_completed' and reference_id is not null
      do nothing;
    end if;
  end loop;

  return new;
end
$$;

drop trigger if exists trg_award_completed_gamification_challenge
  on public.gamification_point_ledger;
create trigger trg_award_completed_gamification_challenge
  after insert on public.gamification_point_ledger
  for each row execute function public.award_completed_gamification_challenge();

commit;
