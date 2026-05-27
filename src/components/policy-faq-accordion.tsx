"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type FAQItem = {
  q: string;
  a: ReactNode;
};

type PolicyFaqAccordionProps = {
  items: FAQItem[];
  background?: string;
  scrollableAnswer?: boolean;
};

export function PolicyFaqAccordion({
  items,
  background = "#ffd700",
  scrollableAnswer = false,
}: PolicyFaqAccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  return (
    <div className="w-full py-5 pl-6 pr-0" style={{ background }}>
      {items.map((faq, index) => {
        const isOpen = openIndexes.includes(index);

        return (
          <div className="mb-4" key={faq.q}>
            <button
              className="relative z-20 flex w-full cursor-pointer items-center gap-4 rounded-l-md border-0 bg-black px-6 py-5 text-left text-[1.1rem] font-bold !text-white"
              onClick={() => {
                const nextOpen = !isOpen;
                setOpenIndexes((prev) =>
                  nextOpen ? [...prev, index] : prev.filter((i) => i !== index)
                );
              }}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`inline-flex w-5 flex-none justify-center text-[1.4rem] font-black leading-none !text-white transition-transform duration-200 ease-out ${
                  isOpen ? "rotate-[360deg]" : "rotate-0"
                }`}
              >
                {isOpen ? "×" : "+"}
              </span>
              <span className="!text-white">{faq.q}</span>
            </button>

            <div
              className={`relative z-10 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                isOpen ? "max-h-[320px]" : "max-h-0"
              }`}
            >
              <div
                className={`ml-6 mr-0 -mt-[18px] rounded-bl-md bg-white px-6 pb-5 pt-9 text-[#222] ${
                  scrollableAnswer ? "max-h-[260px] overflow-y-auto" : ""
                }`}
              >
                <div className="leading-relaxed">{faq.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
