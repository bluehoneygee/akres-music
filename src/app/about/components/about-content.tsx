"use client";

export default function AboutContent() {
  return (
    <section className="flex h-screen w-full items-center px-6 pt-20 md:px-12 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_40px_rgba(15,23,42,.12)] md:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">About</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Tentang Akres Music Academy
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-slate-700 md:text-base">
              Didirikan oleh Fariz Mufqi Djatmiko, Akres Music Academy memiliki visi untuk membantu anak-anak mencintai
              musik dan mencapai hasil yang unggul melalui kelas privat 1-on-1. Akres tidak hanya menjadi akademi,
              tetapi juga Community yang mendukung anak-anak untuk mencapai potensi musikal terbaik mereka.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_40px_rgba(15,23,42,.12)] md:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              What Does ‘Muso’ Mean?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-700 md:text-base">
              First, what does ‘Muso’ mean? Muso is short for “musician” or someone who is obsessed with music.
              For example, your kids who show off piano, flute, or violin everywhere can say “I am such a muso” or
              “Those musos seem to be learning from Lawrence and Isabelle...”
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
