import { LandingFooter } from "@/components/landing-footer";
import { PolicyFaqAccordion } from "@/components/policy-faq-accordion";
import { LandingNavbar } from "@/components/landing-navbar";

const enrollmentPolicies = [
  "Pembayaran kursus dilakukan di awal bulan sebelum pertemuan ke-1.",
  "Setiap pertemuan berdurasi 60 menit, jumlah pertemuan mengikuti paket.",
  "Siswa wajib memiliki jadwal tetap (hari dan jam) yang sudah ditentukan.",
  "Pergantian jadwal maksimal 1x dalam 1 bulan.",
  "Pergantian jadwal harus dilakukan di bulan yang sama, jika lewat maka terhitung hangus.",
  "Minggu ke-5 libur, tidak ada les.",
  "Keterlambatan tidak menambah durasi kursus.",
  "Jika studio libur, Akres akan memberikan jadwal pengganti kepada murid.",
];

const lessonFees = [
  "Paket A: Rp350.000 (4x pertemuan per bulan / 1x per minggu).",
  "Paket B: Rp700.000 (8x pertemuan per bulan / 2x per minggu).",
  "Durasi setiap pertemuan: 60 menit.",
];

const faqs = [
  {
    q: "Minimal usia untuk ikut kelas vokal berapa?",
    a: "Kelas vokal terbuka untuk semua usia, dengan usia minimal 5 tahun.",
  },
  {
    q: "Lokasi studio di mana?",
    a: "Studio Akres Music Academy berlokasi di Kemiling, Bandar Lampung.",
  },
  {
    q: "Kalau telat datang, apakah jam les ditambah?",
    a: "Tidak. Durasi kelas tetap 60 menit sesuai jadwal.",
  },
  {
    q: "Bagaimana jika studio libur?",
    a: "Pihak studio akan memberikan jadwal pengganti kepada murid.",
  },
];

function PolicyPanel({ title, items, defaultOpen = false }: { title: string; items: string[]; defaultOpen?: boolean }) {
  return (
    <details className="rounded-2xl border border-zinc-200 bg-white shadow-sm" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-6 py-5 text-xl font-medium text-[#1f4a9d]">{title}</summary>
      <ul className="list-disc space-y-2 px-10 pb-6 text-base text-black">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f5]">
      <LandingNavbar />

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-32">
        <div className="space-y-4">
          <PolicyPanel defaultOpen items={enrollmentPolicies} title="Enrolment Policies" />
          <PolicyPanel items={lessonFees} title="Lesson Fees" />
        </div>
      </section>

      <section className="bg-[#ffd700] py-14">
        <div className="w-full pl-6 pr-0">
          <h2 className="text-center text-4xl font-semibold text-black">Frequently Asked Questions</h2>
          <div className="mt-8">
            <PolicyFaqAccordion items={faqs} />
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
