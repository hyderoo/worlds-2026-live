"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Short in-app intro for installed-app launches. Champion splash art comes straight from Riot's Data Dragon CDN
 * (hotlinked, not modified). The overlay sits on top of already-rendered content, so it never delays it.
 * Shown only in standalone (installed) mode on every app launch or full page load, and again each time the app returns to the foreground (not on in-app navigation), skipped if reduced motion is on.
 * `?splash=1` forces it for testing.
 */
const CHAMPS = ["Ahri", "Jinx", "Yasuo", "Lux", "Ezreal", "Teemo", "Kaisa", "Sett", "Viego", "Akali", "Leona", "Thresh"];

export function Splash() {
  const [champ, setChamp] = useState<string | null>(null);
  const [out, setOut] = useState(false);
  const [cupOk, setCupOk] = useState(true);
  const path = usePathname();

  useEffect(() => {
    const force = new URLSearchParams(location.search).get("splash") === "1";
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!force && (!standalone || reduce)) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let playing = false;
    const play = () => {
      if (playing) return;
      playing = true;
      setOut(false);
      setChamp(CHAMPS[Math.floor(Math.random() * CHAMPS.length)] ?? "Teemo");
      timers.push(setTimeout(() => setOut(true), 1500));
      timers.push(setTimeout(() => { setChamp(null); playing = false; }, 2000));
    };
    play();
    // Bringing a backgrounded installed app back to the foreground does not reload the page, so each hidden -> visible
    // change counts as a reopen. The browser cannot tell a real reopen from a brief hide (some phones also hide the page
    // for the app switcher), so those can replay it too. Never starts a second intro while one is playing.
    let wasHidden = false;
    const onVis = () => {
      if (document.visibilityState === "hidden") { wasHidden = true; return; }
      if (wasHidden && location.pathname !== "/next") play();
      wasHidden = false;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); timers.forEach(clearTimeout); };
  }, []);

  if (!champ || path === "/next") return null;
  return (
    <div aria-hidden data-testid="splash" onClick={() => setOut(true)} className={`fixed inset-0 z-[100] overflow-hidden bg-[#0b0a10] transition-opacity duration-500 ${out ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ}_0.jpg`} alt="" className="splash-art absolute -inset-[6%] size-[112%] max-w-none object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a10]/70 via-[#1a1438]/40 to-[#0b0a10]/95" />
      <div className="absolute inset-x-0 bottom-[20%] flex flex-col items-center gap-4 text-center">
        <div className="relative">
        {cupOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/cup.webp" alt="" className="splash-cup h-60 w-auto drop-shadow-[0_0_28px_rgba(110,170,255,.4)]" onError={() => setCupOk(false)} />
        ) : <MetalCup />}
        </div>
        <div className="font-[family-name:var(--nf-bold)] text-[3.6rem] uppercase leading-none tracking-[0.02em] text-white" aria-label="Worlds 2026">
          {"Worlds".split("").map((c, i) => <span key={i} className="splash-letter" style={{ animationDelay: `${0.55 + i * 0.05}s` }}>{c}</span>)}
          <span className="splash-letter">&nbsp;</span>
          {"2026".split("").map((c, i) => <span key={i} className="splash-letter text-gold" style={{ animationDelay: `${0.9 + i * 0.07}s` }}>{c}</span>)}
        </div>
        <div className="splash-rise text-[11px] uppercase tracking-[0.25em] text-white/70" style={{ animationDelay: "1.15s" }}>League of Legends World Championship</div>
      </div>
      <div className="absolute inset-x-0 bottom-4 text-center text-[10px] text-white/45">Splash art and cup image © Riot Games (champion art via Data Dragon). Fan-made, unofficial, non-commercial.</div>
    </div>
  );
}

