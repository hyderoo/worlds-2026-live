"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { useSnapshot } from "./providers";
import { Countdown, Empty, MatchCard, Section, StateBadge, TeamLogo } from "./ui";
import { currentStage, hasTbd, nextMatch, stageProgress } from "@/lib/match-state";
import { fmtDateTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { HeroTrophy } from "@/components/hero-trophy";
import { PrizePoolCard } from "@/components/prize-pool";

const STAGES = ["Play-Ins", "Swiss", "Knockouts"];

export function HomeView() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const tz = prefs.tz;
  const live = snap.matches.filter((m) => m.state === "live");
  const next = nextMatch(snap.matches);
  const stage = currentStage(snap.matches);
  const results = snap.matches.filter((m) => m.state === "completed").slice(-4).reverse();
  const upcoming = snap.matches.filter((m) => m.state === "scheduled" && !hasTbd(m)).slice(0, 4);
  const unverified = snap.matches.filter((m) => m.state === "unverified");
  const mine = snap.matches.filter((m) => m.state !== "completed" && m.teams.some((t) => prefs.watch.includes(t.code))).slice(0, 4);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-night via-surface to-ink px-6 py-14 sm:px-12 sm:py-20 mt-6">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-violet/20 blur-3xl" />
        <motion.div className="relative grid items-center gap-10 lg:grid-cols-[1fr_20rem]" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
          <div>
          <p className="eyebrow mb-4">League of Legends World Championship</p>
          <h1 className="display text-6xl sm:text-8xl">Worlds <span className="text-gold">2026</span></h1>
          <p className="mt-5 max-w-xl text-lg text-fog">Schedule, results and recaps straight from the official LoL Esports feed. Times in {tz === "Asia/Jakarta" ? "WIB" : "your chosen zone"}.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-gold">Now: {stage}</span>
            {snap.prize && <span className="rounded-full border border-line px-3 py-1 text-fog">Prize pool: ${snap.prize.totalUsd.toLocaleString("en-US")} (unofficial)</span>}
            {STAGES.map((s) => {
              const p = stageProgress(snap.matches, s);
              return <span key={s} className="rounded-full border border-line px-3 py-1 text-fog">{s}: {p.done}/{p.total} played</span>;
            })}
          </div>
          </div>
          <div className="order-first mx-auto w-56 lg:order-none lg:w-full"><HeroTrophy /></div>
        </motion.div>
      </section>

      <PrizePoolCard prize={snap.prize} />

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="card p-6 lg:col-span-3">
          {live.length > 0 ? (
            <>
              <p className="eyebrow mb-3 !text-ember">Live now</p>
              <div className="grid gap-3">{live.map((m) => <MatchCard key={m.id} m={m} tz={tz} />)}</div>
            </>
          ) : next ? (
            <>
              <p className="eyebrow mb-3">Next verified match</p>
              <Link href={`/matches/${next.id}`} className="group block">
                <div className="flex items-center gap-6">
                  {next.teams.map((t, i) => (
                    <div key={i} className="flex items-center gap-4">
                      {i === 1 && <span className="display text-2xl text-fog">vs</span>}
                      <TeamLogo team={t} size={64} />
                      <span className="display text-3xl sm:text-4xl">{t.code}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-fog">{fmtDateTime(next.startTime, tz)} · {next.block} · Bo{next.bestOf}</p>
              </Link>
              <div className="mt-6"><Countdown target={next.startTime} /></div>
            </>
          ) : (
            <Empty title="No upcoming match with confirmed teams">Teams for the next rounds are decided by results. This updates automatically.</Empty>
          )}
        </div>
        <div className="card p-6 lg:col-span-2">
          <p className="eyebrow mb-3">Coming up</p>
          <ul className="grid gap-3">
            {upcoming.length === 0 && <li className="text-sm text-fog">Nothing with confirmed teams yet.</li>}
            {upcoming.map((m) => (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-white/5">
                  <span className="flex items-center gap-2"><TeamLogo team={m.teams[0]} size={24} />{m.teams[0].code}<span className="text-fog">vs</span><TeamLogo team={m.teams[1]} size={24} />{m.teams[1].code}</span>
                  <span className="text-xs text-fog">{fmtDateTime(m.startTime, tz)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {mine.length > 0 && (
            <>
              <p className="eyebrow mb-2 mt-6">Your teams</p>
              <ul className="grid gap-1 text-sm">
                {mine.map((m) => <li key={m.id}><Link className="hover:text-gold" href={`/matches/${m.id}`}>{m.teams[0].code} vs {m.teams[1].code} · {fmtDateTime(m.startTime, tz)}</Link></li>)}
              </ul>
            </>
          )}
        </div>
      </div>

      {unverified.length > 0 && (
        <div role="note" className="mt-4 rounded-xl border border-line bg-white/[0.03] p-4 text-sm text-fog">
          <StateBadge state="unverified" /> <span className="ml-2">{unverified.length === 1 ? "One match reports a status that does not fit its schedule" : `${unverified.length} matches report a status that does not fit the schedule`} ({unverified.map((m) => `${m.teams[0].code} vs ${m.teams[1].code}`).join(", ")}). We only show it as live or final once the source confirms it.</span>
        </div>
      )}

      <Section eyebrow="Latest" title="Results" action={<Link href="/matches?status=completed" className="text-sm text-gold hover:underline">All results</Link>}>
        {results.length === 0 ? <Empty title="No finished matches yet" /> : (
          <div className="grid gap-4 sm:grid-cols-2">{results.map((m) => <MatchCard key={m.id} m={m} tz={tz} />)}</div>
        )}
      </Section>

      <Section eyebrow="Explore" title="Everything Worlds">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["/matches", "Match center", "Filter, search and switch to calendar view."],
            ["/standings", "Bracket and standings", "Play-In bracket, Swiss table, knockouts."],
            ["/teams", "Teams", "Profiles, rosters, head-to-head."],
            ["/recaps", "Recaps", "Game-by-game results and champions."],
          ].map(([href, t, d]) => (
            <Link key={href} href={href!} className="card p-5 transition hover:border-violet-dim hover:bg-white/[0.04]">
              <p className="display text-2xl">{t}</p>
              <p className="mt-1 text-sm text-fog">{d}</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
