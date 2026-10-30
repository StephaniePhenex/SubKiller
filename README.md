# SubKiller (The Honest Sub)

SubKiller is an AI-driven, Neo-Brutalist web application designed to track, evaluate, and ruthlessly eliminate vampire subscriptions. 

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

- `.env.example` lists every variable with placeholder values. Never commit real values: `.env*` files other than `.env.example` are git-ignored.
- Server-only secrets (for example a Supabase service-role key or an AI provider key) must not use the `NEXT_PUBLIC_` prefix. Store them only in Vercel environment variables, and in GitHub Actions secrets only if a CI step needs them.
- `NEXT_PUBLIC_` values are inlined at build time, so a changed value in Vercel only takes effect after a redeploy.
- Use the publishable key, not the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name; the app does not read the old name. Find the key in the Supabase dashboard under Project Settings → API Keys.
- The Supabase clients in `src/lib/supabase` read both variables when they are created, and no page creates one yet, so CI and the Vercel build need no values today. Add both variables to Vercel (Preview and Production) before sign-in (Issue #5) merges.

## CI/CD

- **GitHub Actions:** `.github/workflows/ci.yml` runs the `build-and-test` job on every pull request to `main` and every push to `main`: `npm ci`, `npm audit --audit-level=high`, `npm run lint`, the `DESIGN.md` lint, `npm test`, then `npm run build`. Any failing step fails the check. The workflow token is read-only (`contents: read`).
- **Database tests:** the `db-test` job starts a local Supabase stack, which applies `supabase/migrations`, and runs the pgTAP tests with `npm run test:db`. It is not a required check unless an admin adds it to the ruleset.
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