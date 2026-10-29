"use client";
import { useRef, useState } from "react";
import { Section } from "./ui";
import { MvPlayer, FIRESTARTER_VIDEO_ID } from "./hero-artwork";

/**
 * FIRESTARTER portrait cards: the four member artworks supplied by the site owner (authorship not claimed;
 * each portrait carries the champion's own signature). Tap a card to play the MV inside the card; desktop
 * hover shows a gold ring and play affordance. Mobile is a swipe row.
 */
const CARDS = [
  { img: "/firestarter-kaisa.jpg", name: "KAI'SA" },
  { img: "/firestarter-ahri.jpg", name: "AHRI" },
  { img: "/firestarter-akali.jpg", name: "AKALI" },
  { img: "/firestarter-evelynn.jpg", name: "EVELYNN" },
] as const;

function Card({ img, name }: { img: string; name: string }) {
  const playButton = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="group relative aspect-[16/9] w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-line sm:w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={`K/DA FIRESTARTER portrait: ${name}`} className="absolute inset-0 size-full object-cover" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />
      {!playing && (
        <>
          <button ref={playButton} type="button" onClick={() => setPlaying(true)} aria-label={`Play K/DA FIRESTARTER (${name} card)`}
            className="absolute inset-0 rounded-2xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:group-hover:ring-2 sm:group-hover:ring-gold" />
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold bg-ink/70 opacity-0 backdrop-blur transition sm:group-hover:opacity-100">
            <svg viewBox="0 0 10 12" className="size-3.5 fill-gold"><path d="M0 0 L10 6 L0 12 Z" /></svg>
          </span>
        </>
      )}
      <span className="pointer-events-none absolute bottom-2.5 left-3 text-sm font-semibold tracking-[0.12em] text-snow">{name}</span>
      {playing && (
        <div className="absolute inset-0 z-10">
          <MvPlayer onClose={() => { setPlaying(false); requestAnimationFrame(() => playButton.current?.focus()); }} />
        </div>
      )}
    </div>
  );
}

export function FirestarterSection() {
  return (
    <Section eyebrow="Artwork & MV" title="K/DA · FIRESTARTER"
      action={<a href={`https://www.youtube.com/watch?v=${FIRESTARTER_VIDEO_ID}`} target="_blank" rel="noreferrer noopener" className="text-sm text-gold hover:underline">Watch MV →</a>}>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {CARDS.map((c) => <Card key={c.name} img={c.img} name={c.name} />)}
      </div>
      <p className="mt-2 text-xs text-fog sm:hidden">Swipe for more →</p>
    </Section>
  );
}
