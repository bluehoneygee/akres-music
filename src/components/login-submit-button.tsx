"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-12 w-full rounded-[16px] bg-zinc-900 text-base font-semibold !text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_14px_28px_rgba(15,23,42,.35)] hover:bg-black dark:bg-zinc-900 dark:!text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_14px_28px_rgba(0,0,0,.4)] dark:hover:bg-black"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Masuk...
        </span>
      ) : (
        "Masuk"
      )}
    </Button>
  );
}
