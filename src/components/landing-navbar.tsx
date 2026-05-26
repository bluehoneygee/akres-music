"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="absolute left-0 top-0 z-20 w-full bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link className="text-xl font-bold text-green-600" href="/">
          Akres<span className="text-yellow-300">Music</span>
        </Link>

        <ul className="hidden gap-8 text-xs uppercase tracking-wider md:flex">
          <li>
            <Link className="text-green-600 hover:text-yellow-300" href="/">
              Home
            </Link>
          </li>
          <li className="group relative">
            <Link className="text-green-600 hover:text-yellow-300" href="/about">
              About
            </Link>
            <div className="absolute left-1/2 top-full z-30 w-44 -translate-x-1/2 pt-2">
              <div className="invisible rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <Link
                className="block rounded-lg px-3 py-2 text-[11px] uppercase tracking-wider text-green-700 hover:bg-slate-50"
                href="/about"
              >
                About Akres
              </Link>
              <Link
                className="block rounded-lg px-3 py-2 text-[11px] uppercase tracking-wider text-green-700 hover:bg-slate-50"
                href="/about/instructors"
              >
                Instructors
              </Link>
              </div>
            </div>
          </li>
          <li>
            <Link className="text-green-600 hover:text-yellow-300" href="/results">
              Results
            </Link>
          </li>
          <li>
            <Link className="text-green-600 hover:text-yellow-300" href="/policies">
              Policies
            </Link>
          </li>
          <li>
            <Link className="text-green-600 hover:text-yellow-300" href="/akres-concert-series">
              Akres Concert Series
            </Link>
          </li>
        </ul>

        <Link
          className="hidden rounded bg-[#AAC5B8] px-4 py-2 font-medium text-black shadow hover:bg-[#d3e9de] md:inline-block"
          href="/login"
        >
          Login
        </Link>

        <button
          aria-label="Toggle menu"
          className="text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {open ? (
        <div className="rounded-b-xl bg-white px-6 py-4 shadow-lg md:hidden">
          <ul className="flex flex-col items-center gap-4 text-sm font-bold uppercase tracking-wider">
            <li>
              <Link className="text-green-600 hover:text-yellow-300" href="/">
                Home
              </Link>
            </li>
            <li>
              <Link className="text-green-600 hover:text-yellow-300" href="/about">
                About
              </Link>
              <div className="mt-2 space-y-2 pl-4">
                <Link className="block text-xs font-semibold tracking-wider text-green-700/90" href="/about">
                  About Akres
                </Link>
                <Link className="block text-xs font-semibold tracking-wider text-green-700/90" href="/about/instructors">
                  Instructors
                </Link>
              </div>
            </li>
            <li>
              <Link className="text-green-600 hover:text-yellow-300" href="/results">
                Results
              </Link>
            </li>
            <li>
              <Link className="text-green-600 hover:text-yellow-300" href="/policies">
                Policies
              </Link>
            </li>
            <li>
              <Link className="text-green-600 hover:text-yellow-300" href="/akres-concert-series">
                Akres Concert Series
              </Link>
            </li>
            <li>
              <Link className="block rounded bg-[#AAC5B8] px-4 py-2 font-medium text-green-700" href="/login">
                Login
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
