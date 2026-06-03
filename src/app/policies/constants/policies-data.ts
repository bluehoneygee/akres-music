export type TextFAQItem = {
  q: string;
  a: string;
};

export type PolicyDropdownSource = {
  q: string;
  items: string[];
};

export const ENROLLMENT_POLICIES: string[] = [
  "Pembayaran kursus dibayarkan penuh dilakukan di awal bulan sebelum pertemuan ke-1.",
  "Tidak tersedia skema pembayaran khusus di luar kebijakan (misalnya bayar per pertemuan).",
  "Setiap pertemuan berdurasi 60 menit, jumlah pertemuan mengikuti paket.",
  "Siswa wajib memiliki jadwal tetap (hari dan jam) yang sudah ditentukan.",
  "Pergantian jadwal maksimal 1x dalam 1 bulan.",
  "Pergantian jadwal harus dilakukan di bulan yang sama, jika lewat maka terhitung hangus.",
  "Minggu ke-5 libur, tidak ada les.",
  "Keterlambatan tidak menambah durasi kursus.",
  "Jika studio libur, Akres akan memberikan jadwal pengganti kepada murid.",
];

export const FAQS: TextFAQItem[] = [
  {
    q: "Apakah orang dewasa masih bisa mendaftar dan belajar dari nol?",
    a: "Bisa. Kelas Akres terbuka untuk semua usia, termasuk dewasa pemula yang baru mulai belajar dari dasar.",
  },
  {
    q: "Minimal usia untuk ikut kelas vokal berapa?",
    a: "Kelas vokal terbuka untuk semua usia, dengan usia minimal 5 tahun.",
  },
  {
    q: "Lokasi studio di mana?",
    a: "Studio Akres Music Academy berlokasi di Perum Wana Asri, Jl. Kenari No.15 Blok C.11, Beringin Raya, Kec. Kemiling, Kota Bandar Lampung, Lampung 35158.",
  },
  {
    q: "Kalau telat datang, apakah jam les ditambah?",
    a: "Tidak. Durasi kelas tetap 60 menit sesuai jadwal.",
  },
 
];

export const POLICY_DROPDOWN_SOURCES: PolicyDropdownSource[] = [
  {
    q: "Enrolment Policies",
    items: ENROLLMENT_POLICIES,
  },
];
