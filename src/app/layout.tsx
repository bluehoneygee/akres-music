import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "Akres Music Academic Dashboard",
  description: "Dashboard akademik sekolah musik berbasis spesifikasi ERPNext Akres.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
