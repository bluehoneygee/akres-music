"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNavigationForRole } from "@/lib/navigation";
import { cn, formatDisplayText } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string>();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSessionRole() {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const session = (await response.json()) as { user?: { name?: string; email?: string; role?: string } };

      if (mounted) {
        setRole(session.user?.role ?? "Academic Staff");
        setUserName(session.user?.name || session.user?.email || "User");
      }
    }

    void loadSessionRole();

    return () => {
      mounted = false;
    };
  }, []);

  const navigation = getNavigationForRole(role);

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

      <div className="mx-auto grid h-full w-full max-w-[1500px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="liquid-glass hidden h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/40 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_28px_90px_rgba(15,23,42,.12)] backdrop-blur-3xl lg:flex">
          <div className="shrink-0">
            <div className="mb-5">
              <Brand />
            </div>
            <Greeting role={role} userName={userName} />
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto no-scrollbar">
            <NavigationList navigation={navigation} pathname={pathname} />
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
          <div className="space-y-4">{children}</div>
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
}: {
  navigation: ReturnType<typeof getNavigationForRole>;
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav className="space-y-1 pr-1">
      {navigation.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-600 transition-colors hover:bg-white/50 hover:text-zinc-950",
              active && "bg-zinc-950 text-white shadow-lg hover:bg-zinc-900 hover:text-white",
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <item.icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/60 bg-white p-0 shadow-xl">
        <img
          alt="Akres Music Logo"
          className="h-full w-full object-contain"
          src="/akres-logo-full.png?v=7"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold leading-tight">Akres Music Academy</p>
        <div className="mt-2">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
