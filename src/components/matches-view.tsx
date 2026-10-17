"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import clsx from "clsx";
import { useSnapshot } from "./providers";
import { Empty, MatchCard, Pill } from "./ui";
import { dayKey, fmtDayLong, fmtTime } from "@/lib/format";
import { usePrefs, useSpoiler, useT } from "@/lib/prefs";
import { REGIONS, REGION_BY_LEAGUE } from "@/lib/regions";
import type { Match } from "@/lib/types";

const STATUSES = [["all", "flt.all"], ["live", "flt.live"], ["scheduled", "flt.upcoming"], ["completed", "flt.completed"]] as const;

export function MatchesView() {
  const { t } = useT();
  const spo = useSpoiler();
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const tz = prefs.tz;
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const get = (k: string, d = "") => sp.get(k) ?? d;
  const status = get("status", "all"), stage = get("stage", "all"), region = get("region", "all"), q = get("q"), date = get("date"), view = get("view", "list"), mine = get("mine") === "1";
  const set = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v === null || v === "" || v === "all") ? n.delete(k) : n.set(k, v);
    router.replace(`${path}?${n}`, { scroll: false });
  };
  const leagueOf = useMemo(() => new Map(snap.teams.map((t) => [t.code, t.league ?? ""])), [snap.teams]);
  const stages = useMemo(() => [...new Set(snap.matches.map((m) => m.stage))], [snap.matches]);

  const list = useMemo(() => snap.matches.filter((m) => {
    if (status !== "all" && m.state !== status) return false;
    if (stage !== "all" && m.stage !== stage) return false;
    if (region !== "all" && !m.teams.some((t) => REGION_BY_LEAGUE[leagueOf.get(t.code) ?? ""] === region)) return false;
    if (date && dayKey(m.startTime, tz) !== date) return false;
    if (mine && !m.teams.some((t) => prefs.watch.includes(t.code))) return false;
    if (q) {
      const n = q.toLowerCase();
      if (!m.teams.some((t) => t.code.toLowerCase().includes(n) || t.name.toLowerCase().includes(n))) return false;
    }
    return true;
  }), [snap.matches, status, stage, region, date, q, mine, tz, leagueOf, prefs.watch]);

  const byDay = useMemo(() => {
    const g = new Map<string, Match[]>();
    for (const m of list) { const k = dayKey(m.startTime, tz); g.set(k, [...(g.get(k) ?? []), m]); }
    return [...g.entries()];
  }, [list, tz]);

  return (
    <div>
      <div className="card mt-6 grid gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map(([id, label]) => <Pill key={id} active={status === id} onClick={() => set({ status: id })}>{t(label)}{id === "live" && snap.matches.some((m) => m.state === "live") ? " •" : ""}</Pill>)}
          <span className="mx-2 hidden h-5 w-px bg-line sm:block" />
          <Pill active={view === "list"} onClick={() => set({ view: "list" })}>{t("flt.list")}</Pill>
          <Pill active={view === "calendar"} onClick={() => set({ view: "calendar" })}>{t("flt.calendar")}</Pill>
          <Pill active={mine} onClick={() => set({ mine: mine ? null : "1" })}>{t("flt.myTeams")}</Pill>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <input aria-label="Search team" placeholder="Search team…" defaultValue={q} onChange={(e) => set({ q: e.target.value })} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
          <select aria-label="Stage" value={stage} onChange={(e) => set({ stage: e.target.value })} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            <option value="all">All stages</option>{stages.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Region" value={region} onChange={(e) => set({ region: e.target.value })} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            <option value="all">All regions</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input aria-label="Date" type="date" value={date} onChange={(e) => set({ date: e.target.value })} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        </div>
        <p className="text-xs text-fog" aria-live="polite">{list.length} match{list.length === 1 ? "" : "es"} · region filter uses each team&apos;s home league · <Link className="underline" href={path}>reset</Link></p>
      </div>

      {list.length === 0 ? (
        <div className="mt-6"><Empty title="No matches fit these filters">Try clearing the date or status filter.</Empty></div>
      ) : view === "calendar" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byDay.map(([k, ms]) => (
            <div key={k} className="card p-4">
              <p className="eyebrow mb-3">{fmtDayLong(ms[0]!.startTime, tz)}</p>
              <ul className="grid gap-2">
                {ms.map((m) => (
                  <li key={m.id}>
                    <Link href={`/matches/${m.id}`} className={clsx("flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5", m.state === "live" && "text-ember")}>
                      <span className="tabular-nums text-fog">{fmtTime(m.startTime, tz)}</span>
                      <span className="flex-1 truncate">{m.teams[0].code} vs {m.teams[1].code}</span>
                      {m.state === "completed" && !spo.hidden(m.id) && <span className="tabular-nums text-gold">{m.teams[0].wins}-{m.teams[1].wins}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-8">
          {byDay.map(([k, ms]) => (
            <section key={k} aria-label={fmtDayLong(ms[0]!.startTime, tz)}>
              <h2 className="eyebrow mb-3">{fmtDayLong(ms[0]!.startTime, tz)}</h2>
              <div className="grid gap-3 sm:grid-cols-2">{ms.map((m) => <MatchCard key={m.id} m={m} tz={tz} />)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
