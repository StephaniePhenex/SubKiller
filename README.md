# SubKiller (The Honest Sub)

SubKiller is an AI-driven, Neo-Brutalist web application designed to track, evaluate, and ruthlessly eliminate vampire subscriptions. 

## Tech Stack

- Next.js 16 (App Router)

- React 19 & TypeScript 5

- Tailwind CSS 4 (Custom Design Tokens)

- Supabase (PostgreSQL + Auth)

## Getting Started

1. Clone the repository and run `npm install`.

2. Copy `.env.example` to `.env.local` and add your Supabase credentials.

3. Run `npm run dev` to start the local development server.

## Environment Variables

| Variable | Used for | Exposure | Where to set it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public (sent to the browser) | `.env.local`; Vercel → Settings → Environment Variables (Preview + Production) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key, protected by RLS | Public (sent to the browser) | `.env.local`; Vercel → Settings → Environment Variables (Preview + Production) |

- `.env.example` lists every variable with placeholder values. Never commit real values: `.env*` files other than `.env.example` are git-ignored.
- Server-only secrets (for example a Supabase service-role key or an AI provider key) must not use the `NEXT_PUBLIC_` prefix. Store them only in Vercel environment variables, and in GitHub Actions secrets only if a CI step needs them.
- CI does not need any secrets today: the unit tests do not connect to Supabase.

## CI/CD

- `.github/workflows/ci.yml` runs on every pull request to `main` and on every push to `main`: `npm ci`, `npm audit --audit-level=high`, `npm run lint`, the `DESIGN.md` lint, and `npm test`. Any failing step fails the `build-and-test` check.
- Vercel's GitHub integration builds a Deploy Preview for each pull request and deploys `main` to production on merge.

## Testing

- `npm test` runs the Jest + React Testing Library unit tests.

- `npm run test:e2e` starts the dev server and runs the Cypress end-to-end tests headlessly. Use `npm run cypress:open` for the interactive runner (with `npm run dev` already running).

- **Test-first rule:** commit a failing test before the implementation for that behavior. The test commit lands first (e.g. `test(#4): ...`), then the commit that makes it pass.

- Test state and data flow, not styling. Do not add styling-only or snapshot tests.

## Architecture & Design

- Read `docs/architecture.md` for system architecture.

- Read `DESIGN.md` for our strict Neo-Brutalist UI constraints.