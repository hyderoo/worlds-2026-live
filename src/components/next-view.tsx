"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSnapshot } from "./providers";
import { TeamLogo } from "./ui";
import { countdownParts, fmtDay, fmtTime, tzShort } from "@/lib/format";
import { hasTbd } from "@/lib/match-state";
import { usePrefs } from "@/lib/prefs";
import type { Match } from "@/lib/types";

const L = {
  id: { next: "Pertandingan berikutnya", live: "Sedang berlangsung", soon: "Segera dimulai", none: "Belum ada jadwal pertandingan berikutnya.", noneSub: "Jadwal diambil dari sumber resmi LoL Esports. Coba lagi nanti.", followed: "Tim favoritmu", d: "hari", h: "jam", m: "mnt", s: "dtk", open: "Buka aplikasi", noScore: "Skor disembunyikan (aman spoiler)", official: "Jadwal resmi LoL Esports" },
  en: { next: "Next match", live: "Live now", soon: "Starting soon", none: "No upcoming match in the schedule yet.", noneSub: "Schedule comes from the official LoL Esports feed. Check back later.", followed: "Your followed team", d: "days", h: "hrs", m: "min", s: "sec", open: "Open app", noScore: "Score hidden (spoiler-safe)", official: "Official LoL Esports schedule" },
} as const;

function pick(matches: Match[], watch: string[], now: number) {
  const live = matches.filter((m) => m.state === "live").sort((a, b) => a.startTime.localeCompare(b.startTime));
  const up = matches
    .filter((m) => m.state === "scheduled" && !hasTbd(m) && new Date(m.startTime).getTime() >= now - 30 * 60_000)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const mineOf = (xs: Match[]) => xs.find((m) => m.teams.some((t) => watch.includes(t.code)));
  const m = mineOf(live) ?? mineOf(up) ?? live[0] ?? up[0] ?? null;
  const followed = !!m && !!watch.length && m.teams.some((t) => watch.includes(t.code));
  return { m, followed };
}

export function NextView() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const t = prefs.lang === "id" ? L.id : L.en;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const a = setTimeout(() => setNow(Date.now()), 0); const id = setInterval(() => setNow(Date.now()), 1000); return () => { clearTimeout(a); clearInterval(id); }; }, []);
  if (now === null) return <div className="mx-auto mt-10 h-72 max-w-md skeleton" aria-hidden />;

  const { m, followed } = pick(snap.matches, prefs.watch, now);
  const tz = prefs.tz;
  if (!m) {
    return (
      <section className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="display text-2xl">{t.none}</p>
        <p className="mt-2 text-sm text-fog">{t.noneSub}</p>
        <Link href="/today" className="mt-6 rounded-full border border-gold/50 px-5 py-2 text-sm text-gold">{t.open}</Link>
      </section>
    );
  }
  const live = m.state === "live";
  const p = countdownParts(m.startTime, now);
  const started = new Date(m.startTime).getTime() <= now;
  const cells: [number, string][] = [[p.d, t.d], [p.h, t.h], [p.m, t.m], [p.s, t.s]];
  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8 text-center" aria-label={t.next}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
        {live ? <span className="inline-flex items-center gap-2 text-ember"><span className="live-dot size-2 rounded-full bg-ember" aria-hidden />{t.live}</span> : started ? t.soon : t.next}
      </p>
      {followed && <p className="mt-1 text-[0.7rem] text-fog">{t.followed}</p>}
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {m.teams.map((tm, i) => (
          <div key={i} className={`flex flex-col items-center gap-3 ${i === 1 ? "order-3" : "order-1"}`}>
            <TeamLogo team={tm} size={84} />
            <span className="display text-xl leading-tight">{tm.name}</span>
          </div>
        ))}
        <span className="order-2 text-sm font-semibold uppercase tracking-widest text-fog">vs</span>
      </div>
      <p className="mt-6 text-lg">{fmtDay(m.startTime, tz)} · <span className="tabular-nums">{fmtTime(m.startTime, tz)}</span> {tzShort(tz)}</p>
      <p className="mt-1 text-xs text-fog">{[m.stage, m.block !== m.stage ? m.block : ""].filter(Boolean).join(" · ")} · Bo{m.bestOf}</p>
      {live ? (
        <p className="mt-8 text-sm text-fog">{t.noScore}</p>
      ) : started ? null : (
        <div role="timer" aria-label={`${p.d} ${t.d} ${p.h} ${t.h} ${p.m} ${t.m}`} className="mt-8 flex justify-center gap-4">
          {cells.map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="display text-4xl tabular-nums">{String(v).padStart(2, "0")}</div>
              <div className="eyebrow !text-[0.6rem] !text-fog">{l}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-10 flex flex-col items-center gap-2 text-[0.7rem] text-fog">
        <Link href={`/matches/${m.id}`} className="rounded-full border border-gold/50 px-5 py-2 text-sm text-gold">{t.open}</Link>
        <span>{t.official} · Fan-made, unofficial</span>
      </div>
    </section>
  );
}
