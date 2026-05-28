"use client";

import { gsap } from "gsap";
import Link from "next/link";
import type { MouseEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

type PreviewCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
  panelClassName: string;
  textColor: string;
};

type PanelDragDetail = {
  active: boolean;
  x: number;
  y: number;
  cardId: string | null;
};

const cards: PreviewCard[] = [
  {
    id: "instructors",
    title: "Instruktur",
    description:
      "Mentor berpengalaman yang membimbing teknik, musikalitas, dan kesiapan tampil.",
    image:
      "https://res.cloudinary.com/djusa1ywh/image/upload/v1779905374/photo-collage.png_1_ayood6.png",
    href: "/about/instructors",
    panelClassName: "bg-[#E09F3E]",
    textColor: "#9E2A2B",
  },
  {
    id: "results",
    title: "Results",
    description:
      "Progres murid terukur lewat evaluasi berkala, recital, dan capaian performa.",
    image:
      "https://res.cloudinary.com/djusa1ywh/image/upload/v1779904777/photo-collage.png_wtkivg.png",
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
  const updateMaskRef = useRef<(() => void) | null>(null);
  const xToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const yToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const maskSizeRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const draggedRef = useRef(false);
  const maskRadius = 120;

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
      reveal.style.setProperty("-webkit-clip-path", clip);
      textReveal.style.clipPath = clip;
      textReveal.style.setProperty("-webkit-clip-path", clip);
    };
    updateMaskRef.current = updateMask;

    gsap.set(reveal, {
      autoAlpha: 0,
      clipPath: "circle(0px at 50% 50%)",
      willChange: "clip-path, opacity",
    });
    gsap.set(textReveal, {
      autoAlpha: 0,
      clipPath: "circle(0px at 50% 50%)",
      willChange: "clip-path, opacity",
    });
    reveal.style.setProperty("-webkit-clip-path", "circle(0px at 50% 50%)");
    textReveal.style.setProperty("-webkit-clip-path", "circle(0px at 50% 50%)");
    gsap.set(image, { scale: 1, x: 0, y: 0 });

    xToRef.current = gsap.quickTo(maskRef.current, "x", {
      duration: 0.18,
      ease: "power2.out",
      onUpdate: updateMask,
    });

    yToRef.current = gsap.quickTo(maskRef.current, "y", {
      duration: 0.18,
      ease: "power2.out",
      onUpdate: updateMask,
    });

    maskSizeRef.current = gsap.quickTo(maskRef.current, "size", {
      duration: 0.32,
      ease: "power2.out",
      onUpdate: updateMask,
    });

    return () => {
      updateMaskRef.current = null;
      gsap.killTweensOf([maskRef.current, reveal, image]);
      xToRef.current = null;
      yToRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onPanelDrag = (event: Event) => {
      const detail = (event as CustomEvent<PanelDragDetail>).detail;
      if (!detail) return;

      if (!detail.active || detail.cardId !== card.id) {
        conceal();
        return;
      }

      const cardEl = cardRef.current;
      if (!cardEl) return;
      const rect = cardEl.getBoundingClientRect();
      const x = detail.x - rect.left;
      const y = detail.y - rect.top;

      xToRef.current?.(x);
      yToRef.current?.(y);
      maskSizeRef.current?.(maskRadius);

      gsap.to(revealRef.current, {
        autoAlpha: 1,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(textRevealRef.current, {
        autoAlpha: 1,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      });
    };

    window.addEventListener("akres-panel-drag", onPanelDrag as EventListener);
    return () =>
      window.removeEventListener(
        "akres-panel-drag",
        onPanelDrag as EventListener,
      );
  }, [card.id]);

  function moveMask(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;

    xToRef.current?.(rawX);
    yToRef.current?.(rawY);
  }

  function reveal(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;

    maskRef.current.x = startX;
    maskRef.current.y = startY;
    updateMaskRef.current?.();
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

  function handlePointerEnter(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") reveal(event);
  }

  function handlePointerLeave(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") conceal();
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    draggedRef.current = false;
    reveal(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    moveMask(event);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    conceal();
  }

  function handlePointerCancel() {
    conceal();
  }

  function handleClickCapture(event: MouseEvent<HTMLElement>) {
    if (draggedRef.current) {
      event.preventDefault();
      draggedRef.current = false;
    }
  }

  return (
    <Link className="block" href={card.href}>
      <article
        className={`relative h-full min-h-0 cursor-pointer overflow-hidden p-8 md:p-10 ${card.panelClassName}`}
        data-preview-card-id={card.id}
        onClickCapture={handleClickCapture}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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

        <div
          className="relative z-20 flex h-full min-h-0 flex-col items-center justify-center text-center"
        >
          <h3
            className="text-4xl font-semibold md:text-5xl"
            style={{ color: card.textColor }}
          >
            {card.title}
          </h3>
          <p
            className="mt-4 max-w-[26ch] text-pretty px-2 text-sm leading-relaxed md:max-w-lg md:px-0 md:text-lg"
            style={{ color: card.textColor }}
          >
            {card.description}
          </p>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-40 opacity-0"
          ref={textRevealRef}
        >
          <div className="relative flex h-full min-h-0 flex-col items-center justify-center text-center text-white">
            <h3
              className="text-4xl font-semibold !text-white md:text-5xl"
              style={{ color: "#ffffff" }}
            >
              {card.title}
            </h3>
            <p
              className="mt-4 max-w-[26ch] text-pretty px-2 text-sm leading-relaxed !text-white md:max-w-lg md:px-0 md:text-lg"
              style={{ color: "#ffffff" }}
            >
              {card.description}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function LandingInstructorResultsHover() {
  const dragPointerIdRef = useRef<number | null>(null);
  const dragActiveRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const [showMobileHint, setShowMobileHint] = useState(true);

  const dispatchPanelDrag = (detail: PanelDragDetail) => {
    window.dispatchEvent(
      new CustomEvent<PanelDragDetail>("akres-panel-drag", { detail }),
    );
  };

  const getCardIdFromPoint = (x: number, y: number) => {
    const target = document.elementFromPoint(x, y);
    const cardEl = target?.closest(
      "[data-preview-card-id]",
    ) as HTMLElement | null;
    return cardEl?.dataset.previewCardId ?? null;
  };

  const handleMobilePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    dragPointerIdRef.current = event.pointerId;
    dragActiveRef.current = false;
    startPointRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleMobilePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    if (dragPointerIdRef.current !== event.pointerId) return;

    if (!dragActiveRef.current) {
      const dx = event.clientX - startPointRef.current.x;
      const dy = event.clientY - startPointRef.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (ady > 10 && ady > adx) {
        dragPointerIdRef.current = null;
        dispatchPanelDrag({
          active: false,
          x: event.clientX,
          y: event.clientY,
          cardId: null,
        });
        return;
      }

      if (adx > 8 || ady > 8) {
        dragActiveRef.current = true;
        if (showMobileHint) {
          setShowMobileHint(false);
        }
      } else {
        return;
      }
    }

    event.preventDefault();
    dispatchPanelDrag({
      active: true,
      x: event.clientX,
      y: event.clientY,
      cardId: getCardIdFromPoint(event.clientX, event.clientY),
    });
  };

  const handleMobilePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    if (dragPointerIdRef.current !== event.pointerId) return;

    dragPointerIdRef.current = null;
    dragActiveRef.current = false;
    dispatchPanelDrag({
      active: false,
      x: event.clientX,
      y: event.clientY,
      cardId: null,
    });
  };

  return (
    <div className="h-screen">
      <div
        className="grid h-full grid-cols-1 md:grid-cols-2"
        style={{ touchAction: "pan-y" }}
        onPointerCancel={handleMobilePointerEnd}
        onPointerDown={handleMobilePointerDown}
        onPointerMove={handleMobilePointerMove}
        onPointerUp={handleMobilePointerEnd}
      >
        {showMobileHint ? (
          <div className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2 md:hidden">
            <p className="animate-pulse rounded-full bg-black/75 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg">
              Sentuh lalu geser perlahan untuk lihat efek
            </p>
          </div>
        ) : null}
        {cards.map((card) => (
          <ParallaxPreviewCard card={card} key={card.id} />
        ))}
      </div>
    </div>
  );
}
