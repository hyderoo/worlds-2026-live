export const TIMEZONES = [
  { id: "Asia/Jakarta", label: "WIB (Jakarta)", short: "WIB" },
  { id: "Asia/Makassar", label: "WITA (Makassar)", short: "WITA" },
  { id: "Asia/Jayapura", label: "WIT (Jayapura)", short: "WIT" },
  { id: "Asia/Singapore", label: "SGT (Singapore)", short: "SGT" },
  { id: "Asia/Tokyo", label: "JST (Tokyo)", short: "JST" },
  { id: "UTC", label: "UTC", short: "UTC" },
  { id: "Asia/Seoul", label: "KST (Seoul)", short: "KST" },
  { id: "Europe/Paris", label: "CET/CEST (Paris)", short: "CET" },
  { id: "America/New_York", label: "ET (New York)", short: "ET" },
  { id: "America/Los_Angeles", label: "PT (Los Angeles)", short: "PT" },
] as const;
export type TzId = (typeof TIMEZONES)[number]["id"];
export const DEFAULT_TZ: TzId = "Asia/Jakarta";
export const tzShort = (tz: string) => TIMEZONES.find((t) => t.id === tz)?.short ?? tz;
export const tzLabel = (tz: string) => TIMEZONES.find((t) => t.id === tz)?.label ?? tz;

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, key: string, opts: Intl.DateTimeFormatOptions) {
  const k = `${tz}|${key}`;
  let f = cache.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts });
    cache.set(k, f);
  }
  return f;
}
export const fmtTime = (iso: string, tz: string) => fmt(tz, "t", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
export const fmtDay = (iso: string, tz: string) => fmt(tz, "d", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
export const fmtDayLong = (iso: string, tz: string) => fmt(tz, "dl", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
export const fmtDateTime = (iso: string, tz: string) => `${fmtDay(iso, tz)}, ${fmtTime(iso, tz)} ${tzShort(tz)}`;
/** yyyy-mm-dd in the given zone, for grouping */
export const dayKey = (iso: string, tz: string) => fmt(tz, "k", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)).split("/").reverse().join("-");

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function countdownParts(targetIso: string, now = Date.now()) {
  let ms = Math.max(0, new Date(targetIso).getTime() - now);
  const d = Math.floor(ms / 86400000); ms -= d * 86400000;
  const h = Math.floor(ms / 3600000); ms -= h * 3600000;
  const m = Math.floor(ms / 60000); ms -= m * 60000;
  return { d, h, m, s: Math.floor(ms / 1000) };
}

export const matchTitle = (a: string, b: string) => `${a} vs ${b}`;
