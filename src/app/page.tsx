import { CircularGallery } from "@/components/circular-gallery";
import { LandingFooter } from "@/components/landing-footer";
import { LandingHero } from "@/components/landing-hero";
import { LandingInstructorResultsHover } from "@/components/landing-instructor-results-hover";
import { LandingNavbar } from "@/components/landing-navbar";

export default function LandingPage() {
  return (
    <main className="relative">
      <div className="fixed inset-0 -z-10">
        <LandingHero />
      </div>
      <LandingNavbar />
      <div className="relative z-10 mt-[100vh] rounded-t-3xl bg-white">
        <section className="relative overflow-hidden bg-white py-0">
          <LandingInstructorResultsHover />

          <div className="relative mt-20" style={{ height: "650px" }}>
            <div className="h-76 w-full overflow-hidden sm:h-64 md:h-126 lg:h-[30rem]">
              <CircularGallery
                bend={3}
                borderRadius={0.05}
                items={[
                  { image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.36.51_p2xg8n.jpg", text: "" },
                  { image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.37.05_opgi1f.jpg", text: "" },
                  { image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.36.48_ff4iiv.jpg", text: "" },
                  { image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817141/IMG_5148_sswd48.jpg", text: "" },
                  { image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.37.04_trqbzh.jpg", text: "" },
                  { image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817069/WhatsApp_Image_2026-05-26_at_19.36.49_moaku3.jpg", text: "" },
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
