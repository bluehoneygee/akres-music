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
              Akres Music Academy hadir untuk membantu murid mencintai musik dan mencapai hasil belajar yang
              konsisten melalui kelas privat 1-on-1, kelas penguatan teknik, dan pengalaman tampil. Akres bukan hanya
              tempat belajar, tetapi juga ruang bertumbuh bagi murid, orang tua, dan instruktur dalam komunitas musik
              yang suportif.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_40px_rgba(15,23,42,.12)] md:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Nilai Utama Akres
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-700 md:text-base">
              Di Akres, proses belajar tidak hanya fokus pada teknik, tetapi juga musikalitas, disiplin latihan, dan
              kepercayaan diri saat tampil. Setiap murid dibimbing sesuai level dan tujuan belajarnya agar progres
              tetap terarah, terukur, dan menyenangkan.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
