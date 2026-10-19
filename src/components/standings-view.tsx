"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { useSnapshot } from "./providers";
import { Empty, Pill, SpoilerGate, StateBadge, TeamLogo } from "./ui";
import { computeRecords, hasTbd } from "@/lib/match-state";
import { dayKey, fmtDateTime } from "@/lib/format";
import { usePrefs, useT } from "@/lib/prefs";
import type { Match } from "@/lib/types";

const STAGES = ["Play-Ins", "Swiss", "Knockouts"] as const;

function BracketCard({ m, tz, hot, setHot, note }: { m: Match; tz: string; hot: string | null; setHot: (c: string | null) => void; note?: string }) {
  return (
    <div className="card block w-60 shrink-0 p-3 text-sm transition hover:border-violet-dim">
      <div className="mb-2 flex items-center justify-between text-[0.7rem] text-fog"><Link href={`/matches/${m.id}`} className="underline-offset-2 hover:underline">{fmtDateTime(m.startTime, tz)} ›</Link><StateBadge state={m.state} /></div>
      {m.teams.map((t, i) => (
        <button key={i} type="button" disabled={t.code === "TBD"} aria-pressed={hot === t.code} onClick={() => setHot(hot === t.code ? null : t.code)}
          className={clsx("flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left", hot === t.code && "bg-violet/25 ring-1 ring-violet/60", m.state === "completed" && t.outcome === "loss" && "opacity-50")}>
          <span className="flex items-center gap-2"><TeamLogo team={t} size={22} /><span className={clsx(t.outcome === "win" && "text-gold")}>{t.code === "TBD" ? "TBD" : t.code}</span></span>
          <span className="tabular-nums">{m.state === "completed" || m.state === "live" ? t.wins ?? 0 : "–"}</span>
        </button>
      ))}
      {note && <p className="mt-2 text-[0.68rem] leading-snug text-fog">{note}</p>}
    </div>
  );
}

function Zoomable({ children, label }: { children: React.ReactNode; label: string }) {
  const [z, setZ] = useState(1);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-fog">
        <span>Zoom</span>
        <button aria-label="Zoom out" className="rounded border border-line px-2 py-0.5 hover:text-snow" onClick={() => setZ((v) => Math.max(0.6, +(v - 0.1).toFixed(1)))}>−</button>
        <span className="tabular-nums">{Math.round(z * 100)}%</span>
        <button aria-label="Zoom in" className="rounded border border-line px-2 py-0.5 hover:text-snow" onClick={() => setZ((v) => Math.min(1.4, +(v + 0.1).toFixed(1)))}>+</button>
        <span className="ml-2">Scroll sideways to pan.</span>
      </div>
      <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-xl border border-line p-4">
        <div style={{ transform: `scale(${z})`, transformOrigin: "top left", width: `${100 / z}%` }} className="flex min-w-max gap-8">{children}</div>
      </div>
    </div>
  );
}



