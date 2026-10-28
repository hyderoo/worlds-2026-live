import data from "@/data/worlds-history.json";

export type HistoryYear = { year: number; result: string; asName?: string };
export type TeamHistory = { liquipediaName: string; years: HistoryYear[]; note?: string; partial?: boolean };

export const HISTORY_SOURCE = data.source;
export const HISTORY_RETRIEVED = data.retrieved;

export function historyFor(code: string): TeamHistory | null {
  const t = (data.teams as Record<string, TeamHistory>)[code];
  return t ?? null;
}

export function summarize(h: TeamHistory) {
  const titles = h.years.filter((y) => y.result === "1st").map((y) => y.year);
  const runnerUp = h.years.filter((y) => y.result === "2nd").map((y) => y.year);
  return { appearances: h.years.length, titles, runnerUp };
}
