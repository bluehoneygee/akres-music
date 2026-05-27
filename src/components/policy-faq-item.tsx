"use client";

import { useState } from "react";

type PolicyFaqItemProps = {
  question: string;
  answer: string;
};

export function PolicyFaqItem({ question, answer }: PolicyFaqItemProps) {
  const [open, setOpen] = useState(false);
  const [spinClass, setSpinClass] = useState("");

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    setSpinClass("");

    // retrigger animation class
    requestAnimationFrame(() => {
      setSpinClass(next ? "spin-open" : "spin-close");
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-transparent">
      <button
        className="flex w-full items-center gap-4 bg-black px-6 py-4 text-left text-xl font-semibold !text-white"
        onClick={onToggle}
        type="button"
      >
        <span aria-hidden="true" className={`inline-flex w-7 justify-center !text-white text-4xl leading-none ${spinClass}`}>
          {open ? "×" : "+"}
        </span>
        <span className="!text-white">{question}</span>
      </button>

      {open ? (
        <div className="bg-[#f3f3f3] px-6 py-5">
          <p className="text-sm leading-relaxed text-black md:text-base">{answer}</p>
        </div>
      ) : null}

      <style jsx>{`
        .spin-open {
          animation: spinOpen 0.2s ease-out;
        }

        .spin-close {
          animation: spinClose 0.2s ease-out;
        }

        @keyframes spinOpen {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(720deg);
          }
        }

        @keyframes spinClose {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
