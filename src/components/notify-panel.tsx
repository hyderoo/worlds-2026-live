"use client";
import { useCallback, useEffect, useState } from "react";
import { usePrefs, useT } from "@/lib/prefs";
import { useSnapshot } from "./providers";

type Status = "checking" | "unsupported" | "off" | "on" | "denied" | "error";

function b64(key: string) {
  const pad = "=".repeat((4 - (key.length % 4)) % 4);
  const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Opt-in browser push for followed teams. Nothing is requested until the user taps Turn on. */
export function NotifyPanel() {
  const { prefs, set } = usePrefs();
  const { t } = useT();
  const { snap } = useSnapshot();
  const effective = prefs.watch.filter((c) => !prefs.notifyOff.includes(c));
  const watchKey = effective.join(","), kindKey = prefs.nkinds.join(",");
  const [status, setStatus] = useState<Status>("checking");
  const [msg, setMsg] = useState("");

  const post = useCallback(async (sub: PushSubscription) => {
    const j = sub.toJSON();
    const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: { endpoint: j.endpoint, keys: j.keys }, watch: watchKey.split(",").filter(Boolean), spoiler: prefs.spoiler, kinds: kindKey.split(",").filter(Boolean) }) });
    if (!r.ok) throw new Error(`server ${r.status}`);
  }, [watchKey, kindKey, prefs.spoiler]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { queueMicrotask(() => setStatus("unsupported")); return; }
    if (Notification.permission === "denied") { queueMicrotask(() => setStatus("denied")); return; }
    navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { setStatus("on"); post(sub).catch(() => undefined); } else setStatus("off");
    }).catch(() => setStatus("off"));
  }, [post]);

  async function enable() {
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch("/api/push/key")).json();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) }));
      await post(sub);
      setStatus("on");
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "Could not turn on notifications");
    }
  }
  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
      await sub.unsubscribe();
    }
    setStatus("off");
  }

  const none = prefs.watch.length === 0;
  return (
    <section className="card mb-6 p-4" aria-labelledby="notif-h">
      <h2 id="notif-h" className="mb-1 font-medium">{t("notif.title")}</h2>
      <p className="mb-3 text-sm text-fog">Browser push for teams you follow (the Follow buttons below): starting soon, live, and result. Off by default. Your browser asks permission only when you tap Turn on. {prefs.spoiler ? "Spoiler mode is on, so result alerts will not include the score." : "With spoiler mode on, result alerts leave out the score."}</p>
      {status === "unsupported" && <p className="text-sm text-fog">This browser does not support push notifications. On iPhone, add the site to the Home Screen first, then open it from there.</p>}
      {status === "denied" && <p className="text-sm text-fog">Notifications are blocked for this site. Allow them in your browser site settings, then come back.</p>}
      {(status === "off" || status === "error") && <button onClick={enable} disabled={none} className="rounded-full border border-gold px-4 py-2 text-sm text-gold disabled:cursor-not-allowed disabled:opacity-50">{t("notif.turnOn")}</button>}
      {status === "off" && none && <p className="mt-2 text-xs text-fog">Follow at least one team first.</p>}
      {status === "on" && <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-gold">On for {effective.length} team{effective.length === 1 ? "" : "s"}{none ? " (follow a team to get alerts)" : ""}</span><button onClick={disable} className="rounded-full border border-line px-4 py-2 text-sm text-fog hover:text-snow">{t("notif.turnOff")}</button></div>}
      {status === "error" && <p className="mt-2 text-sm text-red-300" role="alert">{msg}</p>}
      {status === "on" && prefs.watch.length > 0 && (
        <div className="mt-4 grid gap-3 text-sm">
          <fieldset><legend className="mb-1 text-xs text-fog">Alert types</legend><div className="flex flex-wrap gap-2">
            {(["soon", "live", "final"] as const).map((k) => { const on = prefs.nkinds.includes(k); return <button key={k} aria-pressed={on} onClick={() => set({ nkinds: on ? prefs.nkinds.filter((x) => x !== k) : [...prefs.nkinds, k] })} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-gold text-gold" : "border-line text-fog"}`}>{t(`notif.${k}` as "notif.soon")}</button>; })}
          </div></fieldset>
          <fieldset><legend className="mb-1 text-xs text-fog">Per team (tap to mute a team)</legend><div className="flex flex-wrap gap-2">
            {prefs.watch.map((c) => { const on = !prefs.notifyOff.includes(c); const name = snap.teams.find((x) => x.code === c)?.name ?? c; return <button key={c} aria-pressed={on} onClick={() => set({ notifyOff: on ? [...prefs.notifyOff, c] : prefs.notifyOff.filter((x) => x !== c) })} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-gold text-gold" : "border-line text-fog line-through"}`}>{name}</button>; })}
          </div></fieldset>
        </div>
      )}
      <p className="mt-3 text-xs text-fog">Alerts go out within about 5 minutes of a change, based on the official schedule feed. Email alerts are not offered.</p>
    </section>
  );
}
