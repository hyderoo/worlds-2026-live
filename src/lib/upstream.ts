import { z } from "zod";
import { config } from "./config";
import { normalizeState } from "./match-state";
import { withRetry } from "./retry";
import type { Game, GameStats, Match, Team, TeamSide } from "./types";

const TeamRaw = z.object({
  id: z.string().optional(),
  code: z.string(),
  name: z.string(),
  image: z.string().nullish(),
  result: z.object({ outcome: z.string().nullish(), gameWins: z.number().nullish() }).nullish(),
  record: z.object({ wins: z.number(), losses: z.number() }).nullish(),
});
const StandingsMatch = z.object({ id: z.string(), state: z.string(), previousMatchIds: z.array(z.string()).default([]), teams: z.array(TeamRaw).length(2) });
const StandingsSchema = z.object({
  data: z.object({
    standings: z.array(
      z.object({
        stages: z.array(z.object({ name: z.string(), sections: z.array(z.object({ matches: z.array(StandingsMatch) })) })),
      }),
    ),
  }),
});
const ScheduleEvent = z.object({
  startTime: z.string(),
  state: z.string(),
  blockName: z.string().optional(),
  match: z.object({
    id: z.string(),
    teams: z.array(TeamRaw).length(2),
    strategy: z.object({ count: z.number() }).optional(),
  }),
});
const ScheduleSchema = z.object({
  data: z.object({ schedule: z.object({ events: z.array(z.unknown()), pages: z.object({ newer: z.string().nullish() }).nullish() }) }),
});
const EventDetailsSchema = z.object({
  data: z.object({
    event: z.object({
      match: z.object({
        games: z.array(
          z.object({
            number: z.number(),
            id: z.string(),
            state: z.string(),
            vods: z.array(z.object({ provider: z.string(), parameter: z.string(), locale: z.string() })).default([]),
          }),
        ),
      }),
    }),
  }),
});

