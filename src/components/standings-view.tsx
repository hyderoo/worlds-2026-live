"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { useSnapshot } from "./providers";
import { Empty, Pill, SpoilerGate, StateBadge, TeamLogo } from "./ui";
import { computeRecords, hasTbd } from "@/lib/match-state";
import { fmtDateTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import type { Match } from "@/lib/types";

const STAGES = ["Play-Ins", "Swiss", "Knockouts"] as const;

function BracketCard({ m, tz, hot, setHot, note }: { m: Match; tz: string; hot: string | null; setHot: (c: string | null) => void; note?: string }) {
  return (
    <Link href={`/matches/${m.id}`} className="card block w-60 shrink-0 p-3 text-sm transition hover:border-violet-dim">
      <div className="mb-2 flex items-center justify-between text-[0.7rem] text-fog"><span>{fmtDateTime(m.startTime, tz)}</span><StateBadge state={m.state} /></div>
      {m.teams.map((t, i) => (
        <div key={i} onMouseEnter={() => t.code !== "TBD" && setHot(t.code)} onMouseLeave={() => setHot(null)} onFocus={() => t.code !== "TBD" && setHot(t.code)} onBlur={() => setHot(null)}
          className={clsx("flex items-center justify-between rounded-md px-1.5 py-1", hot === t.code && "bg-violet/15", m.state === "completed" && t.outcome === "loss" && "opacity-50")}>
          <span className="flex items-center gap-2"><TeamLogo team={t} size={22} /><span className={clsx(t.outcome === "win" && "text-gold")}>{t.code === "TBD" ? "TBD" : t.code}</span></span>
          <span className="tabular-nums">{m.state === "completed" || m.state === "live" ? t.wins ?? 0 : "–"}</span>
        </div>
      ))}
      {note && <p className="mt-2 text-[0.68rem] leading-snug text-fog">{note}</p>}
    </Link>
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

function PlayIns({ ms, tz }: { ms: Match[]; tz: string }) {
  const [hot, setHot] = useState<string | null>(null);
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

function Knockouts({ ms, tz }: { ms: Match[]; tz: string }) {
  const [hot, setHot] = useState<string | null>(null);
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

export function StandingsView() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const [stage, setStage] = useState<(typeof STAGES)[number]>("Play-Ins");
  const ms = snap.matches.filter((m) => m.stage === stage);
  const live = snap.matches.some((m) => m.state === "live");
  void live;
  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Stage">{STAGES.map((s) => <Pill key={s} active={stage === s} onClick={() => setStage(s)}>{s}</Pill>)}</div>
      <SpoilerGate what="Standings and results">
      {stage === "Swiss" ? <SwissTable all={snap.matches} teams={snap.teams.map((t) => ({ ...t, image: t.image }))} />
        : ms.length === 0 ? <Empty title={`No ${stage} matches published yet`} />
        : stage === "Play-Ins" ? <PlayIns ms={ms} tz={prefs.tz} /> : <Knockouts ms={ms} tz={prefs.tz} />}
      {stage !== "Swiss" && <div className="card mt-8 overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{stage} records</caption>
        <thead className="border-b border-line text-xs uppercase tracking-wider text-fog"><tr><th className="px-3 py-2 text-left">Team</th><th className="px-3 py-2 text-left">W</th><th className="px-3 py-2 text-left">L</th><th className="px-3 py-2 text-left">Games</th></tr></thead>
        <tbody>{computeRecords(snap.matches, stage).map((r) => <tr key={r.code} className="border-b border-line/50 last:border-0"><td className="px-3 py-2"><Link className="flex items-center gap-2 hover:text-gold" href={`/teams/${r.code}`}><TeamLogo team={r} size={22} />{r.name}</Link></td><td className="px-3 py-2 tabular-nums">{r.w}</td><td className="px-3 py-2 tabular-nums">{r.l}</td><td className="px-3 py-2 tabular-nums">{r.gw}-{r.gl}</td></tr>)}
          {computeRecords(snap.matches, stage).length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-fog">No completed matches yet.</td></tr>}</tbody></table></div>}
      {ms.some(hasTbd) && <p className="mt-3 text-xs text-fog">TBD slots are filled automatically as official results arrive.</p>}
      </SpoilerGate>
    </div>
  );
}
