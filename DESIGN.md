---
version: alpha
name: SubKiller
colors:
  primary: "#000000"
  paper: "#F4F4F0"
  ink: "#000000"
  blood: "#FF0000"
  mint: "#98FF98"
  chartreuse: "#DFFF00"
typography:
  mono:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: 400
    lineHeight: "1.5"
spacing:
  border-thick: 4px
rounded:
  card: 16px
  pill: 9999px
---

## Overview

SubKiller (The Honest Sub) utilizes a Neo-Brutalist (Pop-Art) design system. The visual language is intentionally aggressive, designed to simulate the "pain" of financial loss through high-contrast colors, harsh borders, and raw typography.

## Colors

- **Paper `#F4F4F0`)**: The primary background, simulating dirty receipt paper.

- **Ink `#000000`)**: Used for text, borders, and hard shadows.

- **Blood `#FF0000`)**: Used for destructive actions and the cancellation stamp.

- **Mint & Chartreuse**: High-visibility accent colors for positive/highlighted actions.

## Typography

- **Primary Font**: `Space Mono` is applied globally to mimic receipt printer output and raw data formatting. No sans-serif fonts are permitted.

## Layout

- Layouts are blocky, utilizing explicit framing and compartmentalization. Components are distinctly separated by heavy ink borders.

## Elevation & Depth

- **Zero Soft Shadows**: Default diffuse shadows (e.g., `shadow-md`) are strictly prohibited.

- **Hard Offset**: All elevated surfaces use a rigid `4px 4px 0px 0px rgba(0,0,0,1)` shadow to create physical tension.

## Shapes

- **Borders**: Thick `4px` solid black borders are standard for cards, inputs, and buttons.

- **Corners**: `rounded-2xl` or `rounded-full` to contrast the aggressive borders with Pop-Art playfulness.

## Components

- **Buttons**: Must feature the thick border, hard shadow, and a physical "press" state (translate down-right while shrinking the shadow).

- **Cards**: Used as receipts or distinct data blocks, heavily outlined.

## Do's and Don'ts

- **Do**: Keep layouts high-contrast. Use Space Mono everywhere.

- **Don't**: Use Material UI, Ant Design, or any soft gradient/blur effects. Do not use gray borders.

