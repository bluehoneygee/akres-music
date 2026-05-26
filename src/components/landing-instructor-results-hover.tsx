"use client";

import { gsap } from "gsap";
import Link from "next/link";
import type { PointerEvent } from "react";
import { useEffect, useRef } from "react";

type PreviewCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
  panelClassName: string;
};

const cards: PreviewCard[] = [
  {
    id: "instructors",
    title: "Instruktur",
    description: "Mentor berpengalaman yang membimbing teknik, musikalitas, dan kesiapan tampil.",
    image: "/akres-logo-full.png?v=6",
    href: "/about/instructors",
    panelClassName: "bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50",
  },
  {
    id: "results",
    title: "Results",
    description: "Progres murid terukur lewat evaluasi berkala, recital, dan capaian performa.",
    image: "/akres-logo-full.png?v=6",
    href: "/results",
    panelClassName: "bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50",
  },
];

function ParallaxPreviewCard({ card }: { card: PreviewCard }) {
  const cardRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const maskRef = useRef({ x: 0, y: 0, size: 0 });
  const maskXRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const maskYRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const maskSizeRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const maskRadius = 90;

  useEffect(() => {
    const reveal = revealRef.current;
    const image = imageRef.current;
    if (!reveal || !image) return;

    const updateMask = () => {
      const { x, y, size } = maskRef.current;
      reveal.style.clipPath = `circle(${size}px at ${x}px ${y}px)`;
    };

    gsap.set(reveal, { autoAlpha: 0, clipPath: "circle(0px at 50% 50%)" });
    gsap.set(image, { scale: 1, x: 0, y: 0 });

    maskXRef.current = gsap.quickTo(maskRef.current, "x", {
      duration: 0.4,
      ease: "power2.out",
      onUpdate: updateMask,
    });
    maskYRef.current = gsap.quickTo(maskRef.current, "y", {
      duration: 0.4,
      ease: "power2.out",
      onUpdate: updateMask,
    });
    maskSizeRef.current = gsap.quickTo(maskRef.current, "size", {
      duration: 0.3,
      ease: "power2.out",
      onUpdate: updateMask,
    });

    return () => {
      gsap.killTweensOf([maskRef.current, reveal, image]);
    };
  }, []);

  function moveMask(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;

    maskXRef.current?.(rawX);
    maskYRef.current?.(rawY);
  }

  function reveal(event: PointerEvent<HTMLElement>) {
    moveMask(event);
    maskSizeRef.current?.(maskRadius);
    gsap.to(revealRef.current, { autoAlpha: 1, duration: 0.32, ease: "power2.out" });
  }

  function conceal() {
    maskSizeRef.current?.(0);
    gsap.to(revealRef.current, { autoAlpha: 0, duration: 0.28, ease: "power2.inOut" });
  }

  return (
    <Link className="block" href={card.href}>
      <article
        className={`relative h-full min-h-0 cursor-pointer overflow-hidden p-8 md:p-10 ${card.panelClassName}`}
        onPointerEnter={reveal}
        onPointerLeave={conceal}
        onPointerMove={moveMask}
        ref={cardRef}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-0"
          ref={revealRef}
        >
          <img
            alt=""
            className="h-full w-full object-cover"
            ref={imageRef}
            src={card.image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-zinc-950/20 to-transparent" />
        </div>

        <div className="relative z-20 flex h-full min-h-0 flex-col items-center justify-center text-center">
          <h3 className="text-4xl font-semibold md:text-5xl" style={{ color: "#09090b" }}>
            {card.title}
          </h3>
          <p className="mt-4 max-w-xl text-lg leading-relaxed md:text-xl" style={{ color: "#18181b" }}>
            {card.description}
          </p>
        </div>
      </article>
    </Link>
  );
}

export function LandingInstructorResultsHover() {
  return (
    <div className="h-screen">
      <div className="grid h-full grid-cols-1 md:grid-cols-2">
        {cards.map((card) => (
          <ParallaxPreviewCard card={card} key={card.id} />
        ))}
      </div>
    </div>
  );
}
