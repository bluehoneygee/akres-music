"use client";

import { LandingFooter } from "@/components/landing-footer";
import { LandingNavbar } from "@/components/landing-navbar";
import GridMotion from "@/components/grid-motion";
import Image from "next/image";
import { useState } from "react";

const instructors = [
  {
    name: "Fariz Mufqi Djatmiko",
    role: "Piano Instructor",
    image:
      "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817917/WhatsApp_Image_2026-05-26_at_18.41.59_oa41y8.jpg",
    imagePosition: "center 22%",
    href: "/about",
  },
  {
    name: "Octavia Permatasari",
    role: "Vocal Instructor",
    image:
      "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817918/WhatsApp_Image_2026-05-26_at_18.42.00_hmb0or.jpg",
    imagePosition: "center 22%",
    href: "/about",
  },
  {
    name: "Daniel Simon Julio Siahainenia",
    role: "Guitar Instructor",
    image:
      "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817918/WhatsApp_Image_2026-05-26_at_18.42.00_1_ocm6nz.jpg",
    imagePosition: "center 22%",
    href: "/about",
  },
  {
    name: "Mutiara Indah Hartanty",
    role: "Vocal Instructor",
    image:
      "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817918/WhatsApp_Image_2026-05-26_at_18.42.00_2_rv8s0i.jpg",
    imagePosition: "center 22%",
    href: "/about",
  },
];

export default function InstructorsPage() {
  const bgItems = Array.from({ length: 28 }, () => "/akres-logo-full.png?v=6");
  const [activeInstructor, setActiveInstructor] = useState<string | null>(null);

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f5f5] md:block md:h-auto md:overflow-visible">
      <LandingNavbar />

      <section className="relative z-0 flex h-screen w-full items-start overflow-y-auto px-4 pt-6 md:h-screen md:items-center md:overflow-hidden md:px-12 md:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 hidden md:block"
        >
          <div className="h-full w-full bg-[#eef1f4] [filter:grayscale(1)]">
            <GridMotion
              gradientColor="rgba(255, 255, 255, 0.5)"
              items={bgItems}
            />
          </div>
          <div className="absolute inset-0 bg-[#dfe4ea]/68" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 z-0 bg-[#F8E6A0] md:hidden"
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl md:max-w-5xl">
          <h1 className="mb-2 pt-30 text-center text-2xl font-semibold tracking-wide text-[#223A5E] md:hidden">
            Meet Our Instructors
          </h1>

          <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-x-4 gap-y-2 px-0 md:hidden">
            {instructors.map((instructor) => {
              const isActive = activeInstructor === instructor.name;

              return (
                <article
                  className="group relative h-[248px]"
                  key={`mobile-${instructor.name}`}
                  onClick={() => {
                    setActiveInstructor((current) =>
                      current === instructor.name ? null : instructor.name,
                    );
                  }}
                >
                  <div
                    className={`absolute bottom-0 left-1/2 z-0 flex h-[190px] w-[190px] -translate-x-1/2 flex-col items-center justify-start rounded-[6px] bg-[#09090d] px-3 pt-32 text-white shadow-[0_14px_30px_rgba(15,23,42,.26)] transition-all duration-300 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <h2 className="text-center text-[12px] font-semibold uppercase leading-tight tracking-[0.05em] !text-white">
                      {instructor.name}
                    </h2>
                    <p className="mt-1 text-center text-[10px] font-medium !text-white/85">
                      {instructor.role}
                    </p>
                  </div>

                  <div
                    className={`absolute bottom-0 left-1/2 z-20 h-[190px] w-[190px] -translate-x-1/2 overflow-hidden rounded-[6px] [transform-origin:50%_0%] shadow-[0_10px_20px_rgba(15,23,42,.14)] transition-all duration-300 ${
                      isActive ? "-translate-y-8 scale-[0.68]" : ""
                    }`}
                  >
                    <Image
                      alt={instructor.name}
                      className="object-cover"
                      fill
                      sizes="190px"
                      src={instructor.image}
                      style={{ objectPosition: instructor.imagePosition }}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mx-auto hidden min-h-[58vh] w-full max-w-6xl flex-nowrap items-center justify-center gap-6 overflow-x-auto px-0 md:flex md:overflow-visible">
            {instructors.map((instructor) => {
              const isActive = activeInstructor === instructor.name;

              return (
                <article
                  className="group relative h-[420px] w-[270px] shrink-0"
                  key={instructor.name}
                  onClick={() => {
                    setActiveInstructor((current) =>
                      current === instructor.name ? null : instructor.name,
                    );
                  }}
                >
                  <div
                    className={`absolute bottom-4 left-1/2 z-0 flex h-[270px] w-[270px] -translate-x-1/2 flex-col items-center justify-start rounded-[6px] bg-[#09090d] px-4 pt-36 text-white shadow-[0_20px_48px_rgba(15,23,42,.32)] transition-all duration-500 ${
                      isActive ? "opacity-100" : "opacity-0"
                    } md:opacity-0 md:group-hover:opacity-100`}
                  >
                    <h2
                      className="text-center text-[18px] font-semibold uppercase leading-tight tracking-[0.06em] md:text-[20px]"
                      style={{ color: "#ffffff" }}
                    >
                      {instructor.name}
                    </h2>
                    <p
                      className="mt-1.5 text-center text-xs font-medium tracking-wide"
                      style={{ color: "rgba(255,255,255,.85)" }}
                    >
                      {instructor.role}
                    </p>
                  </div>

                  <div
                    className={`absolute bottom-4 left-1/2 z-20 h-[270px] w-[270px] -translate-x-1/2 overflow-hidden rounded-[6px] [transform-origin:50%_0%] transition-all duration-500 ${
                      isActive
                        ? "-translate-y-10 scale-[0.62] shadow-[0_14px_30px_rgba(15,23,42,.26)]"
                        : ""
                    } md:group-hover:-translate-y-10 md:group-hover:scale-[0.62] md:group-hover:shadow-[0_14px_30px_rgba(15,23,42,.26)]`}
                  >
                    <Image
                      alt={instructor.name}
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      fill
                      sizes="270px"
                      src={instructor.image}
                      style={{ objectPosition: instructor.imagePosition }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
