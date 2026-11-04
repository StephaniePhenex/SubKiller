-- Yearly bleed aggregate tests (Issue #12).
-- Run with `npm run test:db` (needs the local Supabase stack: `supabase start`).
-- Everything runs in one transaction and is rolled back.

begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- ---------------------------------------------------------------------------
-- Fixtures (inserted as the table owner)
--   A: $15.00/month + $10.00/week + $120.00/year = 180 + 520 + 120 = $820.00/year
--   B: $999.99/month = $11,999.88/year (must never leak into A's total)
--   C: no subscriptions
--   D: 3 x $0.10/month + $15.99/week = 3.60 + 831.48 = $835.08/year (exact cents)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a1111111-1111-4111-8111-111111111111', 'bleed-a@subkiller.test'),
  ('b2222222-2222-4222-8222-222222222222', 'bleed-b@subkiller.test'),
  ('c3333333-3333-4333-8333-333333333333', 'bleed-c@subkiller.test'),
  ('d4444444-4444-4444-8444-444444444444', 'bleed-d@subkiller.test');

insert into public.subscriptions (id, user_id, name, cost, frequency) values
  ('aa000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'Streaming', 15.00, 'monthly'),
  ('aa000000-0000-4000-8000-000000000002', 'a1111111-1111-4111-8111-111111111111', 'Gym', 10.00, 'weekly'),
  ('aa000000-0000-4000-8000-000000000003', 'a1111111-1111-4111-8111-111111111111', 'Cloud', 120.00, 'yearly'),
  ('bb000000-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 'Pricey', 999.99, 'monthly'),
  ('dd000000-0000-4000-8000-000000000001', 'd4444444-4444-4444-8444-444444444444', 'Dime 1', 0.10, 'monthly'),
  ('dd000000-0000-4000-8000-000000000002', 'd4444444-4444-4444-8444-444444444444', 'Dime 2', 0.10, 'monthly'),
  ('dd000000-0000-4000-8000-000000000003', 'd4444444-4444-4444-8444-444444444444', 'Dime 3', 0.10, 'monthly'),
  ('dd000000-0000-4000-8000-000000000004', 'd4444444-4444-4444-8444-444444444444', 'Weekly odd', 15.99, 'weekly');

-- ---------------------------------------------------------------------------
-- Shape and security of the function
-- ---------------------------------------------------------------------------
select has_function('public', 'yearly_bleed', array[]::name[], 'public.yearly_bleed() exists');
select hasnt_function('public', 'yearly_bleed', array['uuid'], 'yearly_bleed takes no user id: the caller cannot pick whose rows to sum');
select function_returns('public', 'yearly_bleed', array[]::name[], 'numeric', 'yearly_bleed returns numeric, not a float');
select is((select prosecdef from pg_proc where oid = 'public.yearly_bleed()'::regprocedure), false,
  'yearly_bleed is SECURITY INVOKER, so row-level security applies to the sum');
select ok(pg_get_functiondef('public.yearly_bleed()'::regprocedure) ~* 'sum\s*\(',
  'yearly_bleed aggregates in Postgres with SUM');
select ok(has_function_privilege('authenticated', 'public.yearly_bleed()', 'execute'),
  'signed-in users can call yearly_bleed');

-- ---------------------------------------------------------------------------
-- User A: mixed frequencies, then each delete lowers the baseline
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a1111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is(public.yearly_bleed(), 820.00::numeric,
  'user A: $15/month x 12 + $10/week x 52 + $120/year x 1 = $820, and user B''s row is not included');

delete from public.subscriptions where id = 'aa000000-0000-4000-8000-000000000002';
select is(public.yearly_bleed(), 300.00::numeric, 'deleting the weekly $10 gym removes $520 (weekly x 52)');

delete from public.subscriptions where id = 'aa000000-0000-4000-8000-000000000003';
select is(public.yearly_bleed(), 180.00::numeric, 'deleting the $120/year cloud removes it once (yearly x 1)');

-- Only the monthly row is left: 15 x 12.
delete from public.subscriptions where id = 'aa000000-0000-4000-8000-000000000001';
select is(public.yearly_bleed(), 0::numeric, 'after the last delete the total is 0 (the monthly row was 15 x 12 = 180)');
select isnt(public.yearly_bleed(), null::numeric, 'an empty account gets 0, not null');

-- ---------------------------------------------------------------------------
-- Other users
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "b2222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
select is(public.yearly_bleed(), 11999.88::numeric, 'user B sees only their own $999.99/month');

select set_config('request.jwt.claims',
  '{"sub": "c3333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);
select is(public.yearly_bleed(), 0::numeric, 'a user with no subscriptions gets 0');

select set_config('request.jwt.claims',
  '{"sub": "d4444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);
select is(public.yearly_bleed(), 835.08::numeric,
  'exact cents: 3 x $0.10 x 12 + $15.99 x 52 = $835.08 (no floating-point drift)');

-- ---------------------------------------------------------------------------
-- Signed out
-- ---------------------------------------------------------------------------
reset role;
select ok(not has_function_privilege('anon', 'public.yearly_bleed()', 'execute'), 'anon cannot call yearly_bleed');

set local role anon;
select throws_ok($$ select public.yearly_bleed() $$, '42501', null, 'a signed-out call is refused');

select * from finish();
rollback;
