-- Ajuste de visibilidade automática das lives para alunos.
-- Regra:
-- - A live aparece para alunos enquanto estiver ativa e com status scheduled/live/ended.
-- - Ela deixa de aparecer automaticamente 30 minutos após o fim cadastrado em ends_at.
-- - Se ends_at estiver vazio, usamos starts_at + 60 minutos como duração padrão.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lives'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.lives', policy_record.policyname);
  end loop;
end $$;

create policy "Admins podem ler todas as lives"
on public.lives
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "Alunos podem ler lives publicadas nao expiradas"
on public.lives
for select
to authenticated
using (
  is_active = true
  and status in ('scheduled', 'live', 'ended')
  and now() <= (
    coalesce(ends_at, starts_at + interval '60 minutes') + interval '30 minutes'
  )
);
