-- Row-level security tests for public.subscriptions (Issue #4).
-- Run with `npm run test:db` (needs the local Supabase stack: `supabase start`).
-- Everything runs in one transaction and is rolled back.

begin;
create extension if not exists pgtap with schema extensions;

select plan(57);

-- ---------------------------------------------------------------------------
-- Fixtures: two users with one subscription each (inserted as the table owner)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'user-a@subkiller.test'),
  ('22222222-2222-4222-8222-222222222222', 'user-b@subkiller.test');

insert into public.subscriptions (id, user_id, name, cost, frequency, feeling, ai_score, verdict) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Netflix', 15.99, 'monthly', 'Kind of guilty.', 20, 'You rewatched one sitcom twice.'),
  ('b0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'Gym', 54.00, 'monthly', 'I will go next week.', 18, 'Two visits since January.');

-- ---------------------------------------------------------------------------
-- Schema: exact columns (no audio), types, keys, RLS, policies, index, storage
-- ---------------------------------------------------------------------------
select has_table('public', 'subscriptions', 'subscriptions table exists');
select columns_are('public', 'subscriptions',
  array['id', 'user_id', 'name', 'cost', 'frequency', 'feeling', 'ai_score', 'verdict', 'created_at'],
  'subscriptions has exactly the Issue #4 columns, with no audio columns');

select col_type_is('public', 'subscriptions', 'id', 'uuid', 'id is uuid');
select col_type_is('public', 'subscriptions', 'user_id', 'uuid', 'user_id is uuid');
select col_type_is('public', 'subscriptions', 'name', 'text', 'name is text');
select col_type_is('public', 'subscriptions', 'cost', 'numeric(10,2)', 'cost is numeric(10,2)');
select col_type_is('public', 'subscriptions', 'frequency', 'text', 'frequency is text');
select col_type_is('public', 'subscriptions', 'feeling', 'text', 'feeling is text');
select col_type_is('public', 'subscriptions', 'ai_score', 'smallint', 'ai_score is smallint');
select col_type_is('public', 'subscriptions', 'verdict', 'text', 'verdict is text');
select col_type_is('public', 'subscriptions', 'created_at', 'timestamp with time zone', 'created_at is timestamptz');

select col_is_pk('public', 'subscriptions', 'id', 'id is the primary key');
select fk_ok('public', 'subscriptions', 'user_id', 'auth', 'users', 'id', 'user_id references auth.users');

select col_not_null('public', 'subscriptions', 'user_id', 'user_id is required');
select col_not_null('public', 'subscriptions', 'name', 'name is required');
select col_not_null('public', 'subscriptions', 'cost', 'cost is required');
select col_not_null('public', 'subscriptions', 'frequency', 'frequency is required');
select col_not_null('public', 'subscriptions', 'feeling', 'feeling is required');
select col_not_null('public', 'subscriptions', 'created_at', 'created_at is required');
select col_is_null('public', 'subscriptions', 'ai_score', 'ai_score may be empty until the AI scores the row');
select col_is_null('public', 'subscriptions', 'verdict', 'verdict may be empty until the AI scores the row');

select ok(
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.subscriptions')), false),
  'row-level security is enabled'
);
select policies_are('public', 'subscriptions',
  array['subscriptions_select_own', 'subscriptions_insert_own', 'subscriptions_update_own', 'subscriptions_delete_own'],
  'subscriptions has exactly the four owner policies');
select policy_roles_are('public', 'subscriptions', 'subscriptions_select_own', array['authenticated'], 'select policy is for authenticated users only');
select policy_roles_are('public', 'subscriptions', 'subscriptions_insert_own', array['authenticated'], 'insert policy is for authenticated users only');
select policy_roles_are('public', 'subscriptions', 'subscriptions_update_own', array['authenticated'], 'update policy is for authenticated users only');
select policy_roles_are('public', 'subscriptions', 'subscriptions_delete_own', array['authenticated'], 'delete policy is for authenticated users only');

select has_index('public', 'subscriptions', 'subscriptions_user_id_created_at_idx',
  array['user_id', 'created_at'], 'list query index on (user_id, created_at)');

select is((select count(*)::int from storage.buckets), 0, 'no storage buckets exist, so recordings cannot be stored');

-- ---------------------------------------------------------------------------
-- Signed out (anon)
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok($$ select id from public.subscriptions $$, '42501', null, 'anon cannot read subscriptions');
select throws_ok(
  $$ insert into public.subscriptions (user_id, name, cost, frequency)
     values ('11111111-1111-4111-8111-111111111111', 'Sneaky', 1, 'monthly') $$,
  '42501', null, 'anon cannot insert subscriptions');

-- ---------------------------------------------------------------------------
-- Reads: each user sees only their own rows
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select results_eq($$ select id from public.subscriptions $$,
  $$ values ('a0000000-0000-4000-8000-000000000001'::uuid) $$, 'user A sees only their own row');
select is_empty($$ select id from public.subscriptions where id = 'b0000000-0000-4000-8000-000000000001' $$,
  'user A cannot read user B''s row by id');

select set_config('request.jwt.claims',
  '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

select results_eq($$ select id from public.subscriptions $$,
  $$ values ('b0000000-0000-4000-8000-000000000001'::uuid) $$, 'user B sees only their own row');

-- ---------------------------------------------------------------------------
-- Inserts (as user A)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.subscriptions (name, cost, frequency)
     values ('Spotify', 11.99, 'monthly') $$,
  'user A can insert a row without naming user_id');
select is((select user_id from public.subscriptions where name = 'Spotify'),
  '11111111-1111-4111-8111-111111111111'::uuid, 'user_id defaults to the signed-in user');
select throws_ok(
  $$ insert into public.subscriptions (user_id, name, cost, frequency)
     values ('22222222-2222-4222-8222-222222222222', 'Planted', 9.99, 'monthly') $$,
  '42501', null, 'user A cannot insert a row owned by user B');

-- The AI fields and the defaults cannot be chosen by the client on insert
select throws_ok(
  $$ insert into public.subscriptions (name, cost, frequency, ai_score, verdict)
     values ('Forged', 5, 'monthly', 100, 'Keep it.') $$,
  '42501', null, 'user A cannot insert their own ai_score and verdict');
select throws_ok(
  $$ insert into public.subscriptions (name, cost, frequency, created_at)
     values ('Backdated', 5, 'monthly', now() - interval '1 year') $$,
  '42501', null, 'user A cannot choose created_at on insert');

-- ---------------------------------------------------------------------------
-- Updates (as user A)
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ update public.subscriptions set name = 'Netflix Premium', cost = 22.99, frequency = 'monthly', feeling = 'Still guilty.'
     where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'user A can update the editable fields of their own row');
