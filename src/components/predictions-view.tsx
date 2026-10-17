"use client";
import Link from "next/link";
import { useSnapshot } from "./providers";
import { Empty, SpoilerGate, TeamLogo } from "./ui";
import { fmtDateTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";

/** Personal prediction tracker. Picks live only in this browser; nothing is sent anywhere. */
export function PredictionsView() {
  const { snap } = useSnapshot();
  const { prefs, set } = usePrefs();
  const rows = snap.matches
    .filter((m) => prefs.picks[m.id])
    .map((m) => {
      const pick = prefs.picks[m.id]!;
      const t = m.teams.find((x) => x.code === pick);
      const settled = m.state === "completed" && !!t?.outcome;
      return { m, pick, t, status: settled ? (t!.outcome === "win" ? "correct" : "wrong") : "pending" } as const;
    })
    .sort((a, b) => b.m.startTime.localeCompare(a.m.startTime));
  const right = rows.filter((r) => r.status === "correct").length;
  const wrong = rows.filter((r) => r.status === "wrong").length;
  const n = right + wrong;
  const clear = (id: string) => { const next = { ...prefs.picks }; delete next[id]; set({ picks: next }); };
  return (
    <div className="mt-6 grid gap-6">
      <p className="text-sm text-fog">Your own picks, kept on this device only. They are personal opinions, not forecasts, and nobody else sees them. Pick a winner on any upcoming match page before it starts.</p>
      <SpoilerGate what="Prediction results">
        <div className="grid gap-4 sm:grid-cols-4">
          {[["Accuracy", n === 0 ? "n/a" : `${Math.round((right / n) * 100)}%`], ["Correct", right], ["Wrong", wrong], ["Pending", rows.length - n]].map(([l, v]) => (
            <div key={l as string} className="card p-5"><p className="display text-4xl tabular-nums">{v}</p><p className="eyebrow !text-fog">{l}</p></div>
          ))}
        </div>
        {n > 0 && n < 10 && <p className="text-xs text-fog">Based on only {n} settled pick{n === 1 ? "" : "s"}. Too few to say anything about skill.</p>}
        {rows.length === 0 ? <Empty title="No predictions yet"><Link className="underline" href="/matches">Open an upcoming match</Link> and choose a winner.</Empty> : (
          <ul className="grid gap-3">
            {rows.map(({ m, pick, status }) => (
              <li key={m.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <Link href={`/matches/${m.id}`} className="flex items-center gap-3 hover:text-gold">
                  <TeamLogo team={m.teams[0]} size={28} /><span>{m.teams[0].code} vs {m.teams[1].code}</span><TeamLogo team={m.teams[1]} size={28} />
                  <span className="text-xs text-fog">{fmtDateTime(m.startTime, prefs.tz)}</span>
                </Link>
                <span className="flex items-center gap-3 text-sm">
                  <span>Your pick: <strong>{pick}</strong></span>
                  <span className={status === "correct" ? "text-gold" : status === "wrong" ? "text-ember" : "text-fog"}>{status === "correct" ? "Correct" : status === "wrong" ? "Wrong" : "Pending"}</span>
                  <button onClick={() => clear(m.id)} className="text-xs text-fog underline hover:text-snow" aria-label={`Remove prediction for ${m.teams[0].code} vs ${m.teams[1].code}`}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SpoilerGate>
    </div>
  );
}
