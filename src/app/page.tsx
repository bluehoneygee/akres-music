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
