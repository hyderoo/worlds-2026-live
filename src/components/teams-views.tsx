"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSnapshot } from "./providers";
import { Empty, MatchCard, Pill, Section, SpoilerGate, TeamLogo } from "./ui";
import { computeRecords } from "@/lib/match-state";
import { usePrefs } from "@/lib/prefs";
import { REGIONS, REGION_BY_LEAGUE } from "@/lib/regions";
import { ROLE_LABEL } from "@/lib/champions";
import type { Match, Team } from "@/lib/types";
import { NotifyPanel } from "@/components/notify-panel";
import { TeamDetails } from "@/components/team-details";
import { MatchupPanel, TeamForm } from "@/components/form-panel";

const involves = (m: Match, code: string) => m.teams.some((t) => t.code === code);

export function TeamsView() {
  const { snap } = useSnapshot();
  const { prefs, toggleWatch } = usePrefs();
  const [region, setRegion] = useState("all");
  const [q, setQ] = useState("");
  const teams = snap.teams.filter((t) => (region === "all" || REGION_BY_LEAGUE[t.league ?? ""] === region) && (!q || `${t.name} ${t.code}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="mt-6">
      <NotifyPanel />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input aria-label="Search teams" placeholder="Search teams…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        <Pill active={region === "all"} onClick={() => setRegion("all")}>All</Pill>
        {REGIONS.map((r) => <Pill key={r} active={region === r} onClick={() => setRegion(r)}>{r}</Pill>)}
      </div>
      {teams.length === 0 ? <Empty title="No teams match" /> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const on = prefs.watch.includes(t.code);
            return (
              <li key={t.code} className="card flex items-center justify-between gap-3 p-4">
                <Link href={`/teams/${t.code}`} className="flex min-w-0 items-center gap-4 hover:text-gold"><TeamLogo team={t} size={48} /><span className="min-w-0"><span className="block truncate font-medium">{t.name}</span><span className="text-xs text-fog">{REGION_BY_LEAGUE[t.league ?? ""] ?? t.league} · {t.entry === "Play-In" ? "Play-In" : "Swiss stage"}</span></span></Link>
                <button aria-pressed={on} aria-label={on ? `Unfollow ${t.name}` : `Follow ${t.name}`} onClick={() => toggleWatch(t.code)} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-gold text-gold" : "border-line text-fog hover:text-snow"}`}>{on ? "Following" : "Follow"}</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function TeamProfile({ code }: { code: string }) {
  const { snap } = useSnapshot();
  const { prefs, toggleWatch } = usePrefs();
  const t = snap.teams.find((x) => x.code === code);
  if (!t) return <div className="mt-10"><Empty title="Team not found"><Link className="underline" href="/teams">All teams</Link></Empty></div>;
  const ms = snap.matches.filter((m) => involves(m, code));
  const done = ms.filter((m) => m.state === "completed").reverse();
  const next = ms.filter((m) => m.state === "scheduled" || m.state === "live");
  const rec = computeRecords(snap.matches).find((r) => r.code === code);
  const on = prefs.watch.includes(code);
  return (
    <article className="pt-5 sm:pt-10">
      <div className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:gap-6 sm:p-10">
        <div className="shrink-0 sm:hidden"><TeamLogo team={t} size={64} /></div>
        <div className="hidden shrink-0 sm:block"><TeamLogo team={t} size={96} /></div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">{REGION_BY_LEAGUE[t.league ?? ""] ?? t.league} · {t.league}</p>
          <h1 className="display text-3xl leading-tight sm:text-6xl">{t.name}</h1>
          <p className="mt-1 text-sm text-fog sm:mt-2 sm:text-base">Qualified into the {t.entry === "Play-In" ? "Play-In stage" : "Swiss stage"}.</p>
        </div>
        <button aria-pressed={on} onClick={() => toggleWatch(code)} className={`w-full rounded-full border px-5 py-2 text-sm sm:w-auto ${on ? "border-gold bg-gold/10 text-gold" : "border-line hover:text-gold"}`}>{on ? "Following" : "Follow team"}</button>
      </div>
      <div className="mt-4"><SpoilerGate what="Records"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[["Series won", rec?.w ?? 0], ["Series lost", rec?.l ?? 0], ["Games won", rec?.gw ?? 0], ["Games lost", rec?.gl ?? 0]].map(([l, v]) => (
          <div key={l as string} className="card p-4 sm:p-5"><p className="display text-3xl tabular-nums sm:text-4xl">{v}</p><p className="eyebrow !text-fog">{l}</p></div>
        ))}
      </div></SpoilerGate></div>
      <TeamForm code={code} />
      {t.players && t.players.length > 0 && (
        <Section eyebrow="Roster" title="Players">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">{t.players.map((p) => <li key={p.role} className="card overflow-hidden p-3 sm:p-4">{p.photo ? <PlayerPhoto src={p.photo} name={p.name} /> : null}<p className="eyebrow !text-fog">{ROLE_LABEL[p.role] ?? p.role}</p><p className="mt-1 font-medium">{p.name}</p>{p.official === false && <p className="text-xs text-fog">unconfirmed</p>}</li>)}</ul>
          <p className="mt-2 text-xs text-fog">Roster and player photos from Riot team data (a player without a published photo shows none); players marked unconfirmed are not verified as the starting five.</p>
        </Section>
      )}
      <TeamDetails team={t} stats={snap.gameStats} />
      {next.length > 0 && <Section eyebrow="Schedule" title="Upcoming"><div className="grid gap-4 sm:grid-cols-2">{next.map((m) => <MatchCard key={m.id} m={m} tz={prefs.tz} />)}</div></Section>}
      <Section eyebrow="History" title="Results"><SpoilerGate what="Results">{done.length === 0 ? <Empty title="No finished matches yet" /> : <div className="grid gap-4 sm:grid-cols-2">{done.map((m) => <MatchCard key={m.id} m={m} tz={prefs.tz} />)}</div>}</SpoilerGate></Section>
      <p className="mt-8"><Link className="text-gold underline" href={`/compare?a=${code}`}>Compare with another team</Link></p>
    </article>
  );
}

function Stat({ label, a, b }: { label: string; a: number | string; b: number | string }) {
  return <div className="grid grid-cols-3 items-center border-b border-line/50 py-3 text-center last:border-0"><span className="display text-2xl tabular-nums">{a}</span><span className="text-xs uppercase tracking-wider text-fog">{label}</span><span className="display text-2xl tabular-nums">{b}</span></div>;
}

export function CompareView({ a: ia, b: ib }: { a?: string; b?: string }) {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const [a, setA] = useState(ia ?? "");
  const [b, setB] = useState(ib ?? "");
  const ta = snap.teams.find((t) => t.code === a), tb = snap.teams.find((t) => t.code === b);
  const recs = useMemo(() => new Map(computeRecords(snap.matches).map((r) => [r.code, r])), [snap.matches]);
  const h2h = snap.matches.filter((m) => a && b && involves(m, a) && involves(m, b));
  const sel = (v: string, set: (s: string) => void, label: string) => (
    <select aria-label={label} value={v} onChange={(e) => { set(e.target.value); const u = new URL(window.location.href); u.searchParams.set(label === "Team A" ? "a" : "b", e.target.value); window.history.replaceState(null, "", u); }} className="rounded-lg border border-line bg-surface px-3 py-2">
      <option value="">{label}</option>{snap.teams.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
    </select>
  );
  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap gap-3">{sel(a, setA, "Team A")}{sel(b, setB, "Team B")}</div>
      {!ta || !tb ? <Empty title="Pick two teams">Stats use verified Worlds 2026 results only.</Empty> : (
        <SpoilerGate what="Head-to-head results">
          <div className="card grid grid-cols-3 items-center p-6 text-center">
            <div className="grid justify-items-center gap-2"><TeamLogo team={ta} size={72} /><span className="display text-2xl">{ta.name}</span></div>
            <span className="display text-3xl text-fog">vs</span>
            <div className="grid justify-items-center gap-2"><TeamLogo team={tb} size={72} /><span className="display text-2xl">{tb.name}</span></div>
          </div>
          <div className="card mt-4 px-6 py-2">
            <Stat label="Series won" a={recs.get(a)?.w ?? 0} b={recs.get(b)?.w ?? 0} />
            <Stat label="Series lost" a={recs.get(a)?.l ?? 0} b={recs.get(b)?.l ?? 0} />
            <Stat label="Games won" a={recs.get(a)?.gw ?? 0} b={recs.get(b)?.gw ?? 0} />
            <Stat label="Games lost" a={recs.get(a)?.gl ?? 0} b={recs.get(b)?.gl ?? 0} />
          </div>
          <MatchupPanel a={a} b={b} />
        </SpoilerGate>
      )}
    </div>
  );
}
export type { Team };

/** Official Riot player photo. Hides itself if the image fails to load; the name stays on the card. */
function PlayerPhoto({ src, name }: { src: string; name: string }) {
  const [bad, setBad] = useState(false);
  if (bad) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`${name}, player photo`} width={392} height={310} loading="lazy" decoding="async" onError={() => setBad(true)} className="mb-3 aspect-[5/4] w-full rounded-lg bg-raise object-cover object-top" />;
}
