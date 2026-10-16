import { z } from "zod";

export const MATCH_STATES = ["scheduled", "live", "completed", "unverified"] as const;
export type MatchState = (typeof MATCH_STATES)[number];

export const TeamSideSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
  wins: z.number().int().nullable(),
  outcome: z.enum(["win", "loss"]).nullable(),
  record: z.object({ wins: z.number().int(), losses: z.number().int() }).nullable().optional(),
});
export type TeamSide = z.infer<typeof TeamSideSchema>;

export const VodSchema = z.object({
  provider: z.string(),
  parameter: z.string(),
  locale: z.string(),
});
export type Vod = z.infer<typeof VodSchema>;

export const GameSchema = z.object({
  n: z.number().int(),
  id: z.string(),
  state: z.string(),
  vods: z.array(VodSchema),
});
export type Game = z.infer<typeof GameSchema>;

export const MatchSchema = z.object({
  id: z.string().min(1),
  startTime: z.string(),
  stage: z.string(),
  /** Round label from the schedule, e.g. "Upper Final" or "Quarterfinals". */
  block: z.string(),
  /** Ids of the matches feeding this one (bracket links). */
  previous: z.array(z.string()),
  bestOf: z.number().int().min(1),
  /** Normalized state after sanity checks. */
  state: z.enum(MATCH_STATES),
  /** State exactly as the upstream reported it. */
  upstreamState: z.string(),
  teams: z.tuple([TeamSideSchema, TeamSideSchema]),
  games: z.array(GameSchema),
  source: z.enum(["lolesports", "manual", "seed"]),
  updatedAt: z.string(),
  /** When upstream data for this match last changed (hash change). */
  upstreamChangedAt: z.string(),
});
export type Match = z.infer<typeof MatchSchema>;

export const PickSchema = z.tuple([z.string(), z.string(), z.string()]);
export const GameStatsSchema = z.object({
  n: z.number(),
  id: z.string(),
  patch: z.string().optional(),
  blue: z.object({ team: z.string(), picks: z.array(PickSchema) }),
  red: z.object({ team: z.string(), picks: z.array(PickSchema) }),
});
export type GameStats = z.infer<typeof GameStatsSchema>;

export const PlayerSchema = z.object({ role: z.string(), name: z.string(), official: z.boolean().optional() });
export const TeamSchema = z.object({
  code: z.string(),
  name: z.string(),
  league: z.string().optional(),
  entry: z.string().optional(),
  image: z.string().nullable().optional(),
  players: z.array(PlayerSchema).optional(),
});
export type Team = z.infer<typeof TeamSchema>;

export const RecapSchema = z.object({
  matchId: z.string(),
  title: z.string(),
  body: z.string(),
  kind: z.enum(["editorial", "generated"]),
  author: z.string(),
  updatedAt: z.string(),
});
export type Recap = z.infer<typeof RecapSchema>;

export const SyncRunSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  ok: z.boolean(),
  trigger: z.string(),
  matchesSeen: z.number(),
  matchesChanged: z.number(),
  attempts: z.number(),
  error: z.string().nullable(),
});
export type SyncRun = z.infer<typeof SyncRunSchema>;

export type SyncStatus = {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  connection: "ok" | "degraded" | "down" | "unknown";
  storage: "supabase" | "memory";
  upstream: string;
};

export type Snapshot = {
  generatedAt: string;
  matches: Match[];
  teams: Team[];
  gameStats: Record<string, GameStats[]>;
  recaps: Recap[];
  sync: SyncStatus;
  /** Matches where a manual override is held back because upstream changed later. */
  staleOverrides: string[];
  dataNotes: string[];
};
