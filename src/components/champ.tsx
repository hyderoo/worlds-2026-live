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

/** Small round Riot player photo. Without a published photo (or if it fails to load) an empty round placeholder keeps names aligned; no substitute image is used. */
export function PlayerAvatar({ src, name, size = 28 }: { src?: string; name: string; size?: number }) {
  const [bad, setBad] = useState(false);
  const box = { width: size, height: size };
  if (!src || bad) return <span aria-hidden style={box} className="inline-block shrink-0 rounded-full border border-line bg-raise align-middle" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`${name}, player photo`} width={size} height={size} loading="lazy" decoding="async" onError={() => setBad(true)} style={box} className="inline-block shrink-0 rounded-full border border-line bg-raise object-cover object-top align-middle" />;
}
