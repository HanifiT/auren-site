import type { Metadata } from "next";
import { IM_Fell_English, EB_Garamond } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";

/**
 * IM Fell English is a digitisation of the types John Fell brought to Oxford in
 * the 1670s: hand-cut, irregular, and warm — a printer's hand rather than a
 * state blackletter. It replaces Grenze Gotisch, which was severe in exactly
 * the way the app is trying not to be: the register is kept by somebody who
 * lives on the island, not issued by the Crown.
 *
 * One display face and one body face, and no third. The italic is loaded
 * because glosses are set in it.
 */
const display = IM_Fell_English({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
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
