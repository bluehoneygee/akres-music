"use client";

import { Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNavigationForRole } from "@/lib/navigation";
import { cn, formatDisplayText } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string>();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [unreadNotification, setUnreadNotification] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSessionRole() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const session = (await response.json()) as {
          user?: { name?: string; email?: string; role?: string };
        };

        if (mounted) {
          setRole(session.user?.role ?? "Academic Staff");
          setUserEmail(session.user?.email ?? "");
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
      if (!role || !userEmail) return;
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
        });
        const json = (await response.json()) as {
          data?: Array<{ id: string }>;
        };
        const ids = Array.isArray(json.data)
          ? json.data.map((row) => row.id).filter(Boolean)
          : [];
        const seenKey = `notifications:seen:${userEmail.toLowerCase()}`;
        const seen = new Set<string>(
          JSON.parse(localStorage.getItem(seenKey) || "[]") as string[],
        );
        const hasUnread = ids.some((id) => !seen.has(id));
        if (mounted) setUnreadNotification(hasUnread);

        if (pathname === "/notifications") {
          localStorage.setItem(seenKey, JSON.stringify(ids));
          if (mounted) setUnreadNotification(false);
        }
      } catch {
        if (mounted) setUnreadNotification(false);
      }
    }

    void loadUnreadNotifications();
    const timer = setInterval(() => {
      void loadUnreadNotifications();
    }, 30_000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [pathname, role, userEmail]);

  const navigation = getNavigationForRole(role);
  const displayName = formatDisplayText(userName || "User");

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
        <div className="mx-auto grid h-full w-full max-w-[1500px] gap-3 sm:gap-5 lg:gap-6 lg:grid-cols-[56px_minmax(0,1fr)]">
          <aside className="liquid-glass no-glass-highlight hidden h-full min-h-0 flex-col overflow-hidden rounded-full border border-white/40 bg-white/45 p-1 backdrop-blur-3xl lg:flex">
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
          <section className="min-h-0 min-w-0 overflow-y-auto no-scrollbar pb-4 lg:h-full lg:pb-0">
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
        <div className="fixed inset-0 z-50 bg-zinc-950/25 p-3 backdrop-blur-sm lg:hidden">
          <div className="liquid-glass flex h-full max-w-[340px] flex-col rounded-[28px] border border-white/40 bg-white/70 p-4 shadow-2xl backdrop-blur-3xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <Brand />
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
              />
            </div>
            <div className="mt-4 shrink-0">
              <Button
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/login" })}
                variant="glass"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid h-full w-full max-w-[1500px] gap-3 sm:gap-5 lg:gap-6 lg:grid-cols-[56px_minmax(0,1fr)]">
        <aside className="liquid-glass no-glass-highlight hidden h-full min-h-0 flex-col overflow-hidden rounded-full border border-white/40 bg-white/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_28px_90px_rgba(15,23,42,.12)] backdrop-blur-3xl lg:flex">
          <div className="shrink-0">
            <Brand />
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto no-scrollbar">
            <NavigationList
              compact
              navigation={navigation}
              pathname={pathname}
              unreadNotification={unreadNotification}
            />
          </div>
          <div className="mt-4 shrink-0">
            <Button
              className="h-10 w-full px-0"
              onClick={() => signOut({ callbackUrl: "/login" })}
              variant="glass"
            >
              ⎋
            </Button>
          </div>
        </aside>

        <section className="min-h-0 min-w-0 overflow-y-auto no-scrollbar pb-4 lg:h-full lg:pb-0">
          <div className="sticky top-3 z-20 mb-3 lg:hidden">
            <button
              aria-label="Buka menu"
              className="grid size-9 place-items-center text-zinc-800 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              onClick={() => setMobileMenuOpen(true)}
              type="button"
            >
              <Menu className="size-5" />
            </button>
          </div>
          <div className="mb-4 hidden items-center justify-between gap-4 px-1 py-1 lg:flex">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-zinc-900">
                {greetingCopy.title}
              </p>
              <p className="mt-0.5 truncate text-sm text-zinc-600">{greetingCopy.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Notifications"
                className="grid size-10 place-items-center rounded-full !border-white/70 !bg-white !text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_8px_18px_rgba(15,23,42,.1)] transition-colors hover:!bg-white hover:!text-zinc-700"
                onClick={() => router.push("/notifications")}
                type="button"
              >
                <Bell className="size-4" />
              </button>
              <ThemeToggle />
            </div>
          </div>
          <div className="space-y-4">
            <div className="lg:hidden">
              <Greeting role={role} userName={userName} />
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function Greeting({ userName }: { role?: string; userName: string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/36 px-3 py-2">
      <p className="text-sm font-semibold text-zinc-800">
        Selamat datang, {formatDisplayText(userName || "User")}
      </p>
    </div>
  );
}

function NavigationList({
  navigation,
  onNavigate,
  pathname,
  unreadNotification = false,
  compact = false,
}: {
  navigation: ReturnType<typeof getNavigationForRole>;
  onNavigate?: () => void;
  pathname: string;
  unreadNotification?: boolean;
  compact?: boolean;
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
                  ? "bg-zinc-900 text-white shadow-[0_10px_18px_rgba(15,23,42,.25)] hover:bg-zinc-900 hover:text-white dark:bg-sky-300 dark:text-zinc-900 dark:shadow-[0_10px_18px_rgba(125,211,252,.35)] dark:hover:bg-sky-200"
                  : "bg-zinc-950 text-white shadow-lg hover:bg-zinc-900 hover:text-white dark:bg-sky-300 dark:text-zinc-900 dark:hover:bg-sky-200"),
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

function Brand() {
  return (
    <div className="grid place-items-center">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/60 bg-white p-0 shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_8px_18px_rgba(15,23,42,.1)]">
        <img
          alt="Akres Music Logo"
          className="h-[78%] w-[78%] object-contain"
          src="/akres-logo-full.png?v=7"
        />
      </div>
    </div>
  );
}
