"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Match, SyncRun } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="card mx-auto mt-16 grid max-w-sm gap-4 p-6" onSubmit={async (e) => {
      e.preventDefault();
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
      if (r.ok) router.replace("/admin"); else setErr(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? "Login failed");
    }}>
      <h1 className="display text-3xl">Admin</h1>
      <label className="grid gap-1 text-sm text-fog">Password<input type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-snow" /></label>
      {err && <p role="alert" className="text-sm text-ember">{err}</p>}
      <button className="rounded-full border border-gold px-4 py-2 text-gold hover:bg-gold/10">Sign in</button>
    </form>
  );
}

type Ov = { matchId: string; patch: Record<string, unknown>; createdAt: string };

export function Dashboard({ runs, overrides, matches, storage, stale }: { runs: SyncRun[]; overrides: Ov[]; matches: Match[]; storage: string; stale: string[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [id, setId] = useState(matches[0]?.id ?? "");
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const call = async (url: string, method: string, data?: unknown, label = "Saved") => {
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: data ? JSON.stringify(data) : undefined });
    setMsg(r.ok ? label : ((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? "Failed");
    if (r.ok) router.refresh();
  };
  const field = "rounded-lg border border-line bg-surface px-3 py-2 text-sm";
  return (
    <div className="grid gap-6 py-10">
      <div className="flex items-center justify-between"><h1 className="display text-4xl">Admin</h1><button className="text-sm text-fog underline" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); }}>Sign out</button></div>
      <p className="text-sm text-fog" aria-live="polite">Storage: <strong className="text-snow">{storage}</strong>{storage !== "supabase" && " (edits disabled until Supabase is configured)"} {msg && <span className="ml-3 text-gold">{msg}</span>}</p>
      {stale.length > 0 && <p className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-gold">{stale.length} manual override(s) are held back because the official source changed after the edit: {stale.join(", ")}. Remove or re-apply them.</p>}
      <section className="card grid gap-3 p-5"><h2 className="display text-2xl">Manual result or time correction</h2>
        <p className="text-sm text-fog">Applies only until the official source changes this match. It never overwrites newer official data.</p>
        <select aria-label="Match" value={id} onChange={(e) => setId(e.target.value)} className={field}>{matches.map((m) => <option key={m.id} value={m.id}>{m.teams[0].code} vs {m.teams[1].code} · {m.startTime.slice(0, 16)} · {m.stage}</option>)}</select>
        <div className="flex gap-2"><input aria-label="Team A wins" type="number" min={0} max={4} value={a} onChange={(e) => setA(e.target.value)} placeholder="A wins" className={field} /><input aria-label="Team B wins" type="number" min={0} max={4} value={b} onChange={(e) => setB(e.target.value)} placeholder="B wins" className={field} /></div>
        <button className="w-fit rounded-full border border-gold px-4 py-2 text-sm text-gold" onClick={() => call("/api/admin/override", "POST", { matchId: id, patch: { wins: [Number(a), Number(b)], note: "manual" } })}>Save override</button>
        <ul className="text-sm text-fog">{overrides.map((o) => <li key={o.matchId} className="flex justify-between py-1"><span>{o.matchId} · {JSON.stringify(o.patch)} · {o.createdAt.slice(0, 16)}</span><button className="underline" onClick={() => call(`/api/admin/override?matchId=${encodeURIComponent(o.matchId)}`, "DELETE", undefined, "Removed")}>remove</button></li>)}</ul>
      </section>
      <section className="card grid gap-3 p-5"><h2 className="display text-2xl">Editorial recap</h2>
        <input aria-label="Title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        <textarea aria-label="Body" rows={5} placeholder="Recap text (labeled Editorial on the site)" value={body} onChange={(e) => setBody(e.target.value)} className={field} />
        <button className="w-fit rounded-full border border-gold px-4 py-2 text-sm text-gold" onClick={() => call("/api/admin/recap", "POST", { matchId: id, title, body })}>Publish recap for selected match</button>
      </section>
      <section className="card overflow-x-auto p-5"><h2 className="display mb-3 text-2xl">Sync health</h2>
        <table className="w-full text-sm"><thead className="text-left text-xs uppercase text-fog"><tr><th className="py-1">Started</th><th>Trigger</th><th>OK</th><th>Seen</th><th>Changed</th><th>Tries</th><th>Error</th></tr></thead>
          <tbody>{runs.map((r) => <tr key={r.id} className="border-t border-line/50"><td className="py-1">{r.startedAt.slice(0, 19)}Z</td><td>{r.trigger}</td><td className={r.ok ? "text-emerald-400" : "text-ember"}>{r.ok ? "yes" : "no"}</td><td>{r.matchesSeen}</td><td>{r.matchesChanged}</td><td>{r.attempts}</td><td className="text-fog">{r.error}</td></tr>)}{runs.length === 0 && <tr><td colSpan={7} className="py-3 text-fog">No sync runs recorded.</td></tr>}</tbody></table></section>
    </div>
  );
}
