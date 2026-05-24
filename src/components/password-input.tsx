"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordInputProps = {
  name: string;
  placeholder?: string;
};

export function PasswordInput({ name, placeholder = "Masukkan password" }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        className="h-12 w-full rounded-[16px] border border-white/60 bg-white/70 px-4 pr-11 text-base text-zinc-900 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.6)] placeholder:text-zinc-400 focus:ring-2 focus:ring-sky-300"
        name={name}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-500 transition hover:bg-white/70 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
