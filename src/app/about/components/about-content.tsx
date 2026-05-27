export default function AboutContent() {
  return (
    <section className="flex h-screen min-h-0 w-full items-start overflow-y-auto px-4 pb-4 pt-30 md:h-screen md:items-center md:px-12 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-[1.2fr_.8fr]">
          <div className="p-2 md:rounded-[6px] md:border md:border-slate-200 md:bg-white/95 md:p-10 md:shadow-[0_20px_40px_rgba(15,23,42,.12)]">
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F8E6A0] md:mt-3 md:text-5xl md:text-slate-900">
              Tentang Akres Music Academy
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-[#F8E6A0]/90 md:text-base md:text-slate-700">
              Didirikan oleh Fariz Mufqi Djatmiko, Akres Music Academy memiliki
              visi untuk membantu anak-anak mencintai musik dan mencapai hasil
              yang unggul melalui kelas privat 1-on-1. Akres tidak hanya menjadi
              akademi, tetapi juga Community yang mendukung anak-anak untuk
              mencapai potensi musikal terbaik mereka.
            </p>
          </div>

          <div className="p-2 md:rounded-[6px] md:border md:border-slate-200 md:bg-white/95 md:p-10 md:shadow-[0_20px_40px_rgba(15,23,42,.12)]">
            <h2 className="text-2xl font-semibold tracking-tight text-[#F8E6A0] md:text-3xl md:text-slate-900">
              What Does ‘Akres’ Mean?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#F8E6A0]/90 md:text-base md:text-slate-700">
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
