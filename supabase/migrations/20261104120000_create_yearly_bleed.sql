-- Issue #12: the Graveyard's yearly baseline, "TOTAL MONEY BLED", as a Postgres SUM.
--
-- SECURITY INVOKER: the function runs with the caller's privileges, so the
-- subscriptions RLS policies apply to the rows it sums. It takes no arguments;
-- the user comes from the session (auth.uid()), never from the browser.
--
-- Each row is normalized to a yearly amount with the same rates as the
-- client simulator (toMonthly x 12): weekly x 52, monthly x 12, yearly x 1.
-- cost is numeric(10,2), so the sum is exact to the cent.

create function public.yearly_bleed()
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    sum(
      case s.frequency
        when 'weekly' then s.cost * 52
        when 'monthly' then s.cost * 12
        when 'yearly' then s.cost
      end
    ),
    0
  )
  from public.subscriptions as s
  where s.user_id = (select auth.uid());
$$;

comment on function public.yearly_bleed() is
  'Yearly total of the signed-in user''s subscriptions (weekly x 52, monthly x 12, yearly x 1). RLS applies.';

-- Supabase grants EXECUTE on new public functions to every API role; keep it to signed-in users.
revoke all on function public.yearly_bleed() from public, anon;
grant execute on function public.yearly_bleed() to authenticated;