/** Original SVG drawing of a Summoner's-Cup-style trophy (not Riot artwork, no photo embedded): faceted silver bowl, crown prongs, blue shield gem, tiered stem, stepped base, cool glow and a light sweep. */
function MetalCup() {
  const prong = "M62 76 C32 76 22 40 36 4 C44 36 54 50 72 60 Z M70 64 C60 46 62 26 72 6 C80 32 86 50 90 66 Z M100 52 L95 70 L105 70 Z";
  const bowl = "M63 74 L137 74 C139 112 124 140 100 154 C76 140 61 112 63 74 Z";
  const stem = "M92 154 L108 154 L106 176 L112 184 L108 196 L113 206 L87 206 L92 196 L88 184 L94 176 Z";
  const base = "M70 206 L130 206 L136 218 L146 220 L150 238 L50 238 L54 220 L64 218 Z";
  return (
    <svg viewBox="0 0 200 250" className="splash-cup h-56 drop-shadow-[0_0_26px_rgba(120,180,255,.45)]">
      <defs>
        <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#7fb8ff" stopOpacity=".55" /><stop offset="1" stopColor="#7fb8ff" stopOpacity="0" /></radialGradient>
        <linearGradient id="sil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#b9c9e0" /><stop offset=".55" stopColor="#5f7396" /><stop offset=".8" stopColor="#dbe7f7" /><stop offset="1" stopColor="#7d93b8" /></linearGradient>
        <linearGradient id="sild" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fa6c8" /><stop offset=".5" stopColor="#33466b" /><stop offset="1" stopColor="#a9bdd9" /></linearGradient>
        <linearGradient id="gem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe4ff" /><stop offset=".45" stopColor="#3d86f0" /><stop offset="1" stopColor="#1c3fa0" /></linearGradient>
        <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <path id="pr" d={prong} />
        <clipPath id="cupclip">
          <path d={bowl} /><path d={stem} /><path d={base} /><use href="#pr" /><use href="#pr" transform="translate(200 0) scale(-1 1)" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="120" rx="95" ry="115" fill="url(#glow)" />
      {/* base */}
      <path d={base} fill="url(#sil)" />
      <path d="M100 206 L100 238 M76 207 L64 218 M124 207 L136 218 M54 220 L146 220" stroke="#2a3a5c" strokeOpacity=".55" strokeWidth="1" fill="none" />
      <path d="M150 238 L146 220 L136 218 L130 206 L100 206 L100 238 Z" fill="url(#sild)" opacity=".55" />
      <ellipse cx="100" cy="228" rx="16" ry="6" fill="none" stroke="#eaf3ff" strokeOpacity=".8" strokeWidth="1.3" />
      {/* stem */}
      <path d={stem} fill="url(#sil)" />
      <path d="M100 154 L100 206 M94 176 L106 176 M88 184 L112 184 M92 196 L108 196" stroke="#2a3a5c" strokeOpacity=".5" strokeWidth="1" fill="none" />
      <path d="M100 154 L108 154 L106 176 L112 184 L108 196 L113 206 L100 206 Z" fill="url(#sild)" opacity=".5" />
      <path d="M100 178 L104 184 L100 190 L96 184 Z" fill="url(#gem)" />
      {/* prongs */}
      <use href="#pr" fill="url(#sil)" />
      <use href="#pr" fill="url(#sild)" transform="translate(200 0) scale(-1 1)" />
      {/* bowl */}
      <path d={bowl} fill="url(#sil)" />
      <path d="M100 74 L137 74 C139 112 124 140 100 154 Z" fill="url(#sild)" opacity=".7" />
      <path d="M63 74 L100 100 L137 74 M70 112 L100 100 L130 112 M78 130 L100 120 L122 130 M100 100 L100 154" stroke="#1f2f52" strokeOpacity=".55" strokeWidth="1" fill="none" />
      <path d="M63 74 L100 66 L137 74" stroke="#fff" strokeOpacity=".9" strokeWidth="1.6" fill="none" strokeLinejoin="round" className="splash-draw" pathLength={1} />
      {/* shield gem */}
      <path d="M100 84 L117 90 L115 112 Q112 124 100 130 Q88 124 85 112 L83 90 Z" fill="url(#gem)" stroke="#eaf3ff" strokeWidth="1.6" />
      <path d="M100 92 L108 96 L107 110 Q105 117 100 120 Z" fill="#fff" opacity=".35" />
      <path d="M100 98 l3 6 6 .5 -4.5 4 1.5 6 -6 -3.5 -6 3.5 1.5 -6 -4.5 -4 6 -.5z" fill="#fff" opacity=".9" transform="translate(0 -2) scale(1)" />
      <g clipPath="url(#cupclip)"><rect x="-80" y="0" width="60" height="250" fill="url(#sweep)" transform="skewX(-20)" className="splash-sweep" /></g>
    </svg>
  );
}
