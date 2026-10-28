"use client";
import type { GameStats, Team } from "@/lib/types";
import { ChampIcon } from "@/components/champ";
import { ROLE_LABEL, champName } from "@/lib/champions";
import { historyFor, summarize, HISTORY_SOURCE, HISTORY_RETRIEVED } from "@/lib/worlds-history";

type Agg = { player: string; role: string; games: number; champs: Map<string, number> };

/** Aggregates picks from official live-stats champion data. Counts games with data only; win/loss per game is not in the feed. */
export function aggregateTeam(code: string, stats: Record<string, GameStats[]>) {
  const players = new Map<string, Agg>();
  const pool = new Map<string, number>();
  let games = 0;
  for (const list of Object.values(stats)) {
    for (const g of list) {
      for (const side of [g.blue, g.red]) {
        if (side.team !== code) continue;
        games++;
        for (const [role, champ, name] of side.picks) {
          const player = name.startsWith(code + " ") ? name.slice(code.length + 1) : name;
          const a = players.get(player) ?? { player, role, games: 0, champs: new Map() };
          a.games++;
          a.champs.set(champ, (a.champs.get(champ) ?? 0) + 1);
          players.set(player, a);
          pool.set(champ, (pool.get(champ) ?? 0) + 1);
        }
      }
    }
  }
  return { players: [...players.values()].sort((a, b) => b.games - a.games), pool: [...pool.entries()].sort((a, b) => b[1] - a[1]), games };
}

