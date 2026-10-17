"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSnapshot } from "./providers";
import { Countdown, Empty, StateBadge, TeamLogo } from "./ui";
import { fmtDateTime } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { usePrefs, useSpoiler, useT } from "@/lib/prefs";
import { ChampIcon } from "@/components/champ";
import { ROLE_LABEL, champName } from "@/lib/champions";
import { autoSummary } from "@/lib/recap-text";
import { hasTbd } from "@/lib/match-state";
import { MatchupPanel } from "@/components/form-panel";

export function MatchDetail({ id }: { id: string }) {
  const { snap } = useSnapshot();
  const { prefs, set } = usePrefs();
  const sp = useSpoiler();
  const { t: tr } = useT();
  const [shared, setShared] = useState(false);
  const [perm, setPerm] = useState<string>("default");
  useEffect(() => { const t = setTimeout(() => { if (typeof Notification !== "undefined") setPerm(Notification.permission); }, 0); return () => clearTimeout(t); }, []);
  const m = snap.matches.find((x) => x.id === id);
  const reminded = prefs.reminders.includes(id);
  // in-tab reminder: only works while the page is open, and the UI says so
  useEffect(() => {
    if (!m || !reminded || perm !== "granted") return;
    const at = new Date(m.startTime).getTime() - 10 * 60_000 - Date.now();
    if (at <= 0 || at > 2_147_000_000) return;
    const t = setTimeout(() => new Notification(`${m.teams[0].code} vs ${m.teams[1].code} starts in 10 minutes`, { body: m.block }), at);
    return () => clearTimeout(t);
  }, [reminded, perm, m]);

  if (!m) return <div className="mt-10"><Empty title="Match not found">It may not be scheduled yet. <Link className="underline" href="/matches">Back to matches</Link></Empty></div>;
  const share = (withScore: boolean) => {
    const url = new URL(`/matches/${m.id}`, window.location.origin);
    if (withScore) url.searchParams.set("score", "1");
    const done = () => { setShared(true); setTimeout(() => setShared(false), 1800); };
    if (navigator.share) navigator.share({ title: `${m.teams[0].code} vs ${m.teams[1].code}`, url: url.toString() }).catch(() => undefined);
    else navigator.clipboard?.writeText(url.toString()).then(done, () => undefined);
  };
  const tz = prefs.tz;
  const stats = snap.gameStats[m.id] ?? [];
  const recap = snap.recaps.find((r) => r.matchId === m.id);
  const summary = autoSummary(m);
  const pick = prefs.picks[m.id];

  const download = () => {
    const blob = new Blob([buildIcs([m], window.location.origin)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `worlds-2026-${m.teams[0].code}-vs-${m.teams[1].code}.ics`; a.click();
    URL.revokeObjectURL(a.href);
  };
  const remind = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") set({ reminders: [...new Set([...prefs.reminders, m.id])] });
  };
  return (
    <article className="pt-10">
      <p className="eyebrow mb-3"><Link href="/matches" className="hover:underline">Matches</Link> / {m.stage} / {m.block}</p>
      <div className="card p-6 sm:p-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-fog">
          <span>{fmtDateTime(m.startTime, tz)} · Best of {m.bestOf}</span>
          <StateBadge state={m.state} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {[m.teams[0], m.teams[1]].map((t, i) => (
            <div key={i} className={`flex flex-col items-center gap-3 text-center ${i === 1 ? "order-3" : "order-1"}`}>
              <TeamLogo team={t} size={96} />
              {t.code === "TBD" ? <p className="display text-2xl text-fog">To be decided</p> : <Link href={`/teams/${t.code}`} className="display text-2xl hover:text-gold sm:text-4xl">{t.name}</Link>}
            </div>
          ))}
          <div className="order-2 text-center">
            <p className="display text-5xl tabular-nums sm:text-7xl">{(m.state === "completed" || m.state === "live") && !sp.hidden(m.id) ? `${m.teams[0].wins ?? 0} : ${m.teams[1].wins ?? 0}` : "vs"}</p>
            {(m.state === "completed" || m.state === "live") && sp.hidden(m.id) && <button onClick={() => sp.reveal(m.id)} className="mt-3 rounded-full border border-gold/50 px-4 py-2 text-sm text-gold hover:bg-gold/10">Show result</button>}
            {m.state === "unverified" && <p className="mt-2 text-xs text-fog">Score hidden until the source confirms the status</p>}
          </div>
        </div>
        {m.state === "scheduled" && !hasTbd(m) && <div className="mt-8 flex justify-center"><Countdown target={m.startTime} /></div>}
        {m.source === "manual" && <p className="mt-6 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm text-gold">This match includes a manual admin correction. It is replaced automatically if the official source changes.</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {m.state === "scheduled" && <>
          <button onClick={download} className="rounded-full border border-line px-4 py-2 text-sm hover:border-gold hover:text-gold">Add to calendar (.ics)</button>
          {perm !== "denied" && !reminded && <button onClick={remind} className="rounded-full border border-line px-4 py-2 text-sm hover:border-gold hover:text-gold">Remind me 10 min before</button>}
          {reminded && <span className="rounded-full border border-gold/40 px-4 py-2 text-sm text-gold">Reminder on (works while this tab stays open)</span>}
        </>}
        {m.teams.every((t) => t.code !== "TBD") && <Link href={`/compare?a=${m.teams[0].code}&b=${m.teams[1].code}`} className="rounded-full border border-line px-4 py-2 text-sm hover:border-violet hover:text-violet">Head-to-head</Link>}
        <button onClick={() => share(false)} className="rounded-full border border-line px-4 py-2 text-sm hover:border-violet hover:text-violet">{shared ? tr("act.copied") : tr("act.share")}</button>
        {m.state === "completed" && <button onClick={() => share(true)} className="rounded-full border border-line px-4 py-2 text-sm hover:border-violet hover:text-violet">{tr("act.shareScore")}</button>}
        <a href={`/card/${m.id}${m.state === "completed" ? "?score=1" : ""}`} download={`worlds2026-${m.teams[0].code}-vs-${m.teams[1].code}.png`} className="rounded-full border border-line px-4 py-2 text-sm hover:border-violet hover:text-violet">{tr("act.downloadCard")}</a>
      </div>

      {!hasTbd(m) && <MatchupPanel a={m.teams[0].code} b={m.teams[1].code} />}

      {m.state !== "completed" && !hasTbd(m) && (
        <section className="card mt-6 p-6" aria-labelledby="pred">
          <h2 id="pred" className="display text-2xl">Your prediction</h2>
          <p className="mb-3 text-sm text-fog">A personal opinion saved on this device. It is not a forecast and not shared with anyone.</p>
          <div className="flex gap-2">
            {m.teams.map((t) => <button key={t.code} aria-pressed={pick === t.code} onClick={() => set({ picks: { ...prefs.picks, [m.id]: pick === t.code ? "" : t.code } })} className={`rounded-full border px-4 py-2 text-sm ${pick === t.code ? "border-gold bg-gold/10 text-gold" : "border-line text-fog hover:text-snow"}`}><span className="inline-flex items-center gap-2"><TeamLogo team={t} size={20} />{t.name}</span></button>)}
          </div>
        </section>
      )}

      {m.state === "completed" && !sp.hidden(m.id) && (
        <section className="card mt-6 p-6" aria-labelledby="rc">
          <h2 id="rc" className="display text-2xl">Recap</h2>
          {recap && <div className="mt-3"><p className="eyebrow">Editorial · {recap.author}</p><h3 className="mt-1 font-medium">{recap.title}</h3><p className="mt-2 whitespace-pre-line text-fog">{recap.body}</p></div>}
          {summary && <p className="mt-3 text-fog">{summary}</p>}
          <p className="mt-3 text-xs text-fog">Summary lines are generated from verified result data only. Editorial text is written by an admin and labeled as such.</p>
          {pick && pick !== "" && <p className="mt-3 text-sm">Your pick: <strong className={m.teams.find((t) => t.code === pick)?.outcome === "win" ? "text-gold" : "text-ember"}>{pick}</strong> {m.teams.find((t) => t.code === pick)?.outcome === "win" ? "was right" : "missed"}.</p>}
        </section>
      )}

      {!(sp.hidden(m.id) && m.state !== "scheduled") && (m.games.length > 0 || stats.length > 0) && (
        <section className="mt-6" aria-labelledby="games">
          <h2 id="games" className="display mb-3 text-2xl">Games</h2>
          <p className="mb-2 text-sm text-fog">Pick/ban order and bans: unavailable. Riot&apos;s public live stats feed does not include the draft, so none is shown.</p>
          <p className="mb-4 text-sm text-fog">Per-game winners are not published in the official schedule feed, so only the series score is shown as a result. Champions come from Riot&apos;s live stats feed. VODs are official broadcasts on YouTube.</p>
          <div className="grid gap-3">
            {(m.games.length ? m.games : stats.map((s) => ({ n: s.n, id: s.id, state: "completed", vods: [] }))).map((g) => {
              const s = stats.find((x) => x.id === g.id || x.n === g.n);
              const vod = g.vods.find((v) => v.locale.startsWith("en")) ?? g.vods[0];
              return (
                <div key={g.id} className="card p-4">
                  <div className="mb-2 flex items-center justify-between"><strong>Game {g.n}</strong>
                    <span className="flex items-center gap-3 text-xs text-fog">{s?.patch && <span>Patch {s.patch.split(".").slice(0, 2).join(".")}</span>}{vod && <a className="text-gold underline" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/watch?v=${encodeURIComponent(vod.parameter)}`}>Watch VOD</a>}<span>{g.state}</span></span>
                  </div>
                  {s?.sum ? <GoldLead sum={s.sum} blue={s.blue.team} red={s.red.team} live={g.state === "inProgress"} teams={m.teams} /> : s ? <p className="mb-2 text-xs text-fog">Gold and objectives: not available from the official feed for this game.</p> : null}
                  {s ? (
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      {([s.blue, s.red] as const).map((side, i) => (
                        <div key={i}><p className="mb-1 text-xs text-fog">{i === 0 ? "Blue" : "Red"} side · {side.team}</p>
                          <ul className="grid gap-0.5">{side.picks.map(([role, champ, player]) => <li key={role} className="flex items-center justify-between gap-2"><span><span className="inline-block w-14 text-fog">{ROLE_LABEL[role] ?? role}</span><ChampIcon id={champ} size={22} /> {champName(champ)}</span><span className="text-fog">{player}</span></li>)}</ul></div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-fog">Champion data not available for this game yet.</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <p className="mt-6 text-xs text-fog">MVP: not available. The official feed does not publish it, and we do not guess.</p>
    </article>
  );
}

function fmtGold(n: number) { return `${(n / 1000).toFixed(1)}k`; }
function GoldLead({ sum, blue, red, live, teams }: { sum: import("@/lib/types").GameSum; blue: string; red: string; live: boolean; teams: { code: string; name: string }[] }) {
  const diff = sum.blue.gold - sum.red.gold;
  const nm = (c: string) => teams.find((t) => t.code === c)?.name ?? c;
  const lead = diff === 0 ? "Gold is even" : `${nm(diff > 0 ? blue : red)} lead by ${fmtGold(Math.abs(diff))} gold`;
  const total = sum.blue.gold + sum.red.gold || 1;
  const row = (label: string, a: string | number, b: string | number) => <tr><td className="py-0.5 pr-3 text-left tabular-nums">{a}</td><th scope="row" className="px-2 text-xs font-normal text-fog">{label}</th><td className="py-0.5 pl-3 text-right tabular-nums">{b}</td></tr>;
  return (
    <div className="mb-3 rounded-lg border border-line bg-white/[0.02] p-3 text-sm">
      <p className="mb-1 flex flex-wrap justify-between gap-2"><strong>{lead}</strong><span className="text-xs text-fog">{live ? "Live, latest frame" : sum.state === "finished" ? "Final frame" : "Last frame received"} · {new Date(sum.at).toISOString().slice(11, 19)} UTC</span></p>
      <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Blue ${fmtGold(sum.blue.gold)} gold, red ${fmtGold(sum.red.gold)} gold`}><div className="bg-sky-400" style={{ width: `${(sum.blue.gold / total) * 100}%` }} /><div className="flex-1 bg-rose-400" /></div>
      <table className="w-full"><caption className="sr-only">Team totals, blue side {blue}, red side {red}</caption><tbody>
        {row("Gold", fmtGold(sum.blue.gold), fmtGold(sum.red.gold))}{row("Kills", sum.blue.kills, sum.red.kills)}{row("Towers", sum.blue.towers, sum.red.towers)}{row("Dragons", sum.blue.dragons.length, sum.red.dragons.length)}{row("Barons", sum.blue.barons, sum.red.barons)}
      </tbody></table>
    </div>
  );
}
