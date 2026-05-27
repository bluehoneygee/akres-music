"use client";

export default function AboutContent() {
  return (
    <section className="flex min-h-0 flex-1 w-full items-center overflow-y-auto px-4 pb-4 pt-16 md:h-screen md:px-12 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[6px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_40px_rgba(15,23,42,.12)] md:p-10">
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Tentang Akres Music Academy
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-slate-700 md:text-base">
              Didirikan oleh Fariz Mufqi Djatmiko, Akres Music Academy memiliki
              visi untuk membantu anak-anak mencintai musik dan mencapai hasil
              yang unggul melalui kelas privat 1-on-1. Akres tidak hanya menjadi
              akademi, tetapi juga Community yang mendukung anak-anak untuk
              mencapai potensi musikal terbaik mereka.
            </p>
          </div>

          <div className="rounded-[6px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_40px_rgba(15,23,42,.12)] md:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              What Does ‘Akres’ Mean?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-700 md:text-base">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
