"use client";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/** K/DA "FIRESTARTER" music video on the League of Legends YouTube channel (user-initiated embed, no rehosted audio). */
export const FIRESTARTER_VIDEO_ID = "Mmw-PpWhKFg";

const EMBERS = [
  [12, 88, 0, "#ff8ad8"], [26, 94, 1.4, "#f6e3a1"], [45, 90, 2.6, "#ff8ad8"], [63, 95, 0.8, "#f6e3a1"],
  [78, 89, 2.0, "#ff8ad8"], [90, 93, 3.2, "#f6e3a1"], [35, 96, 3.8, "#f6e3a1"], [55, 92, 4.6, "#ff8ad8"],
] as const;

/** Gold chip that opens the FIRESTARTER MV. Shared by the mobile hero card and the desktop hero artwork. */
export function FirestarterChip({ onOpen, innerRef }: { onOpen: () => void; innerRef?: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <button ref={innerRef} type="button" onClick={onOpen} aria-label="Play K/DA FIRESTARTER" aria-expanded={false}
      className="flex items-center gap-2 rounded-full border border-gold/50 bg-ink/70 px-3 py-1.5 text-[11px] font-medium tracking-wide text-gold backdrop-blur transition hover:bg-ink/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
      <svg viewBox="0 0 10 12" className="size-2.5 fill-current" aria-hidden><path d="M0 0 L10 6 L0 12 Z" /></svg>
      K/DA · FIRESTARTER
    </button>
  );
}

/** Embedded MV with title, YouTube fallback link and a close button that returns focus to the chip that opened it. */
export function MvPlayer({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col justify-center bg-ink" role="region" aria-label="FIRESTARTER music video">
      <div className="flex items-center justify-between gap-2 shrink-0 px-3 py-1.5 text-[11px] text-fog">
        <span className="truncate">K/DA · FIRESTARTER</span>
        <a href={`https://www.youtube.com/watch?v=${FIRESTARTER_VIDEO_ID}`} target="_blank" rel="noreferrer noopener"
          className="shrink-0 rounded px-1 underline decoration-dotted transition hover:text-snow focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">YouTube</a>
        <button type="button" autoFocus onClick={onClose} aria-label="Close music video"
          className="shrink-0 rounded px-1 text-fog transition hover:text-snow focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">✕</button>
      </div>
      <iframe className="aspect-video min-h-[200px] w-full shrink-0" title="K/DA - FIRESTARTER (Official Music Video)"
        src={`https://www.youtube-nocookie.com/embed/${FIRESTARTER_VIDEO_ID}?autoplay=1&playsinline=1&rel=0`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen />
      <p className="shrink-0 px-3 py-2 text-[10px] leading-relaxed text-fog">If playback is blocked, use Play in the video or open YouTube.</p>
    </div>
  );
}

/**
 * Mobile home hero artwork: FIRESTARTER group key art (supplied by the site owner; authorship not claimed)
 * with rising embers. The play chip opens the MV inside the artwork area; while the player is open the box
 * expands so video and close button fit (keeps the f3c1ceb fix). Respects reduced motion.
 */
export function HeroArtwork() {
  const reduce = useReducedMotion();
  const playButton = useRef<HTMLButtonElement>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  return (
    <div className={`relative mx-auto ${playerOpen ? "min-h-[280px]" : "aspect-[16/9]"} w-full select-none overflow-hidden rounded-2xl border border-line shadow-[0_18px_60px_-18px_rgba(255,110,199,0.35)]`}>
        <motion.img src="/firestarter-group.jpg" alt="K/DA FIRESTARTER group key art: Kai'Sa, Ahri, Akali and Evelynn"
          className="absolute inset-0 size-full object-cover"
          animate={reduce ? undefined : { scale: [1, 1.06], x: [0, -6] }}
          transition={{ duration: 18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/25" />
        {EMBERS.map(([x, y, d, c], i) => (
          <motion.span key={i} aria-hidden className="absolute size-[3px] rounded-full"
            style={{ left: `${x}%`, top: `${y}%`, background: c }}
            animate={reduce ? { opacity: 0.5 } : { opacity: [0, 1, 0], y: [0, -64] }}
            transition={{ duration: 4.2, repeat: Infinity, delay: d, ease: "easeOut" }} />
        ))}
        <div className="absolute inset-0 flex items-center justify-center" style={playerOpen ? { display: "none" } : undefined}>
          <FirestarterChip innerRef={playButton} onOpen={() => setPlayerOpen(true)} />
        </div>
      {playerOpen && (
        <div className="absolute inset-0 z-10">
          <MvPlayer onClose={() => { setPlayerOpen(false); requestAnimationFrame(() => playButton.current?.focus()); }} />
        </div>
      )}
    </div>
  );
}

/**
 * Desktop hero: the chip sits inside the full-bleed artwork (bottom right). Opening it swaps the chip for the
 * MV panel in the same corner of the artwork, keeping the in-artwork player behavior from the mobile fix.
 */
export function HeroArtworkDesktop() {
  const playButton = useRef<HTMLButtonElement>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  if (!playerOpen) {
    return (
      <div className="absolute bottom-6 right-6 z-10">
        <FirestarterChip innerRef={playButton} onOpen={() => setPlayerOpen(true)} />
      </div>
    );
  }
  return (
    <div className="absolute bottom-6 right-6 z-10 w-[min(30rem,42vw)] overflow-hidden rounded-2xl border border-line shadow-2xl">
      <MvPlayer onClose={() => { setPlayerOpen(false); requestAnimationFrame(() => playButton.current?.focus()); }} />
    </div>
  );
}
