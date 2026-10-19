"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useSnapshot } from "./providers";
import { Pill, TeamLogo } from "./ui";
import { hasTbd } from "@/lib/match-state";
import { dayKey, fmtDateTime } from "@/lib/format";
import { usePrefs, useT } from "@/lib/prefs";

type Team = { code: string; image?: string | null; name?: string };
/** One user series. round is 0-based inside its stage. official=true only for pairings copied from the official schedule. */
type Series = { id: string; stage: "swiss" | "ko"; round: number; a: string; b: string; w?: string; official?: boolean };
const KEY = "worlds2026.predictor.v1";
const KO_NAMES = ["Quarterfinals", "Semifinals", "Final"];

function load(): Series[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter((s) => s && typeof s.id === "string") : []; } catch { return []; }
}

export function PredictorView() {
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const { lang } = useT();
  const id = lang === "id";
  const tx = (en: string, idn: string) => (id ? idn : en);
  const [tab, setTab] = useState<"swiss" | "ko">("swiss");
  const [mine, setMine] = useState<Series[]>([]);
  const [ready, setReady] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMine(load()); setReady(true); }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch { /* storage full or blocked */ } } }, [mine, ready]);

  const teamMap = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of snap.teams) m.set(t.code, t);
    for (const x of snap.matches) for (const t of x.teams) if (t.code !== "TBD" && !m.has(t.code)) m.set(t.code, t);
    return m;
  }, [snap]);
  const tm = (c: string): Team => teamMap.get(c) ?? { code: c };

  // Official round 1: the earliest Swiss matchday, only if every series on it names both teams.
  const r1 = useMemo(() => {
    const sw = snap.matches.filter((m) => m.stage === "Swiss").sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (!sw.length) return [];
    const d = dayKey(sw[0]!.startTime, prefs.tz);
    const day = sw.filter((m) => dayKey(m.startTime, prefs.tz) === d);
    return day.some((m) => hasTbd(m)) ? [] : day;
  }, [snap, prefs.tz]);
  const officialWinner = (m: (typeof r1)[number]) => m.state === "completed" ? m.teams.find((t) => t.outcome === "win")?.code : undefined;

  const all: Series[] = useMemo(() => {
    const off: Series[] = r1.map((m) => {
      const key = `off-${m.id}`;
      const saved = mine.find((s) => s.id === key);
      return { id: key, stage: "swiss", round: 0, a: m.teams[0]!.code, b: m.teams[1]!.code, w: saved?.w, official: true };
    });
    return [...off, ...mine.filter((s) => !s.id.startsWith("off-"))];
  }, [r1, mine]);

  const swiss = all.filter((s) => s.stage === "swiss");
  const field = useMemo(() => [...new Set(r1.flatMap((m) => m.teams.map((t) => t.code)))], [r1]);
  const rec = (code: string, upto: number) => {
    let w = 0, l = 0;
    for (const s of swiss) if (s.round < upto && s.w && (s.a === code || s.b === code)) { if (s.w === code) w++; else l++; }
    return { w, l };
  };
  const played = (code: string, round: number) => swiss.some((s) => s.round === round && (s.a === code || s.b === code));
  const decided = (code: string, round: number) => swiss.some((s) => s.round === round && s.w && (s.a === code || s.b === code));

  const setWinner = (sid: string, code: string) => setMine((cur) => {
    const base = cur.find((s) => s.id === sid);
    const next = (base?.w === code ? undefined : code);
    if (base) return cur.map((s) => (s.id === sid ? { ...s, w: next } : s));
    const from = all.find((s) => s.id === sid)!;
    return [...cur, { ...from, w: next }];
  });
  // Changing or clearing a result drops every later series that depended on it.
  const pickWinner = (s: Series, code: string) => {
    setWinner(s.id, code);
    setMine((cur) => cur.filter((x) => x.id === s.id || x.id.startsWith("off-") || x.stage !== s.stage || x.round <= s.round));
    setSel(null);
  };
  const pair = (stage: "swiss" | "ko", round: number, code: string) => {
    if (sel === null) { setSel(`${stage}:${round}:${code}`); return; }
    const [st, r, a] = sel.split(":");
    if (st !== stage || Number(r) !== round) { setSel(`${stage}:${round}:${code}`); return; }
    if (a === code) { setSel(null); return; }
    setMine((cur) => [...cur, { id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stage, round, a: a!, b: code }]);
    setSel(null);
  };
  const unpair = (sid: string) => { setMine((cur) => { const s = cur.find((x) => x.id === sid); return cur.filter((x) => x.id !== sid && !(s && x.stage === s.stage && x.round > s.round)); }); setSel(null); };
  const reset = () => { if (window.confirm(tx("Clear all your predictions?", "Hapus semua prediksi lu?"))) { setMine([]); setSel(null); } };

  const qualified = field.filter((c) => rec(c, 5).w >= 3).sort();
  const out = field.filter((c) => rec(c, 5).l >= 3);

  const chip = (c: string, active = false, onClick?: () => void) => (
    <button key={c} type="button" onClick={onClick} disabled={!onClick} aria-pressed={active}
      className={clsx("flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs", active ? "border-gold bg-gold/15 text-gold" : "border-line hover:text-gold", !onClick && "cursor-default hover:text-inherit")}>
      <TeamLogo team={tm(c)} size={18} />{c}
    </button>
  );

  const seriesCard = (s: Series, tag?: string) => (
    <div key={s.id} className="card p-2 text-sm">
      <div className="mb-1 flex items-center justify-between text-[0.65rem] uppercase tracking-wider text-fog">
        <span>{tag ?? (s.official ? tx("Official pairing", "Pairing resmi") : tx("Your pairing", "Pairing lu"))}</span>
        {!s.official && <button type="button" aria-label={tx("Remove pairing", "Hapus pairing")} onClick={() => unpair(s.id)} className="px-1 hover:text-ember">×</button>}
      </div>
      {[s.a, s.b].map((c) => (
        <button key={c} type="button" aria-pressed={s.w === c} onClick={() => pickWinner(s, c)}
          className={clsx("mb-1 flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left last:mb-0", s.w === c && "bg-gold/15 ring-1 ring-gold/60 text-gold", s.w && s.w !== c && "opacity-45")}>
          <span className="flex items-center gap-2"><TeamLogo team={tm(c)} size={22} />{c}</span>
          <span className="text-[0.65rem] text-fog">{s.w === c ? tx("Winner", "Menang") : tx("Pick", "Pilih")}</span>
        </button>
      ))}
    </div>
  );

  // Pool of teams waiting for a pairing in a given round, grouped by record.
  const bucketsFor = (round: number) => {
    const g = new Map<string, string[]>();
    for (const c of field) {
      const r = rec(c, round);
      if (r.w >= 3 || r.l >= 3) continue;
      if (round > 0 && !decided(c, round - 1)) continue;
      const k = `${r.w}-${r.l}`;
      g.set(k, [...(g.get(k) ?? []), c]);
    }
    return [...g.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  };

  const swissColumn = (round: number) => {
    const buckets = bucketsFor(round);
    const started = round === 0 || buckets.length > 0;
    return (
      <div key={round} className="card min-w-[15rem] shrink-0 p-3" style={{ width: "15.5rem" }}>
        <p className="eyebrow mb-2">{tx("Round", "Ronde")} {round + 1}</p>
        {round === 0 && r1.length === 0 && <p className="text-sm text-fog">{tx("Round 1 pairings are not announced yet.", "Pairing ronde 1 belum diumumkan.")}</p>}
        {round > 0 && !started && <p className="text-sm text-fog">{tx("Waiting for your Round " + round + " picks.", "Menunggu pilihan ronde " + round + " lu.")}</p>}
        <div className="grid gap-3">
          {round === 0
            ? swiss.filter((s) => s.round === 0).map((s) => seriesCard(s))
            : buckets.map(([k, teams]) => {
              const bs = swiss.filter((s) => s.round === round && teams.includes(s.a) && teams.includes(s.b));
              const free = teams.filter((c) => !played(c, round));
              return (
                <div key={k}>
                  <p className="mb-1 text-[0.7rem] text-fog"><span className="font-semibold text-snow">{k}</span> · {teams.length} {tx("teams", "tim")}</p>
                  <div className="grid gap-2">{bs.map((s) => seriesCard(s))}</div>
                  {free.length > 0 && (
                    <div className="mt-2 rounded-lg border border-dashed border-line p-2">
                      <p className="mb-1.5 text-[0.68rem] text-fog">{tx("Pairing: waiting for the official draw. Tap two teams to make your own pairing.", "Pairing: menunggu undian resmi. Tap dua tim untuk bikin pairing sendiri.")}</p>
                      <div className="flex flex-wrap gap-1.5">{free.map((c) => chip(c, sel === `swiss:${round}:${c}`, () => pair("swiss", round, c)))}</div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  // Knockouts: pool = qualifiers, then winners of the previous round. Pairings are the user's own.
  const ko = all.filter((s) => s.stage === "ko");
  const koPool = (round: number): string[] => round === 0 ? qualified : ko.filter((s) => s.round === round - 1 && s.w).map((s) => s.w!);
  const koColumn = (round: number) => {
    const pool = koPool(round);
    const need = round === 0 ? 8 : round === 1 ? 4 : 2;
    const bs = ko.filter((s) => s.round === round);
    const free = pool.filter((c) => !bs.some((s) => s.a === c || s.b === c));
    return (
      <div key={round} className="card min-w-[15rem] shrink-0 p-3" style={{ width: "15.5rem" }}>
        <p className="eyebrow mb-2">{KO_NAMES[round]}</p>
        {pool.length < need && <p className="text-sm text-fog">{round === 0 ? tx(`Waiting for ${need - pool.length} more qualified teams from your Swiss picks.`, `Menunggu ${need - pool.length} tim lolos lagi dari pilihan Swiss lu.`) : tx("Waiting for your previous round picks.", "Menunggu pilihan ronde sebelumnya.")}</p>}
        <div className="grid gap-2">{bs.map((s) => seriesCard(s))}</div>
        {free.length > 0 && pool.length >= need && (
          <div className="mt-2 rounded-lg border border-dashed border-line p-2">
            <p className="mb-1.5 text-[0.68rem] text-fog">{tx("Official bracket draw not used here. Tap two teams to pair them.", "Undian bracket resmi gak dipakai di sini. Tap dua tim untuk dipasangkan.")}</p>
            <div className="flex flex-wrap gap-1.5">{free.map((c) => chip(c, sel === `ko:${round}:${c}`, () => pair("ko", round, c)))}</div>
          </div>
        )}
      </div>
    );
  };
  const champ = ko.find((s) => s.round === 2 && s.w)?.w;

  return (
    <div className="mt-6">
      <p className="mb-4 rounded-lg border border-gold/40 bg-gold/5 p-3 text-sm">{tx("These are your own predictions, saved only in this browser. They are separate from official results, which live on the Standings page.", "Ini prediksi lu sendiri, disimpan cuma di browser ini. Terpisah dari hasil resmi yang ada di halaman Klasemen.")}</p>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Stage" className="flex gap-2"><Pill active={tab === "swiss"} onClick={() => setTab("swiss")}>Swiss</Pill><Pill active={tab === "ko"} onClick={() => setTab("ko")}>{tx("Knockouts", "Knockout")}</Pill></div>
        <button type="button" onClick={reset} className="ml-auto rounded-full border border-ember/50 px-3 py-1 text-sm text-ember hover:bg-ember/10">Reset</button>
      </div>

      {tab === "swiss" ? (
        <>
          <p className="mb-3 text-sm text-fog">{tx("Round 1 is the official draw from the schedule. For later rounds your picks fill the record groups (1-0, 0-1, 2-1 and so on). The official pairing rules are not applied, so you choose who plays whom.", "Ronde 1 dari undian resmi di jadwal. Untuk ronde berikutnya pilihan lu mengisi grup rekor (1-0, 0-1, 2-1 dst). Aturan pairing resmi gak dipakai, jadi lu yang nentuin siapa lawan siapa.")}</p>
          {r1.length > 0 && <p className="mb-3 text-xs text-fog">{tx("Round 1 time:", "Jadwal ronde 1:")} {fmtDateTime(r1[0]!.startTime, prefs.tz)}{r1.some((m) => officialWinner(m)) ? tx(" · official results exist, see Standings", " · hasil resmi sudah ada, lihat Klasemen") : ""}</p>}
          <div role="region" aria-label="Swiss predictor" tabIndex={0} className="overflow-x-auto pb-3">
            <div className="flex gap-3">
              {[0, 1, 2, 3, 4].map((r) => swissColumn(r))}
              <div className="grid min-w-[15rem] shrink-0 content-start gap-3" style={{ width: "15.5rem" }}>
                <div className="card border-gold/50 p-3"><p className="eyebrow mb-2 text-gold">{tx("Qualified (3 wins)", "Lolos (3 menang)")} · {qualified.length}/8</p><div className="flex flex-wrap gap-1.5">{qualified.length ? qualified.map((c) => chip(c)) : <span className="text-sm text-fog">{tx("No teams yet", "Belum ada tim")}</span>}</div></div>
                <div className="card p-3 opacity-80"><p className="eyebrow mb-2">{tx("Eliminated (3 losses)", "Tersingkir (3 kalah)")} · {out.length}</p><div className="flex flex-wrap gap-1.5">{out.length ? out.map((c) => chip(c)) : <span className="text-sm text-fog">{tx("No teams yet", "Belum ada tim")}</span>}</div></div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-fog">{tx("Your qualified teams from the Swiss tab go here. Pair them yourself, then pick winners to the final.", "Tim lolos dari tab Swiss masuk ke sini. Pasangkan sendiri, lalu pilih pemenang sampai final.")}</p>
          <div role="region" aria-label="Knockout predictor" tabIndex={0} className="overflow-x-auto pb-3"><div className="flex gap-3">{[0, 1, 2].map((r) => koColumn(r))}
            <div className="card min-w-[15rem] shrink-0 border-gold/50 p-3" style={{ width: "15.5rem" }}><p className="eyebrow mb-2 text-gold">{tx("Your champion", "Juara prediksi lu")}</p>{champ ? <div className="flex items-center gap-3 text-lg"><TeamLogo team={tm(champ)} size={40} />{tm(champ).name ?? champ}</div> : <p className="text-sm text-fog">{tx("Not picked yet", "Belum dipilih")}</p>}</div>
          </div></div>
        </>
      )}
    </div>
  );
}
