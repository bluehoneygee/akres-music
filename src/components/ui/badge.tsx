import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-950 text-white",
        secondary: "border-white/30 bg-white/45 text-zinc-800 backdrop-blur-xl",
        success: "border-emerald-400/30 bg-emerald-100/70 text-emerald-800",
        warning: "border-amber-400/30 bg-amber-100/75 text-amber-800",
        danger: "border-rose-400/30 bg-rose-100/75 text-rose-800",
        outline: "border-white/40 bg-white/20 text-zinc-700 backdrop-blur-xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
