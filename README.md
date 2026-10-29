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

## Testing

- `npm test` runs the Jest + React Testing Library unit tests.

- `npm run test:e2e` starts the dev server and runs the Cypress end-to-end tests headlessly. Use `npm run cypress:open` for the interactive runner (with `npm run dev` already running).

- **Test-first rule:** commit a failing test before the implementation for that behavior. The test commit lands first (e.g. `test(#4): ...`), then the commit that makes it pass.

- Test state and data flow, not styling. Do not add styling-only or snapshot tests.

## Architecture & Design

- Read `docs/architecture.md` for system architecture.

- Read `DESIGN.md` for our strict Neo-Brutalist UI constraints.