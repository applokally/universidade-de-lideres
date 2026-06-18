-- Campos necessários para usar Zoom Meeting SDK nas lives.
-- Execute no Supabase SQL Editor antes de cadastrar/editar lives com SDK.

alter table public.lives
  add column if not exists zoom_sdk_enabled boolean not null default false,
  add column if not exists zoom_meeting_number text,
  add column if not exists zoom_passcode text,
  add column if not exists zoom_role integer not null default 0,
  add column if not exists zoom_join_mode text not null default 'embedded';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lives_zoom_role_check'
  ) then
    alter table public.lives
      add constraint lives_zoom_role_check
      check (zoom_role in (0, 1));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lives_zoom_join_mode_check'
  ) then
    alter table public.lives
      add constraint lives_zoom_join_mode_check
      check (zoom_join_mode in ('embedded'));
  end if;
end $$;

-- Para registros antigos do tipo zoom, mantenha o SDK desligado até informar o número da reunião.
update public.lives
set
  zoom_sdk_enabled = false,
  zoom_role = coalesce(zoom_role, 0),
  zoom_join_mode = coalesce(zoom_join_mode, 'embedded')
where broadcast_type = 'zoom'
  and zoom_meeting_number is null;
