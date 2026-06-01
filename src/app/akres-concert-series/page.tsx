"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LandingNavbar } from "@/components/landing-navbar";

declare global {
  interface Window {
    Pieces?: {
      new (config: Record<string, unknown>): PiecesInstance;
      random: (min: number, max: number) => number;
    };
    anime?: {
      remove: (target: unknown) => void;
      (config: Record<string, unknown>): unknown;
    };
  }
}

type PiecesInstance = {
  animateItems: (config: Record<string, unknown>) => void;
  showPieces: (config: Record<string, unknown>) => void;
  hidePieces: (config: Record<string, unknown>) => void;
  stop: () => void;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src=\"${src}\"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

const IMG_1 = "https://res.cloudinary.com/djusa1ywh/image/upload/v1780322483/IMG_5152_awqwhm.jpg";
const IMG_2 = "https://res.cloudinary.com/djusa1ywh/image/upload/v1780322483/IMG_5167_yk5ibc.jpg";
const IMG_3 = "https://res.cloudinary.com/djusa1ywh/image/upload/v1780322485/IMG_5172_azpc6g.jpg";
const IMG_4 = "https://res.cloudinary.com/djusa1ywh/image/upload/v1780322489/IMG_5153_rd4cyl.jpg";

function srcSet(base: string) {
  // For Cloudinary images, use proper transformations
  if (base.includes('cloudinary.com')) {
    const baseUrl = base.split('/upload/')[0] + '/upload/';
    const imagePath = base.split('/upload/')[1];
    return `${baseUrl}q_100/${imagePath}`;
  }
  // For other images (Unsplash)
  return `${base}?w=500&q=80 500w, ${base}?w=800&q=80 800w, ${base}?w=1000&q=80 1000w`;
}

function displaySrc(base: string) {
  if (base.includes('cloudinary.com')) {
    const baseUrl = base.split('/upload/')[0] + '/upload/';
    const imagePath = base.split('/upload/')[1];
    return `${baseUrl}q_100/${imagePath}`;
  }
  return `${base}?w=1000&q=80`;
}

export default function AkresConcertSeriesPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let teardown: (() => void) | null = null;
    let stopped = false;

    const boot = async () => {
      await loadScript("https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.4.1.min.220afd743d.js");
      await loadScript(
        "https://assets.website-files.com/5e2987fa0ab615bcbd569f7a/5e29890974cbda6f4a1b7da2_anime.min.txt",
      );
      await loadScript(
        "https://assets.website-files.com/5e2987fa0ab615bcbd569f7a/5e29890974cbda45771b7da1_pieces.min.txt",
      );

      if (stopped) return;
      if (!window.Pieces || !window.anime) return;

      const sliderCanvas = document.querySelector(".pieces-slider__canvas") as HTMLCanvasElement | null;
      const imagesEl = Array.from(document.querySelectorAll(".pieces-slider__image")) as HTMLImageElement[];
      const textEl = Array.from(document.querySelectorAll(".pieces-slider__text")) as HTMLElement[];
      const slidesLength = imagesEl.length;

      if (!sliderCanvas || !slidesLength) return;
      const canvasEl = sliderCanvas;

      let currentIndex = 0;
      let currentImageIndex = 0;
      let currentTextIndex = 1;
      let currentNumberIndex = 2;

      function updateIndexes() {
        currentImageIndex = currentIndex * 3;
        currentTextIndex = currentImageIndex + 1;
        currentNumberIndex = currentImageIndex + 2;
      }
      updateIndexes();

      const textIndexes: number[] = [];
      const numberIndexes: number[] = [];
      let windowWidth = window.innerWidth;
      let piecesSlider: PiecesInstance | null = null;

      const imageOptions = {
        angle: 45,
        extraSpacing: { extraX: 100, extraY: 200 },
        piecesWidth: () => window.Pieces!.random(50, 200),
        ty: () => window.Pieces!.random(-400, 400),
      };

      const textOptions = {
        color: "white",
        backgroundColor: "#333",
        fontSize: () => (windowWidth > 720 ? 50 : 30),
        padding: "15 20 10 20",
        angle: -45,
        piecesSpacing: 2,
        extraSpacing: { extraX: 0, extraY: 300 },
        piecesWidth: () => window.Pieces!.random(50, 200),
        ty: () => window.Pieces!.random(-200, 200),
        translate: () => {
          if (windowWidth > 1120) return { translateX: 200, translateY: 200 };
          if (windowWidth > 720) return { translateX: 0, translateY: 200 };
          return { translateX: 0, translateY: 100 };
        },
      };

      const numberOptions = {
        color: "white",
        backgroundColor: "#333",
        fontSize: () => (windowWidth > 720 ? 60 : 20),
        padding: () => (windowWidth > 720 ? "18 35 10 38" : "18 25 10 28"),
        angle: 0,
        piecesSpacing: 2,
        extraSpacing: { extraX: 10, extraY: 10 },
        piecesWidth: 35,
        ty: () => window.Pieces!.random(-200, 200),
        translate: () => {
          if (windowWidth > 1120) return { translateX: -340, translateY: -180 };
          if (windowWidth > 720) return { translateX: -240, translateY: -180 };
          return { translateX: -140, translateY: -100 };
        },
      };

      const items: Array<Record<string, unknown>> = [];
      let imagesReady = 0;
      let hideTimer: number | undefined;
      let resizeTimer: number | undefined;
      let initial = true;

      function showItems() {
        if (!piecesSlider) return;

        piecesSlider.showPieces({
          items: currentImageIndex,
          ignore: ["tx"],
          singly: true,
          update: (anim: { progress: number; animatables: Array<{ target: Record<string, number> }> }) => {
            if (anim.progress > 60) {
              const piece = anim.animatables[0]?.target;
              if (!piece) return;
              const ty = piece.ty;
              window.anime!.remove(piece);
              window.anime!({
                targets: piece,
                ty:
                  piece.h_ty < 300
                    ? [
                        { value: ty + 10, duration: 1000 },
                        { value: ty - 10, duration: 2000 },
                        { value: ty, duration: 1000 },
                      ]
                    : [
                        { value: ty - 10, duration: 1000 },
                        { value: ty + 10, duration: 2000 },
                        { value: ty, duration: 1000 },
                      ],
                duration: 2000,
                easing: "linear",
                loop: true,
              });
            }
          },
        });

        piecesSlider.showPieces({ items: currentTextIndex });
        piecesSlider.showPieces({
          items: currentNumberIndex,
          ty: (p: { s_ty: number }, i: number) => p.s_ty - [-3, 3][i % 2],
        });
      }

      function hideItems() {
        if (!piecesSlider) return;
        piecesSlider.hidePieces({
          items: [currentImageIndex, currentTextIndex, currentNumberIndex],
        });
      }

      function prevItem(e?: Event) {
        e?.preventDefault();
        hideItems();
        currentIndex = currentIndex > 0 ? currentIndex - 1 : slidesLength - 1;
        updateIndexes();
        showItems();
      }

      function nextItem(e?: Event) {
        e?.preventDefault();
        hideItems();
        currentIndex = currentIndex < slidesLength - 1 ? currentIndex + 1 : 0;
        updateIndexes();
        showItems();
      }

      function initSlider() {
        if (piecesSlider) piecesSlider.stop();

        piecesSlider = new window.Pieces!({
          canvas: sliderCanvas,
          items,
          x: "centerAll",
          y: "centerAll",
          piecesSpacing: 1,
          fontFamily: ["'Montserrat', sans-serif"],
          animation: {
            duration: () => window.Pieces!.random(1000, 2000),
            easing: "easeOutQuint",
          },
        });

        piecesSlider.animateItems({
          items: numberIndexes,
          duration: 20000,
          angle: 360,
          loop: true,
        });

        showItems();
      }

      function resizeStart() {
        if (initial) {
          initial = false;
          if (hideTimer) window.clearTimeout(hideTimer);
          canvasEl.classList.add("pieces-slider__canvas--hidden");
        }
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resizeEnd, 300);
      }

      function resizeEnd() {
        initial = true;
        windowWidth = window.innerWidth;
        initSlider();
        hideTimer = window.setTimeout(() => {
          canvasEl.classList.remove("pieces-slider__canvas--hidden");
        }, 500);
      }

      function onKey(e: KeyboardEvent) {
        if (e.keyCode === 37) prevItem();
        else if (e.keyCode === 39) nextItem();
      }

      const prevBtn = document.querySelector(".pieces-slider__button--prev") as HTMLAnchorElement | null;
      const nextBtn = document.querySelector(".pieces-slider__button--next") as HTMLAnchorElement | null;

      for (let i = 0; i < slidesLength; i += 1) {
        const slideImage = new Image();
        slideImage.onload = () => {
          imagesReady += 1;
          if (imagesReady === slidesLength) {
            initSlider();
            prevBtn?.addEventListener("click", prevItem);
            nextBtn?.addEventListener("click", nextItem);
            document.addEventListener("keydown", onKey);
            window.addEventListener("resize", resizeStart);
          }
        };

        items.push({ type: "image", value: imagesEl[i], options: imageOptions });
        items.push({ type: "text", value: textEl[i].innerText, options: textOptions });
        items.push({ type: "text", value: i + 1, options: numberOptions });
        textIndexes.push(i * 3 + 1);
        numberIndexes.push(i * 3 + 2);
        slideImage.src = imagesEl[i].src;
      }

      teardown = () => {
        prevBtn?.removeEventListener("click", prevItem);
        nextBtn?.removeEventListener("click", nextItem);
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", resizeStart);
        if (hideTimer) window.clearTimeout(hideTimer);
        if (resizeTimer) window.clearTimeout(resizeTimer);
        piecesSlider?.stop();
      };
    };

    boot().catch(() => {
      // no-op fallback to static hidden slides
    });

    return () => {
      stopped = true;
      if (teardown) teardown();
    };
  }, []);

  return (
    <main className="body" ref={rootRef}>
      <LandingNavbar />
      <div className="content">
        <div className="canvas w-embed">
          <canvas className="pieces-slider__canvas" height={879} width={883} />
        </div>

        <div className="pieces-slider">
          <div className="pieces-slider__slide">
            <img
              alt=""
              className="pieces-slider__image"
              sizes="90vw"
              src={displaySrc(IMG_1)}
              srcSet={srcSet(IMG_1)}
              width={966}
            />
            <h2 className="pieces-slider__text">Some Text</h2>
          </div>

          <div className="pieces-slider__slide">
            <img
              alt=""
              className="pieces-slider__image"
              sizes="90vw"
              src={displaySrc(IMG_2)}
              srcSet={srcSet(IMG_2)}
              width={645}
            />
            <h2 className="pieces-slider__text">Different Text</h2>
          </div>

          <div className="pieces-slider__slide">
            <img
              alt=""
              className="pieces-slider__image"
              sizes="90vw"
              src={displaySrc(IMG_3)}
              srcSet={srcSet(IMG_3)}
              width={645}
            />
            <h2 className="pieces-slider__text">Some different Text</h2>
          </div>

          <div className="pieces-slider__slide">
            <img
              alt=""
              className="pieces-slider__image"
              sizes="90vw"
              src={displaySrc(IMG_4)}
              srcSet={srcSet(IMG_4)}
              width={645}
            />
            <h2 className="pieces-slider__text">Another text</h2>
          </div>
        </div>

        <div className="button-wrapper">
          <a className="pieces-slider__button pieces-slider__button--prev w-button" href="#">
            Prev
          </a>
          <a className="pieces-slider__button pieces-slider__button--next w-button" href="#">
            Next
          </a>
        </div>

        <Link className="back-btn" href="/">
          Back to Home
        </Link>
      </div>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap");

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .body {
          background: #111;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: "Montserrat", sans-serif;
        }

        .content {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .canvas.w-embed {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
        }

        .pieces-slider__canvas {
          display: block;
          width: 100%;
          height: 100%;
          transition: opacity 0.3s ease;
        }

        .pieces-slider__canvas--hidden {
          opacity: 0;
        }

        .pieces-slider {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          visibility: hidden;
        }

        .pieces-slider__slide {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .pieces-slider__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pieces-slider__text {
          display: none;
        }

        .button-wrapper {
          position: absolute;
          bottom: 40px;
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 20px;
          z-index: 20;
        }

        .pieces-slider__button {
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-family: "Montserrat", sans-serif;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 12px 30px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          transition: border-color 0.3s, background 0.3s;
        }

        .pieces-slider__button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: white;
        }

        .back-btn {
          position: absolute;
          top: max(16px, env(safe-area-inset-top));
          right: 20px;
          z-index: 30;
          border: 1px solid rgba(255, 255, 255, 0.55);
          border-radius: 999px;
          padding: 0.42rem 0.9rem;
          color: #fff;
          text-decoration: none;
          background: rgba(10, 10, 10, 0.35);
          font-size: 0.78rem;
        }
      `}</style>
    </main>
  );
}
