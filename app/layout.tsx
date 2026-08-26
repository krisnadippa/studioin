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
  title: "Studioin — Impact Through Creativity",
  description: "Every act of creativity brings innovation, design, and inspiration to professional teams and creators who need it most.",
  icons: {
    icon: "/images/logosihitam.png",
    shortcut: "/images/logosihitam.png",
    apple: "/images/logosihitam.png",
  },
  openGraph: {
    title: "Studioin — Impact Through Creativity",
    description: "Every act of creativity brings innovation, design, and inspiration to professional teams and creators who need it most.",
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
    title: "Studioin — Impact Through Creativity",
    description: "Every act of creativity brings innovation, design, and inspiration to professional teams and creators who need it most.",
    images: ["/images/logosihitam.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-zinc-900 font-sans">{children}</body>
    </html>
  );
}

