"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

type GridMotionProps = {
  items?: string[];
  gradientColor?: string;
};

export default function GridMotion({ items = [], gradientColor = "black" }: GridMotionProps) {
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mouseXRef = useRef(0);
  const winWRef = useRef(1);

  const totalItems = 28;
  const fallback = Array.from({ length: totalItems }, (_, i) => `Item ${i + 1}`);
  const combinedItems = (items.length ? items : fallback).slice(0, totalItems);

  useEffect(() => {
    const setInitial = () => {
      winWRef.current = typeof window !== "undefined" ? window.innerWidth : 1;
      mouseXRef.current = winWRef.current / 2;
    };
    setInitial();

    const onMove = (e: MouseEvent) => {
      mouseXRef.current = e.clientX ?? mouseXRef.current;
    };
    const onResize = () => {
      winWRef.current = window.innerWidth || 1;
    };

    gsap.ticker.lagSmoothing(0);

    const updateMotion = () => {
      const maxMove = 300;
      const baseDur = 0.8;
      const inertia = [0.6, 0.4, 0.3, 0.2];

      const t = mouseXRef.current / winWRef.current || 0.5;
      const offset = t * maxMove - maxMove / 2;

      rowRefs.current.forEach((row, idx) => {
        if (!row) return;
        const dir = idx % 2 === 0 ? 1 : -1;
        gsap.to(row, {
          x: offset * dir,
          duration: baseDur + inertia[idx % inertia.length],
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    gsap.ticker.add(updateMotion);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(updateMotion);
    };
  }, []);

  rowRefs.current = rowRefs.current.slice(0, 4);

  return (
    <div className="h-full w-full overflow-hidden pointer-events-none">
      <section
        className="relative flex items-center justify-center w-full h-full overflow-hidden"
        style={{
          background: `radial-gradient(circle, ${gradientColor} 0%, transparent 100%)`,
        }}
      >
        <div className="gap-4 flex-none relative w-[150vw] h-[150vh] grid grid-rows-4 grid-cols-1 -rotate-[15deg] origin-center z-[2]">
          {[...Array(4)].map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4 grid-cols-7 will-change-transform"
              ref={(el) => {
                rowRefs.current[rowIndex] = el;
              }}
            >
              {[...Array(7)].map((_, itemIndex) => {
                const idx = rowIndex * 7 + itemIndex;
                const content = combinedItems[idx];
                return (
                  <div key={idx} className="relative">
                    <div className="relative w-full h-full overflow-hidden rounded-[10px] bg-[#111] flex items-center justify-center text-white text-[1.5rem]">
                      {typeof content === "string" && content.startsWith("http") ? (
                        <img
                          alt={`Grid item ${idx}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                          src={content}
                        />
                      ) : (
                        <img
                          alt={`Grid item ${idx}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                          src={content}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
