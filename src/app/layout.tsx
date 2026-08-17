import type { Metadata } from "next";
import { Cinzel, EB_Garamond } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";

const display = Cinzel({ subsets: ["latin"], variable: "--font-display" });
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
