import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeInitializer } from "@/components/theme-initializer";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Akres Music Academic",
  description: "Sistem akademik sekolah musik berbasis spesifikasi ERPNext Akres.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={poppins.className}>
        <ThemeInitializer />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
