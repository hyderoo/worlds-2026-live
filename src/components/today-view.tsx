"use client";
import { useEffect, useState } from "react";
import { useSnapshot } from "./providers";
import { Countdown, Empty, MatchCard } from "./ui";
import { dayKey, fmtDayLong, tzLabel } from "@/lib/format";
import { nextMatch } from "@/lib/match-state";
import { usePrefs, useT } from "@/lib/prefs";

export function TodayView() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const { t } = useT();
  const tz = prefs.tz;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const a = setTimeout(() => setNow(Date.now()), 0); const id = setInterval(() => setNow(Date.now()), 30_000); return () => { clearTimeout(a); clearInterval(id); }; }, []);
  if (now === null) return <div className="mt-8 skeleton h-40" aria-hidden />;

  const nowIso = new Date(now).toISOString();
  const today = dayKey(nowIso, tz);
  const sorted = [...snap.matches].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const todays = sorted.filter((m) => dayKey(m.startTime, tz) === today);
  const live = snap.matches.filter((m) => m.state === "live");
  const next = nextMatch(snap.matches, new Date(now));
  const nextDayKey = !todays.length ? sorted.find((m) => m.startTime > nowIso) : undefined;
  const nextDay = nextDayKey ? sorted.filter((m) => dayKey(m.startTime, tz) === dayKey(nextDayKey.startTime, tz)) : [];
  const mine = todays.filter((m) => m.teams.some((x) => prefs.watch.includes(x.code)));

  return (
    <div className="mt-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{fmtDayLong(nowIso, tz)} · {tzLabel(tz)}</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">{t("today.title")}</h1>
        <p className="mt-2 text-fog">{t("today.sub")}</p>
      </header>

      {live.length > 0 && (
        <section className="mb-8" aria-labelledby="t-live">
          <h2 id="t-live" className="display mb-3 text-2xl">{t("today.live")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">{live.map((m) => <MatchCard key={m.id} m={m} tz={tz} />)}</div>
        </section>
      )}

      {next && (
        <section className="card mb-8 p-5" aria-labelledby="t-next">
          <h2 id="t-next" className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">{t("today.next")}</h2>
          <p className="mb-3 text-lg">{next.teams[0]!.name} vs {next.teams[1]!.name}</p>
          <p className="mb-2 text-sm text-fog">{t("today.startsIn")}</p>
          <Countdown target={next.startTime} />
        </section>
      )}

      {mine.length > 0 && (
        <section className="mb-8" aria-labelledby="t-mine">
          <h2 id="t-mine" className="display mb-3 text-2xl">{t("today.followed")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">{mine.map((m) => <MatchCard key={m.id} m={m} tz={tz} />)}</div>
        </section>
      )}

      <section aria-labelledby="t-all">
        <h2 id="t-all" className="display mb-3 text-2xl">{todays.length ? t("today.all") : t("today.nextDay")}</h2>
        {todays.length === 0 && nextDay.length === 0 && <Empty title={t("today.none")} />}
        {todays.length === 0 && nextDay.length > 0 && <p className="mb-3 text-sm text-fog">{t("today.none")} · {fmtDayLong(nextDay[0]!.startTime, tz)}</p>}
        <div className="grid gap-3 sm:grid-cols-2">{(todays.length ? todays : nextDay).map((m) => <MatchCard key={m.id} m={m} tz={tz} />)}</div>
      </section>
    </div>
  );
}
