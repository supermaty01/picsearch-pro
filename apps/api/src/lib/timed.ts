/**
 * Telemetry timing helper (AGENTS §5, NFR-9). Every pipeline stage runs inside
 * `timed()` so its latency feeds `query_telemetry` and structured logs. Returns
 * both the value and the elapsed milliseconds; the caller decides where the ms
 * lands (a telemetry field, a log line, a response `timings` object).
 */
export interface Timed<T> {
  value: T;
  ms: number;
}

export async function timed<T>(fn: () => Promise<T>): Promise<Timed<T>> {
  const start = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - start };
}

/**
 * Run an async task under a timeout budget. Rejects with the provided error
 * factory if the deadline passes first — used for the agent/rerank budgets that
 * drive the degradation ladder (docs/02 §6). The underlying promise is not
 * cancelled (Workers AI has no abort), but its late result is ignored.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  onTimeout: () => Error,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(onTimeout());
    }, ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
