import type { Team } from "@/lib/types";

/** Feed names look like "T1 Faker". Drops the team-code prefix when present. */
export function bareName(code: string, raw: string): string {
  return raw.startsWith(code + " ") ? raw.slice(code.length + 1) : raw;
}

/** Riot-published photo for a player of this team, matched by exact name (case-insensitive). No match, no photo: never a substitute. */
export function photoFor(teams: Team[] | undefined, code: string, raw: string): string | undefined {
  const name = bareName(code, raw).trim().toLowerCase();
  const t = teams?.find((x) => x.code === code);
  return t?.players?.find((p) => p.name.trim().toLowerCase() === name)?.photo;
}
