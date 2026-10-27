import { type HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <section className={`rounded-card border-[length:var(--spacing-border-thick)] border-ink bg-white ${className}`} {...props}>
      {children}
    </section>
  );
}
