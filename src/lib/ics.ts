import type { Match } from "./types";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");

/** RFC 5545 line folding: lines longer than 75 octets continue on the next line after one space. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  if (cur) out.push(cur);
  return out.join("\r\n ");
}

export const ALARM_CHOICES = [0, 5, 10, 15, 30, 60] as const;

export type IcsOptions = {
  siteUrl: string;
  /** Calendar display name. */
  name?: string;
  /** Minutes before start for a reminder. 0 or undefined = none. */
  alarmMin?: number;
  /** Mark as a subscribable feed (adds refresh hints). */
  feed?: boolean;
};

/**
 * Events are written in UTC, so every calendar app shows them in the device's own time zone (DST included).
 * Titles and descriptions never contain scores. End time is an estimate (about 1h per possible game, capped at 5).
 * UID is stable per match and SEQUENCE/LAST-MODIFIED follow the last upstream change, so time changes update the same event.
 */
export function buildIcs(matches: Match[], siteUrlOrOpts: string | IcsOptions): string {
  const o: IcsOptions = typeof siteUrlOrOpts === "string" ? { siteUrl: siteUrlOrOpts } : siteUrlOrOpts;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Worlds 2026 Live//Fan-made//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  if (o.name) lines.push(`X-WR-CALNAME:${esc(o.name)}`, `NAME:${esc(o.name)}`);
  if (o.feed) lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H");
  for (const m of matches) {
    const start = new Date(m.startTime);
    const end = new Date(start.getTime() + Math.min(m.bestOf, 5) * 3600_000);
    const modified = new Date(m.upstreamChangedAt || m.updatedAt || m.startTime);
    const seq = Math.max(0, Math.floor(modified.getTime() / 60_000));
    const a = m.teams[0].name, b = m.teams[1].name;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@worlds-2026-live`,
      `DTSTAMP:${stamp(modified)}`,
      `LAST-MODIFIED:${stamp(modified)}`,
      `SEQUENCE:${seq}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`${a} vs ${b} (Worlds 2026)`)}`,
      `DESCRIPTION:${esc(`${m.stage}${m.block && m.block !== m.stage ? ` - ${m.block}` : ""} - Bo${m.bestOf}. Start time from the official schedule and can change. End time is an estimate. Fan-made, no scores here. ${o.siteUrl}/matches/${m.id}`)}`,
      `URL:${o.siteUrl}/matches/${m.id}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
    );
    if (o.alarmMin && o.alarmMin > 0) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`${a} vs ${b} starts in ${o.alarmMin} min`)}`, `TRIGGER:-PT${o.alarmMin}M`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
