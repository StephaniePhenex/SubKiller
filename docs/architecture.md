# SubKiller - System Architecture

## 1. System Overview
SubKiller (The Honest Sub) is a client-heavy web application that tracks, evaluates, and "executes" unwanted subscriptions. The app is a Next.js 16 App Router frontend backed by Supabase (PostgreSQL and Auth). It was migrated from a static prototype into this repository.

## 2. Technology Stack
- **Frontend Framework:** Next.js 16 App Router with React 19.
- **Styling & Design System:** Tailwind CSS. Visual tokens live in `DESIGN.md` and are generated with the `@google/design.md` CLI. Icons come from Lucide React. The receipt palette is the source of truth:
  - **Hex codes:** Paper `#F4F4F0`, Ink `#000000`, Harsh Red `#FF0000`, Mint `#8CEDB0`, and Chartreuse `#E2FB72`.
  - **Shadows:** `4px 4px 0` for small cards and inputs, `6px 6px 0` for buttons and standard cards, and `10px 10px 0` for the main receipt and the poster.
  - **Neon color:** Chartreuse (`#E2FB72`) is the background fill for the TOTAL MONEY BLED panel, the Login button, and the Mic button.
  - **Score color:** Harsh Red (`#FF0000`) for scores under 30, Chartreuse (`#E2FB72`) for 30–69, and Mint (`#8CEDB0`) for 70 and above.
  - **Font weight:** Space Mono is strictly 400 and 700. The poster stamp is weight 700 (`font-bold`).
- **Backend & Database:** Supabase (PostgreSQL and Auth).
- **Authentication:** Supabase Auth, using the Google OAuth provider so each session is a Supabase JWT. The receipt shell treats a request as signed in when a `subkiller-session` cookie or an `sb-*-auth-token` cookie is present. The local cookie is the stand-in until Google OAuth is connected.
- **Testing Infrastructure:** Strict red-green-refactor. A failing test is written and committed before implementation code. Jest and React Testing Library cover unit and component behavior. Cypress or Playwright covers end-to-end flows.

## 3. High-Level Architecture Flow
1. **Client Layer (Browser):**
   - Renders the Neo-Brutalist receipt shell.
   - Routes: `/` is the login gate. `/confess`, `/review`, and `/graveyard` render inside the signed-in shell.
   - The What-If Simulator flips each subscription's killed flag in React state and recalculates TOTAL MONEY BLED on the client. Those toggles do not call the database.
2. **Next.js 16 App Router (Server):**
   - The signed-in layout checks the session before rendering the receipt shell.
   - Server Components own the route shell. Interactive lists, the voice state machine, and the poster modal are Client Components.
3. **Data Access Layer (Supabase SDK):**
   - Subscription CRUD goes to Supabase (PostgreSQL and Auth) through the Supabase client.
   - The table is `subscriptions` (plural `snake_case`). The React layer maps each row to `camelCase` as soon as it is fetched.
   - Every query and mutation includes the signed-in `user_id`.
4. **Persistence Layer (PostgreSQL):**
   - Stores user profiles and subscription ledgers.
   - **Security:** Row Level Security (RLS) is enforced per `user_id`. A query cannot run without that user context.
   - The Confess control handles microphone permission, then runs Ready → Recording (simulated delay) → Processing (simulated delay) with `setTimeout`, and opens the editable review form. A recording is transcribed and discarded immediately. Audio files are never saved to the database.

## 4. Key Architectural Decisions
- **Zero UI Component Libraries:** Material UI and Ant Design are rejected. Components are bespoke DOM elements styled with Tailwind, following `DESIGN.md`.
- **Automated Token Injection:** Tailwind color, type, radius, and spacing tokens are generated from `DESIGN.md`. The receipt's hard shadows are the 4px, 6px, and 10px offsets in that file. They are not soft Tailwind shadows.
- **Client-side simulator:** Checking, unchecking, or deleting a graveyard row updates local React state and the savings total immediately.
- **CSS-only poster:** GENERATE MY POSTER opens a full-screen CSS death certificate. The user screenshots it. `html2canvas` is not used.
- **Voice input state machine:** The mic flow asks for microphone permission, then uses `setTimeout` for Ready → Recording → Processing before opening Review. The recording is transcribed and discarded immediately. Audio files are never written to the database.
- **CI/CD:** Vercel provides automated deployments and Deploy Previews. GitHub Actions runs testing and security scanning on every pull request.
