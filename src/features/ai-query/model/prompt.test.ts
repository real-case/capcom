import { describe, expect, it } from "vitest";

import { buildMessages, parseModelSpec } from "./prompt";

/**
 * The live-model prompt + safe parser (ADR 0091). Parsing is the injection
 * boundary: only `kind` + `config` are read, extra commentary keys are dropped,
 * and anything outside the closed grammar yields null (→ the caller falls back to
 * the offline interpreter). The network call is not exercised here — `translate`
 * injects a stub.
 */

const VALID_TRENDS =
  '{"kind":"trends","config":{"event":"sign_up","range":"30d","interval":"day","breakdown":"none"}}';

describe("buildMessages", () => {
  it("returns a system + user pair carrying the prompt and the kinds", () => {
    const messages = buildMessages("show sign-ups");
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toContain("trends");
    expect(messages[0]?.content).toContain("segment");
    expect(messages[1]).toEqual({ role: "user", content: "show sign-ups" });
  });
});

describe("parseModelSpec", () => {
  it("parses a bare JSON spec", () => {
    expect(parseModelSpec(VALID_TRENDS)).toEqual({
      kind: "trends",
      config: {
        event: "sign_up",
        range: "30d",
        interval: "day",
        breakdown: "none",
      },
    });
  });

  it("parses a spec wrapped in a ```json code fence", () => {
    const fenced = "```json\n" + VALID_TRENDS + "\n```";
    expect(parseModelSpec(fenced)?.kind).toBe("trends");
  });

  it("extracts a spec from surrounding prose", () => {
    const noisy = `Here is the query you asked for:\n${VALID_TRENDS}\nHope that helps!`;
    expect(parseModelSpec(noisy)?.kind).toBe("trends");
  });

  it("ignores extra commentary keys the model added", () => {
    const withExtra =
      '{"kind":"retention","config":{"range":"90d","period":"week"},"reasoning":"because"}';
    expect(parseModelSpec(withExtra)).toEqual({
      kind: "retention",
      config: { range: "90d", period: "week" },
    });
  });

  it("returns null for an out-of-grammar spec — never coerces", () => {
    expect(
      parseModelSpec('{"kind":"trends","config":{"event":"login"}}'),
    ).toBeNull();
    expect(parseModelSpec('{"kind":"mystery","config":{}}')).toBeNull();
  });

  it("returns null for non-JSON output", () => {
    expect(parseModelSpec("I cannot help with that.")).toBeNull();
    expect(parseModelSpec("")).toBeNull();
  });
});
