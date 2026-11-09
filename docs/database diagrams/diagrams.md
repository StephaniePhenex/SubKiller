# SubKiller — System Architecture and Database Diagrams

These Mermaid diagrams describe the current application and migration-defined schema. They do not attest that migrations have been applied to a particular remote Supabase instance.

## System architecture

```mermaid
flowchart TD
    person["User / browser"]
    oauth["Google OAuth via Supabase Auth"]
    next["Next.js 16 App Router"]
    gate["Signed-in layout / getSignedInUser"]
    shell["React receipt shell"]
    confess["Confess: simulated microphone states"]
    review["Review: editable form and score preview"]
    graveyard["Graveyard: list, delete, savings"]
    poster["CSS-only death certificate"]
    local["React state: What-If selections"]
    actions["Next.js server actions"]
    repo["Subscription repository and row mapper"]
    userClient["Supabase user-scoped client"]
    verdict["Server verdict provider"]
    admin["Server-only admin client"]
    rls{"RLS and owner checks"}
    subs[("public.subscriptions")]
    aggregate["yearly_bleed() SECURITY INVOKER"]
    auth[("Supabase Auth / auth.users")]

    person --> next
    person --> oauth
    oauth --> auth
    next --> gate
    gate -->|"getUser validates session"| auth
    gate -->|authenticated| shell
    shell --> confess
    confess --> review
    shell --> graveyard
    review -->|"create subscription"| repo
    review -->|"preview and score"| actions
    actions -->|"reads row as owner"| repo
    actions --> verdict
    actions -->|"verified id and user_id; verdict-only update"| admin
    graveyard --> repo
    graveyard --> local
    local --> poster
    repo --> userClient
    userClient --> rls
    rls --> subs
    admin -->|"trusted score write; bypasses RLS"| subs
    repo -->|"RPC with authenticated session"| aggregate
    aggregate -->|"caller permissions and auth.uid()"| subs
```

**Trust boundaries.** A signed-in session is validated by Supabase Auth before entering the receipt shell. Ordinary subscription reads and writes use the authenticated user client, explicit `user_id` filters, and PostgreSQL row-level security. The admin client is server-only and records a verdict after the subscription owner has been confirmed with the user-scoped client. Temporary What-If cancellation selections and the CSS poster remain in React/UI state and do not change the stored ledger. The microphone flow is simulated; audio is not stored or transcribed.

## Database schema

```mermaid
erDiagram
    auth_users ||--o{ subscriptions : "owns via user_id"
    auth_users {
        uuid id PK
    }
    subscriptions {
        uuid id PK "not null, default gen_random_uuid()"
        uuid user_id FK "not null, default auth.uid()"
        text name "not null, 1 to 100 chars"
        numeric cost "not null, numeric(10,2), above 0"
        text frequency "not null, weekly, monthly or yearly"
        text feeling "not null, default empty, max 1000 chars"
        smallint ai_score "nullable, 0 to 100"
        text verdict "nullable, max 500 chars"
        timestamptz created_at "not null, default now()"
    }
```

The `auth_users` shape represents **Supabase-managed `auth.users`**, not a separate application table. `public.subscriptions.user_id` references `auth.users(id)` with `ON DELETE CASCADE`. The application has no separate `profiles` table in its committed database types or cited migrations.

### Database constraints and security

- `subscriptions.id`: UUID primary key, defaults to `gen_random_uuid()`.
- `subscriptions.user_id`: non-null UUID, defaults to `auth.uid()`, and references `auth.users(id)`.
- `name`: nonblank after trimming, 1–100 characters; `cost`: positive `numeric(10,2)`; `frequency`: `weekly`, `monthly`, or `yearly`; `feeling`: at most 1,000 characters.
- `ai_score`: nullable integer 0–100; `verdict`: nullable text at most 500 characters; both must be null together or populated together.
- RLS is enabled. Four owner policies for the `authenticated` role (`subscriptions_select_own`, `_insert_own`, `_update_own`, `_delete_own`) require `(select auth.uid()) = user_id`; `anon` has no policy.
- Grants: `revoke all on table public.subscriptions from anon, authenticated`, then `grant select, delete` to `authenticated`, `grant insert (user_id, name, cost, frequency, feeling)`, and `grant update (name, cost, frequency, feeling)`. Signed-in clients therefore cannot set `ai_score` or `verdict`, change `user_id`, or write `id` and `created_at`.
- A server-only admin client may write verdict columns after a prior owner check. The update matches `id`, `user_id`, and an unscored row to prevent overwriting an existing verdict.
- `subscriptions_user_id_created_at_idx` supports per-user newest-first lists.

### Database function: `yearly_bleed()`

```mermaid
flowchart LR
    user["Authenticated user"] --> rpc["RPC yearly_bleed()"]
    rpc --> invoker["SECURITY INVOKER + auth.uid()"]
    invoker --> rows["RLS-visible subscriptions"]
    rows --> calc["SUM: weekly x52; monthly x12; yearly x1"]
    calc --> total["Numeric yearly total, or 0"]
```

The zero-argument function returns `numeric` and is declared `stable security invoker` with `set search_path = ''`, so it runs with the caller's privileges and RLS applies. It also filters on `s.user_id = (select auth.uid())`. `execute` is revoked from `public` and `anon` and granted to `authenticated`. It does not accept a user ID supplied by the browser. This function is not a database table or relationship.

### Verified repository sources

- `supabase/migrations/20261030174808_create_subscriptions.sql`
- `supabase/migrations/20261104120000_create_yearly_bleed.sql`
- `src/lib/supabase/database.types.ts`
- `src/lib/subscriptions/repository.ts`
- `src/lib/ai/score-subscription.ts`
- `src/app/(app)/review/actions.ts`
- `src/app/(app)/layout.tsx`
- `src/components/receipt/GraveyardView.tsx`

These diagrams document the code and migrations, not the live remote database state.
