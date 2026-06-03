"use client";

import { Bell, Home, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getClientSession } from "@/lib/client-session";
import { getNavigationForRole } from "@/lib/navigation";
import { cn, formatDisplayText } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string>();
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSessionRole() {
      try {
        const session = (await getClientSession()) as {
          user?: { id?: string; name?: string; email?: string; role?: string };
        };

        if (mounted) {
          setRole(session.user?.role ?? "Academic Staff");
          setUserId(String(session.user?.id ?? ""));
          setUserName(session.user?.name || session.user?.email || "User");
        }
      } finally {
        if (mounted) {
          setSessionLoading(false);
        }
      }
    }

    void loadSessionRole();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadUnreadNotifications() {
      if (!role || !userId) return;
      try {
        const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        const json = (await response.json()) as { count?: number };
        const unreadCount = Number(json.count ?? 0);
        if (mounted) setUnreadNotificationCount(unreadCount);
      } catch {
        if (mounted) setUnreadNotificationCount(0);
      }
    }

    void loadUnreadNotifications();
    const onSeenUpdated = () => {
      void loadUnreadNotifications();
    };
    window.addEventListener("notifications:seen-updated", onSeenUpdated as EventListener);
    const timer = setInterval(() => {
      void loadUnreadNotifications();
    }, 30_000);

    return () => {
      mounted = false;
      window.removeEventListener("notifications:seen-updated", onSeenUpdated as EventListener);
      clearInterval(timer);
    };
  }, [role, userId]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDarkMode(root.classList.contains("dark"));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const navigation = getNavigationForRole(role);
  const displayName = formatDisplayText(userName || "User");
  const isNotificationsActive = pathname === "/notifications";
  const unreadNotification = unreadNotificationCount > 0;

  useEffect(() => {
    setHeaderScrolled(false);
  }, [pathname]);

  function headerCopy() {
    if (role === "Parent Portal User") {
      return {
        title: `Halo, ${displayName}.`,
        subtitle: "Siap pantau jadwal dan progres belajar anak Anda hari ini?",
      };
    }

    if (role === "Instructor Portal User") {
      return {
        title: `Halo, ${displayName}.`,
        subtitle: "Siap mengajar dan update progres murid hari ini?",
      };
    }

    if (role === "System Manager") {
      return {
        title: `Halo, ${displayName}.`,
        subtitle: "Siap kelola operasional akademik hari ini?",
      };
    }

    return {
      title: `Halo, ${displayName}.`,
      subtitle: "Siap mulai aktivitas hari ini?",
    };
  }

  const greetingCopy = headerCopy();

  if (sessionLoading) {
    return (
      <main className="h-screen overflow-hidden px-3 py-3 text-zinc-950 sm:px-5 lg:p-6">
        <div className="mx-auto grid h-full w-full max-w-[1500px] gap-3 sm:gap-5 lg:gap-6 md:grid-cols-[56px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="liquid-glass no-glass-highlight hidden h-full min-h-0 flex-col overflow-hidden rounded-full border border-white/40 bg-white/45 p-1 backdrop-blur-3xl md:flex xl:hidden">
            <div className="h-16 w-full animate-pulse rounded-2xl bg-white/55" />
            <div className="mt-4 h-11 w-full animate-pulse rounded-2xl bg-white/45" />
            <div className="mt-5 space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  className="h-10 w-full animate-pulse rounded-2xl bg-white/40"
                  key={index}
                />
              ))}
            </div>
          </aside>
          <aside className="liquid-glass no-glass-highlight hidden h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/40 bg-white/45 p-3 backdrop-blur-3xl xl:flex">
            <div className="h-12 w-full animate-pulse rounded-2xl bg-white/55" />
            <div className="mt-5 space-y-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  className="flex h-10 items-center gap-3 rounded-2xl bg-white/40 px-3 animate-pulse"
                  key={index}
                >
                  <div className="size-4 rounded-full bg-white/65" />
                  <div className="h-3 w-24 rounded bg-white/65" />
                </div>
              ))}
            </div>
            <div className="mt-auto h-10 w-full animate-pulse rounded-2xl bg-white/45" />
          </aside>
          <section className="min-h-0 min-w-0 overflow-y-auto no-scrollbar pb-4 md:h-full md:pb-0">
            <div className="space-y-4">
              <div className="h-28 w-full animate-pulse rounded-[28px] bg-white/45" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    className="h-24 animate-pulse rounded-3xl bg-white/42"
                    key={index}
                  />
                ))}
              </div>
              <div className="h-80 w-full animate-pulse rounded-[28px] bg-white/38" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden px-3 py-3 text-zinc-950 sm:px-5 lg:p-6">
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-zinc-950/25 p-3 backdrop-blur-sm md:hidden">
          <div className="liquid-glass flex h-full max-w-[340px] flex-col rounded-[28px] border border-white/40 bg-white/70 p-4 shadow-2xl backdrop-blur-3xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <Brand compact />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{greetingCopy.title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-600">{greetingCopy.subtitle}</p>
                </div>
              </div>
              <Button
                aria-label="Tutup menu"
                onClick={() => setMobileMenuOpen(false)}
                size="icon"
                variant="glass"
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
              <NavigationList
                navigation={navigation}
                onNavigate={() => setMobileMenuOpen(false)}
                pathname={pathname}
                unreadNotification={unreadNotification}
                isDarkMode={isDarkMode}
              />
            </div>
            <div className="mt-4 grid shrink-0 gap-2">
              <HomeLinkButton onNavigate={() => setMobileMenuOpen(false)} />
              <Button
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="glass"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid h-full w-full max-w-[1500px] gap-3 sm:gap-5 lg:gap-6 md:grid-cols-[56px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="liquid-glass no-glass-highlight hidden h-full min-h-0 flex-col overflow-hidden rounded-full border border-white/40 bg-white/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_28px_90px_rgba(15,23,42,.12)] backdrop-blur-3xl md:flex xl:hidden">
          <div className="shrink-0">
            <Brand compact />
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto no-scrollbar">
            <NavigationList
              compact
              navigation={navigation}
              pathname={pathname}
              unreadNotification={unreadNotification}
              isDarkMode={isDarkMode}
            />
          </div>
          <div className="mt-4 grid shrink-0 gap-2">
            <HomeLinkButton compact />
            <Button
              className="h-10 w-full px-0"
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="glass"
            >
              ⎋
            </Button>
          </div>
        </aside>

        <aside className="liquid-glass no-glass-highlight hidden h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/40 bg-white/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_28px_90px_rgba(15,23,42,.12)] backdrop-blur-3xl xl:flex">
          <div className="shrink-0 px-1 pb-2">
            <Brand showText />
          </div>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto no-scrollbar">
            <NavigationList
              navigation={navigation}
              pathname={pathname}
              unreadNotification={unreadNotification}
              isDarkMode={isDarkMode}
            />
          </div>
          <div className="mt-4 grid shrink-0 gap-2 px-1 pb-1">
            <HomeLinkButton />
            <Button
              className="h-10 w-full"
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="glass"
            >
              Logout
            </Button>
          </div>
        </aside>

        <section
          className="min-h-0 min-w-0 overflow-y-auto no-scrollbar pb-4 md:h-full md:pb-0"
          onScroll={(event) => {
            const scrolled = event.currentTarget.scrollTop > 8;
            setHeaderScrolled((current) => (current === scrolled ? current : scrolled));
          }}
        >
          <div className="sticky top-3 z-30 mb-5 md:hidden">
            <div className="flex items-center justify-between gap-2 px-2 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  aria-label="Buka menu"
                  className="grid size-9 place-items-center rounded-full text-zinc-800 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  onClick={() => setMobileMenuOpen(true)}
                  type="button"
                >
                  <Menu className="size-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Notifications"
                  className={cn(
                    "relative grid size-9 place-items-center rounded-full !border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_8px_18px_rgba(15,23,42,.1)] transition-colors",
                    isNotificationsActive
                      ? isDarkMode
                        ? "!bg-white !text-zinc-900"
                        : "!bg-black !text-white"
                      : isDarkMode
                        ? "!bg-zinc-900/55 !text-zinc-300"
                        : "!bg-white !text-zinc-500",
                  )}
                  onClick={() => router.push("/notifications")}
                  type="button"
                >
                  <Bell className="size-4" />
                  {unreadNotification ? (
                    <>
                      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-rose-500" />
                      <span className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-rose-500 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                      </span>
                    </>
                  ) : null}
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>
          <div
            className={cn(
              "sticky top-0 z-40 mb-4 hidden grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-2xl px-3 py-2 transition-all md:grid",
              headerScrolled
                ? "bg-white/55 shadow-[0_10px_24px_rgba(15,23,42,.08)] backdrop-blur-md"
                : "bg-transparent shadow-none backdrop-blur-0",
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-zinc-900">
                {greetingCopy.title}
              </p>
              <p className="mt-0.5 truncate text-sm text-zinc-600">{greetingCopy.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 justify-self-end">
              <button
                aria-label="Notifications"
                className={cn(
                  "relative grid size-10 place-items-center rounded-full !border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_8px_18px_rgba(15,23,42,.1)] transition-colors",
                  isNotificationsActive
                    ? isDarkMode
                      ? "!bg-white !text-zinc-900"
                      : "!bg-black !text-white"
                    : isDarkMode
                      ? "!bg-zinc-900/55 !text-zinc-300"
                      : "!bg-white !text-zinc-500",
                )}
                onClick={() => router.push("/notifications")}
                type="button"
              >
                <Bell className="size-4" />
                {unreadNotification ? (
                  <>
                    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-rose-500" />
                    <span className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-rose-500 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  </>
                ) : null}
              </button>
              <ThemeToggle />
            </div>
          </div>
          <div className="space-y-4">{children}</div>
        </section>
      </div>
    </main>
  );
}

function HomeLinkButton({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/40 text-sm font-medium text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] transition-colors hover:bg-white/65 hover:text-zinc-950",
        compact && "w-full rounded-full px-0",
      )}
      href="/"
      onClick={onNavigate}
      title="Home"
    >
      <Home className="size-4" />
      {compact ? null : <span>Home</span>}
    </Link>
  );
}

