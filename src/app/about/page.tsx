import AboutContent from "./components/about-content";
import GridMotionBg from "./components/grid-motion-bg";
import { LandingFooter } from "@/components/landing-footer";
import { LandingNavbar } from "@/components/landing-navbar";

export default function AboutPage() {
  return (
    <main className="relative min-h-dvh">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden md:block">
        <GridMotionBg className="h-full w-full" />
        <div className="absolute inset-0 bg-white" />
      </div>

      <div aria-hidden className="fixed inset-0 -z-10 md:hidden" />
      <LandingNavbar />
      <AboutContent />
      <LandingFooter />
    </main>
  );
}
