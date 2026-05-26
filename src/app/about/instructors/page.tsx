"use client";

import { LandingFooter } from "@/components/landing-footer";
import { LandingNavbar } from "@/components/landing-navbar";
import Link from "next/link";
import Image from "next/image";

const instructors = [
  {
    name: "Fariz Mufqi Djatmiko",
    role: "Piano Instructor",
    image: "/akres-logo-full.png",
    href: "/about",
  },
  {
    name: "Sari Wijaya",
    role: "Violin Instructor",
    image: "/akres-logo-full.png",
    href: "/about",
  },
  {
    name: "Budi Santoso",
    role: "Ensemble Instructor",
    image: "/akres-logo-full.png",
    href: "/about",
  },
  {
    name: "Maya Putri",
    role: "Vocal Instructor",
    image: "/akres-logo-full.png",
    href: "/about",
  },
  {
    name: "Jason Tan",
    role: "Guitar Instructor",
    image: "/akres-logo-full.png",
    href: "/about",
  },
];

export default function InstructorsPage() {
  return (
    <main className="bg-[#f5f5f5]">
      <LandingNavbar />

      <section className="flex h-screen w-full items-center px-6 pt-16 md:pt-20">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight text-[#17324f] md:text-4xl">
            Instructors
          </h1>
          <p className="mb-6 text-center text-sm text-[#17324f]/75 md:text-base">Meet Our Music Instructors</p>
          <div className="mx-auto flex min-h-[58vh] w-full max-w-6xl flex-nowrap items-center justify-center gap-6 overflow-x-auto px-6 md:overflow-visible md:px-10">
            {instructors.map((instructor) => (
              <article
                className="group relative flex h-[220px] w-[170px] shrink-0 items-center justify-center p-4 transition-transform duration-300"
                key={instructor.name}
              >
                <div className="relative h-32 w-32 overflow-hidden rounded-full ring-2 ring-white shadow-[0_10px_30px_rgba(15,23,42,.2)] transition-all duration-500 group-hover:h-20 group-hover:w-20 group-hover:-translate-y-14 group-hover:shadow-[0_18px_34px_rgba(15,23,42,.26)]">
                  <Image alt={instructor.name} className="object-cover transition-transform duration-500 group-hover:scale-95" fill sizes="128px" src={instructor.image} />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-4 translate-y-6 text-center opacity-0 transition-all duration-500 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                  <h2 className="truncate text-sm font-semibold tracking-tight text-[#17324f]">{instructor.name}</h2>
                  <p className="mt-1 truncate text-[11px] font-medium tracking-wide text-[#17324f]/80">{instructor.role}</p>
                  <Link
                    className="mt-3 inline-flex rounded-full bg-[#17324f] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#0f243a]"
                    href={instructor.href}
                  >
                    View Profile
                  </Link>
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
