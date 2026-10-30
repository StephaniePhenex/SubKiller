---
version: alpha
name: SubKiller
colors:
  primary: "#000000"
  paper: "#F4F4F0"
  ink: "#000000"
  blood: "#FF0000"
  mint: "#8CEDB0"
  chartreuse: "#E2FB72"
typography:
  mono:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: 400
    lineHeight: "1.5"
  mono-bold:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: 700
    lineHeight: "1.5"
spacing:
  border-thick: 4px
rounded:
  card: 16px
  shell: 24px
  pill: 9999px
---

## Overview

SubKiller (The Honest Sub) utilizes a Neo-Brutalist (Pop-Art) design system. The visual language is intentionally aggressive, designed to simulate the "pain" of financial loss through high-contrast colors, harsh borders, and raw typography.

## Colors

- **Paper `#F4F4F0`**: The page background, simulating dirty receipt paper.

- **White `#FFFFFF`**: Receipt cards and input surfaces that sit on the paper.

- **Ink `#000000`**: Text, borders, and hard shadows.

- **Blood `#FF0000`**: The negative "still bleeding" figure, the delete hover, and the cancellation stamps.

- **Mint `#8CEDB0`**: Score badge for 70 and above, and the background fill for the active navigation pill (Confess, Review, or Graveyard).

- **Chartreuse `#E2FB72`**: Background fill for the TOTAL MONEY BLED panel, the Login button, and the selected frequency chip on Review (Weekly, Monthly, or Yearly). Also the score badge for 30–69. The Mic button is Chartreuse only while it is Ready.

- **Mic button states:** Chartreuse (`#E2FB72`) when Ready, Ink (`#000000`) when Recording, and White (`#FFFFFF`) when Processing.

- **Score color:** Harsh Red (`#FF0000`) for scores under 30, Chartreuse (`#E2FB72`) for 30–69, and Mint (`#8CEDB0`) for 70 and above.

## Typography

- **Primary Font**: `Space Mono` is applied globally to mimic receipt printer output and raw data formatting. No sans-serif fonts are permitted.

- **Font weight:** Space Mono is strictly 400 and 700. `font-weight: 400` is reserved for general body copy. `font-weight: 700` (`font-bold`) is the UI hierarchy weight for headings, buttons, form labels, totals, and the poster stamps.

## Layout

- Layouts are blocky, utilizing explicit framing and compartmentalization. Components are distinctly separated by heavy ink borders.

- The signed-in app is one receipt shell. Confess, Review, and Graveyard are routes inside that shell.

## Elevation & Depth

- **Zero Soft Shadows**: Default diffuse shadows (e.g., `shadow-md`) are strictly prohibited. Shadows are hard black offsets with no blur.

- **Pop-Art offset scale**:
  - **Large (`10px 10px 0 #000000`)**: the main receipt shell and the poster sheet.
  - **Default (`6px 6px 0 #000000`)**: buttons and standard cards. A pressed button translates down and right until this shadow collapses.
  - **Small (`4px 4px 0 #000000`)**: compact cards and inputs.
  - **Compact (`3px 3px 0 #000000`)**: the delete button, the CANCELLED stamp, and the Review score badge.
  - **Delete hover (`2px 2px 0 #000000`)**: the delete button on hover, translated down and right.
  - **Error (`4px 4px 0 #FF0000`)**: an invalid input uses this harsh red offset instead of a black shadow.

## Shapes

- **Borders**: Thick `4px` solid black borders are standard for cards, inputs, and buttons.

- **Corners**:
  - **24px (`rounded-3xl`)**: major outer containers. The receipt shell, the Login card, the TOTAL MONEY BLED panel, and the full-screen poster.
  - **16px (`rounded-2xl`)**: inner standard cards, including Graveyard rows.
  - **Pill (`rounded-full`)**: buttons, including the navigation pills and the delete control.

## Components

- **Buttons**: Pill-shaped, thick black border, hard offset shadow, and a physical press state (translate down-right while shrinking the shadow).

- **Cards**: Used as receipts or distinct data blocks, heavily outlined.

- **Score badge**: A read-only pill. Red under 30, chartreuse from 30 to 69, mint at 70 and above.

- **Poster stamp**: "REST IN PEACE", rotated −15°, with an `8px` solid `#FF0000` border and red text at weight 700. Graveyard rows that are marked killed carry a separate "CANCELLED" stamp.

## Do's and Don'ts

- **Do**: Keep layouts high-contrast. Use Space Mono at 400 for body copy and 700 for headings, buttons, form labels, totals, and poster stamps. Use the 10px, 6px, 4px, 3px, and delete-hover 2px hard offsets.

- **Don't**: Use Material UI, Ant Design, or any soft gradient/blur effects. Do not use gray borders. Do not export the poster with `html2canvas`; the poster is a CSS modal the user screenshots.