/** Official Swiss schedule grouped by matchday. A day shows pairings only once the schedule names both teams of every series. */
function SwissMatchups({ all, tz }: { all: Match[]; tz: string }) {
  const { lang } = useT();
  const id = lang === "id";
  const swiss = all.filter((m) => m.stage === "Swiss").sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (swiss.length === 0) return null;
  const days = new Map<string, Match[]>();
  for (const m of swiss) { const k = dayKey(m.startTime, tz); days.set(k, [...(days.get(k) ?? []), m]); }
  const list = [...days.entries()];
  return (
    <section className="mb-8" aria-labelledby="sw-matchups">
      <h2 id="sw-matchups" className="display mb-1 text-2xl">{id ? "Jadwal dan lawan Swiss" : "Swiss matchups"}</h2>
      <p className="mb-4 text-sm text-fog">{id ? "Hanya dari jadwal resmi lolesports. Pairing ronde berikutnya baru muncul setelah resmi diumumkan, tidak ada yang ditebak." : "Official lolesports schedule only. Later pairings appear once officially published; nothing is guessed."}</p>
      <div className="grid gap-5">
        {list.map(([k, ms], i) => {
          const known = ms.filter((m) => !hasTbd(m));
          const first = ms[0]!;
          const title = i === 0 ? (id ? "Ronde 1" : "Round 1") : (id ? `Hari ${i + 1}` : `Matchday ${i + 1}`);
          return (
            <div key={k}>
              <p className="eyebrow mb-2">{title} · {fmtDateTime(first.startTime, tz).split(",").slice(0, 2).join(",")} · {known.length}/{ms.length} {id ? "lawan diumumkan" : "pairings published"}</p>
              {known.length === 0
                ? <div className="card p-3 text-sm text-fog">{id ? `Belum diumumkan. Jadwal resmi punya ${ms.length} seri, tim akan terisi setelah ronde sebelumnya selesai.` : `Not announced yet. The official schedule has ${ms.length} series; teams fill in after the previous round.`}</div>
                : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {known.map((m) => (
                    <Link key={m.id} href={`/matches/${m.id}`} className="card block p-3 text-sm transition hover:border-violet-dim">
                      <div className="mb-2 flex items-center justify-between text-[0.7rem] text-fog"><span>{fmtDateTime(m.startTime, tz)}</span><span>Bo{m.bestOf}</span></div>
                      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><TeamLogo team={m.teams[0]!} size={22} />{m.teams[0]!.code}</span><span className="text-xs text-fog">vs</span><span className="flex items-center gap-2">{m.teams[1]!.code}<TeamLogo team={m.teams[1]!} size={22} /></span></div>
                    </Link>
                  ))}
                  {ms.length > known.length && <div className="card p-3 text-sm text-fog">{id ? `${ms.length - known.length} seri lain belum diumumkan` : `${ms.length - known.length} more series not announced yet`}</div>}
                </div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Swiss progress board: where each team sits by official W-L record. No pairings are invented; they appear once the schedule names both teams. */
function SwissBoard({ all, teams }: { all: Match[]; teams: { code: string; name: string; entry?: string; image?: string | null }[] }) {
  const swiss = all.filter((m) => m.stage === "Swiss");
  const recs = new Map(computeRecords(all, "Swiss").map((r) => [r.code, r]));
  const field = teams.filter((t) => t.entry === "Swiss");
  const cell = new Map<string, typeof field>();
  for (const t of field) { const r = recs.get(t.code); const k = `${r?.w ?? 0}-${r?.l ?? 0}`; cell.set(k, [...(cell.get(k) ?? []), t]); }
  const known = swiss.filter((m) => m.state !== "completed" && !hasTbd(m));
  const tbd = swiss.filter((m) => hasTbd(m)).length;
  const rows = [[0, 1, 2, 3], [0, 1, 2, 3]];
  return (
    <section className="mb-6" aria-labelledby="sw-board">
      <h2 id="sw-board" className="display mb-1 text-2xl">Swiss progress</h2>
      <p className="mb-3 text-sm text-fog">Rows are series wins, columns are series losses. Three wins advance to the knockouts, three losses eliminate. The Play-In winner takes the 16th Swiss spot.</p>
      <div role="region" aria-label="Swiss record board" tabIndex={0} className="overflow-x-auto"><div className="grid min-w-[40rem] grid-cols-4 gap-2">
        {rows[0]!.flatMap((w) => rows[1]!.map((l) => {
          if (w === 3 && l === 3) return <div key="x" />;
          const k = `${w}-${l}`, here = cell.get(k) ?? [];
          const advanced = w === 3, out = l === 3;
          return (
            <div key={k} className={clsx("card min-h-20 p-2", advanced && "border-gold/50", out && "opacity-70")}>
              <p className={clsx("mb-1 text-[0.7rem] uppercase tracking-wider", advanced ? "text-gold" : "text-fog")}>{k}{advanced ? " advanced" : out ? " eliminated" : ""}</p>
              <div className="flex flex-wrap gap-1.5">{here.map((t) => <Link key={t.code} href={`/teams/${t.code}`} title={t.name} className="flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs hover:text-gold"><TeamLogo team={t} size={16} />{t.code}</Link>)}
                {k === "0-0" && <span className="rounded-md border border-dashed border-line px-1.5 py-0.5 text-xs text-fog" title="Decided by the Play-In">Play-In winner (TBD)</span>}</div>
            </div>
          );
        }))}
      </div></div>
      <p className="mt-3 text-sm text-fog">{known.length > 0 ? `${known.length} upcoming Swiss series with both teams known are listed below under Swiss matchups; the rest are not announced yet.` : `Pairings: not published. The official schedule lists ${tbd} Swiss series with teams still to be decided, and pairings are only drawn after each round. Nothing is guessed here.`}</p>
      <p className="mt-1 text-xs text-fog">Format (5-round Swiss, 3 wins advance, Play-In winner joins) is from <a className="underline" href="https://liquipedia.net/leagueoflegends/World_Championship/2026" target="_blank" rel="noreferrer">Liquipedia</a> (unofficial, CC-BY-SA 3.0). Records come from official results only.</p>
    </section>
  );
}

function PlayIns({ ms, tz, hot, setHot }: { ms: Match[]; tz: string; hot: string | null; setHot: (c: string | null) => void }) {
  const six = ms.length === 6;
  // Double-elimination format of the 4-team Play-In, in schedule order. Labels shown only when the shape matches.
  const notes = six
    ? ["Winner to upper final, loser to lower semifinal", "Winner to upper final, loser to lower semifinal", "Winner to qualifying final, loser to lower final", "Loser is eliminated, winner to lower final", "Winner to qualifying final", "Qualifying final"]
    : [];
  const cols: [string, Match[]][] = six
    ? [["Opening matches", [ms[0]!, ms[1]!]], ["Upper final / lower semifinal", [ms[2]!, ms[3]!]], ["Lower final", [ms[4]!]], ["Qualifying final", [ms[5]!]]]
    : [["Matches", ms]];
  const idx = (m: Match) => ms.indexOf(m);
  return (
    <>
      <Zoomable label="Play-In bracket">
        {cols.map(([title, items]) => (
          <div key={title} className="grid content-center gap-4">
            <p className="eyebrow">{title}</p>
            {items.map((m) => <BracketCard key={m.id} m={m} tz={tz} hot={hot} setHot={setHot} note={notes[idx(m)]} />)}
          </div>
        ))}
      </Zoomable>
      <p className="mt-3 text-xs text-fog">Round labels follow the 4-team double-elimination Play-In format in schedule order. Hover or focus a team to trace it through the bracket. The source feed does not publish bracket links, so progression text is a format description, not a prediction.</p>
    </>
  );
}

function Knockouts({ ms, tz, hot, setHot }: { ms: Match[]; tz: string; hot: string | null; setHot: (c: string | null) => void }) {
  const blocks = [...new Set(ms.map((m) => m.block))];
  return (
    <Zoomable label="Knockout bracket">
      {blocks.map((b) => (
        <div key={b} className="grid content-center gap-4"><p className="eyebrow">{b}</p>{ms.filter((m) => m.block === b).map((m) => <BracketCard key={m.id} m={m} tz={tz} hot={hot} setHot={setHot} />)}</div>
      ))}
    </Zoomable>
  );
}

type SortKey = "w" | "l" | "gd" | "code";

function SwissTable({ all, teams }: { all: Match[]; teams: { code: string; name: string; image?: string | null; entry?: string }[] }) {
  const [key, setKey] = useState<SortKey>("w");
  const [dir, setDir] = useState<1 | -1>(-1);
  const rows = useMemo(() => {
    const rec = new Map(computeRecords(all, "Swiss").map((r) => [r.code, r]));
    const base = teams.filter((t) => t.entry === "Swiss").map((t) => {
      const r = rec.get(t.code);
      return { code: t.code, name: t.name, image: t.image, w: r?.w ?? 0, l: r?.l ?? 0, gd: (r?.gw ?? 0) - (r?.gl ?? 0) };
    });
    return base.sort((a, b) => {
      const v = key === "code" ? a.code.localeCompare(b.code) : a[key] - b[key];
      return (v || a.code.localeCompare(b.code)) * (key === "code" ? -dir : dir);
    });
  }, [all, teams, key, dir]);
  const head = (k: SortKey, label: string, tip: string) => (
    <th scope="col" className="px-3 py-2 text-left font-medium" aria-sort={key === k ? (dir === 1 ? "ascending" : "descending") : "none"}>
      <button title={tip} onClick={() => { if (key === k) setDir((d) => (d === 1 ? -1 : 1)); else { setKey(k); setDir(-1); } }} className="hover:text-snow">{label}{key === k ? (dir === 1 ? " ▲" : " ▼") : ""}</button>
    </th>
  );
  const played = all.filter((m) => m.stage === "Swiss" && m.state === "completed").length;
  return (
    <>
      {played === 0 && <p className="mb-3 rounded-lg border border-line bg-white/[0.03] p-3 text-sm text-fog">Swiss stage has not started. Every team shows 0-0 until official results arrive.</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Swiss stage records</caption>
          <thead className="border-b border-line text-xs uppercase tracking-wider text-fog"><tr>
            <th className="px-3 py-2 text-left font-medium">#</th>{head("code", "Team", "Sort by name")}{head("w", "W", "Series won")}{head("l", "L", "Series lost")}{head("gd", "Game diff", "Games won minus games lost")}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.code} className="border-b border-line/50 last:border-0 hover:bg-white/[0.03]">
                <td className="px-3 py-2 text-fog">{i + 1}</td>
                <td className="px-3 py-2"><Link href={`/teams/${r.code}`} className="flex items-center gap-2 hover:text-gold"><TeamLogo team={r} size={24} />{r.name}</Link></td>
                <td className="px-3 py-2 tabular-nums">{r.w}</td><td className="px-3 py-2 tabular-nums">{r.l}</td><td className="px-3 py-2 tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="mt-3 text-sm text-fog"><summary className="cursor-pointer">Format and tiebreakers</summary>
        <p className="mt-2">Swiss: teams play series against opponents with the same record until they reach the advancing or eliminated threshold set in the official rules. This table sorts by series wins, then losses, then game differential. That is a convenience sort, not Riot&apos;s official tiebreaker.</p></details>
    </>
  );
}

/** Pick a team (tap a team in any bracket card, or use the list) to see its whole Worlds path from official results. */
function TeamPath({ all, teams, pin, setPin, tz }: { all: Match[]; teams: { code: string; name: string }[]; pin: string | null; setPin: (c: string | null) => void; tz: string }) {
  const { t } = useT();
  const list = pin ? all.filter((m) => m.teams.some((x) => x.code === pin)).sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];
  return (
    <section className="card mt-8 p-5" aria-labelledby="tp">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tp" className="display text-2xl">{t("path.title")}</h2>
        <select aria-label={t("path.title")} value={pin ?? ""} onChange={(e) => setPin(e.target.value || null)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="">{t("path.pick")}</option>
          {[...teams].sort((a, b) => a.name.localeCompare(b.name)).filter((x) => x.code !== "TBD").map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
        </select>
      </div>
      {!pin ? <p className="mt-3 text-sm text-fog">{t("path.hint")}</p> : (
        <ol className="mt-4 grid gap-2">
          {list.map((m) => {
            const me = m.teams.find((x) => x.code === pin)!, opp = m.teams.find((x) => x !== me)!;
            const res = m.state === "completed" ? (me.outcome === "win" ? "W" : "L") : m.state === "live" ? "•" : "";
            return (
              <li key={m.id}><Link href={`/matches/${m.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm hover:border-gold">
                <span className="flex items-center gap-2"><span className={clsx("w-5 text-center font-semibold", res === "W" ? "text-gold" : res === "L" ? "text-ember" : "text-fog")}>{res}</span>vs {opp.code === "TBD" ? "TBD" : opp.name}</span>
                <span className="text-xs text-fog">{m.state === "completed" ? `${me.wins ?? 0}-${opp.wins ?? 0} · ` : ""}{m.stage} · {fmtDateTime(m.startTime, tz)}</span>
              </Link></li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-xs text-fog">{t("path.note")}</p>
    </section>
  );
}

export function StandingsView() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const [stage, setStage] = useState<(typeof STAGES)[number]>("Play-Ins");
  const [pin, setPin] = useState<string | null>(null);
  const ms = snap.matches.filter((m) => m.stage === stage);
  const live = snap.matches.some((m) => m.state === "live");
  void live;
  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Stage">{STAGES.map((s) => <Pill key={s} active={stage === s} onClick={() => setStage(s)}>{s}</Pill>)}</div>
      <SpoilerGate what="Standings and results">
      {stage === "Swiss" ? <><SwissBoard all={snap.matches} teams={snap.teams} /><SwissMatchups all={snap.matches} tz={prefs.tz} /><SwissTable all={snap.matches} teams={snap.teams.map((t) => ({ ...t, image: t.image }))} /></>
        : ms.length === 0 ? <Empty title={`No ${stage} matches published yet`} />
        : stage === "Play-Ins" ? <PlayIns ms={ms} tz={prefs.tz} hot={pin} setHot={setPin} /> : <Knockouts ms={ms} tz={prefs.tz} hot={pin} setHot={setPin} />}
      {stage !== "Swiss" && <div className="card mt-8 overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{stage} records</caption>
        <thead className="border-b border-line text-xs uppercase tracking-wider text-fog"><tr><th className="px-3 py-2 text-left">Team</th><th className="px-3 py-2 text-left">W</th><th className="px-3 py-2 text-left">L</th><th className="px-3 py-2 text-left">Games</th></tr></thead>
        <tbody>{computeRecords(snap.matches, stage).map((r) => <tr key={r.code} className="border-b border-line/50 last:border-0"><td className="px-3 py-2"><Link className="flex items-center gap-2 hover:text-gold" href={`/teams/${r.code}`}><TeamLogo team={r} size={22} />{r.name}</Link></td><td className="px-3 py-2 tabular-nums">{r.w}</td><td className="px-3 py-2 tabular-nums">{r.l}</td><td className="px-3 py-2 tabular-nums">{r.gw}-{r.gl}</td></tr>)}
          {computeRecords(snap.matches, stage).length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-fog">No completed matches yet.</td></tr>}</tbody></table></div>}
      <TeamPath all={snap.matches} teams={snap.teams} pin={pin} setPin={setPin} tz={prefs.tz} />
      {ms.some(hasTbd) && <p className="mt-3 text-xs text-fog">TBD slots are filled automatically as official results arrive.</p>}
      </SpoilerGate>
    </div>
  );
}
