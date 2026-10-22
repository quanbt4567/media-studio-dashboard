import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin", "vietnamese"], variable: "--font-manrope" });
const mono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_CLUB_NAME || "BCN"} | Media desk`,
  description: "A focused media management workspace for university clubs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Be Vietnam Pro + Playfair Display: full Vietnamese diacritics support
            (the old Arial Black display font broke ơ/ư/đ marks). */}
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700;800;900&family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} ${manrope.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
