"use client";

import { useEffect, useRef } from "react";

import { LandingNavbar } from "@/components/landing-navbar";

const baseImages = [
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.36.51_p2xg8n.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.37.05_opgi1f.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.36.48_ff4iiv.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817141/IMG_5148_sswd48.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.37.04_trqbzh.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.36.49_moaku3.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797415/WhatsApp_Image_2026-05-26_at_18.55.37_2_rasi1m.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797513/WhatsApp_Image_2026-05-26_at_18.55.23_vbw0rz.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797558/WhatsApp_Image_2026-05-26_at_18.55.20_me1ev4.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797404/WhatsApp_Image_2026-05-26_at_18.55.37_p1omd8.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797597/WhatsApp_Image_2026-05-26_at_18.55.23_1_r91zfu.jpg",
  "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797428/WhatsApp_Image_2026-05-26_at_18.55.37_1_zzrojs.jpg",
];

const buildColumn = (seeds: number[]) => seeds.map((seed) => baseImages[(seed - 1) % baseImages.length]);

const columns = [
  buildColumn([1, 2, 3, 4, 5, 6, 7, 8]),
  buildColumn([9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  buildColumn([1, 2, 3, 4, 5, 6, 7, 8]),
];

export default function ResultsPage() {
  const col1Ref = useRef<HTMLDivElement | null>(null);
  const col2Ref = useRef<HTMLDivElement | null>(null);
  const col3Ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const col1 = col1Ref.current;
    const col2 = col2Ref.current;
    const col3 = col3Ref.current;
    if (!col1 || !col2 || !col3) return;

    let raf = 0;
    let current = 0;
    let target = 0;
    let col2BaseOffset = col2.scrollHeight / 2;
    const BOTTOM_GAP_PX = 140;

    const getMaxScroll = () => {
      const colHeight = Math.max(col1.scrollHeight, col2.scrollHeight, col3.scrollHeight);
      const viewportHeight = window.innerHeight;
      const maxByCol1 = Math.max(0, (col1.scrollHeight - viewportHeight + BOTTOM_GAP_PX) / 0.6);
      const maxByCol3 = Math.max(0, (col3.scrollHeight - viewportHeight + BOTTOM_GAP_PX) / 0.6);
      return Math.min(colHeight > 0 ? maxByCol1 : 0, colHeight > 0 ? maxByCol3 : 0);
    };

    const clamp = (v: number) => {
      const max = getMaxScroll();
      return Math.max(0, Math.min(v, max));
    };

    col1.style.transform = "translateY(0px)";
    col2.style.transform = `translateY(${-col2BaseOffset}px)`;
    col3.style.transform = "translateY(0px)";

    const animate = () => {
      current += (target - current) * 0.08;
      col1.style.transform = `translateY(${-current * 0.6}px)`;
      col2.style.transform = `translateY(${-col2BaseOffset + current * 0.6}px)`;
      col3.style.transform = `translateY(${-current * 0.6}px)`;
      raf = window.requestAnimationFrame(animate);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      target += e.deltaY * 0.8;
      target = clamp(target);
      target = Math.max(0, target);
    };

    let lastTouchY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) lastTouchY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const y = e.touches[0].clientY;
      const deltaY = (lastTouchY - y) * 1.2;
      lastTouchY = y;

      target += deltaY * 0.8;
      target = clamp(target);
      target = Math.max(0, target);

      e.preventDefault();
    };

    const onResize = () => {
      col2BaseOffset = col2.scrollHeight / 2;
      target = clamp(target);
    };

    raf = window.requestAnimationFrame(animate);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <main className="results-page">
      <LandingNavbar />

      <section className="gallery-wrapper">
        <div className="col" id="col1" ref={col1Ref}>
          {columns[0].map((src, idx) => (
            <div className="card" key={`c1-${idx}`}>
              <img alt={`Gallery ${idx + 1}`} loading="lazy" src={src} />
            </div>
          ))}
        </div>

        <div className="col" id="col2" ref={col2Ref}>
          {columns[1].map((src, idx) => (
            <div className="card" key={`c2-${idx}`}>
              <img alt={`Gallery ${idx + 9}`} loading="lazy" src={src} />
            </div>
          ))}
        </div>

        <div className="col" id="col3" ref={col3Ref}>
          {columns[2].map((src, idx) => (
            <div className="card" key={`c3-${idx}`}>
              <img alt={`Gallery ${idx + 17}`} loading="lazy" src={src} />
            </div>
          ))}
        </div>
      </section>

      <h1>Our Gallery</h1>

      <style jsx>{`
        .results-page {
          min-height: 100vh;
          background: #fff;
          font-family: Arial, sans-serif;
        }

        .gallery-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 2vw;
          padding: 7rem 2vw 2vw;
          overflow: hidden;
          height: 100vh;
          position: relative;
          background: #fff;
        }

        .col {
          flex: 1;
          display: flex;
          flex-direction: column;
          will-change: transform;
        }

        .card {
          width: 28vw;
          height: 28vw;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 4vw;
        }

        .card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        h1 {
          margin: 0;
          padding: 1.5rem 0 2rem;
          text-align: center;
          font-family: Georgia, serif;
          font-weight: 400;
        }
      `}</style>
    </main>
  );
}
