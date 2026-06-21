import { afterEach, describe, expect, it, vi } from "vitest";

import { ExpectedError, classifyError, logError, logInfo } from "./logger";

// The logger emits one JSON line per call via console.log (stdout) or
// console.error (stderr). Spy on both, parse the line, and assert the shape.
afterEach(() => {
  vi.restoreAllMocks();
});

function captureLog() {
  return vi.spyOn(console, "log").mockImplementation(() => {});
}
function captureError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}
function lastLine(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const call = spy.mock.calls.at(-1);
  return JSON.parse(String(call?.[0])) as Record<string, unknown>;
}

describe("logInfo", () => {
  it("emits a structured JSON line to stdout with a timestamp and context", () => {
    const log = captureLog();

    logInfo("dev server ready", { port: 3000 });

    const entry = lastLine(log);
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("dev server ready");
    expect(entry.port).toBe(3000);
    // ISO-8601 timestamp on every line.
    expect(String(entry.time)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("logError", () => {
  it("logs unexpected errors at error level on stderr", () => {
    const err = captureError();

    logError("boom", new Error("internal detail"), { expected: false });

    const entry = lastLine(err);
    expect(entry.level).toBe("error");
    expect(entry.expected).toBe(false);
    expect(entry.error).toMatchObject({
      name: "Error",
      message: "internal detail",
    });
  });

  it("logs expected errors at warn level on stdout", () => {
    const log = captureLog();

    logError("validation rejected", new Error("nope"), { expected: true });

    const entry = lastLine(log);
    expect(entry.level).toBe("warn");
    expect(entry.expected).toBe(true);
  });

  it("serializes non-Error throwables instead of dropping them", () => {
    const err = captureError();

    logError("weird throw", "a string was thrown", { expected: false });

    expect(lastLine(err).error).toMatchObject({
      name: "NonError",
      message: "a string was thrown",
    });
  });

  it("falls back to classifyError when no explicit `expected` is given", () => {
    const log = captureLog();
    const err = captureError();

    logError("known failure", new ExpectedError("handled"));
    logError("unknown failure", new Error("bug"));

    // ExpectedError → expected (warn/stdout); plain Error → unexpected (error/stderr).
    expect(lastLine(log).expected).toBe(true);
    expect(lastLine(err).expected).toBe(false);
  });
});

// classifyError is the ADR 0019 author-owned policy. These pin the placeholder
// contract; update them when you encode the real classification.
describe("classifyError (default policy)", () => {
  it("treats ExpectedError as expected", () => {
    expect(classifyError(new ExpectedError("x"))).toBe(true);
  });

  it("treats any other throwable as unexpected", () => {
    expect(classifyError(new Error("x"))).toBe(false);
    expect(classifyError("string")).toBe(false);
  });
});
