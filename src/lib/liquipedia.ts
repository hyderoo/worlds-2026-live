import type { TeamExtras } from "./types";
import type { Store } from "./store";

/**
 * Liquipedia adapter (unofficial, secondary source). Terms: https://liquipedia.net/api-terms-of-use
 * - Custom User-Agent with contact info (LIQUIPEDIA_CONTACT env var, never committed). No contact = adapter disabled.
 * - MediaWiki API only (action=parse, prop=wikitext). No HTML scraping.
 * - Parse requests at most once per 30s; we make at most ONE request per sync tick and keep >= 2 min apart.
 * - Content is CC-BY-SA 3.0 and shown with attribution and an "unofficial" label.
 */
const API = "https://liquipedia.net/leagueoflegends/api.php";
export const WORLDS_PAGE = "World_Championship/2026";
export const MIN_GAP_MS = 2 * 60_000;
const ROSTER_TTL_MS = 6 * 3600_000;
const SOCIALS_TTL_MS = 7 * 24 * 3600_000;

/** Liquipedia participant name (lowercase) -> our team code. */
export const NAME_TO_CODE: Record<string, string> = {
  "gen.g esports": "GEN", "hanwha life esports": "HLE", "t1": "T1", "dplus": "DK", "dplus kia": "DK", "anyone's legend": "AL",
  "bilibili gaming": "BLG", "top esports": "TES", "invictus gaming": "IG", "g2 esports": "G2", "movistar koi": "MKOI",
  "team liquid": "TL", "lyon": "LYON", "secret whales": "TSW", "team secret whales": "TSW", "ctbc flying oyster": "CFO", "los": "LOS",
  "karmine corp": "KC", "cloud9": "C9", "mvk esports": "MVK", "furia": "FUR",
};

const ROLE: Record<string, string> = { top: "top", jgl: "jungle", jng: "jungle", jungle: "jungle", mid: "mid", bot: "bottom", adc: "bottom", sup: "support", support: "support" };

