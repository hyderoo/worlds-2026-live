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
    <div aria-hidden data-testid="splash" onClick={() => setOut(true)} className={`fixed inset-0 z-[100] overflow-hidden bg-[#0b0a10] transition-opacity duration-500 ${out ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ}_0.jpg`} alt="" className="splash-art absolute -inset-[6%] size-[112%] max-w-none object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a10]/70 via-[#1a1438]/40 to-[#0b0a10]/95" />
      <div className="absolute inset-x-0 bottom-[20%] flex flex-col items-center gap-4 text-center">
        <MetalCup />
        <div className="font-[family-name:var(--nf-bold)] text-[3.6rem] uppercase leading-none tracking-[0.02em] text-white" aria-label="Worlds 2026">
          {"Worlds".split("").map((c, i) => <span key={i} className="splash-letter" style={{ animationDelay: `${0.55 + i * 0.05}s` }}>{c}</span>)}
          <span className="splash-letter">&nbsp;</span>
          {"2026".split("").map((c, i) => <span key={i} className="splash-letter text-gold" style={{ animationDelay: `${0.9 + i * 0.07}s` }}>{c}</span>)}
        </div>
        <div className="splash-rise text-[11px] uppercase tracking-[0.25em] text-white/70" style={{ animationDelay: "1.15s" }}>League of Legends World Championship</div>
      </div>
      <div className="absolute inset-x-0 bottom-4 text-center text-[10px] text-white/45">Splash art: {champ} © Riot Games, via Data Dragon. Fan-made, unofficial.</div>
    </div>
  );
}

/** Original SVG recreation of a chrome Summoner's Cup crest (not Riot artwork): bevelled metal rim, copper reflections, light sweep. */
function MetalCup() {
  const d = "M10 62 L38 22 L62 54 L100 14 L138 54 L162 22 L190 62 L190 112 Q190 152 100 178 Q10 152 10 112 Z";
  const inner = "M26 70 L40 48 L64 76 L100 40 L136 76 L160 48 L174 70 L174 110 Q174 140 100 162 Q26 140 26 110 Z";
  return (
    <svg viewBox="0 0 200 190" className="splash-cup h-40 drop-shadow-[0_6px_22px_rgba(0,0,0,.7)]">
      <defs>
        <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4f4f6" /><stop offset=".22" stopColor="#6b6d75" /><stop offset=".4" stopColor="#15151a" /><stop offset=".55" stopColor="#c9c9d0" /><stop offset=".72" stopColor="#8a5a3a" /><stop offset=".85" stopColor="#1a1a20" /><stop offset="1" stopColor="#e6e6ea" /></linearGradient>
        <linearGradient id="void" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a0a0f" /><stop offset=".6" stopColor="#14110f" /><stop offset="1" stopColor="#3a2418" /></linearGradient>
        <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <mask id="ring"><path d={d} fill="#fff" /><path d={inner} fill="#000" /></mask>
      </defs>
      <path d={d} fill="url(#chrome)" />
      <path d={inner} fill="url(#void)" />
      <path d={d} fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.6" strokeLinejoin="round" pathLength={1} className="splash-draw" />
      <path d={inner} fill="none" stroke="#d9a078" strokeOpacity=".85" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M40 48 L64 76 L100 40" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1" />
      <g mask="url(#ring)"><rect x="-80" y="0" width="60" height="190" fill="url(#sweep)" transform="skewX(-20)" className="splash-sweep" /></g>
    </svg>
  );
}
