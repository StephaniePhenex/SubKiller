# SubKiller - Context Engineering Rules

## 1. Project Context & Migration Architecture

- **PRD Reference (CRITICAL):** Before starting any new feature or issue, read `docs/PRD.md`. It is the source for User Stories, Acceptance Criteria, and the core application logic.
- **Folder Structure (Strict Enforcement):**
  - `/src/components`: Reusable UI widgets (e.g., neo-brutalist buttons, inputs, read-only badges).
  - `/src/app`: Next.js App Router pages and API routes.
  - `/src/lib`: Supabase client setup, AI parsing logic, and third-party utility wrappers.
- **Migration Status:** This project is migrating from a self-contained HTML/CDN Artifact prototype to a real local build (**Next.js App Router + React**). Do NOT output single-file HTML or use `htm` tagged templates. Use standard `.jsx` or `.tsx`.
- **Backend Transition:** State persistence is handled by **Supabase (PostgreSQL + Auth)**.
- **Artifacts API Ban (CRITICAL):** The previous prototype used Claude Artifacts APIs. **ABSOLUTELY NO usage of** `claude.use()` **is allowed.** All external interactions must use the official Supabase SDK or standard Next.js APIs.

## 2. PRD & Core User Stories

- **Voice Input (US1):** Fast capture of subscriptions bypassing manual forms, utilizing a simulated state machine.
- **AI Score (US2):** AI-generated 0-100 'Importance Score' and verdict acting as an objective, immutable reality-check.
- **Graveyard (US3):** A dashboard listing all identified "vampire" subscriptions.
- **What-If Simulator (US4):** Instant toggle switches on graveyard items to simulate financial impact.
- **Total Savings (US5):** Real-time aggregation of money saved, displayed prominently at the top of the app.

## 3. UI/UX Ironclads

- **UI work strictly follows `DESIGN.md`:** Do not invent styles. All design tokens (Neo-Brutalist thick borders, hard offset shadows, Space Mono typography, and `#F4F4F0` paper backgrounds) MUST be strictly referenced from the root `DESIGN.md` file.
- **UI Freeze & Read-Only DOM (CRITICAL FOR EXISTING ARTIFACTS):**
  - ZERO UI MODIFICATION: When wiring backend logic, Supabase CRUD, or state management into existing components, YOU MUST NOT alter the existing HTML structure, CSS Grid/Flex layouts, or component nesting from the original Artifacts.
  - NO TRADITIONAL FORMS: Never inject generic corporate form paddings. Rely entirely on the original design artifacts (the "Receipt" aesthetic).
  - SEPARATION OF CONCERNS: Your job is to wire the JavaScript/React logic inside the existing DOM shell. Treat the provided HTML and Tailwind classes as READ-ONLY unless explicitly instructed to design a new visual element.

## 4. Backend & Database Constraints

