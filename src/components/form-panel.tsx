"use client";
import Link from "next/link";
import { useSnapshot } from "./providers";
import { SpoilerGate, TeamLogo } from "./ui";
import { headToHead, streak, teamForm } from "@/lib/form";
import { useT } from "@/lib/prefs";

function Chips({ code }: { code: string }) {
  const { snap } = useSnapshot();
  const { t } = useT();
  const form = teamForm(snap.matches, code, 5);
  if (form.length === 0) return <p className="text-sm text-fog">{t("form.noGames")}</p>;
  const st = streak(form);
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {form.map((f) => (
          <li key={f.matchId}>
            <Link href={`/matches/${f.matchId}`} title={`${f.opp.name} ${f.gw}-${f.gl}`} className={`grid min-w-14 justify-items-center rounded-lg border px-2 py-1.5 text-xs ${f.won ? "border-gold/50 bg-gold/10 text-gold" : "border-ember/40 bg-ember/10 text-ember"}`}>
              <span className="text-sm font-semibold">{f.won ? t("form.win") : t("form.loss")} {f.gw}-{f.gl}</span>
              <span className="text-[0.65rem] text-fog">{f.opp.code}</span>
            </Link>
          </li>
        ))}
      </ul>
      {st && st.n > 1 && <p className="mt-2 text-xs text-fog">{t("form.streak")}: {st.n}{st.won ? t("form.win") : t("form.loss")}</p>}
    </div>
  );
}

/** Recent form for one team, from official completed series only. Hidden behind spoiler mode. */
export function TeamForm({ code }: { code: string }) {
  const { t } = useT();
  return (
    <section className="mt-8" aria-label={t("form.title")}>
      <h2 className="display mb-3 text-2xl">{t("form.title")}</h2>
      <SpoilerGate what="Form"><Chips code={code} /></SpoilerGate>
      <p className="mt-2 text-xs text-fog">{t("form.note")}</p>
    </section>
  );
}

/** Head-to-head and form for two teams. */
export function MatchupPanel({ a, b }: { a: string; b: string }) {
  const { snap } = useSnapshot();
  const { t } = useT();
  const ta = snap.teams.find((x) => x.code === a), tb = snap.teams.find((x) => x.code === b);
  if (!ta || !tb) return null;
  const h = headToHead(snap.matches, a, b);
  return (
    <section className="card mt-6 p-6" aria-labelledby="mu">
      <h2 id="mu" className="display text-2xl">{t("form.h2h")} · {t("form.title")}</h2>
      <SpoilerGate what="Head-to-head">
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">{t("form.h2h")}</h3>
          {h.meetings.length === 0 ? <p className="text-sm text-fog">{t("form.noMeet")}</p> : (
            <>
              <p className="text-sm">{t("form.series")}: <strong>{ta.code} {h.aw} - {h.bw} {tb.code}</strong> · {t("form.games")}: {h.ag} - {h.bg}</p>
              <ul className="mt-2 grid gap-1 text-sm text-fog">{h.meetings.map((m) => <li key={m.matchId}><Link className="hover:text-gold" href={`/matches/${m.matchId}`}>{m.score[0]} {m.score[1]}-{m.score[2]} {m.score[3]} · {m.stage}</Link></li>)}</ul>
            </>
          )}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {[ta, tb].map((x) => (
            <div key={x.code}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><TeamLogo team={x} size={22} />{x.name}</h3>
              <Chips code={x.code} />
            </div>
          ))}
        </div>
      </SpoilerGate>
      <p className="mt-4 text-xs text-fog">{t("form.note")}</p>
    </section>
  );
}
