/**
 * Client-side staleness guard for the loaded snapshot.
 *
 * `generatedAt` is stamped by the server every time a snapshot (or a page's embedded initial
 * snapshot) is produced, so its age measures how long ago THIS DEVICE last received data from
 * the server - not how fresh the upstream match data is (the header badge covers that). It is
 * what catches the failure mode where an old copy (service-worker page cache, a session kept in
 * memory for days, an offline fallback snapshot) renders with today's locally-computed date and
 * looks current: a cached page from before the bracket draw once presented "To be decided"
 * quarterfinals as if they were today's state.
 *
 * The threshold deliberately exceeds the polling interval (90 s) and the edge-cache window by a
 * wide margin: any snapshot older than this was NOT just served by the server. 30 min keeps the
 * banner quiet during normal background-foreground cycling while still catching same-day drift
 * long before it can misrepresent a match day.
 */
export const SNAPSHOT_STALE_MS = 30 * 60_000;

export function isSnapshotStale(generatedAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(generatedAt);
  return Number.isFinite(t) && now - t > SNAPSHOT_STALE_MS;
}
