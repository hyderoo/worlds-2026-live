import type { Match } from "./types";

/**
 * Deterministic summary built only from verified result fields. No invented narrative:
 * no "dominant", no momentum claims, nothing that is not in the data.
 */
export function autoSummary(m: Match): string | null {
  if (m.state !== "completed") return null;
  const w = m.teams.find((t) => t.outcome === "win");
  const l = m.teams.find((t) => t.outcome === "loss");
  if (!w || !l || w.wins === null || l.wins === null) return null;
  const sweep = l.wins === 0;
  const total = w.wins + l.wins;
  return `${w.name} beat ${l.name} ${w.wins}-${l.wins} in a best-of-${m.bestOf} (${m.block}, ${m.stage}). ${sweep ? "It finished without a game dropped." : `The series went ${total} games.`}`;
}

export const matchLabel = (m: Match) => `${m.teams[0].name} vs ${m.teams[1].name}`;
