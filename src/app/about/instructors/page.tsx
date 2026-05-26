"use client";

import { LandingFooter } from "@/components/landing-footer";
import { LandingNavbar } from "@/components/landing-navbar";
import Image from "next/image";

const instructors = [
  {
    name: "Fariz Mufqi Djatmiko",
    role: "Piano Instructor",
    image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817917/WhatsApp_Image_2026-05-26_at_18.41.59_oa41y8.jpg",
    imagePosition: "center 22%",
    href: "/about",
  },
  {
    name: "Octavia Permatasari",
    role: "Vocal Instructor",
    image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817918/WhatsApp_Image_2026-05-26_at_18.42.00_hmb0or.jpg",
    imagePosition: "center 22%",
    href: "/about",
  },
  {
    name: "Daniel Simon Julio Siahainenia",
    role: "Guitar Instructor",
    image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817918/WhatsApp_Image_2026-05-26_at_18.42.00_1_ocm6nz.jpg",
    imagePosition: "center 22%",
    href: "/about",
  },
  {
    name: "Mutiara Indah Hartanty",
    role: "Vocal Instructor",
    image: "https://res.cloudinary.com/djusa1ywh/image/upload/v1779817918/WhatsApp_Image_2026-05-26_at_18.42.00_2_rv8s0i.jpg",
    imagePosition: "center 22%",
    href: "/about",
  },
];

export default function InstructorsPage() {
  return (
    <main className="bg-[#f5f5f5]">
      <LandingNavbar />

      <section className="flex h-screen w-full items-center px-3 pt-16 md:px-6 md:pt-20">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Instructors
          </h1>
          <div className="mx-auto flex min-h-[58vh] w-full max-w-6xl flex-nowrap items-center justify-center gap-6 overflow-x-auto px-2 md:overflow-visible md:px-4">
            {instructors.map((instructor) => (
              <article className="group relative h-[350px] w-[230px] shrink-0" key={instructor.name}>
                <div className="absolute bottom-3 left-1/2 z-0 flex h-[230px] w-[230px] -translate-x-1/2 flex-col items-center justify-start rounded-[12px] bg-[#09090d] px-4 pt-32 text-white shadow-[0_18px_42px_rgba(15,23,42,.3)] transition-all duration-500 md:opacity-0 md:group-hover:opacity-100">
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

                <div className="absolute bottom-3 left-1/2 z-20 h-[230px] w-[230px] -translate-x-1/2 overflow-hidden rounded-[12px] [transform-origin:50%_0%] transition-all duration-500 md:group-hover:-translate-y-10 md:group-hover:scale-[0.62] md:group-hover:shadow-[0_14px_30px_rgba(15,23,42,.26)]">
                  <Image
                    alt={instructor.name}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    fill
                    sizes="230px"
                    src={instructor.image}
                    style={{ objectPosition: instructor.imagePosition }}
                  />
                </div>

              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
