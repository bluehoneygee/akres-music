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
  textColor: string;
};

const cards: PreviewCard[] = [
  {
    id: "instructors",
    title: "Instruktur",
    description: "Mentor berpengalaman yang membimbing teknik, musikalitas, dan kesiapan tampil.",
    image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779905374/photo-collage.png_1_ayood6.png",
    href: "/about/instructors",
    panelClassName: "bg-[#E09F3E]",
    textColor: "#9E2A2B",
  },
  {
    id: "results",
    title: "Results",
    description: "Progres murid terukur lewat evaluasi berkala, recital, dan capaian performa.",
    image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779904777/photo-collage.png_wtkivg.png",
    href: "/results",
    panelClassName: "bg-[#9E2A2B]",
    textColor: "#E09F3E",
  },
];

function ParallaxPreviewCard({ card }: { card: PreviewCard }) {
  const cardRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const textRevealRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const maskRef = useRef({ x: 0, y: 0, size: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const maskSizeRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const maskRadius = 90;

  useEffect(() => {
    const reveal = revealRef.current;
    const textReveal = textRevealRef.current;
    const image = imageRef.current;
    const cardEl = cardRef.current;
    if (!reveal || !textReveal || !image || !cardEl) return;

    const updateMask = () => {
      const { x, y, size } = maskRef.current;
      const clip = `circle(${size}px at ${x}px ${y}px)`;
      reveal.style.clipPath = clip;
      textReveal.style.clipPath = clip;
    };

    gsap.set(reveal, { autoAlpha: 0, clipPath: "circle(0px at 50% 50%)", willChange: "clip-path, opacity" });
    gsap.set(textReveal, { autoAlpha: 0, clipPath: "circle(0px at 50% 50%)", willChange: "clip-path, opacity" });
    gsap.set(image, { scale: 1, x: 0, y: 0 });

    const tick = () => {
      const smooth = 0.24;
      maskRef.current.x += (targetRef.current.x - maskRef.current.x) * smooth;
      maskRef.current.y += (targetRef.current.y - maskRef.current.y) * smooth;
      updateMask();
    };

    gsap.ticker.add(tick);

    maskSizeRef.current = gsap.quickTo(maskRef.current, "size", {
      duration: 0.32,
      ease: "power2.out",
      onUpdate: updateMask,
    });

    return () => {
      gsap.ticker.remove(tick);
      gsap.killTweensOf([maskRef.current, reveal, image]);
    };
  }, []);

  function moveMask(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;

    targetRef.current.x = rawX;
    targetRef.current.y = rawY;
  }

  function reveal(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;

    targetRef.current.x = startX;
    targetRef.current.y = startY;
    maskRef.current.x = startX;
    maskRef.current.y = startY;
    maskSizeRef.current?.(maskRadius);
    gsap.to(revealRef.current, {
      autoAlpha: 1,
      duration: 0.32,
      ease: "power2.out",
      overwrite: true,
    });
    gsap.to(textRevealRef.current, {
      autoAlpha: 1,
      duration: 0.32,
      ease: "power2.out",
      overwrite: true,
    });
  }

  function conceal() {
    maskSizeRef.current?.(0);
    gsap.to(revealRef.current, {
      autoAlpha: 0,
      duration: 0.28,
      ease: "power2.inOut",
      overwrite: true,
    });
    gsap.to(textRevealRef.current, {
      autoAlpha: 0,
      duration: 0.28,
      ease: "power2.inOut",
      overwrite: true,
    });
  }

  return (
    <Link className="block" href={card.href}>
      <article
        className={`relative h-full min-h-0 cursor-pointer overflow-hidden p-8 md:p-10 ${card.panelClassName}`}
        onPointerEnter={reveal}
        onPointerLeave={conceal}
        onPointerMove={moveMask}
        onPointerDown={reveal}
        onPointerUp={conceal}
        onPointerCancel={conceal}
        ref={cardRef}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-0"
          ref={revealRef}
        >
          <img
            alt=""
            className="h-full w-full object-contain object-center bg-white"
            ref={imageRef}
            src={card.image}
          />
          <div className="absolute inset-0 bg-black/48" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-zinc-950/20 to-transparent" />
        </div>

        <div className="relative z-20 flex h-full min-h-0 flex-col items-center justify-center text-center">
          <h3 className="text-4xl font-semibold md:text-5xl" style={{ color: card.textColor }}>
            {card.title}
          </h3>
          <p className="mt-4 max-w-lg text-base leading-relaxed md:text-lg" style={{ color: card.textColor }}>
            {card.description}
          </p>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 opacity-0"
          ref={textRevealRef}
        >
          <div className="relative flex h-full min-h-0 flex-col items-center justify-center text-center">
            <h3 className="text-4xl font-semibold text-white md:text-5xl">
              {card.title}
            </h3>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white md:text-lg">
              {card.description}
            </p>
          </div>
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
