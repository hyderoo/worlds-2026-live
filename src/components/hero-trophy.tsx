"use client";
import { motion, useReducedMotion } from "motion/react";

/** Original SVG cup motif (not Riot artwork): floating chalice, rotating light rays, rising sparks. Respects reduced motion. */
export function HeroTrophy() {
  const reduce = useReducedMotion();
  const sparks = [[60, 250, 0], [150, 270, 1.2], [225, 240, 0.6], [100, 280, 1.8], [190, 285, 2.4], [40, 230, 3]] as const;
  return (
    <div aria-hidden className="pointer-events-none relative mx-auto aspect-square w-full max-w-sm select-none">
      <div className="absolute inset-0 rounded-full bg-gold/10 blur-3xl" />
      <motion.svg viewBox="0 0 300 340" className="relative size-full overflow-visible" animate={reduce ? undefined : { y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6e3a1" /><stop offset=".5" stopColor="#d6a840" /><stop offset="1" stopColor="#8a6420" /></linearGradient>
          <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fd3ff" stopOpacity=".95" /><stop offset="1" stopColor="#3a63d8" stopOpacity=".9" /></linearGradient>
          <radialGradient id="ray" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#f3d070" stopOpacity=".35" /><stop offset="1" stopColor="#f3d070" stopOpacity="0" /></radialGradient>
        </defs>
        <motion.g style={{ transformOrigin: "150px 140px" }} animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
          {Array.from({ length: 12 }).map((_, i) => <polygon key={i} points="150,140 138,-30 162,-30" fill="url(#ray)" transform={`rotate(${i * 30} 150 140)`} />)}
        </motion.g>
        {/* base */}
        <path d="M95 318h110l-8-26H103z" fill="url(#gold)" />
        <rect x="88" y="318" width="124" height="12" rx="4" fill="#8a6420" />
        {/* stem */}
        <path d="M136 292c2-26 4-46 0-70h28c-4 24-2 44 0 70z" fill="url(#gold)" />
        <ellipse cx="150" cy="250" rx="26" ry="7" fill="#f6e3a1" opacity=".5" />
        {/* handles */}
        <path d="M82 70c-38 2-46 42-14 62 14 9 34 12 52 8" fill="none" stroke="url(#gold)" strokeWidth="11" strokeLinecap="round" />
        <path d="M218 70c38 2 46 42 14 62-14 9-34 12-52 8" fill="none" stroke="url(#gold)" strokeWidth="11" strokeLinecap="round" />
        {/* bowl */}
        <path d="M76 52h148c0 78-26 150-74 170C102 202 76 130 76 52z" fill="url(#gold)" />
        <path d="M94 62h112c-2 66-22 122-56 142C116 184 96 128 94 62z" fill="url(#blue)" opacity=".85" />
        <path d="M104 66c2 50 14 90 30 118" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="150" cy="52" rx="74" ry="11" fill="#f6e3a1" />
        <ellipse cx="150" cy="52" rx="62" ry="7" fill="#3a63d8" opacity=".6" />
        {/* star */}
        <motion.path d="M150 96l9 20 22 2-17 14 6 22-20-12-20 12 6-22-17-14 22-2z" fill="#fff6d1" animate={reduce ? undefined : { opacity: [0.65, 1, 0.65] }} transition={{ duration: 3, repeat: Infinity }} />
        {sparks.map(([x, y, d], i) => (
          <motion.circle key={i} cx={x} cy={y} r={2.5} fill="#f6e3a1" initial={{ opacity: 0 }} animate={reduce ? { opacity: 0.6 } : { opacity: [0, 1, 0], y: [0, -90] }} transition={{ duration: 3.6, repeat: Infinity, delay: d }} />
        ))}
      </motion.svg>
    </div>
  );
}
