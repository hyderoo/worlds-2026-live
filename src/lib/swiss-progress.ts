import { computeRecords, hasTbd } from "./match-state";
import type { Match } from "./types";

/** Series records, never individual game scores or predicted winners. */
export function swissStatus(w: number, l: number): "qualified" | "eliminated" | "active" {
  return w >= 3 ? "qualified" : l >= 3 ? "eliminated" : "active";
}

/** Known members of a record bucket whose next pairing is not published yet. */
export function waitingForSwissDraw(all: Match[], record: string, announced: Match[]) {
  const paired = new Set(announced.filter((m) => !hasTbd(m)).flatMap((m) => m.teams.map((t) => t.code)));
  return computeRecords(all, "Swiss").filter((r) => `${r.w}-${r.l}` === record && swissStatus(r.w, r.l) === "active" && !paired.has(r.code));
}
