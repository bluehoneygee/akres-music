"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  Home,
  MapPin,
  Menu,
  Music2,
  Piano,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const metrics = [
  {
    label: "Murid aktif",
    value: "128",
    delta: "+12 bulan ini",
    icon: GraduationCap,
    tint: "bg-sky-100 text-sky-700",
  },
  {
    label: "Sesi minggu ini",
    value: "84",
    delta: "71 selesai",
    icon: CalendarDays,
    tint: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Jurnal terkirim",
    value: "92%",
    delta: "visible untuk portal",
    icon: BookOpenCheck,
    tint: "bg-violet-100 text-violet-700",
  },
  {
    label: "Tagihan terbuka",
    value: "Rp18,4jt",
    delta: "9 invoice",
    icon: WalletCards,
    tint: "bg-amber-100 text-amber-700",
  },
];

const navItems = [
  { label: "Overview", href: "#overview", icon: Sparkles },
  { label: "Jadwal Les", href: "#jadwal", icon: CalendarDays },
  { label: "Murid & Wali", href: "#murid", icon: Users },
  { label: "Lesson Journal", href: "#journal", icon: FileText },
  { label: "Billing", href: "#billing", icon: Banknote },
  { label: "Permission", href: "#permission", icon: ShieldCheck },
];

const schedules = [
  {
    time: "10:00",
    student: "Ayu Prameswari",
    course: "Piano Beginner Private",
    teacher: "Budi Santoso",
    mode: "Studio",
    room: "Piano Room 1",
    status: "Scheduled",
    accent: "bg-sky-500",
  },
  {
    time: "13:30",
    student: "Nara Wijaya",
    course: "Vocal Beginner Private",
    teacher: "Maya Lestari",
    mode: "Home Visit",
    room: "Jl. Melodi No. 12",
    status: "Scheduled",
    accent: "bg-emerald-500",
  },
  {
    time: "16:00",
    student: "Rafi Adhitama",
    course: "Guitar Intermediate",
    teacher: "Dimas Putra",
    mode: "Studio",
    room: "Strings Room",
    status: "Rescheduled",
    accent: "bg-amber-500",
  },
];

const attendance = [
  { name: "Ayu Prameswari", instrument: "Piano", status: "Present", makeup: false },
  { name: "Nara Wijaya", instrument: "Vocal", status: "Late", makeup: false },
  { name: "Rafi Adhitama", instrument: "Guitar", status: "Permission", makeup: true },
  { name: "Keisha Ananda", instrument: "Drums", status: "Absent", makeup: true },
];

const journals = [
  {
    student: "Ayu Prameswari",
    material: "Postur duduk, finger number, dan intro Minuet in G.",
    rating: "Improving",
    progress: 68,
  },
  {
    student: "Nara Wijaya",
    material: "Latihan pitch dasar, artikulasi, dan Twinkle Twinkle.",
    rating: "Good",
    progress: 78,
  },
  {
    student: "Rafi Adhitama",
    material: "Strumming pattern, transisi chord, dan tempo stabil.",
    rating: "Needs Work",
    progress: 46,
  },
];

const alerts = [
  {
    title: "Keisha absen 3 kali dalam 30 hari",
    meta: "Kirim notifikasi ke parent portal",
    variant: "danger" as const,
  },
  {
    title: "2 invoice jatuh tempo hari ini",
    meta: "Reminder billing manual",
    variant: "warning" as const,
  },
  {
    title: "8 jurnal menunggu publish",
    meta: "Pastikan parent_visible aktif",
    variant: "secondary" as const,
  },
];

const portalRows = [
  ["Parent Portal", "Guardian.user -> Student.guardians", "Aktif"],
  ["Student Portal", "Jadwal, absensi, progress, invoice", "Aktif"],
  ["Instructor", "Input attendance dan lesson journal", "Aktif"],
];

