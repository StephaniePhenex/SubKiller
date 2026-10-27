import { type HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <section className={`neo-border neo-rounded bg-receipt shadow-neo ${className}`} {...props}>
      {children}
    </section>
  );
}
