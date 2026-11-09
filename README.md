# SubKiller (The Honest Sub)

SubKiller is a Neo-Brutalist web application that tracks subscriptions and scores each one with a deterministic rules engine.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149ECA)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_Auth-3FCF8E)
![Jest](https://img.shields.io/badge/Jest-30-C21325)
![Cypress](https://img.shields.io/badge/Cypress-16-69D3A7)

## Features

- **OAuth Gate.** `/` is a Neo-Brutalist login card. Sign-in is Google OAuth through Supabase. The signed-in layout calls `getUser()` and opens the receipt only when Supabase returns a user.
- **Confession State Machine.** Confess asks for microphone permission, then moves Ready → Recording → Processing on simulated delays and opens Review. The audio tracks are stopped and discarded. Nothing is transcribed, and Review shows the editable sample unless the URL already carries the confession fields.
- **What-If Simulator.** Graveyard checkboxes flip a killed flag in React state and recalculate TOTAL MONEY BLED on the client, with no database round trip. The importance score beside a confession is the built-in rules engine, not a call to an external model.
- **Graveyard.** The signed-in list loads that user's subscriptions, sorted weakest score first, and can delete a row after Supabase confirms.

## Getting Started

Use Node.js 22. `nvm use` reads `.nvmrc`, and `package.json` sets `engines.node` to `22.x`.

```bash
git clone https://github.com/StephaniePhenex/SubKiller.git
cd SubKiller
nvm use
npm install
cp .env.example .env.local
npm run dev
```

The dev server runs at `http://localhost:3000`. Fill `.env.local` from the table below before Google sign-in or scoring.

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
- The browser client and the server client in `src/lib/supabase` read the public URL and publishable key. Jest mocks the client, so `build-and-test` needs no Supabase secrets. Preview and Production need all three variables, or Google sign-in and scoring fail.

## CI/CD

- **GitHub Actions:** `.github/workflows/ci.yml` runs on every pull request to `main` and every push to `main`. `build-and-test` runs `npm ci`, `npm audit --audit-level=high`, `npm run lint`, the `DESIGN.md` lint, `npm test`, then `npm run build`. Any failing step fails that job. The workflow token is read-only (`contents: read`).
- **Database tests:** the `db-test` job starts a local Supabase stack, which applies `supabase/migrations`, and runs the pgTAP tests with `npm run test:db`.
- **Security scan:** `npm audit --audit-level=high` fails the check on any high or critical advisory. Do not run `npm audit fix --force` to clear lower findings: it can install breaking major versions (for example an old Jest).
- **Vercel:** the project is connected through Vercel's GitHub integration.
  - Every pull request gets a Preview deployment. The Vercel bot comments the Preview URL on the PR, and the `Vercel` status links to the build.
  - Every push to `main` (a merged PR) deploys to Production.
  - Vercel builds independently of GitHub Actions. The ruleset below is what keeps failing code out of `main`.
- **Node.js:** CI reads `.nvmrc` (22). Vercel uses `engines.node` (`22.x`).
- **Branch protection:** The Protect main branch ruleset requires both `build-and-test` and `db-test` status checks, plus 1 approving review. Only a repository admin can change this ruleset.

## Testing

- `npm test` runs the Jest + React Testing Library unit tests once and exits.

- `npm run test:e2e` starts the dev server and runs the Cypress end-to-end tests headlessly against `http://localhost:3000`. Use `npm run cypress:open` for the interactive runner (with `npm run dev` already running). If Cypress reports a missing binary, run `npx cypress install`.

- `npm run typecheck` generates Next's route types, then type-checks the app and the Cypress project.

- `npm run test:db` runs the pgTAP database tests in `supabase/tests/database` (row-level security, two-user isolation, constraints). It needs Docker and a running local stack: `npx supabase start` first, `npx supabase stop` after. After changing a migration, regenerate `src/lib/supabase/database.types.ts` with `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`.

- **Test-first rule: Commit a failing test before implementation.** The `test(#N): ...` commit lands first, then the commit that makes it pass.

- Test state and data flow, not styling. Do not add styling-only or snapshot tests. The homepage and `NeoButton` smoke tests only prove the harness runs; new tests belong on behavior such as the What-If simulator and savings math, not on more page copy.

## Architecture & Design

- [Architecture](docs/architecture.md)
- [DESIGN.md](DESIGN.md)
- [agents.md](agents.md)
- [PRD](docs/PRD.md)
- [OpenAPI](docs/api/openapi.yaml) documents the input and result shapes of the Review server actions `previewVerdict` and `scoreSubscription`.
- [Architecture and database diagrams](docs/database%20diagrams/) cover the system architecture, the `subscriptions` schema and RLS, and the `yearly_bleed()` flow (Mermaid).

## Scoring

The importance score is a deterministic rules engine, not a call to an external model. `src/lib/ai/provider.ts` starts at 60, subtracts up to 40 for the yearly cost, and moves the score by up to 30 for phrases in the feeling. The Review page says so: "Demo scoring: built-in rules, not an AI model." The browser never sends a score. `scoreSubscription` reads the stored row and writes `ai_score` and `verdict` once with the server secret key. Swapping in a model means replacing `getVerdictProvider()`; `parseVerdictResponse` still checks the `{ score, verdict }` JSON.

## Team & Sprint Logs

- [Sprint 1 standup, Oct 27](docs/sprints/sprint-1/standup-10-27.md)
- [Sprint 1 standup, Oct 28](docs/sprints/sprint-1/standup-10-28.md)
