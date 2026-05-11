"use client";

import { Menu, Music2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNavigationForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string>();

  useEffect(() => {
    let mounted = true;

    async function loadSessionRole() {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const session = (await response.json()) as { user?: { role?: string } };

      if (mounted) {
        setRole(session.user?.role ?? "Academic Staff");
      }
    }

    void loadSessionRole();

    return () => {
      mounted = false;
    };
  }, []);

  const navigation = getNavigationForRole(role);

  const nav = (
    <nav className="space-y-1">
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
            onClick={() => setMobileMenuOpen(false)}
          >
            <item.icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <main className="min-h-screen px-3 py-3 text-zinc-950 sm:px-5 lg:p-6">
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-zinc-950/25 p-3 backdrop-blur-sm lg:hidden">
          <div className="liquid-glass h-full max-w-[340px] rounded-[28px] border border-white/40 bg-white/70 p-4 shadow-2xl backdrop-blur-3xl">
            <div className="mb-7 flex items-center justify-between gap-3">
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
            {nav}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-[1500px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="liquid-glass hidden min-h-[calc(100vh-48px)] rounded-[28px] border border-white/40 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_28px_90px_rgba(15,23,42,.12)] backdrop-blur-3xl lg:block">
          <div className="mb-8">
            <Brand />
          </div>
          {nav}
          {role ? (
            <div className="mt-4 rounded-2xl border border-white/40 bg-white/36 px-3 py-2 text-xs text-zinc-600">
              <span className="block font-medium uppercase text-zinc-400">Role</span>
              <span className="mt-0.5 block font-semibold text-zinc-700">{role}</span>
            </div>
          ) : null}
          <Card className="liquid-glass mt-8 rounded-[24px] bg-white/36">
            <CardHeader>
              <CardTitle className="text-sm">MVP Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={38} />
              <p className="text-sm text-zinc-600">
                Master data, jadwal, absensi, jurnal, portal, billing, dan laporan dasar
                sudah tersedia.
              </p>
            </CardContent>
          </Card>
          <Button
            className="mt-3 w-full"
            onClick={() => signOut({ callbackUrl: "/login" })}
            variant="glass"
          >
            Logout
          </Button>
          <ThemeToggle className="mt-3 w-full" showLabel />
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="liquid-glass sticky top-3 z-20 rounded-[28px] border border-white/40 bg-white/55 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.78),0_20px_70px_rgba(15,23,42,.10)] backdrop-blur-3xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Button
                aria-label="Buka menu"
                onClick={() => setMobileMenuOpen(true)}
                size="icon"
                variant="glass"
              >
                <Menu className="size-5" />
              </Button>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button onClick={() => signOut({ callbackUrl: "/login" })} variant="glass">
                  Logout
                </Button>
              </div>
            </div>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-12 place-items-center rounded-2xl bg-zinc-950 text-white shadow-xl">
        <Music2 className="size-6" />
      </div>
      <div>
        <p className="text-lg font-semibold">Akres Music</p>
        <p className="text-xs text-zinc-500">Academic Console</p>
      </div>
    </div>
  );
}
