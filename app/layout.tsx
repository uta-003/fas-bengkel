import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import SoundProvider from "@/app/components/SoundProvider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bengkel FAS — Keluar Masuk Barang & Barcode",
  description:
    "Sistem bengkel modern untuk mengelola keluar masuk barang berbasis barcode.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.svg", type: "image/svg+xml", sizes: "16x16" },
      { url: "/favicon-32x32.svg", type: "image/svg+xml", sizes: "32x32" },
      { url: "/apple-touch-icon.svg", type: "image/png", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#540b0e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SoundProvider>{children}</SoundProvider>
      </body>
    </html>
  );
}