- **Security Ironclad (Supabase RLS):**
  - ABSOLUTELY NO database operations (CRUD) can omit the `user_id` context.
  - All fetching and mutation must rely on authenticated session tokens. Row Level Security (RLS) is strictly enforced.
  - The one exception today is the trusted AI-verdict write (Issue #9), which uses the secret key. It follows the privileged-write rule below.
- **Where the user comes from:** Take the user only from Supabase `getUser()` on the request's session, as `requireUserId()` in `src/lib/subscriptions/repository.ts` does. Filter with `.eq("user_id", userId)` on top of RLS. Never accept a user id from a request body, query string, form field, or cookie value. SQL functions take no user id argument; they read `auth.uid()`, like `yearly_bleed()`.
- **RLS owns subscription ownership:** `public.subscriptions` has RLS enabled, one `*_own` policy per command for `authenticated`, and no grants to `anon`. A new table enables RLS in the same migration that creates it, with policies on `(select auth.uid()) = user_id`. Never disable RLS, add a `using (true)` policy, or widen a grant to make a query work.
- **SQL functions:** `security invoker` and `set search_path = ''`, so RLS applies. Revoke EXECUTE from `public` and `anon` unless the function is meant to be public, and grant it to the roles that need it.
- **Privileged keys stay on the server:** `SUPABASE_SECRET_KEY` is read only in `src/lib/supabase/admin.ts` (`createAdminClient()`). Use it from server actions or route handlers only. Never import it into a `"use client"` module, give it a `NEXT_PUBLIC_` prefix, or log it.
- **Privileged writes verify ownership first:** Before writing with the admin client, read the row with the user's own client, so RLS applies. Pass that verified `userId` into the write's filter. `scoreSubscription` does this: `getSubscription(userClient)` → `recordVerdict(adminClient, { id, userId })`. The write also matches its precondition (`ai_score is null`), and zero matched rows is an error, not a success.
- **Versioned migrations:** Every schema change is a new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_description.sql`. Never edit a migration that is already on `main`, and never change the schema in the Supabase dashboard. Ship pgTAP tests with the migration (Section 7), then regenerate `src/lib/supabase/database.types.ts`.
- **Database Naming Conventions:**
  - Supabase table names MUST be plural `snake_case` (e.g., `subscriptions`).
  - PostgreSQL column names MUST use `snake_case` (e.g., `user_id`, `ai_score`).
  - Frontend React components MUST map database responses to `camelCase` immediately upon fetching.
  - The mapping lives in `src/lib/subscriptions/mapper.ts` (`toSubscription`), not in components. Write paths copy only allowed fields (`toInsertRow`, `toUpdateRow`), so a stray `aiScore` or `userId` never reaches a query.

## 5. Core Business Logic & Data Boundaries

- **The What-If Savings Simulator:**
  - Checking or unchecking items in the Graveyard MUST instantly recalculate the 'TOTAL MONEY BLED' figure.
  - This calculation relies on **pure client-side React state** for zero-latency UX.
  - DO NOT make round-trip database/API calls just to toggle a simulator checkbox.
- **Voice Input State Machine:**
  - The voice recording interaction must follow a strict simulated delay pipeline using `setTimeout`.
  - Flow: "Ready" -> "Recording" (simulate delay) -> "Processing" (simulate delay) -> Navigate to Edit/Confirmation Page.

## 6. Scrum & Workflow Instructions

- **Branch Naming Convention:**
  - Features: `feature/[Issue-Number]-[short-description]`
  - Bugs: `bugfix/[Issue-Number]-[short-description]`
  - Other changes use their Conventional Commit type as the prefix, e.g. `fix/49-cypress-homepage-e2e`, `docs/50-agent-rules-readme`, `ci/...`.
- **Commit Message Format:**
  - Must follow Conventional Commits + Issue tracking: `[Type](#IssueNumber): [Description]`
  - Example: `feat(#4): implement what-if simulator state recalculation`
- **Pull Request Workflow:**
  - All generated code must be modular. When implementing an issue, explicitly state which Acceptance Criteria from the GitHub Issue are being fulfilled.
  - Every PR needs an approving review from a teammate other than its author; the `main` ruleset requires one. The author never approves or merges their own PR. Merged PRs are squash-merged.
  - Use `Closes #N` only when every acceptance criterion of the issue is met; otherwise use `Refs #N`.

## 7. Testing Strategy (STRICT TDD MANDATE)

- **STRICT RED-GREEN-REFACTOR ENFORCEMENT (CRITICAL):** 
  - **You MUST write failing tests and wait for the commit BEFORE generating implementation code.** 
  - Do not bypass this rule. If a feature is requested, output the test file first.
- **Frameworks & Coverage Priorities:**
  - **Unit Tests:** Use Jest + React Testing Library to test specific business logic (e.g., verifying that the What-If Simulator accurately recalculates total savings when items are toggled).
  - **E2E Tests:** Use Cypress or Playwright to test full user flows (e.g., the Voice Input State Machine to Edit Page pipeline). The repository uses Cypress (`cypress/e2e`, `npm run test:e2e`), so add E2E tests there rather than introducing Playwright.
  - **DO NOT** write brittle UI component tests for Tailwind styling. Focus tests on state management and backend data flow.
- **Database Tests (pgTAP):**
  - Files live in `supabase/tests/database/*.test.sql` and run with `npm run test:db`. Each file opens with `begin;` and `select plan(n);`, and ends with `select * from finish(); rollback;`, so nothing persists.
  - REQUIRED: any PR that adds or changes a table, column, constraint, grant, RLS policy, or SQL function adds or updates pgTAP tests in the same PR. Write them first, as the failing test commit.
  - Security cases are mandatory. Assert that `anon` is refused (`throws_ok(..., '42501')`), and cover cross-user isolation with two fixture users: user B can neither read, update, nor delete user A's rows. Switch users with `set local role authenticated` and `request.jwt.claims`. Assert that functions are `SECURITY INVOKER` and take no user id.
  - Aggregates: assert each normalization factor separately (weekly × 52, monthly × 12, yearly × 1). Assert exact cents with `numeric` (e.g. `835.08`, never a float), that deleting a row lowers the total by that row's yearly amount, and that an empty account returns `0`, not `null`. Keep `YEARLY_FACTOR` in `src/lib/subscriptions/yearly.ts` in step with the SQL.
  - Fixtures use fixed UUIDs and `@subkiller.test` emails. Never use real user data.

## 8. Do's and Don'ts (Dependencies & A11y)

- **Do's (Preferred Libraries):**
  - ALWAYS use `lucide-react` for iconography.
  - ALWAYS use standard Tailwind CSS utility classes.
- **Do's (Accessibility - a11y):**
  - All interactive elements must have `aria-label`s.
  - Semantic HTML is mandatory.
- **Don'ts:**
  - DO NOT introduce heavy UI component libraries (like Material-UI or Ant Design). We build our own Neo-Brutalist components.

### Build & Environment Commands

When executing tasks or providing terminal instructions, strictly adhere to these project commands:

- **Install Dependencies:** `npm install` (CI and clean checkouts use `npm ci`, which installs exactly what `package-lock.json` pins)
- **Local Development:** `npm run dev` (Runs Next.js App Router on localhost)
- **Design Tokens Generation (CRITICAL):** `npx @google/design.md export --format css-tailwind DESIGN.md > src/app/generated-theme.css` (Must be run if DESIGN.md is updated)
- **Design System Linting:** `npx @google/design.md lint DESIGN.md`
- **Testing:** `npm test` (Runs Jest unit tests)
- **Type Checking:** `npm run typecheck` (app and Cypress project)
- **E2E Tests:** `npm run test:e2e` (starts the dev server with the E2E auth harness and runs Cypress headlessly)
- **Database Tests:** `npm run test:db` (pgTAP; needs Docker and `npx supabase start`)
- **Build for Production:** `npm run build`

## 9. CI/CD & Pull Request Checks

- **Pipeline:** `.github/workflows/ci.yml` runs on every pull request to `main` and every push to `main`.
  - `build-and-test` runs `npm ci`, `npm audit --audit-level=high`, lint, the `DESIGN.md` lint, Jest, and the build.
  - `db-test` starts a local Supabase stack, which applies `supabase/migrations`, and runs pgTAP.
  - Both are required status checks on `main`. Do not rename either job, or the required check silently stops applying. Add new checks inside these jobs unless an admin also updates the ruleset.
- **Run every check that applies before asking for review:**
  - Always: lint, `npm test`, `npm run typecheck`, and `npm run build`.
  - `npm run test:e2e` when a page, route, or auth path changes.
  - `npm run test:db` when SQL changes.
  - Until CI runs typecheck and Cypress (Issue #49), those two are local-only checks, so report their results in the PR.
- **Never bypass a failing check:** No `continue-on-error`, `|| true`, `.skip` or `.only`, deleted or weakened assertions, lowered audit levels, `--no-verify`, admin-override merges, or force-pushes to `main`. Fix the cause, or leave the check red and open an issue.
- **Node 22 and existing commands:** Use Node 22 (`.nvmrc`, `engines.node: 22.x`). Use the npm scripts above instead of ad-hoc commands, and keep scripts runnable on Windows as well as in CI; a POSIX-only `VAR=value cmd` prefix fails under `cmd.exe`.
- **Test-first, peer-reviewed history:** The `test(#N): ...` commit with failing tests lands before the `feat(#N)` or `fix(#N)` commit that makes them pass. Keep them as separate commits on the PR branch. The squash merge combines them on `main`, so the PR is the record of the order. Never rewrite or amend another author's commits.
- **No real credentials in source control:** `.env.example` holds placeholders only, and `.env*` files are git-ignored. CI uses local placeholder values (e.g. `http://127.0.0.1:54321`) or GitHub Actions secrets; Jest mocks Supabase. Never print a key in logs, test output, or PR text.

