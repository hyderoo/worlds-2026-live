"use client";
import { useCallback, useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs";

type Status = "checking" | "unsupported" | "off" | "on" | "denied" | "error";

function b64(key: string) {
  const pad = "=".repeat((4 - (key.length % 4)) % 4);
  const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Opt-in browser push for followed teams. Nothing is requested until the user taps Turn on. */
export function NotifyPanel() {
  const { prefs } = usePrefs();
  const [status, setStatus] = useState<Status>("checking");
  const [msg, setMsg] = useState("");

  const post = useCallback(async (sub: PushSubscription) => {
    const j = sub.toJSON();
    const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: { endpoint: j.endpoint, keys: j.keys }, watch: prefs.watch, spoiler: prefs.spoiler }) });
    if (!r.ok) throw new Error(`server ${r.status}`);
  }, [prefs.watch, prefs.spoiler]);

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
      <h2 id="notif-h" className="mb-1 font-medium">Match notifications</h2>
      <p className="mb-3 text-sm text-fog">Browser push for teams you follow (the Follow buttons below): starting soon, live, and result. Off by default. Your browser asks permission only when you tap Turn on. {prefs.spoiler ? "Spoiler mode is on, so result alerts will not include the score." : "With spoiler mode on, result alerts leave out the score."}</p>
      {status === "unsupported" && <p className="text-sm text-fog">This browser does not support push notifications. On iPhone, add the site to the Home Screen first, then open it from there.</p>}
      {status === "denied" && <p className="text-sm text-fog">Notifications are blocked for this site. Allow them in your browser site settings, then come back.</p>}
      {(status === "off" || status === "error") && <button onClick={enable} disabled={none} className="rounded-full border border-gold px-4 py-2 text-sm text-gold disabled:cursor-not-allowed disabled:opacity-50">Turn on notifications</button>}
      {status === "off" && none && <p className="mt-2 text-xs text-fog">Follow at least one team first.</p>}
      {status === "on" && <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-gold">On for {prefs.watch.length} team{prefs.watch.length === 1 ? "" : "s"}{none ? " (follow a team to get alerts)" : ""}</span><button onClick={disable} className="rounded-full border border-line px-4 py-2 text-sm text-fog hover:text-snow">Turn off</button></div>}
      {status === "error" && <p className="mt-2 text-sm text-red-300" role="alert">{msg}</p>}
      <p className="mt-3 text-xs text-fog">Alerts go out within about 5 minutes of a change, based on the official schedule feed. Email alerts are not offered.</p>
    </section>
  );
}
