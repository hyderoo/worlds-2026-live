"use client";
import { useState } from "react";
import { champIconUrl, champName } from "@/lib/champions";

/** Champion square from Riot Data Dragon. Hides itself if the image is unavailable (name stays visible next to it). */
export function ChampIcon({ id, size = 24 }: { id: string; size?: number }) {
  const [bad, setBad] = useState(false);
  if (bad) return <span aria-hidden style={{ width: size, height: size }} className="inline-block shrink-0 rounded-md bg-raise" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={champIconUrl(id)} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setBad(true)} title={champName(id)} className="inline-block shrink-0 rounded-md border border-line bg-raise align-middle" />;
}
