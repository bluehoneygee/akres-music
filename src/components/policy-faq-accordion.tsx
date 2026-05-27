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
  triggerBackground?: string;
  triggerTextColor?: string;
};

export function PolicyFaqAccordion({
  items,
  background = "#ffd700",
  scrollableAnswer = false,
  triggerBackground = "#000000",
  triggerTextColor = "#ffffff",
}: PolicyFaqAccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  return (
    <div className="w-full py-4 pl-4 pr-2 sm:py-5 sm:pl-6 sm:pr-0" style={{ background }}>
      {items.map((faq, index) => {
        const isOpen = openIndexes.includes(index);

        return (
          <div className="mb-4" key={faq.q}>
            <button
              className="relative z-20 flex w-full cursor-pointer items-center gap-3 rounded-l-md border-0 px-4 py-4 text-left text-[0.95rem] font-bold sm:gap-4 sm:px-6 sm:py-5 sm:text-[1.1rem]"
              onClick={() => {
                const nextOpen = !isOpen;
                setOpenIndexes((prev) =>
                  nextOpen ? [...prev, index] : prev.filter((i) => i !== index)
                );
              }}
              style={{ background: triggerBackground, color: triggerTextColor }}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`inline-flex w-5 flex-none justify-center text-[1.2rem] font-black leading-none transition-transform duration-200 ease-out sm:text-[1.4rem] ${
                  isOpen ? "rotate-[360deg]" : "rotate-0"
                }`}
              >
                {isOpen ? "×" : "+"}
              </span>
              <span>{faq.q}</span>
            </button>

            <div
              className={`relative z-10 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                isOpen ? "max-h-[320px]" : "max-h-0"
              }`}
            >
              <div
                className={`ml-4 mr-0 -mt-3 rounded-bl-md bg-white px-4 pb-4 pt-7 text-[0.92rem] text-[#222] sm:ml-6 sm:-mt-[18px] sm:px-6 sm:pb-5 sm:pt-9 sm:text-base ${
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
