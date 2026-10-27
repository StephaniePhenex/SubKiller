import { type ButtonHTMLAttributes } from "react";

type NeoButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function NeoButton({ className = "", type = "button", children, ...props }: NeoButtonProps) {
  return (
    <button type={type} className={`neo-border neo-pill neo-press px-6 py-3 text-lg font-bold ${className}`} {...props}>
      {children}
    </button>
  );
}
