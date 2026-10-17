"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSnapshot } from "./providers";
import { Empty, SpoilerGate } from "./ui";
import { fmtDateTime } from "@/lib/format";
import { usePrefs, useT } from "@/lib/prefs";

type Creds = { memberId: string; token: string; name: string };
const KEY = "w26:groups:v1";
const readAll = (): Record<string, Creds> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const saveCreds = (id: string, c: Creds) => { try { localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [id]: c })); } catch { /* storage blocked */ } };
const forget = (id: string) => { const a = readAll(); delete a[id]; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ } };

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm";
const btn = "rounded-full border border-gold px-4 py-2 text-sm text-gold hover:bg-gold/10 disabled:opacity-50";

function Notice() {
  const { t } = useT();
  return <p className="mb-6 rounded-lg border border-line bg-white/[0.03] p-3 text-sm text-fog">{t("grp.notice")}</p>;
}

export function GroupsHome() {
  const { t } = useT();
  const router = useRouter();
  const [mine, setMine] = useState<[string, Creds][]>([]);
  const [league, setLeague] = useState("");
  const [me, setMe] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { const x = setTimeout(() => setMine(Object.entries(readAll())), 0); return () => clearTimeout(x); }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch("/api/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: league, displayName: me }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      saveCreds(j.id, { memberId: j.memberId, token: j.token, name: me });
      router.push(`/groups/${j.id}`);
    } catch (x) { setErr(x instanceof Error ? x.message : "Failed"); setBusy(false); }
  }
  return (
    <div className="mt-6">
      <header className="mb-6"><h1 className="display text-4xl">{t("grp.title")}</h1></header>
      <Notice />
      {mine.length > 0 && (
        <section className="mb-8" aria-labelledby="my-l"><h2 id="my-l" className="display mb-3 text-2xl">Your leagues</h2>
          <ul className="grid gap-2">{mine.map(([id, c]) => <li key={id}><Link href={`/groups/${id}`} className="card block p-3 hover:border-gold">League {id} · you are {c.name}</Link></li>)}</ul>
        </section>
      )}
      <form onSubmit={create} className="card grid max-w-md gap-3 p-5">
        <h2 className="display text-2xl">{t("grp.create")}</h2>
        <label className="grid gap-1 text-sm">{t("grp.leagueName")}<input required maxLength={40} value={league} onChange={(e) => setLeague(e.target.value)} className={field} /></label>
        <label className="grid gap-1 text-sm">{t("grp.name")}<input required maxLength={24} value={me} onChange={(e) => setMe(e.target.value)} className={field} /></label>
        <button disabled={busy} className={btn}>{t("grp.create")}</button>
        {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      </form>
    </div>
  );
}

type Data = { id: string; name: string; members: { id: string; name: string; points: number; settled: number; picks: number }[]; revealed: Record<string, Record<string, string>>; me: { id: string; name: string; picks: Record<string, string> } | null };

