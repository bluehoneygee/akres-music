import Link from "next/link";

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.75A4 4 0 0 0 3.75 7.75v8.5a4 4 0 0 0 4 4h8.5a4 4 0 0 0 4-4v-8.5a4 4 0 0 0-4-4h-8.5Zm8.88 1.5a1.12 1.12 0 1 1 0 2.24 1.12 1.12 0 0 1 0-2.24ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.48h-3.4v13.24a2.89 2.89 0 1 1-2-2.75V9.25a6.34 6.34 0 1 0 6.36 6.35V9.18a8.2 8.2 0 0 0 4.8 1.53V7.38a4.79 4.79 0 0 1-1.99-.69Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.5 7.2a3 3 0 0 0-2.11-2.12C19.52 4.5 12 4.5 12 4.5s-7.52 0-9.39.58A3 3 0 0 0 .5 7.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 4.8 3 3 0 0 0 2.11 2.12C4.48 19.5 12 19.5 12 19.5s7.52 0 9.39-.58a3 3 0 0 0 2.11-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-4.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-zinc-950 px-4 py-12 text-white sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-xl font-semibold sm:text-2xl md:text-3xl">
          Bersama Akres, <span className="text-white">Tumbuh Lewat Musik</span>
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-white sm:mt-4 sm:text-sm">
          Langkah kecil dari latihan rutin membentuk progres besar.
          <span className="block">Akres Music Academy hadir untuk membantu murid berkembang</span>
          <span className="block">dengan alur belajar yang terarah.</span>
        </p>
        <div className="mt-6 flex justify-center gap-5 text-xl sm:mt-8 sm:gap-6 sm:text-2xl">
          <Link
            aria-label="Instagram Akres Music"
            className="transition-colors hover:text-zinc-300"
            href="https://www.instagram.com/akresmusic.id/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="inline-block size-6 align-middle sm:size-7">
              <InstagramIcon />
            </span>
          </Link>
          <Link
            aria-label="TikTok Akres Music"
            className="transition-colors hover:text-zinc-300"
            href="https://www.tiktok.com/@akresmusic.id"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="inline-block size-6 align-middle sm:size-7">
              <TikTokIcon />
            </span>
          </Link>
          <Link
            aria-label="YouTube Akres Music"
            className="transition-colors hover:text-zinc-300"
            href="https://youtube.com/@akresmusic?si=QAJxuDRY2VdixCxm"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="inline-block size-6 align-middle sm:size-7">
              <YouTubeIcon />
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
