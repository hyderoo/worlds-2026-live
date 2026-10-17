"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useSnapshot } from "./providers";
import { TeamLogo } from "./ui";
import { TIMEZONES, ago } from "@/lib/format";
import { usePrefs, useSpoiler, useT } from "@/lib/prefs";
import { LANGS, type Key } from "@/lib/i18n";

type Item = readonly [string, Key];
const MATCH_MENU: readonly Item[] = [["/matches", "nav.matches"], ["/today", "nav.today"], ["/predictions", "nav.predictions"], ["/groups", "nav.groups"], ["/calendar", "nav.calendar"]];
const TOURNAMENT_MENU: readonly Item[] = [["/standings", "nav.standings"], ["/teams", "nav.teams"], ["/recaps", "nav.recaps"], ["/stats", "nav.stats"]];
const PALETTE_PAGES: readonly Item[] = [["/", "nav.home"], ...MATCH_MENU, ...TOURNAMENT_MENU];
const inGroup = (path: string, items: readonly Item[]) => items.some(([h]) => path === h || path.startsWith(h + "/"));

/** Closes on Escape, outside click and route change. Used by every header dropdown. */
function useDropdown(path: string) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const x = setTimeout(() => setOpen(false), 0); return () => clearTimeout(x); }, [path]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return { open, setOpen, ref };
}

