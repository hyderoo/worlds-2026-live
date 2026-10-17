/** Errors that mean the page was built from an older deploy than the server: a hard reload fixes them. */
export const STALE_BUILD = /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch RSC|Failed to load script|importing a module script failed|error loading dynamically/i;

export function reportClientError(e: Error & { digest?: string }) {
  try {
    void fetch("/api/client-error", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ message: `${e.name}: ${e.message}`, digest: e.digest, url: location.pathname + location.search, ua: navigator.userAgent }) });
  } catch { /* logging is best effort */ }
}

/** Reload once per minute at most, so a real bug cannot cause a reload loop. */
export function reloadOnceIfStale(e: Error): boolean {
  if (!STALE_BUILD.test(`${e.name} ${e.message}`)) return false;
  try {
    const last = Number(sessionStorage.getItem("w26:reloaded") ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem("w26:reloaded", String(Date.now()));
  } catch { /* storage blocked: still reload once */ }
  location.reload();
  return true;
}