select is((select name from public.subscriptions where id = 'a0000000-0000-4000-8000-000000000001'),
  'Netflix Premium', 'user A''s update was applied');
select is_empty(
  $$ update public.subscriptions set name = 'Hacked'
     where id = 'b0000000-0000-4000-8000-000000000001' returning id $$,
  'user A cannot update user B''s row');

-- Ownership transfer and the immutable AI fields
select throws_ok(
  $$ update public.subscriptions set user_id = '22222222-2222-4222-8222-222222222222'
     where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'user A cannot transfer their row to user B');
select is((select user_id from public.subscriptions where id = 'a0000000-0000-4000-8000-000000000001'),
  '11111111-1111-4111-8111-111111111111'::uuid, 'the row still belongs to user A');
select throws_ok(
  $$ update public.subscriptions set ai_score = 99 where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'ai_score cannot be edited');
select throws_ok(
  $$ update public.subscriptions set verdict = 'Totally worth it.' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'verdict cannot be edited');
select throws_ok(
  $$ update public.subscriptions set created_at = now() - interval '1 year' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'created_at cannot be edited');

-- ---------------------------------------------------------------------------
-- Deletes (as user A)
-- ---------------------------------------------------------------------------
select is_empty(
  $$ delete from public.subscriptions where id = 'b0000000-0000-4000-8000-000000000001' returning id $$,
  'user A cannot delete user B''s row');
select lives_ok(
  $$ delete from public.subscriptions where name = 'Spotify' $$,
  'user A can delete their own row');
select is_empty($$ select id from public.subscriptions where name = 'Spotify' $$,
  'user A''s deleted row is gone');

-- ---------------------------------------------------------------------------
-- Constraints (as user A)
-- ---------------------------------------------------------------------------
select throws_ok($$ insert into public.subscriptions (name, cost, frequency) values ('Free', 0, 'monthly') $$,
  '23514', null, 'cost must be above 0');
select throws_ok($$ insert into public.subscriptions (name, cost, frequency) values ('   ', 5, 'monthly') $$,
  '23514', null, 'name cannot be blank');
select throws_ok($$ insert into public.subscriptions (name, cost, frequency) values ('Daily', 5, 'daily') $$,
  '23514', null, 'frequency must be weekly, monthly, or yearly');

-- ---------------------------------------------------------------------------
-- User B's row survived everything user A tried
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

select results_eq(
  $$ select id, user_id, name from public.subscriptions $$,
  $$ values ('b0000000-0000-4000-8000-000000000001'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, 'Gym'::text) $$,
  'user B still has exactly their original row, unchanged');

-- ---------------------------------------------------------------------------
-- Score constraints (as the table owner, the trusted path that scores rows)
-- ---------------------------------------------------------------------------
reset role;

select throws_ok(
  $$ insert into public.subscriptions (user_id, name, cost, frequency, ai_score, verdict)
     values ('11111111-1111-4111-8111-111111111111', 'Overrated', 5, 'monthly', 101, 'Too high.') $$,
  '23514', null, 'ai_score must be between 0 and 100');
select throws_ok(
  $$ insert into public.subscriptions (user_id, name, cost, frequency, ai_score)
     values ('11111111-1111-4111-8111-111111111111', 'Half scored', 5, 'monthly', 50) $$,
  '23514', null, 'ai_score and verdict must be set together');

-- ---------------------------------------------------------------------------
-- Deleting a user removes their subscriptions
-- ---------------------------------------------------------------------------
delete from auth.users where id = '11111111-1111-4111-8111-111111111111';

select is((select count(*)::int from public.subscriptions where user_id = '11111111-1111-4111-8111-111111111111'),
  0, 'deleting user A removes their subscriptions');

select * from finish();
rollback;
