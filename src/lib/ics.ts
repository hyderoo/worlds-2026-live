import type { Match } from "./types";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

/** Estimated end time. Bo1 ~1h, otherwise ~1h per possible game. Labeled as an estimate in the description. */
export function buildIcs(matches: Match[], siteUrl: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Worlds 2026 Live//EN", "CALSCALE:GREGORIAN"];
  for (const m of matches) {
    const start = new Date(m.startTime);
    const end = new Date(start.getTime() + Math.min(m.bestOf, 5) * 3600_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@worlds-2026-live`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`Worlds 2026: ${m.teams[0].code} vs ${m.teams[1].code}`)}`,
      `DESCRIPTION:${esc(`${m.stage} - Bo${m.bestOf}. End time is an estimate. ${siteUrl}/matches/${m.id}`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
