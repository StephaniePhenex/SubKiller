"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { INK, WHITE } from "./palette";

export function Rule() {
  return (
    <div className="my-5 overflow-hidden whitespace-nowrap select-none" aria-hidden="true">
      {"- ".repeat(80)}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`border-4 border-black rounded-3xl p-5 neo-shadow ${className}`} style={{ background: WHITE }}>
      {children}
    </section>
  );
}

export const NeoButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function NeoButton(
  { children, className = "", style, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`neo-btn border-4 border-black rounded-full font-bold ${className}`}
      style={{ background: WHITE, color: INK, ...style }}
      {...props}
    >
      {children}
    </button>
  );
});
