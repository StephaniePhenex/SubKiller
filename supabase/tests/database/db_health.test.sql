-- Database health probe tests (Issue #48).
-- Run with `npm run test:db` (needs the local Supabase stack: `supabase start`).
-- Everything runs in one transaction and is rolled back.

begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email) values
  ('e5555555-5555-4555-8555-555555555555', 'health-e@subkiller.test');
insert into public.subscriptions (id, user_id, name, cost, frequency) values
  ('ee000000-0000-4000-8000-000000000001', 'e5555555-5555-4555-8555-555555555555', 'Private', 9.99, 'monthly');

-- ---------------------------------------------------------------------------
-- Shape and security of the function
-- ---------------------------------------------------------------------------
select has_function('public', 'db_health', array[]::name[], 'public.db_health() exists');
select function_returns('public', 'db_health', array[]::name[], 'boolean', 'db_health returns boolean');
select is((select prosecdef from pg_proc where oid = 'public.db_health()'::regprocedure), false,
  'db_health is SECURITY INVOKER, so it gains no privileges');
select is((select provolatile from pg_proc where oid = 'public.db_health()'::regprocedure), 's'::"char",
  'db_health is STABLE, so it cannot write');

-- ---------------------------------------------------------------------------
-- The public health endpoint calls it as anon
-- ---------------------------------------------------------------------------
set local role anon;
select is(public.db_health(), true, 'anon can run db_health and gets true');
select throws_ok(
  'select count(*) from public.subscriptions',
  '42501',
  null,
  'anon still cannot read subscriptions: the probe opens no data'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e5555555-5555-4555-8555-555555555555","role":"authenticated"}', true);
select is(public.db_health(), true, 'authenticated can run db_health');
reset role;

select ok(
  not has_function_privilege('public', 'public.db_health()', 'execute'),
  'PUBLIC has no EXECUTE grant; only anon and authenticated do'
);

select * from finish();
rollback;
