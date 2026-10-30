-- Issue #4: the subscriptions ledger, owned per user and protected by RLS.
-- Audio is never stored: there are no audio columns and no storage buckets.

create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 100),
  cost        numeric(10, 2) not null check (cost > 0),
  frequency   text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  feeling     text not null default '' check (char_length(feeling) <= 1000),
  -- Filled in by the AI verdict (US2); empty until the row is scored.
  ai_score    smallint check (ai_score between 0 and 100),
  verdict     text check (char_length(verdict) <= 500),
  created_at  timestamptz not null default now(),
  constraint subscriptions_score_verdict_paired
    check ((ai_score is null) = (verdict is null))
);

comment on table public.subscriptions is
  'Subscriptions a user has confessed. Rows are visible only to their owner (RLS).';

-- Covers the RLS filter, the user_id foreign key, and the newest-first list.
create index subscriptions_user_id_created_at_idx
  on public.subscriptions (user_id, created_at desc);

alter table public.subscriptions enable row level security;

-- (select auth.uid()) is evaluated once per query instead of once per row.
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "subscriptions_insert_own" on public.subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "subscriptions_update_own" on public.subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "subscriptions_delete_own" on public.subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Signed-out users get nothing. Signed-in users may write only the fields they
-- typed. ai_score and verdict (the immutable reality check) can be neither
-- inserted nor updated by a client; a trusted server path scores the row
-- (Issue #9). id and created_at keep their defaults, and user_id is set on
-- insert (checked by RLS) but can never be changed.
revoke all on table public.subscriptions from anon, authenticated;
grant select, delete on table public.subscriptions to authenticated;
grant insert (user_id, name, cost, frequency, feeling) on table public.subscriptions to authenticated;
grant update (name, cost, frequency, feeling) on table public.subscriptions to authenticated;
