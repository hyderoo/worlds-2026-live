"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { countdownParts, fmtDateTime } from "@/lib/format";
import { useSpoiler } from "@/lib/prefs";
import type { Match, MatchState, Team, TeamSide } from "@/lib/types";

export function TeamLogo({ team, size = 40 }: { team: Pick<TeamSide, "code" | "image"> | Pick<Team, "code" | "image">; size?: number }) {
  // Bundled official team logos first (public/logos/<CODE>.png), then the feed's own image URL, then initials.
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const tbd = team.code === "TBD";
  const local = `/logos/${team.code}.png`;
  const src = stage === 0 ? local : stage === 1 ? team.image : null;
  if (tbd || !src) {
    return (
      <span aria-hidden className="grid shrink-0 place-items-center rounded-full border border-line bg-raise text-[0.6rem] font-semibold text-fog" style={{ width: size, height: size }}>
        {tbd ? "?" : team.code.slice(0, 3)}
      </span>
    );
  }
  return <Image key={src} src={src} alt="" width={size} height={size} unoptimized onError={() => setStage((v) => (v === 0 && team.image ? 1 : 2))} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

const STATE_META: Record<MatchState, { label: string; cls: string; hint: string }> = {
  live: { label: "Live", cls: "bg-ember/15 text-ember border-ember/40", hint: "Reported live by the official source and consistent with the schedule." },
  scheduled: { label: "Scheduled", cls: "bg-violet/10 text-violet border-violet/30", hint: "Start time from the official schedule. Times can change." },
  completed: { label: "Final", cls: "bg-gold/10 text-gold border-gold/30", hint: "Result confirmed by the official source." },
  unverified: { label: "Unverified", cls: "bg-white/5 text-fog border-line", hint: "The source reports a status that does not fit the schedule. Shown as unverified until confirmed." },
};

export function StateBadge({ state }: { state: MatchState }) {
  const m = STATE_META[state];
  return (
    <span title={m.hint} className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider", m.cls)}>
      {state === "live" && <span className="live-dot size-1.5 rounded-full bg-ember" aria-hidden />}
      {m.label}
    </span>
  );
}

/** Replaces results-revealing content while spoiler-free mode is on. */
export function SpoilerGate({ children, what = "Results" }: { children: ReactNode; what?: string }) {
  const sp = useSpoiler();
  if (!sp.on) return <>{children}</>;
  return (
    <div role="status" className="card p-6 text-center">
      <p className="font-medium">{what} are hidden (spoiler-free mode).</p>
      <button onClick={sp.revealSession} className="mt-3 rounded-full border border-gold/50 px-4 py-2 text-sm text-gold hover:bg-gold/10">Show for this session</button>
    </div>
  );
}

export function MatchCard({ m, tz, compact }: { m: Match; tz: string; compact?: boolean }) {
  const sp = useSpoiler();
  const hide = sp.hidden(m.id) && (m.state === "completed" || m.state === "live");
  const done = m.state === "completed" && !hide;
  return (
    <Link href={`/matches/${m.id}`} className={clsx("card group block p-4 transition hover:border-violet-dim hover:bg-white/[0.04]", m.state === "live" && "border-ember/50")}>
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-fog">
        <span>{fmtDateTime(m.startTime, tz)}</span>
        <span className="flex items-center gap-2">
          <span>{m.block !== m.stage ? m.block : m.stage} · Bo{m.bestOf}</span>
          <StateBadge state={m.state} />
        </span>
      </div>
      {m.teams.map((t, i) => (
        <div key={i} className={clsx("flex items-center justify-between py-1.5", done && t.outcome === "loss" && "opacity-55")}>
          <span className="flex min-w-0 items-center gap-3">
            <TeamLogo team={t} size={compact ? 28 : 36} />
            <span className={clsx("truncate font-medium", t.outcome === "win" && !hide && "text-gold")}>{t.code === "TBD" ? "To be decided" : t.name}</span>
          </span>
          <span className={clsx("tabular-nums text-xl font-semibold", t.outcome === "win" && !hide ? "text-gold" : "text-fog")}>{hide ? "·" : done || m.state === "live" ? (t.wins ?? 0) : "–"}</span>
        </div>
      ))}
      {hide && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sp.reveal(m.id); }} className="mt-2 rounded-full border border-line px-3 py-1 text-xs text-fog hover:border-gold hover:text-gold">Show result</button>}
    </Link>
  );
}

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);
  if (now === null) return <div className="skeleton h-14 w-64" aria-hidden />;
  const p = countdownParts(target, now);
  const cells: [number, string][] = [[p.d, "days"], [p.h, "hrs"], [p.m, "min"], [p.s, "sec"]];
  return (
    <div role="timer" aria-label={`${p.d} days ${p.h} hours ${p.m} minutes until the next match`} className="flex gap-3">
      {cells.map(([v, l]) => (
        <div key={l} className="text-center">
          <div className="display text-4xl tabular-nums sm:text-5xl">{String(v).padStart(2, "0")}</div>
          <div className="eyebrow !text-[0.6rem] !text-fog">{l}</div>
        </div>
      ))}
    </div>
  );
}

export function Section({ eyebrow, title, action, children }: { eyebrow?: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 className="display text-3xl sm:text-4xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card grid place-items-center gap-1 p-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-md text-sm text-fog">{children}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden />;
}

export function PageTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <header className="pt-10 pb-2">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h1 className="display text-5xl sm:text-6xl">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-fog">{sub}</p>}
    </header>
  );
}

export function Pill({ active, children, ...p }: { active?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} aria-pressed={active} className={clsx("rounded-full border px-3.5 py-1.5 text-sm transition", active ? "border-gold bg-gold/10 text-gold" : "border-line text-fog hover:border-violet-dim hover:text-snow")}>
      {children}
    </button>
  );
}