export function GroupView({ id }: { id: string }) {
  const { t } = useT();
  const { snap } = useSnapshot();
  const { prefs } = usePrefs();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [limit, setLimit] = useState(12);

  const load = useCallback(async () => {
    const c = readAll()[id];
    try {
      const r = await fetch(`/api/groups/${id}`, { cache: "no-store", headers: c ? { "x-w26-member": c.memberId, "x-w26-token": c.token } : {} });
      if (r.status === 404) { setState("missing"); return; }
      if (!r.ok) throw new Error(String(r.status));
      setData(await r.json()); setNowMs(Date.now()); setState("ok");
    } catch { setState("error"); }
  }, [id]);
  useEffect(() => { const x = setTimeout(() => void load(), 0); const i = setInterval(() => void load(), 60_000); return () => { clearTimeout(x); clearInterval(i); }; }, [load]);

  async function join(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch(`/api/groups/${id}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: name }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error ?? "Failed"); return; }
    saveCreds(id, { memberId: j.memberId, token: j.token, name });
    void load();
  }
  async function pick(matchId: string, team: string) {
    const c = readAll()[id];
    if (!c) return;
    const r = await fetch(`/api/groups/${id}/picks`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: c.memberId, token: c.token, matchId, team }) });
    if (!r.ok) setErr((await r.json()).error ?? "Failed");
    else setErr("");
    void load();
  }

  if (state === "loading") return <div className="mt-8 skeleton h-40" aria-hidden />;
  if (state === "missing") return <div className="mt-10"><Empty title="League not found">Check the link, or <Link className="underline" href="/groups">create a new league</Link>.</Empty></div>;
  if (state === "error" || !data) return <div className="mt-10"><Empty title="Could not load this league">Try again in a moment.</Empty></div>;

  const open = snap.matches.filter((m) => m.state === "scheduled" && m.teams.every((x) => x.code !== "TBD") && new Date(m.startTime).getTime() > nowMs).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const shown = open.slice(0, limit);
  const settled = snap.matches.filter((m) => m.state === "completed" && data.me?.picks[m.id] && m.teams.some((x) => x.outcome === "win")).sort((a, b) => b.startTime.localeCompare(a.startTime));
  const link = typeof window !== "undefined" ? `${window.location.origin}/groups/${id}` : "";
  const nameOf = (mid: string) => data.members.find((m) => m.id === mid)?.name ?? "?";

  return (
    <div className="mt-6">
      <header className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{t("grp.title")}</p><h1 className="display mt-1 text-4xl">{data.name}</h1></header>
      <Notice />
      <div className="card mb-6 p-4">
        <p className="mb-2 text-sm text-fog">{t("grp.share")}</p>
        <div className="flex flex-wrap items-center gap-2"><code className="break-all rounded bg-white/5 px-2 py-1 text-xs">{link}</code>
          <button className={btn} onClick={() => { void navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? t("act.copied") : t("act.copyLink")}</button></div>
      </div>

      {!data.me && (
        <form onSubmit={join} className="card mb-6 grid max-w-md gap-3 p-5">
          <h2 className="display text-2xl">{t("grp.join")}</h2>
          <label className="grid gap-1 text-sm">{t("grp.name")}<input required maxLength={24} value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
          <button className={btn}>{t("grp.join")}</button>
          {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
        </form>
      )}

      <section className="mb-8" aria-labelledby="lb">
        <h2 id="lb" className="display mb-3 text-2xl">{t("grp.leaderboard")}</h2>
        <SpoilerGate>
          <div className="card overflow-x-auto"><table className="w-full text-sm">
            <caption className="sr-only">{t("grp.leaderboard")}</caption>
            <thead className="border-b border-line text-xs uppercase tracking-wider text-fog"><tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Points</th><th className="px-3 py-2 text-left">Correct / settled</th><th className="px-3 py-2 text-left">Picks made</th></tr></thead>
            <tbody>{data.members.map((m, i) => <tr key={m.id} className="border-b border-line/50 last:border-0"><td className="px-3 py-2 text-fog">{i + 1}</td><td className="px-3 py-2">{m.name}{data.me?.id === m.id ? " (you)" : ""}</td><td className="px-3 py-2 tabular-nums">{m.points}</td><td className="px-3 py-2 tabular-nums">{m.points} / {m.settled}</td><td className="px-3 py-2 tabular-nums">{m.picks}</td></tr>)}</tbody>
          </table></div>
          <p className="mt-2 text-xs text-fog">1 point for each correct winner pick, counted only from official completed results. Small samples early on mean the order can change a lot.</p>
        </SpoilerGate>
      </section>

      {data.me && (
        <section aria-labelledby="pk">
          <h2 id="pk" className="display mb-3 text-2xl">Your picks</h2>
          {err && <p role="alert" className="mb-2 text-sm text-red-300">{err}</p>}
          {open.length === 0 ? <p className="text-sm text-fog">No upcoming matches with both teams known yet. Picks open when the official schedule names both teams.</p> : (
            <ul className="grid gap-3 sm:grid-cols-2">{shown.map((m) => {
              const mine = data.me!.picks[m.id];
              return (
                <li key={m.id} className="card p-4">
                  <p className="mb-2 text-xs text-fog">{fmtDateTime(m.startTime, prefs.tz)} · {m.stage}</p>
                  <div className="flex gap-2">{m.teams.map((tm) => <button key={tm.code} aria-pressed={mine === tm.code} onClick={() => void pick(m.id, mine === tm.code ? "" : tm.code)} className={`flex-1 rounded-full border px-3 py-2 text-sm ${mine === tm.code ? "border-gold bg-gold/10 text-gold" : "border-line text-fog hover:text-snow"}`}>{tm.name}</button>)}</div>
                </li>
              );
            })}</ul>
          )}
          {open.length > limit && <button className="mt-3 text-sm text-gold underline" onClick={() => setLimit((n) => n + 12)}>{t("pk.more")} ({open.length - limit})</button>}
          <div className="mt-8"><h3 className="display mb-3 text-xl">{t("pk.myResults")}</h3>
            <SpoilerGate>{settled.length === 0 ? <p className="text-sm text-fog">{t("pk.noSettled")}</p> : <ul className="grid gap-2 text-sm">{settled.map((m) => {
              const mine = data.me!.picks[m.id]; const win = m.teams.find((x) => x.outcome === "win")?.code; const ok = mine === win;
              return <li key={m.id} className="card flex items-center justify-between gap-3 p-3"><span>{m.teams[0].code} vs {m.teams[1].code} · <span className="text-fog">{mine}</span></span><span className={ok ? "text-gold" : "text-ember"}>{ok ? t("pk.right") : t("pk.wrong")}</span></li>;
            })}</ul>}</SpoilerGate></div>
          <div className="mt-6 flex flex-wrap gap-2">
            <a className={btn} href={`/card/league/${id}?m=${data.me.id}`} target="_blank" rel="noopener noreferrer">{t("pk.card")}</a>
            <a className={btn} href={`/card/league/${id}?m=${data.me.id}&score=1`} target="_blank" rel="noopener noreferrer">{t("pk.cardScore")}</a>
          </div>
          <p className="mt-2 text-xs text-fog">{t("pk.cardNote")}</p>
          {Object.keys(data.revealed).length > 0 && (
            <div className="mt-8"><h3 className="display mb-3 text-xl">Locked picks (match started)</h3>
              <SpoilerGate><ul className="grid gap-2 text-sm">{Object.entries(data.revealed).map(([mid, ps]) => {
                const m = snap.matches.find((x) => x.id === mid);
                return <li key={mid} className="card p-3"><strong>{m ? `${m.teams[0]!.code} vs ${m.teams[1]!.code}` : mid}</strong>: {Object.entries(ps).map(([u, tm]) => `${nameOf(u)} → ${tm}`).join(", ")}</li>;
              })}</ul></SpoilerGate></div>
          )}
          <button className="mt-6 text-xs text-fog underline" onClick={() => { forget(id); void load(); }}>Forget this league on this device</button>
        </section>
      )}
    </div>
  );
}
