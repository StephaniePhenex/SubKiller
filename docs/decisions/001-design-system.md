# # ADR 001: Adopt Neo-Brutalism for UI Framework

- **Date:** 2026-10-27

- **Context:** The application needs to simulate the "pain" of financial loss. Standard corporate UI frameworks (like Material-UI) feel too safe and detached.

- **Decision:** We will use a bespoke Neo-Brutalist design system. All UI work will strictly follow the custom Tailwind tokens generated from `DESIGN.md` (hard shadows, thick borders, Space Mono). No third-party component libraries will be used.

- **Consequences:** Higher initial CSS configuration overhead, but distinct product identity and strict aesthetic consistency.