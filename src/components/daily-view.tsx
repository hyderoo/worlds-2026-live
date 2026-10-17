"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSnapshot } from "./providers";
import { TeamLogo } from "./ui";
import { dayKey, fmtDayLong, fmtTime, tzLabel } from "@/lib/format";
import { usePrefs, useSpoiler, useT } from "@/lib/prefs";
import type { Match } from "@/lib/types";

const done = (m: Match) => m.state === "completed" && m.teams.some((t) => t.outcome === "win");

export function DailyView() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const sp = useSpoiler();
  const { t } = useT();
  const tz = prefs.tz;
  const [now, setNow] = useState<number | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hideLocal, setHideLocal] = useState(false);
  useEffect(() => { const x = setTimeout(() => setNow(Date.now()), 0); return () => clearTimeout(x); }, []);

  const days = useMemo(() => {
    const k = new Set(snap.matches.filter(done).map((m) => dayKey(m.startTime, tz)));
    return [...k].sort();
  }, [snap.matches, tz]);
  if (now === null) return <div className="mt-8 skeleton h-40" aria-hidden />;

  const today = dayKey(new Date(now).toISOString(), tz);
  const yesterday = dayKey(new Date(now - 86_400_000).toISOString(), tz);
  const fallback = days.includes(yesterday) ? yesterday : [...days].reverse().find((d) => d <= today) ?? days[days.length - 1] ?? null;
  const day = sel && days.includes(sel) ? sel : fallback;
  const idx = day ? days.indexOf(day) : -1;
  const matches = day ? snap.matches.filter((m) => done(m) && dayKey(m.startTime, tz) === day).sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];
  const nextDayMatches = (() => {
    const upcoming = snap.matches.filter((m) => m.state === "scheduled" && m.teams.every((x) => x.code !== "TBD") && new Date(m.startTime).getTime() > now).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const first = upcoming[0];
    return first ? upcoming.filter((m) => dayKey(m.startTime, tz) === dayKey(first.startTime, tz)) : [];
  })();
  const hidden = sp.on || hideLocal;
  const label = day === yesterday ? t("daily.yesterday") : day === today ? t("today.title") : "";
  const btn = "rounded-full border border-line px-3 py-1.5 text-sm text-fog hover:text-snow disabled:opacity-30";

  return (
    <div className="mt-6 max-w-2xl">
      <header className="mb-4">
        <h1 className="display text-4xl">{t("daily.title")}</h1>
        {day && matches[0] && <p className="mt-2 text-fog"><span className="text-gold">{label}</span>{label && " · "}{fmtDayLong(matches[0].startTime, tz)} · {tzLabel(tz)}</p>}
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={btn} disabled={idx <= 0} onClick={() => setSel(days[idx - 1] ?? null)} aria-label={t("daily.prev")}>←</button>
        <button className={btn} disabled={idx < 0 || idx >= days.length - 1} onClick={() => setSel(days[idx + 1] ?? null)} aria-label={t("daily.next")}>→</button>
        <label className="ml-auto flex items-center gap-2 text-sm text-fog"><input type="checkbox" checked={hidden} disabled={sp.on} onChange={(e) => setHideLocal(e.target.checked)} />{t("daily.hide")}</label>
      </div>
      {sp.on && <p className="mb-3 text-sm text-fog">{t("spoiler.hidden")} <button className="text-gold underline" onClick={sp.revealSession}>{t("act.showSession")}</button></p>}

      {matches.length === 0 ? <p className="card p-5 text-fog">{t("daily.none")}</p> : (
        <>
          <p className="mb-3 text-sm text-fog">{matches.length} {t("daily.played")}</p>
          <ul className="grid gap-2">
            {matches.map((m) => (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="card grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 hover:border-gold">
                  {m.teams.map((tm, i) => {
                    const win = !hidden && tm.outcome === "win";
                    return (
                      <span key={tm.code + i} className={`order-${i === 0 ? 1 : 3} flex items-center gap-2 ${i === 1 ? "flex-row-reverse text-right" : ""} ${win ? "font-semibold text-snow" : hidden ? "" : "text-fog"}`}>
                        <TeamLogo team={tm} size={28} /><span className="truncate">{tm.code}</span>
                      </span>
                    );
                  })}
                  <span className="order-2 text-center"><span className="display block text-xl tabular-nums">{hidden ? "vs" : `${m.teams[0].wins ?? 0} - ${m.teams[1].wins ?? 0}`}</span><span className="text-[0.65rem] text-fog">{fmtTime(m.startTime, tz)} · Bo{m.bestOf}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {nextDayMatches.length > 0 && (
        <section className="mt-6" aria-labelledby="dn">
          <h2 id="dn" className="display mb-2 text-xl">{t("daily.upNext")} · {fmtDayLong(nextDayMatches[0]!.startTime, tz)}</h2>
          <ul className="grid gap-1 text-sm text-fog">{nextDayMatches.slice(0, 6).map((m) => <li key={m.id}><Link className="hover:text-gold" href={`/matches/${m.id}`}>{fmtTime(m.startTime, tz)} · {m.teams[0].code} vs {m.teams[1].code}</Link></li>)}</ul>
        </section>
      )}
      <p className="mt-6 text-xs text-fog">{t("daily.note")}</p>
    </div>
  );
}
