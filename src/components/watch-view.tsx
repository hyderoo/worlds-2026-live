"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSnapshot } from "./providers";
import { Countdown, Empty, StateBadge, TeamLogo } from "./ui";
import { fmtDateTime } from "@/lib/format";
import { usePrefs, useT } from "@/lib/prefs";

const STREAM = "https://lolesports.com/en-US/live/worlds";
const nowMs = () => Date.now();
const nkey = (id: string) => `w26:notes:${id}`;

export function WatchView({ id }: { id: string }) {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const { t } = useT();
  const m = snap.matches.find((x) => x.id === id);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [awake, setAwake] = useState(false);
  const lock = useRef<WakeLockSentinel | null>(null);
  const [wlOk, setWlOk] = useState(true);

  useEffect(() => {
    const x = setTimeout(() => {
      try { setText(localStorage.getItem(nkey(id)) ?? ""); } catch { /* storage blocked */ }
      setLoaded(true); setNow(Date.now()); setWlOk("wakeLock" in navigator);
    }, 0);
    const i = setInterval(() => setNow(Date.now()), 15_000);
    return () => { clearTimeout(x); clearInterval(i); };
  }, [id]);
  useEffect(() => { if (loaded) try { localStorage.setItem(nkey(id), text); } catch { /* ignore */ } }, [text, loaded, id]);
  useEffect(() => () => { void lock.current?.release(); }, []);

  async function toggleAwake() {
    try {
      if (awake) { await lock.current?.release(); lock.current = null; setAwake(false); }
      else { lock.current = await navigator.wakeLock.request("screen"); setAwake(true); lock.current.addEventListener("release", () => setAwake(false)); }
    } catch { setWlOk(false); }
  }

  if (!m) return <div className="mt-10"><Empty title="Match not found"><Link className="underline" href="/matches">Matches</Link></Empty></div>;
  const [a, b] = m.teams;
  const tz = prefs.tz;
  const pick = prefs.picks[m.id];
  const stamp = () => {
    const mins = Math.max(0, Math.floor(((nowMs()) - new Date(m.startTime).getTime()) / 60_000));
    const s = `[+${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}] `;
    setText((v) => (v && !v.endsWith("\n") ? v + "\n" : v) + s);
  };
  const btn = "rounded-full border border-gold px-4 py-2.5 text-center text-sm text-gold hover:bg-gold/10";
  const finished = m.state === "completed";

  return (
    <article className="mt-6 max-w-2xl">
      <p className="eyebrow mb-3"><Link href={`/matches/${m.id}`} className="hover:underline">{a.code} vs {b.code}</Link> / {t("watch.open")}</p>
      <div className="card p-5 text-center">
        <div className="mb-3 flex items-center justify-between text-xs text-fog"><span>{fmtDateTime(m.startTime, tz)} · Bo{m.bestOf} · {m.stage}</span><StateBadge state={m.state} /></div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {[a, b].map((tm, i) => (
            <div key={i} className={`flex flex-col items-center gap-2 ${i === 1 ? "order-3" : "order-1"}`}><TeamLogo team={tm} size={64} /><span className="display text-lg leading-tight">{tm.name}</span></div>
          ))}
          <span className="order-2 text-sm font-semibold uppercase tracking-widest text-fog">vs</span>
        </div>
        {m.state === "scheduled" && <div className="mt-5 flex justify-center"><div><p className="mb-1 text-xs text-fog">{t("watch.startsIn")}</p><Countdown target={m.startTime} /></div></div>}
        {m.state === "live" && <p className="mt-5 text-sm text-ember">{t("watch.live")}</p>}
        {finished && <p className="mt-5 text-sm text-fog">{t("watch.ended")}</p>}
        {(m.state === "live" || finished) && (
          <p className="mt-2 text-xs text-fog">
            {reveal && finished ? `${a.code} ${a.wins ?? 0} - ${b.wins ?? 0} ${b.code}` : t("watch.hidden")}
            {finished && !reveal && <> <button className="text-gold underline" onClick={() => setReveal(true)}>{t("watch.show")}</button></>}
          </p>
        )}
        {pick && <p className="mt-3 text-xs text-fog">{t("watch.yourPick")}: <strong className="text-snow">{pick}</strong></p>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a href={STREAM} target="_blank" rel="noopener noreferrer" className={btn}>{t("watch.stream")}</a>
        <button onClick={() => void toggleAwake()} disabled={!wlOk} aria-pressed={awake} className={`${btn} disabled:opacity-40 ${awake ? "bg-gold/10" : ""}`}>{wlOk ? t("watch.awake") : `${t("watch.awake")}: ${t("watch.awakeNo")}`}</button>
      </div>
      <p className="mt-2 text-xs text-fog">{t("watch.streamNote")}</p>

      <section className="card mt-6 p-5" aria-labelledby="wn">
        <div className="mb-2 flex items-center justify-between gap-2"><h2 id="wn" className="display text-xl">{t("watch.notes")}</h2><button onClick={stamp} className="rounded-full border border-line px-3 py-1 text-xs text-fog hover:text-snow">{t("watch.stamp")}</button></div>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 5000))} rows={8} placeholder={t("watch.notesPh")} aria-label={t("watch.notes")} className="w-full rounded-lg border border-line bg-surface p-3 text-sm" />
        <p className="mt-2 text-xs text-fog">{t("watch.private")}</p>
      </section>
    </article>
  );
}
