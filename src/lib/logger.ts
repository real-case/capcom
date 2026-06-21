/**
 * Structured stdout logger (ADR 0019).
 *
 * Emits one JSON object per line so logs are machine-parseable; on the Vercel
 * runtime (ADR 0009) stdout/stderr are captured as logs. Two rules from 0019
 * shape this module:
 *
 *   1. **Generic client copy, detailed server logs.** This logger runs
 *      server-side and records the *internal* detail (messages, stack traces)
 *      that the error boundaries (`error.tsx` / `global-error.tsx`) must never
 *      show the user.
 *   2. **Expected vs unexpected.** Failures are tagged so logs stay diagnosable:
 *      *expected* failures (validation, not-found, auth rejection) are normal
 *      operation and log at `warn`; *unexpected* ones (bugs, outages) log at
 *      `error` — the ones worth alerting on once an aggregator exists.
 *
 * External error tracking (e.g. Sentry) is deliberately deferred to its own ADR
 * (0019); this stays a dependency-free stdout logger until then.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Arbitrary structured context merged into the log line (e.g. `{ action }`). */
export type LogContext = Record<string, unknown>;

interface LogEntry extends LogContext {
  level: LogLevel;
  message: string;
}

/**
 * Marker base class for *expected* failures — validation, not-found, auth
 * rejection: outcomes that are part of normal operation and are surfaced to the
 * user as a message, not bugs to page on. `classifyError` treats these as
 * expected (logged at `warn`). Throw `new ExpectedError(...)` (or a subclass)
 * for a known failure mode you don't want logged as an outage.
 */
export class ExpectedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ExpectedError";
  }
}

/**
 * Decide whether an error is *expected* (normal operation) or *unexpected* (a
 * bug or outage). ADR 0019 makes this an explicit, author-owned policy — the
 * usefulness of the logs depends on drawing this line deliberately rather than
 * lumping every throwable together.
 *
 * TODO(you — ADR 0019 decision point): implement the classification policy.
 * A reasonable shape to start from:
 *   - return `true` for known/handled failures you surface to the user, e.g.
 *       `error instanceof ExpectedError`,
 *       a Zod `ZodError` (`error?.name === "ZodError"`),
 *       Supabase auth errors you already turn into a user-facing message;
 *   - return `false` for everything else (the safe default) so unknown
 *     throwables stay loud and visible.
 * Callers can always override per-call via `logError(msg, err, { expected })`;
 * this function is only the default when no override is given.
 *
 * The placeholder below treats only `ExpectedError` as expected, so the module
 * is functional and the gate stays green until you encode the real policy.
 */
export function classifyError(error: unknown): boolean {
  // --- replace this placeholder with your policy ---
  return error instanceof ExpectedError;
}

function serializeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      error: { name: error.name, message: error.message, stack: error.stack },
    };
  }
  // Non-Error throwables (strings, objects) still get recorded, never dropped.
  return { error: { name: "NonError", message: String(error) } };
}

function emit(entry: LogEntry): void {
  // `time` first for readability; spread keeps caller context on the line.
  const line = JSON.stringify({ time: new Date().toISOString(), ...entry });
  // stderr for errors, stdout for everything else — both captured as logs.
  if (entry.level === "error") console.error(line);
  else console.log(line);
}

export function logDebug(message: string, context: LogContext = {}): void {
  emit({ level: "debug", message, ...context });
}

export function logInfo(message: string, context: LogContext = {}): void {
  emit({ level: "info", message, ...context });
}

export function logWarn(message: string, context: LogContext = {}): void {
  emit({ level: "warn", message, ...context });
}

/**
 * Log an error with the expected/unexpected distinction (ADR 0019). `expected`
 * is taken from `context.expected` when provided, else from `classifyError`.
 * Expected errors log at `warn`; unexpected at `error`.
 */
export function logError(
  message: string,
  error: unknown,
  context: LogContext = {},
): void {
  const { expected: override, ...rest } = context;
  const expected =
    typeof override === "boolean" ? override : classifyError(error);
  emit({
    level: expected ? "warn" : "error",
    message,
    expected,
    ...serializeError(error),
    ...rest,
  });
}
