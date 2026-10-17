import type { Metadata } from "next";
import { WatchView } from "@/components/watch-view";

export const metadata: Metadata = { title: "Watch-along", description: "Countdown, official stream link and private notes for a Worlds 2026 match. Spoiler-safe.", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WatchView id={id} />;
}
