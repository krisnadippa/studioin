import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://studioin.com"),
  title: "Studioin — Platform Galeri & Proofing Foto Klien untuk Fotografer & Studio",
  description: "Kirim galeri foto photoshoot ke klien dengan mudah melalui integrasi Google Drive, proteksi kode PIN, dan kurasi foto interaktif tanpa ribet.",
  icons: {
    icon: "/images/logosihitam.png",
    shortcut: "/images/logosihitam.png",
    apple: "/images/logosihitam.png",
  },
  openGraph: {
    title: "Studioin — Platform Galeri & Proofing Foto Klien untuk Fotografer & Studio",
    description: "Kirim galeri foto photoshoot ke klien dengan mudah melalui integrasi Google Drive, proteksi kode PIN, dan kurasi foto interaktif tanpa ribet.",
    url: "https://studioin.com",
    siteName: "Studioin",
    images: [
      {
        url: "/images/logosihitam.png",
        width: 512,
        height: 512,
        alt: "Studioin Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Studioin — Platform Galeri & Proofing Foto Klien untuk Fotografer & Studio",
    description: "Kirim galeri foto photoshoot ke klien dengan mudah melalui integrasi Google Drive, proteksi kode PIN, dan kurasi foto interaktif tanpa ribet.",
    images: ["/images/logosihitam.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-zinc-900 font-sans">{children}</body>
    </html>
  );
}

