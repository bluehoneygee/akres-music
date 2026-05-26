"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const HERO_VIDEO_URL =
  "https://res.cloudinary.com/djusa1ywh/video/upload/f_auto,q_auto:best,w_1920,c_fill/v1779789890/WhatsApp_Video_2026-05-26_at_14.12.45_1_ohf7os.mp4";

export function LandingHero() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(window.scrollY / window.innerHeight, 1);
      setScale(1 + progress * 0.2);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <video
        autoPlay
        className="block h-full w-full object-cover transition-transform duration-150"
        loop
        muted
        playsInline
        preload="metadata"
        style={{ transform: `scale(${scale})` }}
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/58 via-black/45 to-black/52" />

      <div className="absolute inset-0 grid place-content-center px-4 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-[clamp(28px,6vw,56px)] font-extrabold leading-tight">Mengajarkan Anak Mencintai Musik</h1>
          <p className="mt-2 text-[clamp(14px,3vw,18px)] text-white/90 md:mt-4">
            Akres Music Academy membimbing anak melalui kelas privat 1-on-1 agar berkembang musikal dan percaya diri.
            Kami mengajar piano, gitar, vocal, dan biola.
          </p>
          <div className="mt-2 flex justify-center gap-4 md:mt-5">
            <Link
              className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(24,24,27,.25)] transition hover:cursor-pointer hover:bg-zinc-800 hover:shadow-[0_14px_28px_rgba(24,24,27,.32)] sm:w-auto"
              href="/about"
            >
              Tentang Akres
            </Link>
            <Link
              className="w-full rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white hover:bg-white/20 sm:w-auto"
              href="https://wa.me/6281366584810?text=Halo%20Akres%20Music%20Academy%2C%20saya%20ingin%20booking%20kelas%20privat%201-on-1.%20Mohon%20info%20jadwal%2C%20biaya%2C%20dan%20pilihan%20instrumennya.%20Terima%20kasih."
              rel="noopener noreferrer"
              target="_blank"
            >
              Booking via WhatsApp
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
