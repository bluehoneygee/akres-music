import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.24),0_20px_50px_rgba(15,23,42,.18)] hover:bg-zinc-800",
        glass:
          "border border-white/35 bg-white/40 text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,.65),0_12px_30px_rgba(15,23,42,.08)] backdrop-blur-2xl hover:bg-white/60",
        ghost: "text-zinc-700 hover:bg-white/45",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
