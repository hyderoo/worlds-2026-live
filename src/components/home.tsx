"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { useSnapshot } from "./providers";
import { Countdown, Empty, MatchCard, Section, StateBadge, TeamLogo } from "./ui";
import { currentStage, hasTbd, nextMatch, stageProgress } from "@/lib/match-state";
import { fmtDateTime, fmtDateTimeShort, tzLabel } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { HeroArtwork, HeroArtworkDesktop } from "@/components/hero-artwork";
import { FirestarterSection } from "@/components/firestarter-section";
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
      {/* Mobile hero: compact card, artwork banner on top, chip plays the MV in the artwork (keeps f3c1ceb). */}
      <section className="mt-4 rounded-3xl border border-line bg-surface/60 p-4 sm:mt-6 lg:hidden">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
          <HeroArtwork />
          <div className="px-2 pb-2 pt-5">
            <p className="eyebrow mb-2">League of Legends World Championship</p>
            <h1 className="display text-5xl">Worlds <span className="text-gold">2026</span></h1>
            <p className="mt-3 text-base text-fog">Schedule, results and recaps straight from the official LoL Esports feed. Times in {tzLabel(tz)}.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-gold">Now: {stage}</span>
              <span className="rounded-full border border-line px-3 py-1 text-fog">{stage}: {stageProgress(snap.matches, stage).done}/{stageProgress(snap.matches, stage).total} played</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Mobile schedule peek (approved mockup): stage progress at a glance + link, replacing the old prize card. */}
      <section className="mt-4 rounded-3xl border border-line bg-surface/60 p-4 lg:hidden">
        <p className="eyebrow mb-2 px-2">Schedule</p>
        <ul className="divide-y divide-line/60 px-2 text-sm">
          {STAGES.map((s) => {
            const p = stageProgress(snap.matches, s);
            return (
              <li key={s} className="flex items-center justify-between py-2.5">
                <span className="text-snow">{s}</span>
                <span className="text-fog">{p.done}/{p.total} played</span>
              </li>
            );
          })}
        </ul>
        <Link href="/matches" className="mt-2 inline-block px-2 text-sm font-medium text-gold transition hover:text-snow focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">View schedule →</Link>
      </section>

      {/* Desktop hero: full-bleed FIRESTARTER artwork with the tracker content over scrims. */}
      <section className="relative left-1/2 mt-6 hidden h-[600px] w-screen -translate-x-1/2 overflow-clip lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/firestarter-group.jpg" alt="" aria-hidden className="absolute inset-0 size-full object-cover object-[58%_center]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink/95 from-15% via-ink/55 via-45% to-transparent to-75%" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/70 to-transparent" />
        <motion.div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center px-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
          <p className="eyebrow mb-4">League of Legends World Championship</p>
          <h1 className="display text-8xl">Worlds <span className="text-gold">2026</span></h1>
          <p className="mt-5 max-w-xl text-lg text-fog">Schedule, results and recaps straight from the official LoL Esports feed. Times in {tzLabel(tz)}.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-gold/40 bg-ink/50 px-3 py-1 text-gold">Now: {stage}</span>
            {STAGES.map((s) => {
              const p = stageProgress(snap.matches, s);
              return <span key={s} className="rounded-full border border-line bg-ink/50 px-3 py-1 text-fog">{s}: {p.done}/{p.total} played</span>;
            })}
          </div>
          <div className="mt-8 flex items-center gap-3">
            <Link href="/matches" className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">View schedule</Link>
            <Link href="/standings" className="rounded-full border border-gold/50 px-5 py-2.5 text-sm text-gold transition hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">Open bracket</Link>
          </div>
        </motion.div>
        <HeroArtworkDesktop />
      </section>

      <FirestarterSection />

      <PrizePoolCard prize={snap.prize} />

      <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-5 [&>*]:min-w-0">
        <div className="card p-4 sm:p-6 lg:col-span-3">
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
        <div className="card p-4 sm:p-6 lg:col-span-2">
          <p className="eyebrow mb-3">Coming up</p>
          <ul className="grid gap-3">
            {upcoming.length === 0 && <li className="text-sm text-fog">Nothing with confirmed teams yet.</li>}
            {upcoming.map((m) => (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="flex items-center justify-between gap-2 rounded-lg p-1.5 hover:bg-white/5 sm:gap-3 sm:p-2">
                  <span className="flex min-w-0 items-center gap-2"><TeamLogo team={m.teams[0]} size={24} />{m.teams[0].code}<span className="text-fog">vs</span><TeamLogo team={m.teams[1]} size={24} />{m.teams[1].code}</span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-fog"><span className="sm:hidden">{fmtDateTimeShort(m.startTime, tz)}</span><span className="hidden sm:inline">{fmtDateTime(m.startTime, tz)}</span></span>
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
