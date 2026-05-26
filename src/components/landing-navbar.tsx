"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const pathname = usePathname();

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
        isSticky ? "fixed bg-white/95 shadow-md backdrop-blur" : "absolute bg-white"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link className="text-xl font-bold text-zinc-900" href="/">
          Akres<span className="text-zinc-600">Music</span>
        </Link>

        <ul className="hidden gap-8 text-xs uppercase tracking-wider md:flex">
          <li>
            <Link className="text-zinc-900 hover:text-zinc-600" href="/">
              Home
            </Link>
          </li>
          <li className="group relative">
            <Link className="text-zinc-900 hover:text-zinc-600" href="/about">
              About
            </Link>
            <div className="absolute left-1/2 top-full z-30 w-44 -translate-x-1/2 pt-2">
              <div className="invisible rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <Link
                className="block rounded-lg px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-800 hover:bg-slate-50"
                href="/about"
              >
                About Akres
              </Link>
              <Link
                className="block rounded-lg px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-800 hover:bg-slate-50"
                href="/about/instructors"
              >
                Instructors
              </Link>
              </div>
            </div>
          </li>
          <li>
            <Link className="text-zinc-900 hover:text-zinc-600" href="/results">
              Results
            </Link>
          </li>
          <li>
            <Link className="text-zinc-900 hover:text-zinc-600" href="/policies">
              Policies
            </Link>
          </li>
          <li>
            <Link className="text-zinc-900 hover:text-zinc-600" href="/akres-concert-series">
              Akres Concert Series
            </Link>
          </li>
        </ul>

        <Link
          className="hidden rounded bg-zinc-900 px-4 py-2 font-medium text-white shadow hover:bg-zinc-800 md:inline-block"
          href="/login"
        >
          Login
        </Link>

        <button
          aria-label="Toggle menu"
          className="text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:ring-offset-2 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {open ? (
        <div className="rounded-b-xl bg-white px-6 py-4 shadow-lg md:hidden">
          <ul className="flex flex-col items-center gap-4 text-sm font-bold uppercase tracking-wider">
            <li>
              <Link className="text-zinc-900 hover:text-zinc-600" href="/">
                Home
              </Link>
            </li>
            <li>
              <Link className="text-zinc-900 hover:text-zinc-600" href="/about">
                About
              </Link>
              <div className="mt-2 space-y-2 pl-4">
                <Link className="block text-xs font-semibold tracking-wider text-zinc-800/90" href="/about">
                  About Akres
                </Link>
                <Link className="block text-xs font-semibold tracking-wider text-zinc-800/90" href="/about/instructors">
                  Instructors
                </Link>
              </div>
            </li>
            <li>
              <Link className="text-zinc-900 hover:text-zinc-600" href="/results">
                Results
              </Link>
            </li>
            <li>
              <Link className="text-zinc-900 hover:text-zinc-600" href="/policies">
                Policies
              </Link>
            </li>
            <li>
              <Link className="text-zinc-900 hover:text-zinc-600" href="/akres-concert-series">
                Akres Concert Series
              </Link>
            </li>
            <li>
              <Link className="block rounded bg-zinc-900 px-4 py-2 font-medium text-white" href="/login">
                Login
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
