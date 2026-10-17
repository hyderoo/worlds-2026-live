"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSnapshot } from "./providers";
import { Empty, Pill, StateBadge, TeamLogo } from "./ui";
import { fmtDateTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { ChampIcon } from "@/components/champ";
import { ROLE_LABEL, champName } from "@/lib/champions";
import { autoSummary } from "@/lib/recap-text";
import { computeRecords } from "@/lib/match-state";

export function RecapsList() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const done = useMemo(() => snap.matches.filter((m) => m.state === "completed").reverse(), [snap.matches]);
  const stages = [...new Set(done.map((m) => m.stage))];
  const list = done.filter((m) => (stage === "all" || m.stage === stage) && (!q || m.teams.some((t) => `${t.name} ${t.code}`.toLowerCase().includes(q.toLowerCase()))));
  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input aria-label="Search recaps" placeholder="Search team…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        <Pill active={stage === "all"} onClick={() => setStage("all")}>All</Pill>
        {stages.map((s) => <Pill key={s} active={stage === s} onClick={() => setStage(s)}>{s}</Pill>)}
      </div>
      {list.length === 0 ? <Empty title="No recaps yet">Recaps appear once a series finishes and the result is confirmed.</Empty> : (
        <ul className="grid gap-4">
          {list.map((m) => {
            const r = snap.recaps.find((x) => x.matchId === m.id);
            return (
              <li key={m.id}><Link href={`/recaps/${m.id}`} className="card block p-5 transition hover:border-violet-dim">
                <div className="mb-2 flex items-center justify-between text-xs text-fog"><span>{fmtDateTime(m.startTime, prefs.tz)} · {m.stage}</span>{r ? <span className="text-gold">Editorial</span> : <span>Auto summary</span>}</div>
                <p className="display flex flex-wrap items-center gap-3 text-2xl"><TeamLogo team={m.teams[0]} size={30} />{m.teams[0].code} {m.teams[0].wins}<span className="text-fog">-</span>{m.teams[1].wins} {m.teams[1].code}<TeamLogo team={m.teams[1]} size={30} /></p>
                <p className="mt-2 text-sm text-fog">{r?.title ?? autoSummary(m)}</p>
              </Link></li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function RecapDetail({ id }: { id: string }) {
  const { snap } = useSnapshot();
  const m = snap.matches.find((x) => x.id === id);
  if (!m || m.state !== "completed") return <div className="mt-10"><Empty title="Recap not available">Recaps exist only for confirmed finished series. <Link className="underline" href={`/matches/${id}`}>Open match page</Link></Empty></div>;
  const r = snap.recaps.find((x) => x.matchId === id);
  const stats = snap.gameStats[id] ?? [];
  return (
    <article className="pt-10">
      <p className="eyebrow mb-3"><Link href="/recaps" className="hover:underline">Recaps</Link> / {m.stage}</p>
      <div className="card p-6 sm:p-10">
        <StateBadge state="completed" />
        <h1 className="display mt-4 text-4xl sm:text-6xl">{m.teams[0].name} <span className="text-gold">{m.teams[0].wins}-{m.teams[1].wins}</span> {m.teams[1].name}</h1>
        <p className="mt-4 text-lg text-fog">{autoSummary(m)}</p>
        <p className="mt-1 text-xs text-fog">Generated from verified result data only.</p>
      </div>
      {r && <section className="card mt-4 p-6"><p className="eyebrow">Editorial · {r.author}</p><h2 className="display mt-1 text-2xl">{r.title}</h2><p className="mt-2 whitespace-pre-line text-fog">{r.body}</p></section>}
      <section className="mt-6"><h2 className="display mb-3 text-2xl">Champions by game</h2>
        {stats.length === 0 ? <Empty title="Champion data not available for this series yet" /> : (
          <div className="grid gap-3">{stats.map((g) => (
            <div key={g.id} className="card p-4"><strong>Game {g.n}</strong><div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{([g.blue, g.red] as const).map((s, i) => <ul key={i}><li className="mb-1 text-xs text-fog">{i === 0 ? "Blue" : "Red"} · {s.team}</li>{s.picks.map(([role, c, p]) => <li key={role} className="flex items-center justify-between"><span><span className="inline-block w-14 text-fog">{ROLE_LABEL[role] ?? role}</span><ChampIcon id={c} size={22} /> {champName(c)}</span><span className="text-fog">{p}</span></li>)}</ul>)}</div></div>
          ))}</div>
        )}
        <p className="mt-3 text-xs text-fog">Source: Riot lolesports live stats. MVP and per-game winners are not in the official feed, so they are not shown.</p>
      </section>
      <p className="mt-6"><Link className="text-gold underline" href={`/matches/${id}`}>Full match page</Link></p>
    </article>
  );
}

export function StatsView() {
  const { snap } = useSnapshot();
  const done = snap.matches.filter((m) => m.state === "completed");
  const games = done.reduce((n, m) => n + (m.teams[0].wins ?? 0) + (m.teams[1].wins ?? 0), 0);
  const sweeps = done.filter((m) => m.teams.some((t) => t.wins === 0)).length;
  const champs = new Map<string, number>();
  let gamesWithData = 0;
  for (const gs of Object.values(snap.gameStats)) for (const g of gs) { gamesWithData++; for (const s of [g.blue, g.red]) for (const [, c] of s.picks) champs.set(c, (champs.get(c) ?? 0) + 1); }
  const top = [...champs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  const recs = computeRecords(snap.matches);
  return (
    <div className="mt-6 grid gap-6">
      <div className="grid gap-4 sm:grid-cols-4">{[["Series played", done.length], ["Games played", games], ["Sweeps", sweeps], ["Games with champion data", gamesWithData]].map(([l, v]) => <div key={l as string} className="card p-5"><p className="display text-4xl tabular-nums">{v}</p><p className="eyebrow !text-fog">{l}</p></div>)}</div>
      <section className="card p-6"><h2 className="display text-2xl">Most picked champions</h2>
        {top.length === 0 ? <p className="mt-2 text-fog">No champion data yet.</p> : <ol className="mt-4 grid gap-2">{top.map(([c, n]) => <li key={c} className="grid grid-cols-[11rem_1fr_2rem] items-center gap-3 text-sm"><span className="flex items-center gap-2"><ChampIcon id={c} size={24} />{champName(c)}</span><span className="h-2 rounded-full bg-raise"><span className="block h-2 rounded-full bg-gradient-to-r from-violet to-gold" style={{ width: `${(n / (top[0]?.[1] ?? 1)) * 100}%` }} /></span><span className="tabular-nums text-fog">{n}</span></li>)}</ol>}
        <p className="mt-3 text-xs text-fog">Counts picks across {gamesWithData} games that have official live-stats champion data. Small sample.</p></section>
      <section className="card overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Team records</caption><thead className="border-b border-line text-xs uppercase tracking-wider text-fog"><tr><th className="px-3 py-2 text-left">Team</th><th className="px-3 py-2 text-left">W-L</th><th className="px-3 py-2 text-left">Game diff</th></tr></thead>
        <tbody>{recs.map((r) => <tr key={r.code} className="border-b border-line/50 last:border-0"><td className="px-3 py-2"><Link className="hover:text-gold" href={`/teams/${r.code}`}><span className="flex items-center gap-2"><TeamLogo team={r} size={22} />{r.name}</span></Link></td><td className="px-3 py-2 tabular-nums">{r.w}-{r.l}</td><td className="px-3 py-2 tabular-nums">{r.gw - r.gl > 0 ? "+" : ""}{r.gw - r.gl}</td></tr>)}{recs.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-fog">No completed matches yet.</td></tr>}</tbody></table></section>
    </div>
  );
}