function params(raw: string) {
  const out: Record<string, string> = {};
  for (const part of raw.split("|")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

export function parseParticipants(wikitext: string): Map<string, Pick<TeamExtras, "players" | "staff">> {
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, "");
  const starts = [...text.matchAll(/\{\{Opponent\|([^\n|{}]+)/g)];
  const out = new Map<string, Pick<TeamExtras, "players" | "staff">>();
  starts.forEach((m, i) => {
    const code = NAME_TO_CODE[m[1]!.trim().toLowerCase()];
    if (!code || out.has(code)) return;
    const block = text.slice(m.index!, starts[i + 1]?.index ?? text.length);
    const players: TeamExtras["players"] = [];
    const staff: TeamExtras["staff"] = [];
    for (const p of block.matchAll(/\{\{Person\|([^{}]*)\}\}/g)) {
      const segs = p[1]!.split("|");
      const id = (segs.find((x) => !x.includes("=")) ?? "").trim();
      if (!id) continue;
      const a = params(segs.filter((x) => x.includes("=")).join("|"));
      const roleRaw = (a.role ?? "").toLowerCase();
      if (a.type?.toLowerCase() === "staff") {
        staff.push({ id, role: (a.role ?? "staff").replace(/\s+/g, " ").toLowerCase() });
        continue;
      }
      const parts = roleRaw.split(",").map((x) => x.trim());
      const role = ROLE[parts[0] ?? ""] ?? parts[0] ?? "";
      if (!role) continue;
      players.push({ id, role, sub: a.status?.toLowerCase() === "sub", captain: parts.includes("captain") });
    }
    if (players.length > 0) out.set(code, { players, staff });
  });
  return out;
}

export function parseSocials(wikitext: string): TeamExtras["socials"] {
  const m = wikitext.match(/\{\{Infobox team([\s\S]*?)\n\}\}/);
  if (!m) return [];
  const a = params(m[1]!.replace(/\n\|/g, "|"));
  const s: TeamExtras["socials"] = [];
  const ok = (v?: string) => (v && /^[A-Za-z0-9_.\-]+$/.test(v) ? v : null);
  if (a.website && /^https:\/\/[^\s{}|]+$/.test(a.website)) s.push({ label: "Website", url: a.website });
  if (ok(a.twitter)) s.push({ label: "X / Twitter", url: `https://x.com/${a.twitter}` });
  if (ok(a.instagram)) s.push({ label: "Instagram", url: `https://www.instagram.com/${a.instagram}` });
  if (ok(a.twitch)) s.push({ label: "Twitch", url: `https://www.twitch.tv/${a.twitch}` });
  if (ok(a.facebook)) s.push({ label: "Facebook", url: `https://www.facebook.com/${a.facebook}` });
  if (a.youtube && /^(@|channel\/|c\/|user\/)[A-Za-z0-9_.\-]+$/.test(a.youtube)) s.push({ label: "YouTube", url: `https://www.youtube.com/${a.youtube}` });
  return s;
}

export async function fetchWikitext(page: string, contact: string): Promise<string> {
  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`;
  const r = await fetch(url, { headers: { "User-Agent": `Worlds2026LiveTracker/1.0 (fan project; contact: ${contact})`, "Accept-Encoding": "gzip" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`liquipedia ${r.status}`);
  const j = (await r.json()) as { parse?: { wikitext?: { "*"?: string } } };
  const t = j.parse?.wikitext?.["*"];
  if (!t) throw new Error("liquipedia: empty response");
  return t;
}

const META = "__lp_meta";
type Meta = { lastRequestAt: string; backoffUntil?: string };

/**
 * One throttled Liquipedia step per sync tick (cron/manual only). Never throws: failures keep the previous data.
 * Order: Worlds participants page (rosters, subs, coaches) when stale, otherwise one team page for social links.
 */
export async function refreshLiquipedia(store: Store, opts: { contact?: string; now?: Date; fetcher?: typeof fetchWikitext } = {}): Promise<string> {
  const contact = opts.contact ?? process.env.LIQUIPEDIA_CONTACT;
  if (!contact) return "disabled (LIQUIPEDIA_CONTACT not set)";
  const now = opts.now ?? new Date();
  const fetcher = opts.fetcher ?? fetchWikitext;
  try {
    const extras = await store.loadExtras();
    const meta = extras[META] as unknown as Meta | undefined;
    if (meta?.backoffUntil && new Date(meta.backoffUntil) > now) return "backoff";
    if (meta && now.getTime() - new Date(meta.lastRequestAt).getTime() < MIN_GAP_MS) return "throttled";
    const teams = (key: string) => extras[key] as TeamExtras | undefined;
    const rosterAge = Math.min(...Object.values(extras).filter((x): x is TeamExtras => !!x && (x as TeamExtras).source === "liquipedia").map((x) => (x.rosterFetchedAt ? now.getTime() - new Date(x.rosterFetchedAt).getTime() : Infinity)), Infinity);
    await store.saveExtra(META, { lastRequestAt: now.toISOString() });
    const missing = new Set(Object.values(NAME_TO_CODE)).size > Object.values(extras).filter((x) => (x as TeamExtras | undefined)?.rosterFetchedAt).length;
    if (missing || rosterAge > ROSTER_TTL_MS) {
      const parsed = parseParticipants(await fetcher(WORLDS_PAGE, contact));
      for (const [code, v] of parsed) {
        const prev = teams(code);
        await store.saveExtra(code, { code, source: "liquipedia", pageTitle: prev?.pageTitle ?? "", rosterFetchedAt: now.toISOString(), socialsFetchedAt: prev?.socialsFetchedAt ?? null, socials: prev?.socials ?? [], ...v } satisfies TeamExtras);
      }
      return `roster ok (${parsed.size} teams)`;
    }
    const due = Object.entries(NAME_TO_CODE).filter(([, c], i, arr) => arr.findIndex(([, d]) => d === c) === i)
      .map(([name, code]) => ({ name, code, at: teams(code)?.socialsFetchedAt ?? null }))
      .filter((t) => !t.at || now.getTime() - new Date(t.at).getTime() > SOCIALS_TTL_MS)
      .sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""))[0];
    if (!due) return "up to date";
    const page = await fetcher(PAGE_BY_CODE[due.code] ?? due.name, contact);
    const prev = teams(due.code);
    if (prev) await store.saveExtra(due.code, { ...prev, socials: parseSocials(page), socialsFetchedAt: now.toISOString() });
    return `socials ok (${due.code})`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg.includes("429")) { try { await store.saveExtra(META, { lastRequestAt: (opts.now ?? new Date()).toISOString(), backoffUntil: new Date((opts.now ?? new Date()).getTime() + 30 * 60_000).toISOString() }); } catch { /* best effort */ } }
    return `error: ${msg.slice(0, 100)}`;
  }
}

/** Liquipedia page titles for the infobox lookup (redirects are followed by the API). */
const PAGE_BY_CODE: Record<string, string> = { GEN: "Gen.G Esports", HLE: "Hanwha Life Esports", T1: "T1", DK: "Dplus KIA", AL: "Anyone's Legend", BLG: "Bilibili Gaming", TES: "Top Esports", IG: "Invictus Gaming", G2: "G2 Esports", MKOI: "Movistar KOI", TL: "Team Liquid", LYON: "LYON", TSW: "Team Secret Whales", CFO: "CTBC Flying Oyster", LOS: "LOS", KC: "Karmine Corp", C9: "Cloud9", MVK: "MVK Esports", FUR: "FURIA" };