const ORDER = ["top", "jungle", "mid", "bottom", "support"];
const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function Sec({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="mt-8"><p className="eyebrow mb-1">{eyebrow}</p><h2 className="display mb-3 text-2xl">{title}</h2>{children}</section>;
}

function WorldsHistory({ code }: { code: string }) {
  const h = historyFor(code);
  const credit = <p className="mt-2 text-xs text-fog">Unofficial: from Liquipedia&apos;s <a className="underline" href={HISTORY_SOURCE} target="_blank" rel="noreferrer noopener">World Championship results by year</a> (CC-BY-SA 3.0), read {HISTORY_RETRIEVED}. Not verified by Riot. Years not shown are years the team did not reach Worlds, or were not listed. Worlds 2026 results are on the schedule.</p>;
  if (!h) return <><p className="text-sm text-fog">Earlier Worlds appearances: not read for this team. Liquipedia&apos;s results table did not list this organization under a name we could match, so nothing is shown rather than a guess.</p>{credit}</>;
  const s = summarize(h);
  return (
    <>
      <div className="card p-4">
        <p className="text-sm"><span className="font-semibold tabular-nums">{s.appearances}</span> earlier Worlds appearance{s.appearances === 1 ? "" : "s"}{s.titles.length > 0 && <> · <span className="font-semibold text-gold">{s.titles.length} title{s.titles.length === 1 ? "" : "s"}</span> ({s.titles.join(", ")})</>}{s.runnerUp.length > 0 && <> · runner-up {s.runnerUp.join(", ")}</>}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">{[...h.years].reverse().map((y) => <li key={y.year} className="rounded-md border border-line px-2 py-1 text-xs"><span className="tabular-nums text-fog">{y.year}</span> <span className={y.result === "1st" ? "font-semibold text-gold" : ""}>{y.result}</span>{y.asName && <span className="text-fog"> as {y.asName}</span>}</li>)}</ul>
        {h.note && <p className="mt-2 text-xs text-fog">{h.note}</p>}
        {h.partial && <p className="mt-2 text-xs text-fog">Only the most recent appearance was read for this team.</p>}
      </div>
      {credit}
    </>
  );
}

export function TeamDetails({ team, stats }: { team: Team; stats: Record<string, GameStats[]> }) {
  const ex = team.extras;
  const agg = aggregateTeam(team.code, stats);
  const starters = ex ? ex.players.filter((p) => !p.sub).sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role)) : [];
  const subs = ex ? ex.players.filter((p) => p.sub) : [];
  return (
    <>
      <Sec eyebrow="Roster and staff" title="Squad, substitutes and coaches">
        {!ex ? <p className="text-fog">Substitutes, coaches and analysts: unavailable. The official Riot feed does not list them; the unofficial source has not been read yet.</p> : (
          <div className="card grid gap-6 p-5 sm:grid-cols-3">
            <div><p className="eyebrow !text-fog mb-2">Starting five</p><ul className="grid gap-1 text-sm">{starters.map((p) => <li key={p.id} className="flex justify-between"><span>{p.id}{p.captain && <span className="ml-1 text-xs text-gold">C</span>}</span><span className="text-fog">{ROLE_LABEL[p.role] ?? p.role}</span></li>)}</ul></div>
            <div><p className="eyebrow !text-fog mb-2">Substitutes</p>{subs.length === 0 ? <p className="text-sm text-fog">None listed.</p> : <ul className="grid gap-1 text-sm">{subs.map((p) => <li key={p.id} className="flex justify-between"><span>{p.id}</span><span className="text-fog">{ROLE_LABEL[p.role] ?? p.role}</span></li>)}</ul>}</div>
            <div><p className="eyebrow !text-fog mb-2">Coaches and analysts</p>{ex.staff.length === 0 ? <p className="text-sm text-fog">None listed.</p> : <ul className="grid gap-1 text-sm">{ex.staff.map((p) => <li key={p.id} className="flex justify-between"><span>{p.id}</span><span className="text-fog">{cap(p.role)}</span></li>)}</ul>}</div>
          </div>
        )}
        <p className="mt-2 text-xs text-fog">{ex ? <>Unofficial: from <a className="underline" href="https://liquipedia.net/leagueoflegends/World_Championship/2026" target="_blank" rel="noreferrer">Liquipedia</a> (CC-BY-SA 3.0), read {ex.rosterFetchedAt ? new Date(ex.rosterFetchedAt).toLocaleString() : "n/a"}. Official Riot data takes priority where they differ.</> : "Unofficial source: Liquipedia. Nothing shown until it has been read."}</p>
      </Sec>

      <Sec eyebrow="Player statistics" title="Games and champions this tournament">
        {agg.games === 0 ? <p className="text-fog">No champion data for this team yet.</p> : (
          <div className="card overflow-x-auto p-2">
            <table className="w-full min-w-[32rem] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-fog"><tr><th className="p-2">Player</th><th className="p-2">Role</th><th className="p-2">Games</th><th className="p-2">Champions played</th></tr></thead>
              <tbody>{agg.players.map((p) => <tr key={p.player} className="border-t border-line/50"><td className="p-2 font-medium">{p.player}</td><td className="p-2 text-fog">{ROLE_LABEL[p.role] ?? p.role}</td><td className="p-2 tabular-nums">{p.games}</td><td className="p-2"><span className="flex flex-wrap gap-1.5">{[...p.champs.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => <span key={c} className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs"><ChampIcon id={c} size={18} />{champName(c)}{n > 1 && <span className="text-fog"> x{n}</span>}</span>)}</span></td></tr>)}</tbody></table>
          </div>
        )}
        <p className="mt-2 text-xs text-fog">From Riot live stats, {agg.games} game{agg.games === 1 ? "" : "s"} with champion data. KDA and per-game win/loss are not in the feed, so they are not shown. Small sample early in the tournament.</p>
      </Sec>

      <Sec eyebrow="Champion pool" title="Most played by the team">
        {agg.pool.length === 0 ? <p className="text-fog">No champion data for this team yet.</p> : <ul className="flex flex-wrap gap-2">{agg.pool.slice(0, 16).map(([c, n]) => <li key={c} className="card flex items-center gap-2 px-2 py-1.5 text-sm"><ChampIcon id={c} size={28} />{champName(c)}<span className="tabular-nums text-fog">x{n}</span></li>)}</ul>}
      </Sec>

      <Sec eyebrow="Tournament history" title="Worlds history">
        <WorldsHistory code={team.code} />
      </Sec>

      <Sec eyebrow="Social" title="Team links">
        {ex && ex.socials.length > 0 ? <><ul className="flex flex-wrap gap-2">{ex.socials.map((s) => <li key={s.url}><a className="rounded-full border border-line px-3 py-1 text-sm hover:text-gold" href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a></li>)}</ul><p className="mt-2 text-xs text-fog">Unofficial: handles from Liquipedia (CC-BY-SA 3.0). Not verified by Riot.</p></> : <p className="text-sm text-fog">Unavailable. Not provided by the official feed; the unofficial source has not been read for this team yet.</p>}
      </Sec>
    </>
  );
}
