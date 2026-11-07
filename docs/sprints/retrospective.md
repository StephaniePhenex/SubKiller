# Sprint 1 & Sprint 2 Retrospectives

## Sprint 1 Retrospective: Foundation, Infrastructure & Core Shell

### 1. Sprint Overview & Objectives
* **Focus**: Foundational architecture scaffolding, Supabase authentication & database setup, CI/CD automated pipeline configuration, and initial UI shell routing (Receipt Shell, Neo-brutalist styling, Google OAuth integration).
* **Delivered Issues & Assignments**:
  * **Issue 1 (Chore)**: Scaffold the Next.js App Router and Tailwind neo-brutalist tokens (2 pts / 2 hrs - Stephanie)
  * **Issue 2 (Chore)**: Add the Jest, React Testing Library, and Cypress harness (3 pts / 4 hrs - Ray)
  * **Issue 3 (Chore)**: Run tests and security checks on every pull request and deploy with Vercel (3 pts / 3 hrs - Ray)
  * **Issue 4 (Feat)**: Provision the Supabase project, subscriptions table, and row-level security (5 pts / 4 hrs - Ray)
  * **Issue 5 (Feat)**: Implement the neo-brutalist Google OAuth gate (3 pts / 4 hrs - Stephanie)
  * **Issue 6 (Feat)**: Port the receipt shell into the App Router without changing its layout (3 pts / 4 hrs - Stephanie)
* **Velocity & Metrics**:
  * **Total Planned Story Points**: 19 pts | **Delivered**: 19 pts (100% completion)
  * **Estimated Effort**: 21 hrs

### 2. What Went Well
* **Early Adoption of Neo-Brutalist Design Tokens**: Successfully codified the visual baseline using Space Mono typography, hard drop shadows, crisp `#000000` 4px borders, and high-contrast color tokens (`#F4F4F0` paper backdrop, chartreuse, harsh red), ensuring visual consistency across all subsequent views.
* **Granular Database Security & Row-Level Security (RLS)**: Enforced strict database isolation using Supabase RLS policies (`auth.uid() = user_id`) combined with Next.js Server Actions, ensuring all client operations execute strictly within the authenticated user context.
* **Automated CI/CD Quality Gates**: Embedded GitHub Actions workflows (`build-and-test`) alongside automated Vercel preview deployments from day one, guaranteeing zero regressions before any pull request could land on `main`.

### 3. What Could Be Improved
* **TDD Commit Ordering Discipline**: While the test harness was established early, several features initially combined failing tests and implementations within the same commits rather than strictly adhering to sequential `failing test -> implementation` commit pairings.
* **Mock Context vs. Live Database Alignment**: The transition between client-side mock authentication contexts and live Supabase session tokens required extra communication overhead and integration adjustments for Issue 5 (OAuth Gate).

### 4. Action Items for Next Sprint
* **Enforce Two-Phase TDD Commits**: Mandate explicit, isolated commits for failing tests before committing corresponding implementation code across all Sprint 2 feature issues.
* **Standardize Schema-to-Frontend Interface Contracts**: Pre-align snake_case PostgreSQL schema columns with frontend camelCase TypeScript interfaces prior to building active data forms.

---

## Sprint 2 Retrospective: Interactive Features, Simulation & Release Hardening

### 1. Sprint Overview & Objectives
* **Focus**: Full-stack interactive features (voice confession state machine, editable review form, immutable AI importance score, subscription graveyard), client-side What-If savings simulator, PostgreSQL `yearly_bleed()` aggregation, mobile responsive layouts, and release documentation.
* **Delivered Issues & Assignments**:
  * **Issue 7 (Feat)**: Implement the voice confession state machine (5 pts / 3 hrs - Stephanie)
  * **Issue 8 (Feat)**: Build the editable confession review form (5 pts / 3 hrs - Stephanie)
  * **Issue 9 (Feat)**: Render the immutable AI importance score and verdict (5 pts / 4 hrs - Ray)
  * **Issue 10 (Feat)**: Build the subscription graveyard list with sort and delete (5 pts / 4 hrs - Ray)
  * **Issue 11 (Feat)**: Implement the what-if savings simulator (5 pts / 3 hrs - Stephanie)
  * **Issue 12 (Feat)**: Aggregate yearly bleed with a SQL SUM and show the simulator delta (5 pts / 4 hrs - Ray)
  * **Issue 13 (Feat)**: Add the CSS-only death-certificate poster (3 pts / 3 hrs - Stephanie)
  * **Issue 14 (Feat)**: Implement mobile responsiveness and layout adaptation for Receipt Shell (3 pts / 3 hrs - Stephanie)
  * **Issue 15 (Docs)**: Refine and polish README for industrial-grade project presentation (2 pts / 3 hrs - Stephanie)
  * **Issue 16 (Docs)**: Add Contribution Log and Sprint Retrospective (2 pts / 2 hrs - Stephanie)
  * **Issue 17 (Docs)**: Add system architecture and database Mermaid diagrams (2 pts / 4 hrs - Ray)
