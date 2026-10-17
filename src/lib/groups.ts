import { createHash, randomBytes } from "node:crypto";
import type { Match } from "./types";
import type { Store } from "./store";

export type Member = { name: string; tokenHash: string; joinedAt: string; picks: Record<string, string> };
export type Group = { id: string; name: string; createdAt: string; members: Record<string, Member> };

export const GROUP_PREFIX = "grp:";
export const MAX_MEMBERS = 30;
export const MAX_GROUPS = 300;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export const newToken = () => randomBytes(24).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export function newId(len = 8): string {
  const b = randomBytes(len);
  return [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
}
export const cleanName = (s: unknown, max: number): string => String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

export async function loadGroup(store: Store, id: string): Promise<Group | null> {
  if (!/^[a-z0-9]{6,12}$/.test(id)) return null;
  const ex = await store.loadExtras();
  return (ex[GROUP_PREFIX + id] as Group | undefined) ?? null;
}

/** A pick is open only for scheduled matches with both teams known and a start time still in the future. */
export function pickOpen(m: Match, now: Date): boolean {
  return m.state === "scheduled" && m.teams.every((t) => t.code !== "TBD") && new Date(m.startTime).getTime() > now.getTime();
}

export function winnerOf(m: Match): string | null {
  if (m.state !== "completed") return null;
  const w = m.teams.find((t) => t.outcome === "win");
  return w && w.code !== "TBD" ? w.code : null;
}

export type Row = { id: string; name: string; points: number; settled: number; picks: number };

/** 1 point per correct pick on a completed match. Picks on unfinished or undecided matches score nothing. */
export function leaderboard(g: Group, matches: Match[]): Row[] {
  const wins = new Map<string, string>();
  for (const m of matches) { const w = winnerOf(m); if (w) wins.set(m.id, w); }
  return Object.entries(g.members)
    .map(([id, mem]) => {
      let points = 0, settled = 0;
      for (const [mid, team] of Object.entries(mem.picks)) {
        const w = wins.get(mid);
        if (!w) continue;
        settled++;
        if (w === team) points++;
      }
      return { id, name: mem.name, points, settled, picks: Object.keys(mem.picks).length };
    })
    .sort((a, b) => b.points - a.points || b.settled - a.settled || a.name.localeCompare(b.name));
}

/** Other members' picks are revealed only once a match has started, so nobody can copy them. */
export function revealedPicks(g: Group, matches: Match[], now: Date): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const m of matches) {
    if (new Date(m.startTime).getTime() > now.getTime() && m.state === "scheduled") continue;
    for (const [id, mem] of Object.entries(g.members)) {
      const p = mem.picks[m.id];
      if (p) (out[m.id] ??= {})[id] = p;
    }
  }
  return out;
}
