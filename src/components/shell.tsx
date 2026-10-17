"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useSnapshot } from "./providers";
import { TeamLogo } from "./ui";
import { TIMEZONES, ago } from "@/lib/format";
import { usePrefs, useSpoiler } from "@/lib/prefs";

const NAV = [
  ["/", "Home"], ["/matches", "Matches"], ["/standings", "Standings"], ["/teams", "Teams"], ["/recaps", "Recaps"], ["/stats", "Statistics"],
] as const;

export function Freshness() {
  const { snap, offline, refreshing } = useSnapshot();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setNow(Date.now()), 0); const id = setInterval(() => setNow(Date.now()), 15_000); return () => { clearTimeout(t); clearInterval(id); }; }, []);
  const s = snap.sync;
  const status = offline ? "offline" : s.connection;
  const dot = status === "ok" ? "bg-emerald-400" : status === "degraded" ? "bg-gold" : status === "unknown" ? "bg-fog" : "bg-ember";
  const label = status === "ok" ? "Synced" : status === "degraded" ? "Source error, showing cached data" : status === "offline" ? "You are offline, showing last loaded data" : status === "down" ? "Source unavailable" : "Awaiting first sync";
  return (
    <div className="group relative">
      <button className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-fog hover:text-snow" aria-describedby="fresh-pop">
        <span className={clsx("size-2 rounded-full", dot, refreshing && "live-dot")} aria-hidden />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{status}</span>
      </button>
      <div id="fresh-pop" role="tooltip" className="invisible absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed text-fog opacity-0 shadow-2xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <p className="mb-1 font-medium text-snow">{label}</p>
        <p>Last successful sync: {now === null ? "…" : ago(s.lastSuccessAt, now)}</p>
        <p>Last attempt: {now === null ? "…" : ago(s.lastAttemptAt, now)}</p>
        {s.lastError && <p className="mt-1 text-ember">Last error: {s.lastError}</p>}
        <p className="mt-2">Source: {s.upstream}</p>
        <p>Storage: {s.storage === "supabase" ? "shared database" : "cache only (no database configured)"}</p>
      </div>
    </div>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const { snap } = useSnapshot();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const items = useMemo(() => {
    const all: { key: string; label: string; sub: string; href: string; team?: (typeof snap.teams)[number] }[] = [
      ...NAV.map(([href, label]) => ({ key: href, label, sub: "Page", href })),
      ...snap.teams.map((t) => ({ key: `t-${t.code}`, label: t.name, sub: `Team · ${t.league ?? ""}`, href: `/teams/${t.code}`, team: t })),
      ...snap.matches.filter((m) => m.teams.every((t) => t.code !== "TBD")).map((m) => ({ key: m.id, label: `${m.teams[0].code} vs ${m.teams[1].code}`, sub: `Match · ${m.block}`, href: `/matches/${m.id}` })),
    ];
    const n = q.trim().toLowerCase();
    return (n ? all.filter((x) => `${x.label} ${x.sub}`.toLowerCase().includes(n)) : all.slice(0, 12)).slice(0, 12);
  }, [q, snap]);
  const go = (href: string) => { onClose(); router.push(href); };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-start justify-items-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal aria-label="Search" onClick={onClose}>
      <div className="card w-full max-w-xl overflow-hidden bg-surface" onClick={(e) => e.stopPropagation()}>
        <input
          ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder="Search teams, matches, pages…"
          aria-label="Search" className="w-full border-b border-line bg-transparent px-5 py-4 text-lg outline-none placeholder:text-fog"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, items.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
            if (e.key === "Enter" && items[i]) go(items[i].href);
          }}
        />
        <ul role="listbox" className="max-h-[50vh] overflow-auto p-2">
          {items.length === 0 && <li className="p-4 text-sm text-fog">No results.</li>}
          {items.map((x, idx) => (
            <li key={x.key} role="option" aria-selected={idx === i}>
              <button onMouseEnter={() => setI(idx)} onClick={() => go(x.href)} className={clsx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", idx === i && "bg-white/[0.06]")}>
                {x.team ? <TeamLogo team={x.team} size={24} /> : <span className="size-6" />}
                <span className="flex-1">{x.label}</span>
                <span className="text-xs text-fog">{x.sub}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-5 py-2 text-xs text-fog">↑↓ to move · Enter to open · Esc to close</p>
      </div>
    </div>
  );
}

export function Header() {
  const path = usePathname();
  const { prefs, set } = usePrefs();
  const sp = useSpoiler();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement).tagName)) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <>
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[70] rounded bg-gold px-3 py-2 text-ink">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="display text-xl"><span className="text-gold">Worlds</span> 2026</Link>
          <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} aria-current={path === href || (href !== "/" && path.startsWith(href)) ? "page" : undefined}
                className={clsx("rounded-full px-3 py-1.5 text-sm text-fog hover:text-snow", (path === href || (href !== "/" && path.startsWith(href))) && "bg-white/[0.07] text-snow")}>{label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button onClick={() => setOpen(true)} className="rounded-full border border-line px-3 py-1.5 text-xs text-fog hover:text-snow" aria-label="Open search (Ctrl K)">
              Search <kbd className="ml-1 hidden rounded bg-white/10 px-1.5 sm:inline">⌘K</kbd>
            </button>
            <label className="sr-only" htmlFor="tz">Time zone</label>
            <select id="tz" value={prefs.tz} onChange={(e) => set({ tz: e.target.value })} className="hidden rounded-full border border-line bg-surface px-2.5 py-1.5 text-xs text-fog sm:block">
              {TIMEZONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button aria-pressed={sp.enabled} onClick={sp.toggle} title="Hide scores and results until you click" className={clsx("rounded-full border px-2.5 py-1.5 text-xs", sp.enabled ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-fog hover:text-snow")}>Spoilers {sp.enabled ? "hidden" : "shown"}</button>
            <Freshness />
            <button className="rounded-full border border-line px-3 py-1.5 text-xs md:hidden" aria-expanded={menu} aria-controls="mnav" onClick={() => setMenu(!menu)}>Menu</button>
          </div>
        </div>
        {menu && (
          <nav id="mnav" aria-label="Mobile" className="grid gap-1 border-t border-line p-3 md:hidden">
            {NAV.map(([href, label]) => <Link key={href} href={href} onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">{label}</Link>)}
            <select aria-label="Time zone" value={prefs.tz} onChange={(e) => set({ tz: e.target.value })} className="mt-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              {TIMEZONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </nav>
        )}
      </header>
      {open && <Palette onClose={() => setOpen(false)} />}
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 text-sm text-fog sm:grid-cols-2">
        <p>Fan-made tracker. Not affiliated with or endorsed by Riot Games. League of Legends and Worlds are trademarks of Riot Games, Inc. Champion icons and favicon: Riot Data Dragon. Trophy is an original illustration.</p>
        <p className="sm:text-right">Match data: Riot Games LoL Esports. Optional extras may cite Liquipedia (CC-BY-SA 3.0) and are always labeled unofficial. <Link href="/about" className="underline hover:text-snow">Data and sync</Link></p>
      </div>
    </footer>
  );
}