async function get(path: string, params: Record<string, string>, fetcher: typeof fetch = fetch): Promise<unknown> {
  const url = `${config.apiBase}/${path}?${new URLSearchParams({ hl: "en-US", ...params })}`;
  const res = await fetcher(url, { headers: { "x-api-key": config.apiKey }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
  if (!res.ok) throw new Error(`lolesports ${path} responded ${res.status}`);
  return res.json();
}

const https = (u?: string | null) => (u ? u.replace(/^http:\/\//, "https://") : null);

function side(t: z.infer<typeof TeamRaw>): TeamSide {
  const outcome = t.result?.outcome === "win" || t.result?.outcome === "loss" ? t.result.outcome : null;
  return {
    code: t.code,
    name: t.name,
    ...(t.id ? { id: t.id } : {}),
    image: https(t.image),
    wins: t.result?.gameWins ?? null,
    outcome,
    record: t.record ?? null,
  };
}

export type UpstreamResult = { matches: Match[]; attempts: number; stages: string[] };

/**
 * Official LoL Esports data. The standings endpoint gives the canonical tournament match list
 * (including TBD knockout slots); the schedule endpoint adds start times and series format.
 */
export async function fetchUpstream(now: Date = new Date(), fetcher: typeof fetch = fetch): Promise<UpstreamResult> {
  const { value, attempts } = await withRetry(async () => {
    const [standingsRaw, scheduleRaw] = await Promise.all([
      get("getStandings", { tournamentId: config.tournamentId }, fetcher),
      get("getSchedule", { leagueId: config.leagueId }, fetcher),
    ]);
    const schedule = ScheduleSchema.parse(scheduleRaw);
    // The schedule is paginated; the first page ends mid-tournament, so follow the "newer" page once.
    const newer = schedule.data.schedule.pages?.newer;
    let extra: unknown[] = [];
    if (newer) {
      try {
        extra = ScheduleSchema.parse(await get("getSchedule", { leagueId: config.leagueId, pageToken: newer }, fetcher)).data.schedule.events;
      } catch {
        /* later rounds are simply missing until the next sync */
      }
    }
    return { standings: StandingsSchema.parse(standingsRaw), events: [...schedule.data.schedule.events, ...extra] };
  });

  const sched = new Map<string, z.infer<typeof ScheduleEvent>>();
  for (const e of value.events) {
    const p = ScheduleEvent.safeParse(e);
    if (p.success) sched.set(p.data.match.id, p.data);
  }

  const out: Match[] = [];
  const stages: string[] = [];
  const iso = now.toISOString();
  for (const st of value.standings.data.standings[0]?.stages ?? []) {
    stages.push(st.name);
    for (const sec of st.sections) {
      for (const m of sec.matches) {
        const ev = sched.get(m.id);
        if (!ev) continue; // no verified start time: omit rather than guess
        const teams = m.teams.map(side) as [TeamSide, TeamSide];
        out.push({
          id: m.id,
          startTime: ev.startTime,
          stage: st.name,
          block: ev.blockName ?? st.name,
          previous: m.previousMatchIds,
          bestOf: ev.match.strategy?.count ?? 1,
          state: normalizeState(m.state, ev.startTime, teams, now),
          upstreamState: m.state,
          teams,
          games: [],
          source: "lolesports",
          updatedAt: iso,
          upstreamChangedAt: iso,
        });
      }
    }
  }
  out.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
  if (out.length === 0) throw new Error("upstream returned no matches for this tournament");
  return { matches: out, attempts, stages };
}

export async function fetchGames(matchId: string, fetcher: typeof fetch = fetch): Promise<Game[]> {
  const raw = await get("getEventDetails", { id: matchId }, fetcher);
  const p = EventDetailsSchema.parse(raw);
  return p.data.event.match.games.map((g) => ({
    n: g.number,
    id: g.id,
    state: g.state,
    vods: g.vods.filter((v) => v.provider === "youtube").slice(0, 6),
  }));
}

const SideFrame = z.object({ totalGold: z.number(), totalKills: z.number(), towers: z.number(), barons: z.number(), dragons: z.array(z.string()), inhibitors: z.number().optional() });
const WindowSchema = z.object({
  frames: z.array(z.object({ rfc460Timestamp: z.string(), gameState: z.string(), blueTeam: SideFrame, redTeam: SideFrame })).optional(),
  gameMetadata: z.object({
    patchVersion: z.string().optional(),
    blueTeamMetadata: z.object({ esportsTeamId: z.string(), participantMetadata: z.array(z.object({ role: z.string(), championId: z.string(), summonerName: z.string() })) }),
    redTeamMetadata: z.object({ esportsTeamId: z.string(), participantMetadata: z.array(z.object({ role: z.string(), championId: z.string(), summonerName: z.string() })) }),
  }),
});

/** Champions per side from Riot's live stats feed. Returns null if the feed has nothing for this game. */
export async function fetchGameStats(gameId: string, n: number, idToCode: Map<string, string>, fetcher: typeof fetch = fetch): Promise<GameStats | null> {
  // The feed returns the first frames unless startingTime is given; ask for a recent time (10s aligned) to get the latest frame.
  const st = new Date(Math.floor((Date.now() - 60_000) / 10_000) * 10_000).toISOString();
  const res = await fetcher(`${config.feedBase}/window/${encodeURIComponent(gameId)}?startingTime=${encodeURIComponent(st)}`, { signal: AbortSignal.timeout(12_000), cache: "no-store" });
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) throw new Error(`livestats responded ${res.status}`);
  const p = WindowSchema.safeParse(await res.json());
  if (!p.success) return null;
  const { blueTeamMetadata: b, redTeamMetadata: r, patchVersion } = p.data.gameMetadata;
  const blue = idToCode.get(b.esportsTeamId), red = idToCode.get(r.esportsTeamId);
  if (!blue || !red) return null; // do not guess which team is which
  const picks = (pm: typeof b.participantMetadata) => pm.map((x) => [x.role, x.championId, x.summonerName] as [string, string, string]);
  const f = p.data.frames?.at(-1);
  const side = (t: z.infer<typeof SideFrame>) => ({ gold: t.totalGold, kills: t.totalKills, towers: t.towers, barons: t.barons, dragons: t.dragons, inhibitors: t.inhibitors });
  const sum = f && f.blueTeam.totalGold > 0 ? { at: f.rfc460Timestamp, state: f.gameState, blue: side(f.blueTeam), red: side(f.redTeam) } : undefined;
  return { n, id: gameId, sum, patch: patchVersion, blue: { team: blue, picks: picks(b.participantMetadata) }, red: { team: red, picks: picks(r.participantMetadata) } };
}

export function fingerprint(m: Match): string {
  return JSON.stringify([m.startTime, m.stage, m.block, m.previous, m.bestOf, m.upstreamState, m.teams.map((t) => [t.code, t.wins, t.outcome])]);
}

export type { Team };
