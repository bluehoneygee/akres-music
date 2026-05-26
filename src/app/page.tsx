import Link from "next/link";

import { CircularGallery } from "@/components/circular-gallery";
import { LandingFooter } from "@/components/landing-footer";
import { LandingNavbar } from "@/components/landing-navbar";

export default function LandingPage() {
  return (
    <main className="bg-white">
      <LandingNavbar />

      <section className="relative h-screen w-full">
        <img alt="" aria-hidden className="block h-full w-full object-cover" src="/akres-logo-full.png?v=6" />
        <div className="pointer-events-none absolute inset-0 bg-white/45" />

        <div className="absolute inset-0 grid place-content-center px-4 text-center text-black">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-[clamp(28px,6vw,56px)] font-extrabold leading-tight">Belajar Musik Lebih Terarah</h1>
            <p className="mt-2 text-[clamp(14px,3vw,18px)] text-black md:mt-4">
              Bantu murid memantau progres belajar musik dengan alur yang lebih jelas dan konsisten.
            </p>
            <div className="mt-2 flex justify-center gap-4 md:mt-5">
              <Link
                className="w-full rounded bg-[#AAC5B8] px-6 py-3 font-medium hover:cursor-pointer hover:bg-[#dceee5] sm:w-auto"
                href="/login"
              >
                Masuk Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-16 md:py-18">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:mb-25 md:mt-25 md:grid-cols-2 md:px-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-green-700/70">
              Orang Tua dan Instruktur Jadi Kunci Progres Murid
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-green-900 md:text-5xl">
              Perubahan Besar
              <br className="hidden md:block" />
              Dimulai <span className="text-green-600">dari Latihan di Kelas</span>
            </h2>
            <p className="mt-5 max-w-xl text-sm text-green-900/80 md:text-base">
              Akres membantu murid berkembang lewat jadwal rutin, attendance, journal, dan evaluasi yang rapi dalam
              satu portal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { v: "Jadwal dan attendance terhubung langsung.", d: "Monitoring kelas jadi lebih jelas." },
              { v: "Jurnal instruktur tersimpan per sesi.", d: "Progress materi mudah ditindaklanjuti." },
              { v: "Showcase jadi target latihan bertahap.", d: "Murid lebih siap tampil." },
              { v: "Portal role-based sesuai kebutuhan user.", d: "Akses data sesuai peran." },
            ].map((card, i) => (
              <div
                className="relative rounded-2xl border border-white/40 bg-[rgba(255,255,255,0.55)] p-5 shadow-[0_10px_25px_rgba(164,109,38,0.15)] transition-shadow hover:shadow-[0_14px_30px_rgba(164,109,38,0.22)]"
                key={i}
              >
                <div className="absolute -left-2 -top-2 h-6 w-6 rounded-lg bg-[#5D8374]/90" />
                <div className="absolute -right-2 -top-2 h-6 w-6 rounded-lg bg-green-700/90" />
                <p className="mt-2 text-xl font-semibold text-[#5D8374] md:text-3xl">{card.v}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-green-900/70">{card.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-20" style={{ height: "650px" }}>
          <h3 className="text-center text-2xl font-semibold leading-tight text-green-700 md:text-5xl">
            Dari Kelas ke Panggung
          </h3>
          <p className="mb-5 mt-8 px-2 text-center text-sm text-green-900/80 md:px-20 md:text-base">
            Dokumentasi proses belajar murid Akres dari latihan rutin hingga showcase.
          </p>
          <div className="h-76 w-full overflow-hidden sm:h-64 md:h-126 lg:h-[30rem]">
            <CircularGallery
              bend={3}
              borderRadius={0.05}
              items={[
                { image: "/akres-logo-full.png?v=6", text: "" },
                { image: "/akres-logo-full.png?v=6", text: "" },
                { image: "/akres-logo-full.png?v=6", text: "" },
                { image: "/akres-logo-full.png?v=6", text: "" },
                { image: "/akres-logo-full.png?v=6", text: "" },
                { image: "/akres-logo-full.png?v=6", text: "" },
              ]}
              scrollEase={0.02}
              textColor="black"
            />
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
