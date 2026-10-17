import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Splash } from "@/components/splash";
import { Footer, Header } from "@/components/shell";
import { buildSnapshot } from "@/lib/snapshot";
import { config } from "@/lib/config";

const display = Fraunces({ subsets: ["latin"], variable: "--nf-display", axes: ["opsz"] });
const sans = Inter({ subsets: ["latin"], variable: "--nf-sans" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: "Worlds 2026 Live: schedule, results and recaps", template: "%s | Worlds 2026 Live" },
  description: "League of Legends Worlds 2026 schedule, live results, bracket, standings, team profiles and match recaps. Data from the official LoL Esports source.",
  openGraph: { type: "website", siteName: "Worlds 2026 Live", title: "Worlds 2026 Live", description: "Schedule, results, bracket and recaps for LoL Worlds 2026." },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};
export const viewport: Viewport = { themeColor: "#0d0c11", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const snap = await buildSnapshot();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <Providers initial={snap}>
          <Splash />
          <Header />
          <main id="main" className="mx-auto max-w-6xl px-4 pb-8">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
