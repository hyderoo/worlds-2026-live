"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * FIRESTARTER intro (Dani's rule): it plays once per session - on the first open, or again only after the app
 * was fully closed - and never when the app returns from minimize/background. The sessionStorage flag is what
 * separates the two; note a known limitation: if the browser restores the previous session after a full close,
 * the flag survives and the splash counts as already shown.
 * Auto-dismisses after ~1.2s, tap anywhere skips. Skipped with reduced motion. Group key art supplied by the
 * site owner; authorship not claimed. `?splash=1` forces it for testing without consuming the flag.
 */
const SEEN_KEY = "w26-splash-seen";

export function Splash() {
  const [show, setShow] = useState(false);
  const [out, setOut] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const force = new URLSearchParams(location.search).get("splash") === "1";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem(SEEN_KEY) === "1";
    if (!force && (reduce || seen)) return;
    if (!force) sessionStorage.setItem(SEEN_KEY, "1");
    const t0 = setTimeout(() => setShow(true), 0);
    const t1 = setTimeout(() => setOut(true), 1200);
    const t2 = setTimeout(() => setShow(false), 1750);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!show || path === "/next") return null;
  return (
    <div aria-hidden data-testid="splash" onClick={() => setOut(true)} className={`fixed inset-0 z-[100] overflow-hidden bg-ink transition-opacity duration-500 ${out ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
        <div className="splash-rise px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">League of Legends World Championship</p>
          <p className="display mt-2 whitespace-nowrap text-4xl uppercase leading-none text-snow">Worlds <span className="text-gold">2026</span></p>
        </div>
        <div className="splash-rise relative w-full" style={{ animationDelay: "0.15s" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/firestarter-group.jpg" alt="" className="w-full" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/70 to-transparent" />
        </div>
        <p className="splash-rise text-[11px] uppercase tracking-[0.25em] text-fog" style={{ animationDelay: "0.35s" }}>K/DA · FIRESTARTER</p>
        <div className="splash-rise flex w-36 flex-col items-center gap-2" style={{ animationDelay: "0.5s" }}>
          <p className="text-[10px] uppercase tracking-[0.25em] text-fog">Loading</p>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
            <div className="splash-loader h-full w-full rounded-full bg-gold" />
          </div>
          <p className="text-[11px] text-fog/80">Tap to skip</p>
        </div>
      </div>
    </div>
  );
}
