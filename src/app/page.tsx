import { CircularGallery } from "@/components/circular-gallery";
import { LandingFooter } from "@/components/landing-footer";
import { LandingHero } from "@/components/landing-hero";
import { LandingNavbar } from "@/components/landing-navbar";

export default function LandingPage() {
  return (
    <main className="relative">
      <div className="fixed inset-0 -z-10">
        <LandingHero />
      </div>
      <LandingNavbar />
      <div className="relative z-10 mt-[100vh] rounded-t-3xl bg-white">
        <section className="relative overflow-hidden bg-white py-16 md:py-18">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:mb-25 md:mt-25 md:grid-cols-2 md:px-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Orang Tua dan Instruktur Jadi Kunci Progres Murid
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-zinc-900 md:text-5xl">
                Perubahan Besar
                <br className="hidden md:block" />
                Dimulai <span className="text-zinc-800">dari Latihan di Kelas</span>
              </h2>
              <p className="mt-5 max-w-xl text-sm text-zinc-900/80 md:text-base">
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
                  <div className="absolute -left-2 -top-2 h-6 w-6 rounded-lg bg-zinc-900/90" />
                  <div className="absolute -right-2 -top-2 h-6 w-6 rounded-lg bg-zinc-700/90" />
                  <p className="mt-2 text-xl font-semibold text-zinc-900 md:text-3xl">{card.v}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-900/70">{card.d}</p>
                </div>
              ))}
            </div>
          </div>

        <div className="relative mt-20" style={{ height: "650px" }}>
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
      </div>
    </main>
  );
}
