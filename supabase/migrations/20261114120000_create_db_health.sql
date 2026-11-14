-- Issue #48: a read-only probe for the public GET /api/health endpoint.
--
-- It reads no table and takes no arguments, so calling it reveals nothing
-- except that PostgREST reached Postgres and Postgres answered. STABLE means
-- it cannot write; SECURITY INVOKER means it gains no privileges.

create function public.db_health()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

comment on function public.db_health() is
  'Health probe for GET /api/health. Returns true when Postgres answers. Reads no data.';

-- Supabase grants EXECUTE on new public functions to every API role; name them explicitly.
revoke all on function public.db_health() from public;
grant execute on function public.db_health() to anon, authenticated;
