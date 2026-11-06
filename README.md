# SubKiller (The Honest Sub)

SubKiller is a Neo-Brutalist web application that tracks subscriptions and scores each one with a deterministic rules engine. 

## Tech Stack

- Next.js 16 (App Router)

- React 19 & TypeScript 5

- Tailwind CSS 4 (Custom Design Tokens)

- Supabase (PostgreSQL + Auth)

## Getting Started

1. Use Node.js 22 (`nvm use` reads `.nvmrc`; `package.json` sets `engines.node` to `22.x`). Clone the repository and run `npm install`.

2. Copy `.env.example` to `.env.local` and add your Supabase credentials.

3. Run `npm run dev` to start the local development server.

## Environment Variables

| Variable | Used for | Exposure | Where to set it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public (sent to the browser) | `.env.local`; Vercel → Settings → Environment Variables (Preview + Production) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_...`), protected by RLS | Public (sent to the browser) | `.env.local`; Vercel → Settings → Environment Variables (Preview + Production) |
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_...`). Used by one server write only: recording the AI score and verdict (Issue #9) | **Server only.** Bypasses RLS; never prefix with `NEXT_PUBLIC_` | `.env.local`; Vercel → Settings → Environment Variables (Preview + Production), marked Sensitive |

- `.env.example` lists every variable with placeholder values. Never commit real values: `.env*` files other than `.env.example` are git-ignored.
- Server-only secrets (for example a Supabase service-role key or an AI provider key) must not use the `NEXT_PUBLIC_` prefix. Store them only in Vercel environment variables, and in GitHub Actions secrets only if a CI step needs them.
- `NEXT_PUBLIC_` values are inlined at build time, so a changed value in Vercel only takes effect after a redeploy.
- Use the publishable key, not the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name; the app does not read the old name. Find the key in the Supabase dashboard under Project Settings → API Keys.
- The browser client, the server client, and `src/proxy.ts` read the public URL and publishable key when a request needs Supabase. `GET /api/health` does not. Jest mocks the client, and `npm run test:e2e` signs the Cypress server in with `SUBKILLER_E2E_AUTH=1`, so those jobs need no Supabase secrets. Preview and Production need all three variables, or Google sign-in and scoring fail.

## CI/CD

- **GitHub Actions:** `.github/workflows/ci.yml` runs on every pull request to `main` and every push to `main`. `build-and-test` runs `npm ci`, `npm audit --audit-level=high`, `npm run lint`, the `DESIGN.md` lint, `npm test`, then `npm run build`. The `e2e` job runs `npm run test:e2e`. Any failing step fails that job. The workflow token is read-only (`contents: read`).
- **Database tests:** the `db-test` job starts a local Supabase stack, which applies `supabase/migrations`, and runs the pgTAP tests with `npm run test:db`. `db-test` and `e2e` are not required checks unless an admin adds them to the ruleset.
- **Security scan:** `npm audit --audit-level=high` fails the check on any high or critical advisory. Do not run `npm audit fix --force` to clear lower findings: it can install breaking major versions (for example an old Jest).
- **Vercel:** the project is connected through Vercel's GitHub integration.
  - Every pull request gets a Preview deployment. The Vercel bot comments the Preview URL on the PR, and the `Vercel` status links to the build.
  - Every push to `main` (a merged PR) deploys to Production.
  - Vercel builds independently of GitHub Actions: it deploys `main` even if `build-and-test` failed. The required check below is what keeps failing code out of `main`.
- **Node.js:** CI reads `.nvmrc` (22). Vercel uses `engines.node` (`22.x`).
- **Branch protection:** the `Protect main branch` ruleset requires a pull request and a passing `build-and-test` check before merging into `main`, so a failing test blocks the merge. Only a repository admin can change this ruleset.

## Testing

- `npm test` runs the Jest + React Testing Library unit tests once and exits.

- `npm run test:e2e` starts the dev server and runs the Cypress end-to-end tests headlessly against `http://localhost:3000`. Use `npm run cypress:open` for the interactive runner (with `npm run dev` already running). If Cypress reports a missing binary, run `npx cypress install`.

- `npm run typecheck` generates Next's route types, then type-checks the app and the Cypress project.

- `npm run test:db` runs the pgTAP database tests in `supabase/tests/database` (row-level security, two-user isolation, constraints). It needs Docker and a running local stack: `npx supabase start` first, `npx supabase stop` after. After changing a migration, regenerate `src/lib/supabase/database.types.ts` with `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`.

- **Test-first rule: Commit a failing test before implementation.** The `test(#N): ...` commit lands first, then the commit that makes it pass.

- Test state and data flow, not styling. Do not add styling-only or snapshot tests. The homepage and `NeoButton` smoke tests only prove the harness runs; new tests belong on behavior such as the What-If simulator and savings math, not on more page copy.

## Architecture & Design

- Read `docs/architecture.md` for system architecture.

- Read `DESIGN.md` for our strict Neo-Brutalist UI constraints.

- Read `docs/api/openapi.yaml` for `GET /api/health` and the Review server actions.

## Scoring

The importance score is a deterministic rules engine, not a call to an external model. `src/lib/ai/provider.ts` starts at 60, subtracts up to 40 for the yearly cost, and moves the score by up to 30 for phrases in the feeling. The Review page says so: "Demo scoring: built-in rules, not an AI model." The browser never sends a score. `scoreSubscription` reads the stored row and writes `ai_score` and `verdict` once with the server secret key. Swapping in a model means replacing `getVerdictProvider()`; `parseVerdictResponse` still checks the `{ score, verdict }` JSON.