import type { Metadata } from "next";
import { Grenze_Gotisch, EB_Garamond } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";

/**
 * Grenze Gotisch is a blackletter-derived display face that still sets legibly
 * at body sizes — it carries the register-of-souls voice without tipping into
 * the unreadable textura a real charter would have used.
 */
const display = Grenze_Gotisch({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});
const body = EB_Garamond({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Auren",
  description: "An island that grows without season.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
