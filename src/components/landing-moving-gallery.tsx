"use client";

const galleryItems = [
  "Kelas Individual",
  "Latihan Ensemble",
  "Persiapan Resital",
  "Sesi Evaluasi Teknik",
  "Kelas Repertoar",
  "Showcase Murid",
];

export function LandingMovingGallery() {
  const items = [...galleryItems, ...galleryItems];

  return (
    <div className="h-76 w-full overflow-hidden sm:h-64 md:h-126 lg:h-[30rem]">
      <div className="landing-marquee-track flex h-full w-max items-end gap-6">
        {items.map((title, index) => (
          <article
            className="w-[220px] shrink-0 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_28px_rgba(15,23,42,.16)] sm:w-[260px] md:w-[300px]"
            key={`${title}-${index}`}
            style={{ transform: `rotate(${[-12, -6, 0, 6, 11, 7][index % 6]}deg)` }}
          >
            <div className="aspect-[3/4] bg-slate-100">
              <img alt="" aria-hidden className="h-full w-full object-cover" src="/akres-logo-full.png?v=6" />
            </div>
            <div className="p-3 text-xs text-zinc-600">{title}</div>
          </article>
        ))}
      </div>
      <style jsx>{`
        .landing-marquee-track {
          animation: landing-marquee 40s linear infinite;
        }
        @keyframes landing-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
