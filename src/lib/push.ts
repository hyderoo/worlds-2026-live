import { createHash } from "node:crypto";
import webpush from "web-push";
import { config } from "./config";
import type { Store } from "./store";
import type { Match } from "./types";

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushRecord = { sub: PushSub; watch: string[]; spoiler: boolean; createdAt: string };

const SUB_PREFIX = "push:sub:";
export const MAX_SUBS = 500;

/** Browsers only use these push services. Anything else is refused so the server never posts to arbitrary URLs. */
export function allowedEndpoint(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname;
    return h === "fcm.googleapis.com" || h.endsWith(".push.services.mozilla.com") || h.endsWith(".push.apple.com") || h.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

export const subKey = (endpoint: string) => SUB_PREFIX + createHash("sha256").update(endpoint).digest("hex").slice(0, 32);

/** VAPID keys are generated once on the server and kept in the database, so no secret env var is needed. */
export async function getVapid(store: Store): Promise<{ publicKey: string; privateKey: string }> {
  const ex = await store.loadExtras();
  const have = ex["push:vapid"] as { publicKey: string; privateKey: string } | undefined;
  if (have?.publicKey && have.privateKey) return have;
  const k = webpush.generateVAPIDKeys();
  await store.saveExtra("push:vapid", k);
  return k;
}

export type Event = { key: string; kind: "soon" | "live" | "final"; match: Match };

/** Which notifications are due now. Pure, so it can be tested. */
export function dueEvents(matches: Match[], now: Date): Event[] {
  const out: Event[] = [];
  for (const m of matches) {
    if (m.teams.some((t) => t.code === "TBD")) continue;
    const start = new Date(m.startTime).getTime();
    const mins = (start - now.getTime()) / 60_000;
    if (m.upstreamState === "unstarted" || m.state === "scheduled") {
      if (mins > 0 && mins <= 15) out.push({ key: `${m.id}:soon`, kind: "soon", match: m });
    } else if (m.state === "live") {
      out.push({ key: `${m.id}:live`, kind: "live", match: m });
    } else if (m.state === "completed" && now.getTime() - new Date(m.upstreamChangedAt).getTime() < 45 * 60_000) {
      out.push({ key: `${m.id}:final`, kind: "final", match: m });
    }
  }
  return out;
}

export function payloadFor(e: Event, spoiler: boolean, now: Date) {
  const [a, b] = e.match.teams;
  const vs = `${a!.name} vs ${b!.name}`;
  const url = `/matches/${e.match.id}`;
  if (e.kind === "soon") return { title: "Starting soon", body: `${vs} in about ${Math.max(1, Math.round((new Date(e.match.startTime).getTime() - now.getTime()) / 60_000))} min`, url, tag: e.key };
  if (e.kind === "live") return { title: "Live now", body: vs, url, tag: e.key };
  return { title: "Result is in", body: spoiler ? `${vs}. Open to see the result.` : `${a!.name} ${a!.wins ?? 0} - ${b!.wins ?? 0} ${b!.name}`, url, tag: e.key };
}

export async function sendDueNotifications(store: Store, matches: Match[], now: Date): Promise<number> {
  const ex = await store.loadExtras();
  const subs = Object.entries(ex).filter(([k]) => k.startsWith(SUB_PREFIX)) as [string, PushRecord][];
  if (subs.length === 0) return 0;
  const events = dueEvents(matches, now);
  const sent = new Set((ex["push:sent"] as string[] | undefined) ?? []);
  const fresh = events.filter((e) => !sent.has(e.key));
  if (fresh.length === 0) return 0;
  const vapid = await getVapid(store);
  webpush.setVapidDetails(config.siteUrl.startsWith("https") ? config.siteUrl : "https://worlds-2026-live.vercel.app", vapid.publicKey, vapid.privateKey);
  let n = 0;
  for (const e of fresh) {
    const codes = new Set(e.match.teams.map((t) => t.code));
    for (const [k, rec] of subs) {
      if (!rec.watch.some((c) => codes.has(c))) continue;
      try {
        await webpush.sendNotification(rec.sub, JSON.stringify(payloadFor(e, rec.spoiler, now)), { TTL: 600, urgency: "normal", timeout: 8000 });
        n++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await store.deleteExtra(k).catch(() => undefined);
      }
    }
    sent.add(e.key);
  }
  await store.saveExtra("push:sent", [...sent].slice(-400));
  return n;
}
