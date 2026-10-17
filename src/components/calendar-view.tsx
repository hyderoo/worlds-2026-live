"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { useSnapshot } from "./providers";
import { TeamLogo } from "./ui";
import { ALARM_CHOICES } from "@/lib/ics";
import { usePrefs, useT } from "@/lib/prefs";

export function CalendarView() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const { t } = useT();
  const teams = snap.teams.filter((x) => x.code !== "TBD").sort((a, b) => a.name.localeCompare(b.name));
  const [sel, setSel] = useState<string[] | null>(null);
  const [alarm, setAlarm] = useState(15);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { const x = setTimeout(() => setOrigin(window.location.origin), 0); return () => clearTimeout(x); }, []);
  const chosen = sel ?? prefs.watch.filter((c) => teams.some((x) => x.code === c));
  const toggle = (c: string) => setSel((prev) => { const cur = prev ?? chosen; return cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]; });
  const q = new URLSearchParams();
  if (chosen.length) q.set("teams", chosen.join(","));
  if (alarm) q.set("alarm", String(alarm));
  const path = `/calendar.ics${q.size ? `?${q}` : ""}`;
  const https = origin + path;
  const webcal = https.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const btn = "rounded-full border border-gold px-4 py-2.5 text-center text-sm text-gold hover:bg-gold/10";
  return (
    <div className="mt-6 max-w-2xl">
      <header className="mb-6">
        <h1 className="display text-4xl">{t("cal.title")}</h1>
        <p className="mt-2 text-fog">{t("cal.sub")}</p>
      </header>

      <section className="card mb-5 p-5" aria-labelledby="cal-teams">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="cal-teams" className="text-sm font-semibold">{t("cal.teams")}</h2>
          {prefs.watch.length > 0 && <button onClick={() => setSel(null)} className="text-xs text-gold underline">{t("cal.useFollowed")}</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          {teams.map((x) => {
            const on = chosen.includes(x.code);
            return (
              <button key={x.code} aria-pressed={on} onClick={() => toggle(x.code)} className={clsx("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", on ? "border-gold bg-gold/10 text-snow" : "border-line text-fog")}>
                <TeamLogo team={x} size={18} />{x.code}
              </button>
            );
          })}
        </div>
        <label className="mt-5 grid max-w-xs gap-1 text-sm">{t("cal.alarm")}
          <select value={alarm} onChange={(e) => setAlarm(Number(e.target.value))} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            {ALARM_CHOICES.map((m) => <option key={m} value={m}>{m === 0 ? t("cal.alarmNone") : `${m} ${t("cal.min")}`}</option>)}
          </select>
        </label>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href={google} target="_blank" rel="noopener noreferrer" className={btn}>{t("cal.google")}</a>
        <a href={webcal} className={btn}>{t("cal.apple")}</a>
        <button onClick={() => { navigator.clipboard?.writeText(https).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); }} className={btn}>{copied ? t("cal.copied") : t("cal.copy")}</button>
        <a href={path} download="worlds-2026.ics" className="rounded-full border border-line px-4 py-2.5 text-center text-sm text-fog hover:text-snow">{t("cal.download")}</a>
      </div>
      <p className="mt-3 break-all rounded-lg border border-line bg-white/[0.03] p-2 font-mono text-[0.7rem] text-fog" data-testid="feed-url">{https || "…"}</p>

      <ul className="mt-5 grid gap-2 text-sm text-fog">
        <li>{t("cal.noteTz")}</li>
        <li>{t("cal.noteRefresh")}</li>
      </ul>
    </div>
  );
}
