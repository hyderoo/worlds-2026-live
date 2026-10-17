import type { Metadata } from "next";
import { NextView } from "@/components/next-view";

export const metadata: Metadata = {
  title: "Next match",
  description: "Worlds 2026 next match with a live countdown.",
  manifest: "/next/manifest.webmanifest",
  alternates: { canonical: "/next" },
  appleWebApp: { capable: true, title: "Worlds Next", statusBarStyle: "black-translucent" },
  icons: { icon: "/next-icon-192.png", apple: "/next-icon-192.png" },
};

export default function Page() {
  return <NextView />;
}
