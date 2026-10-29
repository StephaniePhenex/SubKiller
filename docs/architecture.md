# SubKiller - System Architecture

## 1. System Overview
SubKiller (The Honest Sub) is a modern, client-heavy web application designed to track, evaluate, and "execute" unwanted subscriptions. The architecture follows a strict decoupled model, migrating from a static Claude Web Artifact prototype to a production-ready Next.js environment backed by Supabase.

## 2. Technology Stack
- **Frontend Framework:** Next.js (App Router) with React 18+.
- **Styling & Design System:** Tailwind CSS, strictly controlled by a centralized YAML-based design token generator (`@google/design.md` CLI) to enforce the Neo-Brutalist visual identity.
- **Backend & Database:** Supabase (PostgreSQL).
- **Authentication:** Supabase Auth (Session-based).
- **Testing Infrastructure:** Jest & React Testing Library (Unit/Component level), Cypress/Playwright (E2E flows). *Note: Testing infrastructure is handled under Issue #2 & #3.*

## 3. High-Level Architecture Flow
1. **Client Layer (Browser):**
   - Renders the Neo-Brutalist UI.
   - Manages instantaneous state recalculations (e.g., the "What-If Simulator" which relies on pure React state for zero-latency feedback without hitting the database).
2. **Next.js App Router (Server/Edge):**
   - Handles route protection, API endpoints (if needed for secure proxying), and SSR/SSG rendering optimization.
3. **Data Access Layer (Supabase SDK):**
   - The frontend communicates directly with Supabase via its client SDK for CRUD operations on the `subscriptions` table.
4. **Persistence Layer (PostgreSQL):**
   - Stores user profiles and subscription ledgers.
   - **Security:** Protected entirely by Row Level Security (RLS) policies. No query can execute without a valid `user_id` context.

## 4. Key Architectural Decisions (ADRs)
- **Zero UI Component Libraries:** Rejected Material-UI and Ant Design to maintain the integrity of the Pop-Art/Neo-Brutalist aesthetic. All components are bespoke native DOM elements styled with Tailwind.
- **Automated Token Injection:** Tailwind configurations are not hand-coded. They are dynamically generated from `DESIGN.md` to ensure a single source of truth for the design system.
- **State Machine for Voice Input:** The "Voice Input" feature bypasses native Web Speech APIs in the MVP phase, utilizing a simulated React state machine (`setTimeout` pipelines) to model the asynchronous audio processing flow.
