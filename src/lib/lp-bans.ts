import seedGames from "@/data/games-seed.json";
import type { Store } from "./store";
import type { GameBans, GameStats } from "./types";

/**
 * Per-game champion bans from Liquipedia match pages (secondary source, CC-BY-SA 3.0; terms: https://liquipedia.net/api-terms-of-use).
 * Riot's live stats feed has no draft data. We read the rendered "Draft" section through the MediaWiki parse API
 * (one request at a time, at least 35 s apart, contact in the User-Agent) and attach bans to a game only when both teams'
 * five picks on Liquipedia equal the five picks we stored from Riot's feed for that exact game and side. No match, no bans.
 */
const API = "https://liquipedia.net/leagueoflegends/api.php";
export const MIN_BANS_GAP_MS = 35_000;
const EMPTY_RECHECK_MS = 60 * 60_000;
const OPEN_RECHECK_MS = 10 * 60_000;
const LIST_TTL_MS = 6 * 3600_000;
const META = "__lpb_meta";
const LIST = "__lpb_pages";
const PAGE_PREFIX = "lpb:";

export type LpSide = { side: "blue" | "red" | null; picks: string[]; bans: string[] };
export type LpGame = { n: number; teams: [LpSide, LpSide] };
export type LpPage = { title: string; fetchedAt: string; games: LpGame[] };

const OVERRIDES: Record<string, string> = { "K'Sante": "KSante", "Kog'Maw": "KogMaw", "Rek'Sai": "RekSai", Wukong: "MonkeyKing", "Nunu & Willump": "Nunu", "Renata Glasc": "Renata", LeBlanc: "Leblanc" };
const decode = (s: string) => s.replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&#160;/g, " ");

