# SubKiller - Design & UI Guidelines

## 1. Core Visual Identity: Brutalist Pop-Art

The visual language merges Brutalist UI (raw, unpolished, structural) with Pop Art (satirical consumerism, bold contrast, irony). Since the app's core message confronts the user's passive financial waste, the design must feel like a cold, harsh reality check. It rejects friendly, soft, corporate FinTech aesthetics (no rounded corners, no soft drop-shadows, no pastel gradients) in favor of aggressive, highly legible, in-your-face typography.

## 2. Typography & Color Palette

- **Typography:** Strict use of Monospace fonts (e.g., Courier New, JetBrains Mono, Space Mono) to replicate the mechanical, impersonal feel of a printed cash register receipt or a terminal log.
- **Primary Background:** Off-White / "Dirty" Paper (e.g., `#F4F4F0`), simulating cheap receipt paper.
- **Primary Ink:** Pure Black (`#000000`). Used for all text, heavy borders, and structural grids. High contrast is mandatory.
- **Pop-Art Accents:**
  - **Harsh Red (`#FF0000`):** Reserved exclusively for the "CANCELLED" or "REST IN PEACE" stamps and negative financial numbers.
  - **Toxic Yellow / Halftone highlights:** Used sparingly to highlight the AI Importance Score or to emulate the cheap, mass-produced printing aesthetic characteristic of Pop Art.

## 3. Component Styling: The "Receipt" Aesthetic

- **Heavy Borders & Grids:** Containers, input fields, and the Editable Table must feature thick, solid black borders (e.g., `border-4 border-black`).
- **Aggressive Typography:** Key data points must be oversized and confrontational. For example, the top of the Graveyard dashboard should display "YOU BLED $450 THIS YEAR" in massive, bold typography, completely dominating the visual hierarchy.
- **Flat UI:** Zero drop-shadows, zero blur effects, and zero 3D elements. Depth is created purely through stark black border offsets or flat solid-color shadows (Pop Art style).

## 4. The "Pseudo-Poster" Implementation (CSS-Only)

**Technical Constraint:** To avoid CORS rendering bugs and mobile layout breakdowns, the app will NOT utilize DOM-to-image libraries (e.g., `html2canvas`). The poster generation relies entirely on the "Screenshot Hack."

- **Visual Layout:** The bottom of the dashboard (or the generated modal) renders a dedicated HTML/CSS `div` formatted exactly like a stylized death certificate or CVS receipt.
- **The CSS Stamp Effect:** The poster features a massive red stamp applied via CSS: `transform: rotate(-15deg); border: 4px solid red; color: red; font-weight: bold;`.
- **UX Flow:** Instead of a complex "Download Image" script, the UI simply frames the CSS container perfectly on the screen and prompts the user with a bold CTA: "Screenshot to flex your savings!" This embraces native mobile user habits while maintaining absolute engineering simplicity.