function NavMenu({ path, label, items }: { path: string; label: string; items: readonly Item[] }) {
  const { t } = useT();
  const { open, setOpen, ref } = useDropdown(path);
  const active = inGroup(path, items);
  return (
    <div ref={ref} className="relative" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={clsx("flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-fog hover:text-snow", active && "bg-white/[0.07] text-snow")}>
        {label}<span aria-hidden className="text-[0.65rem]">▾</span>
      </button>
      {open && (
        <ul role="menu" aria-label={label} className="absolute left-0 top-full z-50 mt-2 min-w-44 rounded-xl border border-line bg-surface p-1 shadow-2xl">
          {items.map(([href, key]) => (
            <li key={href} role="none"><Link role="menuitem" href={href} aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)} className={clsx("block rounded-lg px-3 py-2 text-sm text-fog hover:bg-white/5 hover:text-snow", path === href && "text-snow")}>{t(key)}</Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsControls({ idp }: { idp: string }) {
  const { t } = useT();
  const { prefs, set } = usePrefs();
  const sp = useSpoiler();
  const f = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm";
  return (
    <div className="grid gap-3">
      <div><label htmlFor={`${idp}-lang`} className="mb-1 block text-xs text-fog">{t("hdr.language")}</label>
        <select id={`${idp}-lang`} value={prefs.lang} onChange={(e) => set({ lang: e.target.value })} className={f}>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
        <p className="mt-1 text-[0.7rem] leading-snug text-fog">{t("lang.machine")}</p></div>
      <div><label htmlFor={`${idp}-tz`} className="mb-1 block text-xs text-fog">{t("hdr.timezone")}</label>
        <select id={`${idp}-tz`} value={prefs.tz} onChange={(e) => set({ tz: e.target.value, tzSet: true })} className={f}>{TIMEZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}</select></div>
      <button aria-pressed={sp.enabled} onClick={sp.toggle} className={clsx("rounded-lg border px-3 py-2 text-left text-sm", sp.enabled ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-fog hover:text-snow")}>
        {sp.enabled ? t("hdr.spoilersHidden") : t("hdr.spoilersShown")}<span className="block text-[0.7rem] text-fog">Hide scores and results until you click</span>
      </button>
    </div>
  );
}

function SettingsMenu({ path }: { path: string }) {
  const { t } = useT();
  const sp = useSpoiler();
  const { open, setOpen, ref } = useDropdown(path);
  return (
    <div ref={ref} className="relative" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <button aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-fog hover:text-snow">
        {sp.enabled && <span className="size-1.5 rounded-full bg-gold" aria-hidden />}{t("hdr.settings")}<span aria-hidden className="text-[0.65rem]">▾</span>
      </button>
      {open && <div role="dialog" aria-label={t("hdr.settings")} className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-surface p-4 shadow-2xl"><SettingsControls idp="d" /></div>}
    </div>
  );
}

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
  const { t } = useT();
  const { snap } = useSnapshot();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const items = useMemo(() => {
    const all: { key: string; label: string; sub: string; href: string; team?: (typeof snap.teams)[number] }[] = [
      ...PALETTE_PAGES.map(([href, label]) => ({ key: href, label: t(label), sub: "Page", href })),
      ...snap.teams.map((t) => ({ key: `t-${t.code}`, label: t.name, sub: `Team · ${t.league ?? ""}`, href: `/teams/${t.code}`, team: t })),
      ...snap.matches.filter((m) => m.teams.every((t) => t.code !== "TBD")).map((m) => ({ key: m.id, label: `${m.teams[0].code} vs ${m.teams[1].code}`, sub: `Match · ${m.block}`, href: `/matches/${m.id}` })),
    ];
    const n = q.trim().toLowerCase();
    return (n ? all.filter((x) => `${x.label} ${x.sub}`.toLowerCase().includes(n)) : all.slice(0, 12)).slice(0, 12);
  }, [q, snap, t]);
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
  const { t, lang } = useT();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
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
  if (path === "/next") return null;
  return (
    <>
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[70] rounded bg-gold px-3 py-2 text-ink">{t("hdr.skip")}</a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="display text-xl"><span className="text-gold">Worlds</span> 2026</Link>
          <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 md:flex">
            <Link href="/" aria-current={path === "/" ? "page" : undefined} className={clsx("rounded-full px-3 py-1.5 text-sm text-fog hover:text-snow", path === "/" && "bg-white/[0.07] text-snow")}>{t("nav.home")}</Link>
            <NavMenu path={path} label={t("nav.matches")} items={MATCH_MENU} />
            <NavMenu path={path} label={t("nav.tournament")} items={TOURNAMENT_MENU} />
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button onClick={() => setOpen(true)} className="rounded-full border border-line px-3 py-1.5 text-xs text-fog hover:text-snow" aria-label="Open search (Ctrl K)">
              {t("hdr.search")} <kbd className="ml-1 hidden rounded bg-white/10 px-1.5 sm:inline">⌘K</kbd>
            </button>
            <div className="hidden md:block"><SettingsMenu path={path} /></div>
            <Freshness />
            <button className="rounded-full border border-line px-3 py-1.5 text-xs md:hidden" aria-expanded={menu} aria-controls="mnav" onClick={() => setMenu(!menu)}>{sp.enabled && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-gold align-middle" aria-hidden />}{t("hdr.menu")}</button>
          </div>
        </div>
        {menu && (
          <nav id="mnav" aria-label="Mobile" className="grid max-h-[calc(100dvh-4.5rem)] gap-1 overflow-y-auto border-t border-line p-3 md:hidden">
            <Link href="/" onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">{t("nav.home")}</Link>
            {([["nav.matches", MATCH_MENU], ["nav.tournament", TOURNAMENT_MENU]] as const).map(([h, items]) => (
              <div key={h} className="grid gap-1"><p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-gold">{t(h)}</p>
                {items.map(([href, key]) => <Link key={href} href={href} onClick={() => setMenu(false)} className="rounded-lg py-2 pl-6 pr-3 hover:bg-white/5">{t(key)}</Link>)}</div>
            ))}
            <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-wider text-gold">{t("hdr.settings")}</p>
            <div className="px-3 pb-2"><SettingsControls idp="m" /></div>
          </nav>
        )}
      </header>
      {open && <Palette onClose={() => setOpen(false)} />}
    </>
  );
}

type InstallEvent = Event & { prompt: () => Promise<void> };
function InstallApp() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", () => setInstalled(true));
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const tm = setTimeout(() => { setInstalled(standalone); setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone); }, 0);
    return () => { window.removeEventListener("beforeinstallprompt", h); clearTimeout(tm); };
  }, []);
  if (installed) return null;
  if (ev) return <button onClick={() => { void ev.prompt(); setEv(null); }} className="mt-3 rounded-full border border-gold/50 px-4 py-2 text-sm text-gold hover:bg-gold/10">Install app</button>;
  if (ios) return <p className="mt-3 text-xs">Install: tap Share, then Add to Home Screen.</p>;
  return null;
}

export function Footer() {
  const path = usePathname();
  if (path === "/next") return null;
  return (
    <footer className="mt-12 border-t border-line sm:mt-24">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 text-sm text-fog sm:grid-cols-2">
        <p>Fan-made tracker. Not affiliated with or endorsed by Riot Games. League of Legends and Worlds are trademarks of Riot Games, Inc. Champion icons and favicon: Riot Data Dragon. Trophy is an original illustration.</p>
        <p className="sm:text-right">Match data: Riot Games LoL Esports. Optional extras may cite Liquipedia (CC-BY-SA 3.0) and are always labeled unofficial. <Link href="/about" className="underline hover:text-snow">Data and sync</Link></p>
        <div><InstallApp /></div>
      </div>
    </footer>
  );
}
