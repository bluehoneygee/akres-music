import Link from "next/link";
import { Globe, Music2, PlayCircle } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-[#5D8374] px-4 py-16 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-semibold md:text-3xl">
          Bersama Akres, <span className="text-white">Tumbuh Lewat Musik</span>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white">
          Langkah kecil dari latihan rutin membentuk progres besar. Akres Music Academy hadir untuk membantu murid
          berkembang dengan alur belajar yang terarah.
        </p>
        <div className="mt-8 flex justify-center gap-6 text-2xl">
          <Link className="transition-colors hover:text-[#cae2d9]" href="https://instagram.com">
            <Music2 />
          </Link>
          <Link className="transition-colors hover:text-[#cae2d9]" href="https://youtube.com">
            <PlayCircle />
          </Link>
          <Link className="transition-colors hover:text-[#cae2d9]" href="https://facebook.com">
            <Globe />
          </Link>
        </div>
      </div>
    </footer>
  );
}