function statusVariant(status: string) {
  if (status === "Present" || status === "Completed" || status === "Aktif") {
    return "success";
  }

  if (status === "Late" || status === "Rescheduled") {
    return "warning";
  }

  if (status === "Absent") {
    return "danger";
  }

  return "secondary";
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen px-3 py-3 text-zinc-950 sm:px-5 lg:p-6">
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-zinc-950/25 p-3 backdrop-blur-sm lg:hidden">
          <div className="liquid-glass h-full max-w-[340px] rounded-[28px] border border-white/40 bg-white/70 p-4 shadow-2xl backdrop-blur-3xl">
            <div className="mb-7 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-zinc-950 text-white shadow-xl">
                  <Music2 className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">Akres Music</p>
                  <p className="text-xs text-zinc-500">Academic ERP Console</p>
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
            <nav className="space-y-1">
              {navItems.map((item) => (
                <a
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-700 transition-colors hover:bg-white/60 hover:text-zinc-950"
                  href={item.href}
                  key={item.label}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-[1500px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="liquid-glass hidden min-h-[calc(100vh-48px)] rounded-[28px] border border-white/40 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_28px_90px_rgba(15,23,42,.12)] backdrop-blur-3xl lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-zinc-950 text-white shadow-xl">
              <Music2 className="size-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">Akres Music</p>
              <p className="text-xs text-zinc-500">Academic ERP Console</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <a
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-600 transition-colors hover:bg-white/50 hover:text-zinc-950",
                  item.label === "Overview" &&
                    "bg-zinc-950 text-white shadow-lg hover:bg-zinc-900 hover:text-white",
                )}
                href={item.href}
                key={item.label}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <Card className="liquid-glass mt-8 rounded-[24px] bg-white/36">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Piano className="size-4" />
                MVP Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={74} />
              <p className="text-sm text-zinc-600">
                Core academic, portal, attendance, journal, dan billing preview sudah
                direpresentasikan.
              </p>
            </CardContent>
          </Card>
        </aside>

        <section className="min-w-0 space-y-4">
          <header className="liquid-glass sticky top-3 z-20 rounded-[28px] border border-white/40 bg-white/55 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.78),0_20px_70px_rgba(15,23,42,.10)] backdrop-blur-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  aria-label="Buka menu"
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  size="icon"
                  variant="glass"
                >
                  <Menu className="size-5" />
                </Button>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Minggu akademik 10-17 Mei 2026
                  </p>
                  <h1 className="truncate text-xl font-semibold tracking-normal sm:text-2xl">
                    Dashboard Manajemen Sekolah Musik
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button className="hidden sm:inline-flex" variant="glass">
                  <Search className="size-4" />
                  Cari
                </Button>
                <Button size="icon" variant="glass" aria-label="Notifikasi">
                  <Bell className="size-5" />
                </Button>
                <Button>
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Jadwal</span>
                </Button>
              </div>
            </div>
          </header>

          <section id="overview" className="scroll-mt-28 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <Card className="liquid-glass" key={metric.label}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-zinc-500">{metric.label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-normal">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{metric.delta}</p>
                    </div>
                    <div className={cn("grid size-11 place-items-center rounded-2xl", metric.tint)}>
                      <metric.icon className="size-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section
            id="jadwal"
            className="scroll-mt-28 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]"
          >
            <Card className="liquid-glass">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Jadwal Les Hari Ini</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">
                    Studio dan home visit sesuai Course Schedule.
                  </p>
                </div>
                <Button variant="glass" size="sm">
                  Lihat semua
                  <ArrowUpRight className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {schedules.map((item) => (
                  <div
                    className="grid gap-3 rounded-[20px] border border-white/45 bg-white/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] sm:grid-cols-[72px_minmax(0,1fr)_auto]"
                    key={`${item.time}-${item.student}`}
                  >
                    <div className="flex items-center gap-2 sm:block">
                      <span className={cn("inline-block size-2 rounded-full", item.accent)} />
                      <p className="font-semibold sm:mt-1">{item.time}</p>
                      <p className="text-xs text-zinc-500">60 menit</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.student}</p>
                      <p className="truncate text-sm text-zinc-500">{item.course}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" />
                          {item.teacher}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {item.mode === "Studio" ? (
                            <MapPin className="size-3.5" />
                          ) : (
                            <Home className="size-3.5" />
                          )}
                          {item.room}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                      <Button size="icon" variant="glass" aria-label="Buka detail jadwal">
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle>Alert Operasional</CardTitle>
                <p className="mt-1 text-sm text-zinc-500">
                  Aturan notifikasi absen dan tagihan dari specs.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    className="rounded-[20px] border border-white/45 bg-white/42 p-4"
                    key={alert.title}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <AlertTriangle className="size-5 text-zinc-500" />
                      <Badge variant={alert.variant}>Action</Badge>
                    </div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">{alert.meta}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section id="murid" className="scroll-mt-28 grid gap-4 xl:grid-cols-3">
            <Card className="liquid-glass xl:col-span-1">
              <CardHeader>
                <CardTitle>Absensi Murid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {attendance.map((item) => (
                  <div className="flex items-center justify-between gap-3" key={item.name}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-zinc-500">
                        {item.instrument}
                        {item.makeup ? " - makeup required" : ""}
                      </p>
                    </div>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card id="journal" className="liquid-glass scroll-mt-28 xl:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Lesson Journal & Progress</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">
                    Materi, repertoire, homework, dan progress rating.
                  </p>
                </div>
                <Badge variant="outline">Parent visible</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {journals.map((journal) => (
                  <div
                    className="rounded-[20px] border border-white/45 bg-white/42 p-4"
                    key={journal.student}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="font-medium">{journal.student}</p>
                      <Badge variant={statusVariant(journal.rating)}>{journal.rating}</Badge>
                    </div>
                    <p className="min-h-16 text-sm text-zinc-600">{journal.material}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Progress</span>
                        <span>{journal.progress}%</span>
                      </div>
                      <Progress value={journal.progress} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
            <Card id="permission" className="liquid-glass scroll-mt-28">
              <CardHeader>
                <CardTitle>Portal & Permission Matrix</CardTitle>
                <p className="mt-1 text-sm text-zinc-500">
                  Role dari spesifikasi: admin, staff akademik, guru, murid, orang tua.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full min-w-[620px] border-separate border-spacing-y-2 text-left text-sm">
                    <thead className="text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Area</th>
                        <th className="px-3 py-2 font-medium">Akses Data</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portalRows.map(([area, access, status]) => (
                        <tr className="bg-white/42" key={area}>
                          <td className="rounded-l-2xl px-3 py-3 font-medium">{area}</td>
                          <td className="px-3 py-3 text-zinc-600">{access}</td>
                          <td className="rounded-r-2xl px-3 py-3">
                            <Badge variant={statusVariant(status)}>{status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card id="billing" className="liquid-glass scroll-mt-28">
              <CardHeader>
                <CardTitle>Billing Manual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[22px] border border-white/45 bg-zinc-950 p-5 text-white shadow-xl">
                  <p className="text-sm text-white/65">Billing period</p>
                  <p className="mt-2 text-2xl font-semibold">2026-05</p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-sm text-white/70">Collected</span>
                    <span className="text-lg font-semibold">Rp42,8jt</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] border border-white/45 bg-white/42 p-4">
                    <Clock3 className="mb-3 size-5 text-amber-600" />
                    <p className="text-2xl font-semibold">7</p>
                    <p className="text-xs text-zinc-500">hari sebelum due</p>
                  </div>
                  <div className="rounded-[20px] border border-white/45 bg-white/42 p-4">
                    <CheckCircle2 className="mb-3 size-5 text-emerald-600" />
                    <p className="text-2xl font-semibold">31</p>
                    <p className="text-xs text-zinc-500">invoice lunas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </section>
      </div>
    </main>
  );
}
