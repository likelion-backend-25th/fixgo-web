import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "border border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
  outline: "border border-blue-600 bg-white text-blue-600 hover:bg-blue-50",
  ghost: "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
