"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
  { href: "/policies", label: "Policies" },
  { href: "/akres-concert-series", label: "Akres Concert Series" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      setIsSticky(false);
      return;
    }

    const onScroll = () => {
      const trigger = window.innerHeight - 80;
      setIsSticky(window.scrollY >= trigger);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return (
    <nav
      className={`left-0 top-0 z-20 w-full transition-all duration-300 ${
        isSticky
          ? "fixed bg-white/92 shadow-[0_12px_34px_rgba(146,64,14,0.12)] backdrop-blur"
          : "absolute bg-white/92 shadow-[0_12px_34px_rgba(146,64,14,0.12)] backdrop-blur"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link className="inline-flex items-center" href="/">
          <span className="relative block h-[44px] w-[242px] shrink-0 md:h-[56px] md:w-[308px]">
            <Image
              alt="Akres Music Academy"
              className="object-contain"
              fill
              priority
              sizes="(max-width: 768px) 242px, 308px"
              src="/IMG_4876-navbar.png"
            />
          </span>
        </Link>

        <ul className="hidden gap-8 text-xs uppercase tracking-wider md:flex">
          <li className="group relative">
            <Link className="!text-black transition hover:text-amber-700" href="/about">
              About
            </Link>
            <div className="absolute left-1/2 top-full z-30 w-44 -translate-x-1/2 pt-1.5">
              <div className="pointer-events-none translate-y-2 rounded-xl border border-zinc-200 bg-white p-2 opacity-0 shadow-[0_12px_30px_rgba(24,24,27,0.12)] transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <Link
                  className="block rounded-lg px-3 py-2 text-[11px] uppercase tracking-wider text-black transition hover:bg-zinc-50 hover:text-amber-700"
                  href="/about"
                >
                  About Akres
                </Link>
                <Link
                  className="block rounded-lg px-3 py-2 text-[11px] uppercase tracking-wider text-black transition hover:bg-zinc-50 hover:text-amber-700"
                  href="/about/instructors"
                >
                  Instructors
                </Link>
              </div>
            </div>
          </li>

          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link className="!text-black transition hover:text-amber-700" href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          className="hidden rounded-full bg-[#09090b] px-4 py-2 font-medium !text-white shadow-[0_10px_22px_rgba(24,24,27,0.24)] transition hover:bg-[#18181b] md:inline-block"
          href="/login"
        >
          Login
        </Link>

        <button
          aria-label="Toggle menu"
          className="!text-black focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          type="button"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {open ? (
        <div className="rounded-b-xl border-t border-amber-100/70 bg-white/98 px-6 py-4 shadow-[0_12px_30px_rgba(146,64,14,0.16)] md:hidden">
          <ul className="flex flex-col items-center gap-4 text-sm font-bold uppercase tracking-wider">
            <li>
              <Link className="!text-black transition hover:text-amber-700" href="/about">
                About
              </Link>
              <div className="mt-2 space-y-2 pl-4">
                <Link
                  className="block text-xs font-semibold tracking-wider text-black transition hover:text-amber-700"
                  href="/about"
                >
                  About Akres
                </Link>
                <Link
                  className="block text-xs font-semibold tracking-wider text-black transition hover:text-amber-700"
                  href="/about/instructors"
                >
                  Instructors
                </Link>
              </div>
            </li>

            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link className="!text-black transition hover:text-amber-700" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}

            <li>
              <Link
                className="block rounded-full bg-[#09090b] px-4 py-2 font-medium !text-white hover:bg-[#18181b]"
                href="/login"
              >
                Login
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
