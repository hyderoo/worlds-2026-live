import type { Match, TeamSide } from "./types";

export type FormEntry = { matchId: string; opp: TeamSide; won: boolean; gw: number; gl: number; startTime: string };
export type Meeting = { matchId: string; startTime: string; stage: string; winner: string; score: [string, number, number, string] };

const done = (m: Match) => m.state === "completed" && m.teams.some((t) => t.outcome === "win");

/** Last results for a team, newest first. Official completed series only. Nothing is estimated. */
export function teamForm(matches: Match[], code: string, n = 5): FormEntry[] {
  return matches
    .filter((m) => done(m) && m.teams.some((t) => t.code === code))
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, n)
    .map((m) => {
      const me = m.teams.find((t) => t.code === code)!;
      const opp = m.teams.find((t) => t !== me)!;
      return { matchId: m.id, opp, won: me.outcome === "win", gw: me.wins ?? 0, gl: opp.wins ?? 0, startTime: m.startTime };
    });
}

export function streak(form: FormEntry[]): { won: boolean; n: number } | null {
  if (form.length === 0) return null;
  const first = form[0]!.won;
  let n = 0;
  for (const f of form) { if (f.won !== first) break; n++; }
  return { won: first, n };
}

/** Meetings between two teams at this tournament (completed only). Earlier years are not in the data. */
export function headToHead(matches: Match[], a: string, b: string) {
  const ms = matches
    .filter((m) => done(m) && m.teams.some((t) => t.code === a) && m.teams.some((t) => t.code === b))
    .sort((x, y) => y.startTime.localeCompare(x.startTime));
  let aw = 0, bw = 0, ag = 0, bg = 0;
  const meetings: Meeting[] = ms.map((m) => {
    const ta = m.teams.find((t) => t.code === a)!, tb = m.teams.find((t) => t.code === b)!;
    if (ta.outcome === "win") aw++; else bw++;
    ag += ta.wins ?? 0; bg += tb.wins ?? 0;
    return { matchId: m.id, startTime: m.startTime, stage: m.stage, winner: ta.outcome === "win" ? a : b, score: [a, ta.wins ?? 0, tb.wins ?? 0, b] };
  });
  return { meetings, aw, bw, ag, bg };
}
