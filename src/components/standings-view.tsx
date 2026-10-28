"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { useSnapshot } from "./providers";
import { Empty, Pill, SpoilerGate, StateBadge, TeamLogo } from "./ui";
import { sortStandingsRows, computeRecords, hasTbd, playInWinner, swissField, type StandingsSortKey } from "@/lib/match-state";
import { fmtDateTime } from "@/lib/format";
import { usePrefs, useT } from "@/lib/prefs";
import { swissStatus, waitingForSwissDraw } from "@/lib/swiss-progress";
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



/** Bucket structure of a 16-team Swiss (3 wins advance, 3 losses out): derived from the rules, not from any pairing guess. */
const SWISS_ROUNDS: { key: string; slots: number }[][] = [
  [{ key: "0-0", slots: 8 }],
  [{ key: "1-0", slots: 4 }, { key: "0-1", slots: 4 }],
  [{ key: "2-0", slots: 2 }, { key: "1-1", slots: 4 }, { key: "0-2", slots: 2 }],
  [{ key: "2-1", slots: 3 }, { key: "1-2", slots: 3 }],
  [{ key: "2-2", slots: 3 }],
];

/** Swiss as a bracket: one column per round, one lane per W-L record. Only official pairings are filled; the rest are placeholders. */
function SwissBracket({ all, tz }: { all: Match[]; tz: string }) {
  const { lang } = useT();
  const id = lang === "id";
  const swiss = all.filter((m) => m.stage === "Swiss").sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (swiss.length === 0) return null;
  const records = computeRecords(all, "Swiss");
  const qualified = records.filter((r) => swissStatus(r.w, r.l) === "qualified");
  const eliminated = records.filter((r) => swissStatus(r.w, r.l) === "eliminated");
  const done = swiss.filter((m) => m.state === "completed");
  const rec = (code: string, before: string) => {
    let w = 0, l = 0;
    for (const m of done) { if (m.startTime >= before) continue; const t = m.teams.find((x) => x.code === code); if (t?.outcome === "win") w++; else if (t?.outcome === "loss") l++; }
    return `${w}-${l}`;
  };
  const lane = new Map<string, Match[]>();
  for (const m of swiss) {
    if (hasTbd(m)) continue;
    const k = rec(m.teams[0]!.code, m.startTime);
    lane.set(k, [...(lane.get(k) ?? []), m]);
  }
  const names = [id ? "Ronde 1" : "Round 1", id ? "Ronde 2" : "Round 2", id ? "Ronde 3" : "Round 3", id ? "Ronde 4" : "Round 4", id ? "Ronde 5" : "Round 5"];
  const sub = (k: string) => { const [w, l] = k.split("-").map(Number) as [number, number]; return { win: w + 1 === 3 ? "3-" + l + (id ? " lolos" : " qualified") : `${w + 1}-${l}`, lose: l + 1 === 3 ? w + "-3" + (id ? " tersingkir" : " out") : `${w}-${l + 1}` }; };
  return (
    <section className="mb-8" aria-labelledby="sw-matchups">
      <h2 id="sw-matchups" className="display mb-1 text-2xl">{id ? "Bracket Swiss" : "Swiss bracket"}</h2>
      <p className="mb-4 text-sm text-fog">{id ? "Pairing diisi dari feed resmi lolesports. Kalau draw ronde terbaru sudah berlangsung dan pairingnya kami verifikasi dari rekaman draw show, tapi feed resmi belum memuatnya, slot itu ditandai 'draw terverifikasi' dan otomatis diganti begitu feed terbit. Slot kosong menunggu hasil ronde sebelumnya, tidak ada yang ditebak. Jumlah slot per rekor dihitung dari aturan 16 tim, 3 menang lolos, 3 kalah tersingkir." : "Pairings come from the official lolesports feed. When the latest round's draw has taken place and we verified the pairings against draw show footage, but the official feed has not published them yet, those slots are marked 'verified draw' and replaced automatically once the feed catches up. Open slots wait for the previous round; nothing is guessed. Slot counts per record follow from the 16-team, 3-win, 3-loss rules."}</p>
      <div role="region" aria-label="Swiss bracket" tabIndex={0} className="-mx-4 snap-x overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-stretch gap-0">
          {SWISS_ROUNDS.map((round, ri) => (
            <div key={ri} className="relative flex w-[15.5rem] shrink-0 snap-start flex-col pr-9 sm:w-64">
              <p className="eyebrow mb-3">{names[ri]}</p>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {round.map((g) => {
                  const ms = lane.get(g.key) ?? [];
                  const ghosts = Math.max(0, g.slots - ms.length);
                  const { win, lose } = sub(g.key);
                  const waiting = waitingForSwissDraw(all, g.key, ms);
                  // Published feed formats for named matches; later Swiss slots are all Bo3.
                  const formats = [...new Set(ms.map((m) => m.bestOf))];
                  const format = formats.length === 1 ? `BO${formats[0]}` : formats.length > 1 ? formats.map((n) => `BO${n}`).join(" / ") : ri >= 3 ? "BO3" : "";
                  return (
                    <div key={g.key} className="relative rounded-xl border border-line bg-white/[0.02] p-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="shrink-0 whitespace-nowrap rounded-full border border-violet-dim/60 bg-violet/15 px-2 py-0.5 text-xs font-semibold tabular-nums">{g.key}</span>
                        <span className="truncate pl-2 text-[0.68rem] text-fog">{(() => { const seeded = ms.filter((m) => m.source === "seed").length; return seeded > 0
                          ? <>{ms.length - seeded}/{g.slots} {id ? "feed" : "feed"} · {seeded} {id ? "draw terverifikasi" : "verified draw"}</>
                          : <>{ms.length}/{g.slots} {id ? "resmi" : "official"}</>; })()}</span>
                      </div>
                      {format && <p className="mb-2 text-[0.68rem] font-semibold tracking-wide text-gold/90">{format}</p>}
                      <div className="grid gap-1.5">
                        {ms.map((m) => (
                          <Link key={m.id} href={`/matches/${m.id}`} className={clsx("block rounded-lg border bg-ink/40 px-2 py-1.5 text-sm transition hover:border-violet-dim", m.source === "seed" ? "border-dashed border-gold/40" : "border-line")}>
                            <time dateTime={m.startTime} className="mb-1 block text-[0.68rem] leading-relaxed text-fog">{fmtDateTime(m.startTime, tz)} · BO{m.bestOf}</time>
                            {m.source === "seed" && <span className="block pb-0.5 text-[0.6rem] uppercase tracking-wider text-gold/70">{id ? "draw terverifikasi - belum di feed resmi" : "verified draw - not in the official feed yet"}</span>}
                            {m.teams.map((t, i) => (
                              <div key={i} className={clsx("flex items-center justify-between py-0.5", m.state === "completed" && t.outcome === "loss" && "opacity-50")}>
                                <span className="flex items-center gap-2"><TeamLogo team={t} size={18} /><span className={clsx(t.outcome === "win" && "text-gold")}>{t.code}</span></span>
                                <span className="text-xs tabular-nums text-fog">{m.state === "completed" || m.state === "live" ? t.wins ?? 0 : ""}</span>
                              </div>
                            ))}
                          </Link>
                        ))}
                        {waiting.length > 0 && <div className="rounded-lg border border-dashed border-gold/30 bg-gold/5 p-2">
                          <p className="mb-1.5 text-[0.65rem] leading-snug text-fog">{id ? "Sudah di rekor ini · menunggu draw" : "At this record · awaiting draw"}</p>
                          <div className="flex flex-wrap gap-1.5">{waiting.map((r) => <Link key={r.code} href={`/teams/${r.code}`} title={r.name} className="flex items-center gap-1 rounded border border-line px-1.5 py-1 text-xs"><TeamLogo team={r} size={16} />{r.code}</Link>)}</div>
                          <p className="mt-1.5 text-[0.6rem] leading-snug text-fog">{id ? "Lawan belum diumumkan, bukan pasangan match." : "Opponents not announced. These are not match pairings."}</p>
                        </div>}
                        {ghosts > 0 && (
                          <div className="flex items-center justify-between rounded-lg border border-dashed border-line px-2 py-1.5 text-xs text-fog">
                            <span>{ms.length === 0 ? (id ? "Belum diumumkan" : "Not announced yet") : (id ? "Belum diumumkan" : "Not announced")}</span>
                            <span className="tabular-nums">{ghosts} {id ? "seri" : ghosts === 1 ? "series" : "series"}</span>
                          </div>
                        )}
                      </div>
                      {ri < 4 && (
                        <div className="mt-2 flex justify-between text-[0.65rem] text-fog"><span className="text-gold/80">W → {win}</span><span>L → {lose}</span></div>
                      )}
                      {ri < 4 && <span aria-hidden className="absolute -right-9 top-1/2 h-px w-9 bg-gradient-to-r from-violet-dim to-line" />}
                    </div>
                  );
                })}
              </div>
              {ri < 4 && <span aria-hidden className="absolute right-0 top-10 bottom-4 w-px bg-line" />}
            </div>
          ))}
          <div className="flex w-56 shrink-0 flex-col justify-center gap-4 pl-2 pt-8">
            <div className="rounded-xl border border-gold/50 bg-gold/5 p-3 text-sm"><p className="text-xs uppercase tracking-wider text-gold">{id ? "Lolos ke knockout" : "Advance to knockouts"}</p><p className="mt-1 text-xs text-fog">{qualified.length}/8 · 3-0, 3-1, 3-2</p><div className="mt-2 grid gap-2">{qualified.map((r) => <Link key={r.code} href={`/teams/${r.code}`} title={r.name} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-1.5"><TeamLogo team={r} size={18} />{r.code}</span><span className="text-gold">{r.w}-{r.l} · {id ? "Lolos" : "Qualified"}</span></Link>)}{qualified.length === 0 && <p className="text-xs text-fog">{id ? "Belum ada tim lolos" : "No teams qualified yet"}</p>}</div></div>
            <div className="rounded-xl border border-line p-3 text-sm opacity-80"><p className="text-xs uppercase tracking-wider text-fog">{id ? "Tersingkir" : "Eliminated"}</p><p className="mt-1 text-xs text-fog">0-3, 1-3, 2-3</p><div className="mt-2 grid gap-2">{eliminated.map((r) => <Link key={r.code} href={`/teams/${r.code}`} title={r.name} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-1.5"><TeamLogo team={r} size={18} />{r.code}</span><span>{r.w}-{r.l}</span></Link>)}{eliminated.length === 0 && <p className="text-xs text-fog">{id ? "Belum ada tim tersingkir" : "No teams eliminated yet"}</p>}</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Swiss progress board: where each team sits by official W-L record. No pairings are invented; they appear once the schedule names both teams. */
function SwissBoard({ all, teams }: { all: Match[]; teams: { code: string; name: string; entry?: string; image?: string | null }[] }) {
  const swiss = all.filter((m) => m.stage === "Swiss");
  const recs = new Map(computeRecords(all, "Swiss").map((r) => [r.code, r]));
  const winner = playInWinner(all, teams);
  const field = swissField(all, teams);
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
                {k === "0-0" && !winner && <span className="rounded-md border border-dashed border-line px-1.5 py-0.5 text-xs text-fog" title="Decided by the Play-In">Play-In winner (TBD)</span>}</div>
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

type SortKey = StandingsSortKey;

function SwissTable({ all, teams }: { all: Match[]; teams: { code: string; name: string; image?: string | null; entry?: string }[] }) {
  const { lang } = useT();
  const id = lang === "id";
  const [key, setKey] = useState<SortKey>("w");
  const [dir, setDir] = useState<1 | -1>(-1);
  const rows = useMemo(() => {
    const rec = new Map(computeRecords(all, "Swiss").map((r) => [r.code, r]));
    const base = swissField(all, teams).map((t) => {
      const r = rec.get(t.code);
      return { code: t.code, name: t.name, image: t.image, w: r?.w ?? 0, l: r?.l ?? 0, gd: (r?.gw ?? 0) - (r?.gl ?? 0) };
    });
    return sortStandingsRows(base, key, dir);
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
            <th className="px-3 py-2 text-left font-medium">#</th>{head("code", "Team", "Sort by name")}{head("w", "W", "Series won")}{head("l", "L", "Series lost")}{head("gd", "Game diff", "Games won minus games lost")}<th scope="col" className="px-3 py-2 text-left font-medium">Status</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.code} className="border-b border-line/50 last:border-0 hover:bg-white/[0.03]">
                <td className="px-3 py-2 text-fog">{i + 1}</td>
                <td className="px-3 py-2"><Link href={`/teams/${r.code}`} className="flex items-center gap-2 hover:text-gold"><TeamLogo team={r} size={24} />{r.name}</Link></td>
                <td className="px-3 py-2 tabular-nums">{r.w}</td><td className="px-3 py-2 tabular-nums">{r.l}</td><td className="px-3 py-2 tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{swissStatus(r.w, r.l) === "qualified" ? <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-1 text-gold">{id ? "Lolos ke knockout" : "Qualified for knockouts"}</span> : swissStatus(r.w, r.l) === "eliminated" ? <span className="text-fog">{id ? "Tersingkir" : "Eliminated"}</span> : <span className="text-fog">{id ? "Masih di Swiss" : "In Swiss"}</span>}</td>
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
      {stage === "Swiss" ? <><SwissBoard all={snap.matches} teams={snap.teams} /><SwissBracket all={snap.matches} tz={prefs.tz} /><SwissTable all={snap.matches} teams={snap.teams.map((t) => ({ ...t, image: t.image }))} /></>
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
