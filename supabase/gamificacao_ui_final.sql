-- Gamificação UNL — ajustes finais de ranking público e pontuação automática da comunidade

create or replace view public.gamification_public_ranking as
select
  ledger.user_id,
  coalesce(nullif(trim(profiles.full_name), ''), 'Aluno') as full_name,
  profiles.avatar_url,
  coalesce(sum(ledger.points), 0)::integer as earned_points,
  count(ledger.id)::integer as entries_count,
  max(ledger.created_at) as last_activity_at
from public.gamification_point_ledger ledger
left join public.profiles profiles on profiles.id = ledger.user_id
group by ledger.user_id, profiles.full_name, profiles.avatar_url;

grant select on public.gamification_public_ranking to authenticated;

create or replace function public.gamification_award_community_post_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    perform public.gamification_award_points(
      new.author_id,
      'community_post_created',
      'community_post',
      new.id,
      'Publicou na comunidade',
      jsonb_build_object('channel_id', new.channel_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gamification_community_post_points on public.community_posts;
create trigger trg_gamification_community_post_points
after insert on public.community_posts
for each row
execute function public.gamification_award_community_post_points();

create or replace function public.gamification_award_community_comment_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    perform public.gamification_award_points(
      new.author_id,
      'community_comment_created',
      'community_comment',
      new.id,
      'Comentou na comunidade',
      jsonb_build_object('post_id', new.post_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gamification_community_comment_points on public.community_comments;
create trigger trg_gamification_community_comment_points
after insert on public.community_comments
for each row
execute function public.gamification_award_community_comment_points();

create or replace function public.gamification_award_like_received_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_author uuid;
begin
  if new.reaction_type <> 'like' or new.post_id is null then
    return new;
  end if;

  select author_id
    into v_post_author
  from public.community_posts
  where id = new.post_id
  limit 1;

  if v_post_author is not null and v_post_author <> new.user_id then
    perform public.gamification_award_points(
      v_post_author,
      'community_like_received',
      'community_reaction',
      new.id,
      'Recebeu uma curtida na comunidade',
      jsonb_build_object('post_id', new.post_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gamification_like_received_points on public.community_reactions;
create trigger trg_gamification_like_received_points
after insert on public.community_reactions
for each row
execute function public.gamification_award_like_received_points();