/** Liquipedia champion name -> Riot Data Dragon id, the id format used everywhere else on the site. */
export function champId(name: string): string {
  const n = decode(name).trim();
  if (OVERRIDES[n]) return OVERRIDES[n]!;
  return n.replace(/'(.)/g, (_, c: string) => c.toLowerCase()).replace(/[^A-Za-z0-9]/g, "");
}
const norm = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Parses the Draft overview blocks of one Liquipedia match page (rendered HTML from action=parse). */
export function parseMatchPageDrafts(html: string): LpGame[] {
  const startRe = /<div class="match-bm-lol-game-veto-overview">/g;
  const starts = [...html.matchAll(startRe)].map((m) => m.index!);
  const areas = [...html.matchAll(/data-toggle-area-content="(\d+)"/g)].map((m) => ({ at: m.index!, k: Number(m[1]) }));
  const games: LpGame[] = [];
  starts.forEach((s, i) => {
    const block = html.slice(s, starts[i + 1] ?? html.length);
    const end = block.search(/match-bm-lol-game-veto-order|<h3 id="Team_Stats/);
    const overview = end > 0 ? block.slice(0, end) : block;
    const teamBlocks = overview.split('<div class="match-bm-lol-game-veto-overview-team">').slice(1);
    if (teamBlocks.length !== 2) return;
    const teams = teamBlocks.map((tb): LpSide => {
      let side: LpSide["side"] = null, picks: string[] = [], bans: string[] = [];
      const rowRe = /veto-row--(red|blue|ban)" aria-labelledby="(picks|bans)">([\s\S]*?)(?=<div class="match-bm-game-veto-overview-team-veto-row |$)/g;
      for (const r of tb.matchAll(rowRe)) {
        const names = [...r[3]!.matchAll(/<a href="[^"]*" title="([^"]+)"><img/g)].map((x) => decode(x[1]!));
        if (r[2] === "bans") bans = names;
        else { side = r[1] as "blue" | "red"; picks = names; }
      }
      return { side, picks, bans };
    }) as [LpSide, LpSide];
    const k = areas.filter((a) => a.at < s).at(-1)?.k;
    games.push({ n: k && k >= 2 ? k - 1 : i + 1, teams });
  });
  return games;
}

const sameSet = (a: string[], b: string[]) => a.length === 5 && b.length === 5 && [...a].map(norm).sort().join("|") === [...b].map(norm).sort().join("|");

/** Attach bans to stored game stats only on an exact pick-set match for both sides. Never guesses. */
export function attachBans(stats: GameStats[], pages: LpPage[]): GameStats[] {
  return stats.map((g) => {
    const bluePicks = g.blue.picks.map((p) => p[1]), redPicks = g.red.picks.map((p) => p[1]);
    for (const page of pages) {
      for (const lg of page.games) {
        const blue = lg.teams.find((t) => t.side === "blue"), red = lg.teams.find((t) => t.side === "red");
        if (!blue || !red) continue;
        if (!sameSet(blue.picks.map(champId), bluePicks) || !sameSet(red.picks.map(champId), redPicks)) continue;
        if (blue.bans.length === 0 && red.bans.length === 0) continue;
        const bans: GameBans = { source: "liquipedia", page: `https://liquipedia.net/leagueoflegends/${page.title.replace(/ /g, "_")}`, fetchedAt: page.fetchedAt, blue: blue.bans.map(champId), red: red.bans.map(champId) };
        return { ...g, bans };
      }
    }
    return g;
  });
}

export class LpHttpError extends Error {
  constructor(public status: number, public retryAfterMs: number | null) { super(`liquipedia ${status}`); }
}
/** Retry-After as milliseconds: delta-seconds or an HTTP date. null when absent or unreadable. */
export function parseRetryAfter(v: string | null | undefined, now = Date.now()): number | null {
  if (!v) return null;
  const secs = Number(v);
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  const at = Date.parse(v);
  return Number.isFinite(at) ? Math.max(0, at - now) : null;
}
export const BACKOFF_MS = 30 * 60_000;

async function lpGet(params: string, contact: string): Promise<unknown> {
  const r = await fetch(`${API}?${params}&format=json`, { headers: { "User-Agent": `Worlds2026LiveTracker/1.0 (fan project; contact: ${contact})`, "Accept-Encoding": "gzip" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new LpHttpError(r.status, parseRetryAfter(r.headers.get("retry-after")));
  return r.json();
}
export type LpFetchers = { list: (contact: string) => Promise<string[]>; page: (title: string, contact: string) => Promise<string> };
export const defaultFetchers: LpFetchers = {
  async list(contact) {
    const j = (await lpGet("action=query&list=allpages&apprefix=ID_Wrd26&apnamespace=130&aplimit=100", contact)) as { query?: { allpages?: { title: string }[] } };
    return (j.query?.allpages ?? []).map((p) => p.title);
  },
  async page(title, contact) {
    const j = (await lpGet(`action=parse&prop=text&redirects=1&page=${encodeURIComponent(title)}`, contact)) as { parse?: { text?: { "*"?: string } } };
    const t = j.parse?.text?.["*"];
    if (!t) throw new Error("liquipedia: empty response");
    return t;
  },
};

export function loadPages(extras: Record<string, unknown>): LpPage[] {
  return Object.entries(extras).filter(([k]) => k.startsWith(PAGE_PREFIX)).map(([, v]) => v as LpPage);
}

/**
 * One throttled Liquipedia request per call, only while some stored game still lacks bans.
 * Never throws; failures keep what is stored. `lastOtherRequestAt` keeps the combined rate under one request per 35 s.
 */
export async function refreshBans(store: Store, stats: Record<string, GameStats[]>, opts: { contact?: string; now?: Date; fetchers?: LpFetchers; lastOtherRequestAt?: string } = {}): Promise<string> {
  const contact = opts.contact ?? process.env.LIQUIPEDIA_CONTACT;
  if (!contact) return "disabled";
  const now = opts.now ?? new Date();
  const f = opts.fetchers ?? defaultFetchers;
  try {
    const extras = await store.loadExtras();
    const pages = loadPages(extras);
    const missing = Object.values(attachAll(stats, pages)).some((gs) => gs.some((g) => !g.bans));
    if (!missing) return "complete";
    const meta = extras[META] as { lastRequestAt?: string; backoffUntil?: string } | undefined;
    if (meta?.backoffUntil && new Date(meta.backoffUntil) > now) return "backoff";
    const lastReq = Math.max(meta?.lastRequestAt ? Date.parse(meta.lastRequestAt) : 0, opts.lastOtherRequestAt ? Date.parse(opts.lastOtherRequestAt) : 0);
    if (now.getTime() - lastReq < MIN_BANS_GAP_MS) return "throttled";
    await store.saveExtra(META, { lastRequestAt: now.toISOString() });
    const list = extras[LIST] as { fetchedAt: string; titles: string[] } | undefined;
    if (!list || now.getTime() - Date.parse(list.fetchedAt) > LIST_TTL_MS) {
      const titles = await f.list(contact);
      if (titles.length) await store.saveExtra(LIST, { fetchedAt: now.toISOString(), titles });
      return `listed ${titles.length} pages`;
    }
    const byTitle = new Map(pages.map((p) => [p.title, p]));
    const due = list.titles
      .map((title) => ({ title, p: byTitle.get(title) }))
      .filter(({ p }) => {
        if (!p) return true;
        const age = now.getTime() - Date.parse(p.fetchedAt);
        const complete = p.games.length > 0 && p.games.every((g) => g.teams.every((t) => t.picks.length === 5 && t.bans.length > 0));
        return !complete && age > (p.games.length ? OPEN_RECHECK_MS : EMPTY_RECHECK_MS);
      })
      .sort((a, b) => (a.p?.fetchedAt ?? "").localeCompare(b.p?.fetchedAt ?? ""))[0];
    if (!due) return "up to date";
    const html = await f.page(due.title, contact);
    await store.saveExtra(PAGE_PREFIX + due.title, { title: due.title, fetchedAt: now.toISOString(), games: parseMatchPageDrafts(html) } satisfies LpPage);
    return `page ok (${due.title})`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const rate = (e instanceof LpHttpError && (e.status === 429 || e.status === 503)) || msg.includes("429");
    if (rate) {
      const wait = Math.max(BACKOFF_MS, e instanceof LpHttpError ? e.retryAfterMs ?? 0 : 0);
      const at = opts.now ?? new Date();
      try { await store.saveExtra(META, { lastRequestAt: at.toISOString(), backoffUntil: new Date(at.getTime() + wait).toISOString() }); } catch { /* best effort */ }
    }
    return `error: ${msg.slice(0, 100)}`;
  }
}

export function attachAll(stats: Record<string, GameStats[]>, pages: LpPage[]): Record<string, GameStats[]> {
  const out: Record<string, GameStats[]> = {};
  for (const [id, gs] of Object.entries(stats)) out[id] = attachBans(gs, pages);
  return out;
}

/** Same as refreshBans, loading stored plus seeded game stats and the roster step's last request time itself. */
export async function refreshBansFromStore(store: Store): Promise<string> {
  try {
    const [stored, extras] = await Promise.all([store.loadGameStats(), store.loadExtras()]);
    const stats = { ...(seedGames as unknown as Record<string, GameStats[]>), ...stored };
    return await refreshBans(store, stats, { lastOtherRequestAt: (extras["__lp_meta"] as { lastRequestAt?: string } | undefined)?.lastRequestAt });
  } catch (e) {
    return `error: ${e instanceof Error ? e.message.slice(0, 100) : "unknown"}`;
  }
}
