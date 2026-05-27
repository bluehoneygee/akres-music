"use client";

import { useState } from "react";
import type { ReactNode } from "react";

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
  const [spinMeta, setSpinMeta] = useState<{
    index: number | null;
    kind: "open" | "close" | null;
    key: number;
  }>({ index: null, kind: null, key: 0 });

  return (
    <div className="faq-wrap">
      {items.map((faq, index) => {
        const isOpen = openIndexes.includes(index);

        return (
          <div className="faq-item" key={faq.q}>
            <button
              className="faq-header"
              onClick={() => {
                const nextOpen = !isOpen;
                setOpenIndexes((prev) =>
                  nextOpen ? [...prev, index] : prev.filter((i) => i !== index)
                );
                setSpinMeta({
                  index,
                  kind: nextOpen ? "open" : "close",
                  key: Date.now(),
                });
              }}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`faq-icon ${
                  spinMeta.index === index && spinMeta.kind
                    ? `spin-${spinMeta.kind}`
                    : ""
                }`}
                key={`${index}-${spinMeta.key}`}
              >
                {isOpen ? "×" : "+"}
              </span>
              <span>{faq.q}</span>
            </button>

            <div className={`faq-answer-shell ${isOpen ? "open" : ""}`}>
              <div className={`faq-answer ${scrollableAnswer ? "faq-answer-scroll" : ""}`}>{faq.a}</div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        .faq-wrap {
          width: 100%;
          padding: 20px 0 20px 24px;
          background: ${background};
        }

        .faq-item {
          margin-bottom: 16px;
        }

        .faq-header {
          width: 100%;
          background: #000;
          border: 0;
          border-radius: 6px 0 0 6px;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          position: relative;
          z-index: 2;
        }

        .faq-icon {
          width: 20px;
          flex: 0 0 20px;
          display: inline-flex;
          justify-content: center;
          font-size: 1.4rem;
          font-weight: 900;
          line-height: 1;
        }

        .faq-answer-shell {
          position: relative;
          z-index: 1;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .faq-answer-shell.open {
          max-height: 300px;
        }

        .faq-answer {
          background: #fff;
          border-radius: 0 0 0 6px;
          margin: -18px 0 0 24px;
          padding: 36px 24px 20px;
          color: #222;
          line-height: 1.6;
        }

        .faq-answer-scroll {
          max-height: 260px;
          overflow-y: auto;
        }

        .spin-open {
          animation: spinOpen 0.25s ease-out;
        }

        .spin-close {
          animation: spinClose 0.25s ease-out;
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