* **Velocity & Metrics**:
  * **Total Planned Story Points**: 39 pts | **Delivered**: 39 pts (100% completion)
  * **Estimated Effort**: 34 hrs

### 2. What Went Well
* **Client-Side Simulation & Interactive State Machines**: The What-If savings simulator and confession state machine delivered instant calculations and feedback loops without round-trip network delays, seamlessly recalculating yearly financial bleed and rendering the death-certificate poster.
* **Critical Asynchronous State Bug Resolution**: Successfully discovered and patched a subtle race condition in Issue 44 where early returns in `ReviewView.tsx` could unintentionally halt asynchronous AI scoring during consecutive submissions.
* **Comprehensive Documentation & Architectural Transparency**: Published comprehensive developer documentation complete with Mermaid request lifecycle diagrams, Supabase schema ERDs, setup scripts, and accurate branch protection descriptions (`build-and-test` & `db-test` gates).

### 3. What Could Be Improved
* **PR Scope Creep & Granularity Enforcement**: Mid-sprint branches occasionally carried unmerged infrastructure files and outdated review component copies into documentation tasks (e.g., Issue 17), demanding targeted `git restore` operations to isolate diffs and prevent regressions.
* **Asynchronous Review Latency & Review Automation Friction**: Discrepancies in availability caused review bottlenecks, while over-reliance on external CLI automated reviews introduced rigid formatting checkpoints; more frequent direct synchronization would have smoothed the merge cadence.

### 4. Key Takeaways & Future Process Improvements
* **Strict Single Responsibility for PRs**: Keep documentation, core feature logic, and infrastructure/harness scripts in separate, dedicated pull requests to avoid cross-concern merge blockers.
* **Continuous Upstream Synchronization**: Rebase and synchronize active feature branches frequently against `origin/main` to safeguard upstream fixes (such as the Issue 44 async scoring fix) from being inadvertently overwritten.

---

## 5. Partner & Peer Evaluation (Cross-Feedback)

### Feedback for Ray (Evaluated by Stephanie)
* **Key Strengths**:
  * **Backend Security & Database Architecture**: Demonstrated solid competence in provisioning the Supabase PostgreSQL environment, configuring Row-Level Security (RLS) policies, and crafting the `yearly_bleed()` database aggregation function.
  * **Testing Infrastructure**: Successfully laid down the baseline Jest/Cypress testing configuration and CI workflow execution during the early setup phase.
* **Areas for Collaborative Growth**:
  * **Asynchronous Communication & PR Latency**: Accelerating response intervals during cross-functional PR reviews would reduce blocked states for dependent UI integration tasks.
  * **Decoupling Automated Auditing from Peer Reviews**: While automated review tooling and linters provide baseline checks, replacing direct peer reviews with rigid automated output occasionally created unnecessary scope blockers. A stronger focus on direct, human-to-human coordination on branch hygiene will streamline future collaborative merges.

### Feedback for Stephanie (Evaluated by Ray)
* **Key Strengths**:
  * **Frontend Engineering & State Machine Architecture**: Took complete ownership of the high-complexity client-side features, including the voice confession state machine, What-If real-time savings simulator, and responsive Neo-Brutalist design tokens.
  * **Rapid Root-Cause Debugging**: Successfully identified and resolved the critical asynchronous state race condition (#44) in the review flow, safeguarding the reliability of AI scoring and database persistence.
  * **Sprint Cadence & Delivery Rigor**: Maintained high momentum and rapid turnaround on code reviews and project documentation alignment throughout both sprints.
* **Areas for Collaborative Growth**:
  * **Branch Isolation Discipline**: In earlier iterations of documentation branches, ensuring that non-documentation code and experimental backend prototypes are isolated into separate feature branches before review will minimize merge overhead.