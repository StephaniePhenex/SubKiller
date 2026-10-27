# SubKiller - Context Engineering Rules

## 1. Project Context & Migration Architecture

- **PRD Reference (CRITICAL):** Before starting any new feature or issue, read `prd_subkiller.md` at the repository root. It is the source for User Stories, Acceptance Criteria, and the core application logic.
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

## 3. UI/UX Ironclads (Rounded Neo-Brutalism)

This project strictly adheres to a "Rounded Neo-Brutalist / Pop-Art" design system. Never deviate into standard "corporate clean" or "Apple-style" minimalism.

- **Borders & Shadows (Critical):**
  - NEVER use default Tailwind soft shadows (`shadow-md`, `shadow-lg`).
  - All interactive cards, inputs, and buttons MUST use strict Neo-Brutalist utility classes with rounded corners (e.g., `rounded-2xl`, `rounded-full` for buttons).
  - Borders MUST be thick: `border-4 border-black`.
  - Shadows MUST be hard offsets: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`.
  - Focus/Active states MUST translate slightly down/right and reduce the shadow offset to simulate a physical press.
- **Color Palette (Strict Constraints):**
  - **Base Background:** "Dirty paper" off-white (`#F4F4F0`) or pure white.
  - **Primary Ink:** Pure black (`#000000`).
  - **Accents:** Toxic/Mint Green or Neon Yellow/Chartreuse MUST be used strictly as decorative highlights/stickers, NOT as global backgrounds.
  - **Negative/Cancel:** Harsh Red (`#FF0000`) is reserved exclusively for the "CANCELLED" stamp, negative scores, or deletions.
- **Typography:**
  - Strictly use Monospace fonts (e.g., Courier New, Space Mono). No generic sans-serif.
- **UI Freeze & Read-Only DOM (CRITICAL FOR EXISTING ARTIFACTS):**
  - ZERO UI MODIFICATION: When wiring backend logic, Supabase CRUD, or state management into existing components, YOU MUST NOT alter the existing HTML structure, CSS Grid/Flex layouts, or component nesting from the original Artifacts.
  - NO TRADITIONAL FORMS: Never inject generic corporate form paddings. Rely entirely on the original design artifacts (the "Receipt" aesthetic).
  - SEPARATION OF CONCERNS: Your job is to wire the JavaScript/React logic inside the existing DOM shell. Treat the provided HTML and Tailwind classes as READ-ONLY unless explicitly instructed to design a new visual element.

## 4. Backend & Database Constraints

- **Security Ironclad (Supabase RLS):**
  - ABSOLUTELY NO database operations (CRUD) can omit the `user_id` context.
  - All fetching and mutation must rely on authenticated session tokens. Row Level Security (RLS) is strictly enforced.
- **Database Naming Conventions:**
  - Supabase table names MUST be plural `snake_case` (e.g., `subscriptions`).
  - PostgreSQL column names MUST use `snake_case` (e.g., `user_id`, `ai_score`).
  - Frontend React components MUST map database responses to `camelCase` immediately upon fetching.

## 5. Core Business Logic & Data Boundaries

- **The What-If Savings Simulator:**
  - Checking or unchecking items in the Graveyard MUST instantly recalculate the 'TOTAL MONEY SAVED' figure.
  - This calculation relies on **pure client-side React state** for zero-latency UX.
  - DO NOT make round-trip database/API calls just to toggle a simulator checkbox.
- **Voice Input State Machine:**
  - The voice recording interaction must follow a strict simulated delay pipeline using `setTimeout`.
  - Flow: "Ready" -> "Recording" (simulate delay) -> "Processing" (simulate delay) -> Navigate to Edit/Confirmation Page.

## 6. Scrum & Workflow Instructions

- **Branch Naming Convention:**
  - Features: `feature/[Issue-Number]-[short-description]`
  - Bugs: `bugfix/[Issue-Number]-[short-description]`
- **Commit Message Format:**
  - Must follow Conventional Commits + Issue tracking: `[Type](#IssueNumber): [Description]`
  - Example: `feat(#4): implement what-if simulator state recalculation`
- **Pull Request Workflow:**
  - All generated code must be modular. When implementing an issue, explicitly state which Acceptance Criteria from the GitHub Issue are being fulfilled.

## 7. Testing Strategy (STRICT TDD MANDATE)

- **STRICT RED-GREEN-REFACTOR ENFORCEMENT (CRITICAL):** 
  - **You MUST write failing tests and wait for the commit BEFORE generating implementation code.** 
  - Do not bypass this rule. If a feature is requested, output the test file first.
- **Frameworks & Coverage Priorities:**
  - **Unit Tests:** Use Jest + React Testing Library to test specific business logic (e.g., verifying that the What-If Simulator accurately recalculates total savings when items are toggled).
  - **E2E Tests:** Use Cypress or Playwright to test full user flows (e.g., the Voice Input State Machine to Edit Page pipeline).
  - **DO NOT** write brittle UI component tests for Tailwind styling. Focus tests on state management and backend data flow.

## 8. Do's and Don'ts (Dependencies & A11y)

- **Do's (Preferred Libraries):**
  - ALWAYS use `lucide-react` for iconography.
  - ALWAYS use standard Tailwind CSS utility classes.
- **Do's (Accessibility - a11y):**
  - All interactive elements must have `aria-label`s.
  - Semantic HTML is mandatory.
- **Don'ts:**
  - DO NOT introduce heavy UI component libraries (like Material-UI or Ant Design). We build our own Neo-Brutalist components.