function NavigationList({
  navigation,
  onNavigate,
  pathname,
  unreadNotification = false,
  compact = false,
  isDarkMode = false,
}: {
  navigation: ReturnType<typeof getNavigationForRole>;
  onNavigate?: () => void;
  pathname: string;
  unreadNotification?: boolean;
  compact?: boolean;
  isDarkMode?: boolean;
}) {
  const filteredNavigation = navigation.filter(
    (item) => item.href !== "/notifications",
  );

  return (
    <nav className={cn("space-y-1 pr-1", compact && "space-y-2 pr-0")}>
      {filteredNavigation.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            className={cn(
              "group",
              compact
                ? "relative mx-auto grid size-10 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-900 before:hidden after:hidden"
                : "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-600 transition-colors hover:bg-white/50 hover:text-zinc-950",
              active &&
                (compact
                  ? isDarkMode
                    ? "!bg-white !text-zinc-900 shadow-[0_10px_18px_rgba(255,255,255,.24)] hover:!bg-zinc-100 hover:!text-zinc-900"
                    : "!bg-black !text-white shadow-[0_10px_18px_rgba(15,23,42,.25)] hover:!bg-black hover:!text-white"
                  : isDarkMode
                    ? "!bg-white !text-zinc-900 shadow-lg hover:!bg-zinc-100 hover:!text-zinc-900"
                    : "!bg-black !text-white shadow-lg hover:!bg-black hover:!text-white"),
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            title={item.label}
          >
            <item.icon className="size-4" />
            {compact ? null : <span>{item.label}</span>}
            {compact ? (
              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
                {item.label}
              </span>
            ) : null}
            {item.href === "/notifications" && unreadNotification ? (
              <span
                className={cn(
                  "size-2 rounded-full bg-rose-500",
                  compact ? "absolute right-1 top-1" : "ml-auto",
                )}
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ compact = false, showText = false }: { compact?: boolean; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "justify-center" : "justify-start")}>
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center overflow-hidden border border-white/60 bg-white p-0 shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_8px_18px_rgba(15,23,42,.1)]",
          compact ? "rounded-full" : "rounded-xl",
        )}
      >
        <img
          alt="Akres Music Logo"
          className="h-[78%] w-[78%] object-contain"
          src="/akres-logo-full.png?v=7"
        />
      </div>
      {showText ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">Akres Music</p>
          <p className="truncate text-xs text-zinc-500">Academic</p>
        </div>
      ) : null}
    </div>
  );
}
