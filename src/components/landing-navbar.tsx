"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getClientSession } from "@/lib/client-session";
import { getPublicNavigationBySection, publicNavigation } from "@/lib/navigation";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setAboutOpen(false);
  }, [pathname]);

  const isHomeActive = pathname === "/";
  const isHomePage = pathname === "/";
  const isAboutActive = pathname === "/about" || pathname.startsWith("/about/");
  const isActivePath = (href: string) => pathname === href;
  const homeItem = useMemo(
    () => publicNavigation.find((item) => item.href === "/" && item.section === "primary"),
    [],
  );
  const aboutItem = useMemo(
    () => publicNavigation.find((item) => item.section === "about"),
    [],
  );
  const loginItem = useMemo(
    () => publicNavigation.find((item) => item.section === "auth"),
    [],
  );
  const aboutItems = useMemo(() => getPublicNavigationBySection("about-child"), []);
  const primaryNavItems = useMemo(
    () => getPublicNavigationBySection("primary").filter((item) => item.href !== "/"),
    [],
  );
  const HomeIcon = homeItem?.icon;
  const AboutIcon = aboutItem?.icon;
  const LoginIcon = loginItem?.icon;
  const authHref = isLoggedIn ? "/dashboard" : (loginItem?.href ?? "/login");
  const authLabel = isLoggedIn ? "Dashboard" : (loginItem?.label ?? "Login");

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

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const session = await getClientSession();
      if (mounted) setIsLoggedIn(Boolean(session.user?.id || session.user?.email));
    }

    void loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 transition-opacity duration-200 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          aria-label="Close menu overlay"
          className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[1px]"
          onClick={() => {
            setOpen(false);
            setAboutOpen(false);
          }}
          type="button"
        />

        <aside
          aria-hidden={!open}
          className={`relative flex h-screen w-[84%] max-w-[340px] flex-col bg-white px-5 pb-10 pt-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-end border-b border-zinc-200 pb-4">
            <button
              aria-label="Close menu"
              className="!text-black focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
              onClick={() => {
                setOpen(false);
                setAboutOpen(false);
              }}
              type="button"
            >
              <X size={24} />
            </button>
          </div>

          <ul className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto text-sm font-bold capitalize tracking-wide">
              <li>
                <Link
                  className={`flex items-center gap-2 transition ${
                    isHomeActive
                      ? "text-amber-700"
                      : "!text-black hover:text-amber-700"
                  }`}
                  href={homeItem?.href ?? "/"}
                >
                  {HomeIcon ? <HomeIcon className="size-4" /> : null}
                  {homeItem?.label ?? "Home"}
                </Link>
              </li>

              {aboutItem ? (
                <li>
                  <button
                    aria-expanded={aboutOpen}
                    className={`flex w-full items-center justify-between transition ${
                      isAboutActive
                        ? "text-amber-700"
                        : "!text-black hover:text-amber-700"
                    }`}
                    onClick={() => setAboutOpen((prev) => !prev)}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      {AboutIcon ? <AboutIcon className="size-4" /> : null}
                      {aboutItem.label}
                    </span>
                    <ChevronDown
                      className={`size-4 transition-transform ${aboutOpen ? "rotate-180" : "rotate-0"}`}
                    />
                  </button>
                  <div
                    className={`mt-2 space-y-2 overflow-hidden pl-4 transition-[max-height,opacity] duration-200 ${
                      aboutOpen ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    {aboutItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          className={`flex items-center gap-2 text-xs font-semibold capitalize tracking-wide transition ${
                            pathname === item.href
                              ? "text-amber-700"
                              : "text-black hover:text-amber-700"
                          }`}
                          href={item.href}
                          key={`${item.section}-${item.href}-${item.label}`}
                        >
                          <Icon className="size-3.5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </li>
              ) : null}

              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      className={`flex items-center gap-2 transition ${
                        isActivePath(item.href)
                          ? "text-amber-700"
                          : "!text-black hover:text-amber-700"
                      }`}
                      href={item.href}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}

              {loginItem ? (
                <li className="mt-auto border-t border-zinc-200 pt-6 pb-2">
                  <Link
                    className={`${isActivePath(authHref) ? "text-amber-700" : "!text-black hover:text-amber-700"} flex items-center gap-2 transition`}
                    href={authHref}
                  >
                    {LoginIcon ? <LoginIcon className="size-4" /> : null}
                    {authLabel}
                  </Link>
                </li>
              ) : null}
          </ul>
        </aside>
      </div>

      <nav
        className={`left-0 top-0 z-40 w-full transition-all duration-300 ${
          isHomePage
            ? isSticky
              ? "fixed bg-white/92 shadow-[0_12px_34px_rgba(146,64,14,0.12)] backdrop-blur"
              : "absolute bg-white/92 shadow-[0_12px_34px_rgba(146,64,14,0.12)] backdrop-blur"
            : "fixed bg-white/92 shadow-[0_12px_34px_rgba(146,64,14,0.12)] backdrop-blur"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <button
            aria-label="Toggle menu"
            className="!text-black focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            type="button"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>

          <Link className="hidden items-center md:inline-flex" href="/">
            <span className="relative block h-[44px] w-[242px] shrink-0 md:h-[56px] md:w-[308px]">
              <Image
                alt="Akres Music Academy"
                className="object-contain"
                fill
                sizes="(max-width: 768px) 242px, 308px"
                src="/IMG_4876-navbar.png"
              />
            </span>
          </Link>

          <ul className="hidden gap-8 text-xs uppercase tracking-wider md:flex">
            <li>
              <Link
                className={`inline-flex items-center gap-2 transition ${
                  isHomeActive
                    ? "text-amber-700"
                    : "text-zinc-600 hover:text-amber-700"
                }`}
                href={homeItem?.href ?? "/"}
              >
                {homeItem?.label ?? "Home"}
              </Link>
            </li>

            {aboutItem ? (
              <li className="group relative">
                <Link
                  className={`inline-flex items-center gap-2 transition ${
                    isAboutActive
                      ? "text-amber-700"
                      : "text-zinc-600 hover:text-amber-700"
                  }`}
                  href={aboutItem.href}
                >
                  {aboutItem.label}
                </Link>
                <div className="absolute left-1/2 top-full z-30 w-44 -translate-x-1/2 pt-1.5">
                  <div className="pointer-events-none translate-y-2 rounded-xl border border-zinc-200 bg-white p-2 opacity-0 shadow-[0_12px_30px_rgba(24,24,27,0.12)] transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {aboutItems.map((item) => (
                      <Link
                        className={`block rounded-lg px-3 py-2 text-[11px] uppercase tracking-wider transition hover:bg-zinc-50 hover:text-amber-700 ${
                          pathname === item.href ? "text-amber-700" : "text-black"
                        }`}
                        href={item.href}
                        key={`${item.section}-${item.href}-${item.label}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </li>
            ) : null}

            {primaryNavItems.map((item) => {
              return (
                <li key={item.href}>
                  <Link
                    className={`inline-flex items-center gap-2 transition ${
                      isActivePath(item.href)
                        ? "text-amber-700"
                        : "text-zinc-600 hover:text-amber-700"
                    }`}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {loginItem ? (
            <Link
              className="hidden rounded-full bg-[#09090b] px-4 py-2 font-medium !text-white shadow-[0_10px_22px_rgba(24,24,27,0.24)] transition hover:bg-[#18181b] md:inline-block"
              href={authHref}
            >
              {authLabel}
            </Link>
          ) : null}

          <span aria-hidden="true" className="block w-[26px] md:hidden" />
        </div>
      </nav>
    </>
  );
}
