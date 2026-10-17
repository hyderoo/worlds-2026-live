"use client";
import { useEffect, useState } from "react";

/**
 * Short in-app intro for installed-app launches. Champion splash art comes straight from Riot's Data Dragon CDN
 * (hotlinked, not modified). The overlay sits on top of already-rendered content, so it never delays it.
 * Shown only in standalone (installed) mode, skipped if shown in the last 30 minutes or if reduced motion is on.
 * `?splash=1` forces it for testing.
 */
const CHAMPS = ["Ahri", "Jinx", "Yasuo", "Lux", "Ezreal", "Teemo", "Kaisa", "Sett", "Viego", "Akali", "Leona", "Thresh"];
const KEY = "w26.splash.at";

export function Splash() {
  const [champ, setChamp] = useState<string | null>(null);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const force = new URLSearchParams(location.search).get("splash") === "1";
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!force && (!standalone || reduce)) return;
    let last = 0;
    try { last = Number(localStorage.getItem(KEY) || 0); } catch {}
    if (!force && Date.now() - last < 30 * 60_000) return;
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChamp(CHAMPS[Math.floor(Math.random() * CHAMPS.length)] ?? "Teemo");
    const a = setTimeout(() => setOut(true), 1500);
    const b = setTimeout(() => setChamp(null), 2000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  if (!champ) return null;
  return (
    <div aria-hidden data-testid="splash" className={`pointer-events-none fixed inset-0 z-[100] overflow-hidden bg-[#0b0a10] transition-opacity duration-500 ${out ? "opacity-0" : "opacity-100"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ}_0.jpg`} alt="" className="splash-art absolute inset-0 size-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a10]/70 via-[#1a1438]/40 to-[#0b0a10]/95" />
      <div className="splash-rise absolute inset-x-0 bottom-[22%] flex flex-col items-center gap-3 text-center">
        <svg viewBox="0 0 300 340" className="h-24 drop-shadow-[0_0_18px_rgba(246,227,161,.5)]">
          <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6e3a1" /><stop offset=".5" stopColor="#d6a840" /><stop offset="1" stopColor="#8a6420" /></linearGradient>
            <linearGradient id="sb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fd3ff" /><stop offset="1" stopColor="#3a63d8" /></linearGradient></defs>
          <path d="M95 318h110l-8-26H103z" fill="url(#sg)" /><rect x="88" y="318" width="124" height="12" rx="4" fill="#8a6420" />
          <path d="M136 292c2-26 4-46 0-70h28c-4 24-2 44 0 70z" fill="url(#sg)" />
          <path d="M82 70c-38 2-46 42-14 62 14 9 34 12 52 8" fill="none" stroke="url(#sg)" strokeWidth="11" strokeLinecap="round" />
          <path d="M218 70c38 2 46 42 14 62-14 9-34 12-52 8" fill="none" stroke="url(#sg)" strokeWidth="11" strokeLinecap="round" />
          <path d="M76 52h148c0 78-26 150-74 170C102 202 76 130 76 52z" fill="url(#sg)" /><path d="M94 62h112c-2 66-22 122-56 142C116 184 96 128 94 62z" fill="url(#sb)" opacity=".85" />
          <ellipse cx="150" cy="52" rx="74" ry="11" fill="#f6e3a1" /><path d="M150 96l9 20 22 2-17 14 6 22-20-12-20 12 6-22-17-14 22-2z" fill="#fff6d1" />
        </svg>
        <div className="display text-5xl leading-none text-white">Worlds <span className="text-gold">2026</span></div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/70">League of Legends World Championship</div>
      </div>
      <div className="absolute inset-x-0 bottom-4 text-center text-[10px] text-white/45">Splash art: {champ} © Riot Games, via Data Dragon. Fan-made, unofficial.</div>
    </div>
  );
}
