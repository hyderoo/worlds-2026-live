export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { attempts?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<{ value: T; attempts: number }> {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 400;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return { value: await fn(i), attempts: i };
    } catch (e) {
      lastErr = e;
      if (i < attempts) await sleep(baseMs * 2 ** (i - 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
