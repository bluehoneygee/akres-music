import Image from "next/image";
import Link from "next/link";

export default function AkresConcertSeriesPage() {
  return (
    <main
      className="min-h-screen !bg-white px-4 py-8 sm:px-6 sm:py-10 md:h-screen md:overflow-hidden md:py-6"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="mx-auto max-w-5xl bg-white md:flex md:h-full md:flex-col">
        <div className="overflow-hidden bg-white md:flex-1">
          <Image
            alt="Akres Concert Series under construction"
            className="h-auto w-full"
            height={3000}
            priority
            src="/akres-concert-series-under-construction.jpg"
            width={2000}
          />
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            href="/"
          >
            Kembali ke Home
          </Link>
        </div>
      </div>
    </main>
  );
}
