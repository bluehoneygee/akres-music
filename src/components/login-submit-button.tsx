"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-12 w-full rounded-[16px] bg-sky-500 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_14px_28px_rgba(14,165,233,.35)] hover:bg-sky-400"
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
