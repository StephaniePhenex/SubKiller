# Product Requirements Document (PRD): SubKiller (The Honest Sub)

## 1. Product Context & Positioning
- **Product Name:** SubKiller (The Honest Sub)
- **Core Concept:** A frictionless, AI-driven financial reality check that exposes the true cost of subscription waste. It transforms the dreaded chore of financial auditing into a highly satisfying, gamified act of reclaiming personal wealth by confronting the "Subjective Perception Gap."
- **Target Output:** A brutal, cold financial reality check presented as a CVS receipt or a satirical "death certificate" for canceled subscriptions, ready to be screenshotted and flexed on social media.
- **UI/UX Aesthetic:** **Rounded Neo-Brutalism / Pop-Art.** Thick black borders (`border-4`) and pill-shaped buttons (`rounded-full`).
  * **Hex codes:** Paper `#F4F4F0`, Ink `#000000`, Harsh Red `#FF0000`, Mint `#8CEDB0`, and Chartreuse `#E2FB72`.
  * **Shadows:** `10px 10px 0 #000000` for the main receipt and the poster, `6px 6px 0 #000000` for buttons and standard cards, and `4px 4px 0 #000000` for small cards and inputs. Compact elements use `3px 3px 0 #000000`: the delete button, the CANCELLED stamp, and the Review score badge. The delete button hover is `2px 2px 0 #000000`, translated down and right. An invalid input uses a harsh red offset, `4px 4px 0 #FF0000`, instead of black.
  * **Neon color:** Chartreuse (`#E2FB72`) fills the TOTAL MONEY BLED panel, the Login button, and the selected Review frequency chip (Weekly, Monthly, or Yearly). Mint (`#8CEDB0`) fills the active navigation pill (Confess, Review, or Graveyard). The Mic button is Chartreuse when Ready, Ink (`#000000`) when Recording, and White (`#FFFFFF`) when Processing.
  * **Radius:** 24px (`rounded-3xl`) for the receipt shell, Login card, TOTAL MONEY BLED panel, and poster. 16px (`rounded-2xl`) for inner cards, including Graveyard rows.
  * **Font weight:** Space Mono is strictly 400 and 700. `font-weight: 400` is reserved for general body copy. `font-weight: 700` (`font-bold`) is used for headings, buttons, form labels, totals, and the poster stamps.

## 2. Core User Stories (US0 - US5)

- **US0: Authentication (The Gatekeeper)**
  * **Description:** As a user, I need to log in securely so my financial data remains private across sessions.
  * **Acceptance Criteria:** 
    * A brutalist landing page with a giant "Login with Google" button.
    * Utilizes Supabase Auth with the Google OAuth provider, so each session is a Supabase JWT.
    * The receipt shell treats a request as signed in when a `subkiller-session` cookie or an `sb-*-auth-token` cookie is present. The local cookie is the stand-in until Google OAuth is connected.

- **US1: Voice Input & Confession**
  * **Description:** Log subscriptions quickly by speaking out details (name, cost, usage frequency, subjective feeling) to bypass tedious manual form entry.
  * **Acceptance Criteria:**
    * System handles microphone permissions gracefully.
    * UI displays clear state transitions: Ready -> Recording (simulated delay) -> Processing (simulated delay).
    * Extracted data auto-populates a brutally styled, editable frontend form for review.

- **US2: AI-Powered Importance Score (The Verdict)**
  * **Description:** Receive an objective 0-100 score and a blunt one-sentence reality check based on cost, frequency, and sentiment.
  * **Acceptance Criteria:**
    * Output is strictly constrained to a JSON format containing `score` (0-100) and `verdict`.
    * Rendered as a compact, read-only Pop-Art badge aligned horizontally with the verdict text. Harsh Red (`#FF0000`) for scores under 30, Chartreuse (`#E2FB72`) for 30–69, and Mint (`#8CEDB0`) for 70 and above. **The user CANNOT edit this score; it is an immutable reality check.**

- **US3: Subscription Graveyard Dashboard**
  * **Description:** View all identified "vampire" subscriptions in a highly legible, receipt-like list.
  * **Acceptance Criteria:**
    * Fetches and renders a list of subscriptions (Name, Cost, AI Score) from the Supabase database.
    * Each card includes a brutalist delete `[ X ]` or Trash icon to permanently remove incorrect entries from the database and the UI.

- **US4: What-If Savings Simulator**
  * **Description:** Select/deselect subscriptions in the Graveyard to instantly simulate financial impact.
  * **Acceptance Criteria:**
    * Each subscription card features a massive checkbox/toggle.
    * Toggling a checkbox triggers immediate, zero-latency React client-side state updates.
    * This satisfies the "Complex State Management" requirement.

- **US5: Total Money Saved Aggregation**
  * **Description:** See the total aggregated waste/savings calculated dynamically.
  * **Acceptance Criteria:**
    * Backend calculates the baseline total utilizing a database aggregate query (e.g., SQL SUM).
    * Displayed at the top in massive, aggressive typography ("TOTAL MONEY BLED: $XXX/Year") on a Chartreuse (`#E2FB72`) background.
    * Dynamically recalculates in real-time when the What-If Simulator (US4) is toggled or when an item is deleted.

## 3. Core Business Logic & Boundaries

- **The Pop-Art Poster (CSS-Only Visual Export):**
  * A purely visual reward mechanism replacing complex image export logic to prevent CORS/rendering bugs.
  * Triggered by a "GENERATE MY POSTER" button at the bottom of the Graveyard.
  * Opens a full-screen CSS-only Modal structured like a CVS receipt or death certificate.
  * Includes a massive CSS stamp effect (`transform: rotate(-15deg); border: 8px solid #FF0000; color: #FF0000; font-weight: 700;`) stating "REST IN PEACE" or "CANCELLED". The stamp is Space Mono at weight 700 (`font-bold`).
  * Prompts the user to "Screenshot to flex" (**NO external libraries like `html2canvas` allowed**).

- **Data Privacy Boundary:**
  * Voice recordings must be transcribed and immediately discarded. Audio files are NEVER saved to the database.

## 4. Non-Functional Requirements & Architecture

- **Tech Stack:**
  * Frontend: Next.js 16 App Router + React 19 + Tailwind CSS + Lucide React.
  * Backend & Database: Supabase (PostgreSQL and Auth), accessed through the Supabase client.
- **Data Management (Security Ironclad):**
  * Strict Row Level Security (RLS) enforced per `user_id` in Supabase. Absolutely no database operations can omit the `user_id` context.
  * Table names must be plural `snake_case`, and mapped to `camelCase` in the React frontend.
- **Testing (TDD Mandate):**
  * **Strict Red-Green-Refactor enforcement.** Failing tests MUST be written and committed (Jest/React Testing Library for units, Cypress/Playwright for E2E) BEFORE any implementation code is generated or committed.
- **CI/CD & DevOps:**
  * Vercel for automated deployments and Deploy Previews.
  * GitHub Actions configured to run testing and security scanning on every Pull Request.