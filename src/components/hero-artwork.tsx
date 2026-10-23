"use client";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/** K/DA "FIRESTARTER" official music video on the League of Legends YouTube channel (user-initiated embed, no rehosted audio). */
const VIDEO_ID = "Mmw-PpWhKFg";

const EMBERS = [
  [12, 88, 0, "#ff8ad8"], [26, 94, 1.4, "#f6e3a1"], [45, 90, 2.6, "#ff8ad8"], [63, 95, 0.8, "#f6e3a1"],
  [78, 89, 2.0, "#ff8ad8"], [90, 93, 3.2, "#f6e3a1"], [35, 96, 3.8, "#f6e3a1"], [55, 92, 4.6, "#ff8ad8"],
] as const;

/**
 * Home hero artwork: K/DA FIRESTARTER key art (supplied by the site owner; Riot fan art, credited) broken into
 * layered motion - blurred slow-zoom backdrop, drifting main art, parallax crowd band, rising embers.
 * Replaces the old drawn trophy. Respects reduced motion. Play button opens the official MV embed; artwork authorship is not claimed.
 */
export function HeroArtwork() {
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <div className="relative mx-auto aspect-square w-full max-w-sm select-none overflow-hidden rounded-2xl border border-line shadow-[0_18px_60px_-18px_rgba(255,110,199,0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img src="/kda-firestarter.jpg" alt="" aria-hidden
          className="absolute inset-0 size-full object-cover opacity-60 blur-md"
          animate={reduce ? undefined : { scale: [1.12, 1.24] }}
          transition={{ duration: 26, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img src="/kda-firestarter.jpg" alt="K/DA FIRESTARTER key art: the group on stage above a concert crowd"
          className="absolute inset-0 size-full object-cover"
          animate={reduce ? undefined : { scale: [1, 1.06], x: [0, -6] }}
          transition={{ duration: 18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img src="/kda-firestarter-crowd.png" alt="" aria-hidden
          className="absolute -bottom-1 -left-[4%] w-[108%] max-w-none"
          animate={reduce ? undefined : { x: [0, 12] }}
          transition={{ duration: 11, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/25" />
        {EMBERS.map(([x, y, d, c], i) => (
          <motion.span key={i} aria-hidden className="absolute size-[3px] rounded-full"
            style={{ left: `${x}%`, top: `${y}%`, background: c }}
            animate={reduce ? { opacity: 0.5 } : { opacity: [0, 1, 0], y: [0, -64] }}
            transition={{ duration: 4.2, repeat: Infinity, delay: d, ease: "easeOut" }} />
        ))}
        <button type="button" onClick={() => setPlaying(true)}
          className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-gold/50 bg-ink/70 px-3 py-1.5 text-[11px] font-medium tracking-wide text-gold backdrop-blur transition hover:bg-ink/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          <svg viewBox="0 0 10 12" className="size-2.5 fill-current" aria-hidden><path d="M0 0 L10 6 L0 12 Z" /></svg>
          K/DA · FIRESTARTER
        </button>
      </div>
      {playing && (
        <div className="fixed bottom-4 right-4 z-50 w-72 overflow-hidden rounded-xl border border-line bg-ink shadow-2xl">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-fog">
            <span className="truncate">K/DA — FIRESTARTER (Official MV)</span>
            <a href={`https://www.youtube.com/watch?v=${VIDEO_ID}`} target="_blank" rel="noreferrer noopener"
              className="shrink-0 rounded px-1 underline decoration-dotted transition hover:text-snow focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">YouTube</a>
            <button type="button" onClick={() => setPlaying(false)} aria-label="Close player"
              className="shrink-0 rounded px-1 text-fog transition hover:text-snow focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">✕</button>
          </div>
          <iframe className="aspect-video w-full" title="K/DA - FIRESTARTER (Official Music Video)"
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen />
        </div>
      )}
    </>
  );
}
