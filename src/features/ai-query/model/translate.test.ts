import { describe, expect, it, vi } from "vitest";

import { translate } from "./translate";

/**
 * The translation orchestration (ADR 0091). Two happy paths matter: the **no-key**
 * fallback (deterministic offline interpreter, no client) and the **stubbed-AI**
 * model path (an injected `chatComplete` returns a canned spec). The real network
 * path stays inert in CI — it is never called here. A model failure (throw or
 * out-of-grammar output) must fall back to the interpreter so the surface never
 * crashes.
 */

const MODEL_SPEC =
  '{"kind":"funnel","config":{"steps":["page_view","sign_up","purchase"],"range":"90d","window":"30d"}}';

describe("translate — no key (offline)", () => {
  it("interprets the prompt via the offline interpreter", async () => {
    const result = await translate("registrations by channel over 30 days", {
      configured: false,
    });
    expect(result).toEqual({
      ok: true,
      engine: "offline",
      spec: {
        kind: "trends",
        config: {
          event: "sign_up",
          range: "30d",
          interval: "day",
          breakdown: "referrer",
        },
      },
    });
  });

  it("returns an unrecognized failure for an off-topic prompt", async () => {
    const result = await translate("what's the weather like?", {
      configured: false,
    });
    expect(result).toEqual({
      ok: false,
      engine: "offline",
      reason: "unrecognized",
    });
  });

  it("treats a blank prompt as unrecognized", async () => {
    const result = await translate("   ", { configured: false });
    expect(result.ok).toBe(false);
  });
});

describe("translate — live model (stubbed)", () => {
  it("uses the injected client and returns the model engine", async () => {
    const chatComplete = vi.fn().mockResolvedValue(MODEL_SPEC);
    const result = await translate("acquisition funnel", {
      configured: true,
      chatComplete,
    });
    expect(chatComplete).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      ok: true,
      engine: "model",
      spec: { kind: "funnel" },
    });
  });

  it("falls back to the offline interpreter when the model throws", async () => {
    const chatComplete = vi.fn().mockRejectedValue(new Error("502 upstream"));
    const result = await translate("weekly retention cohorts", {
      configured: true,
      chatComplete,
    });
    expect(result).toMatchObject({
      ok: true,
      engine: "offline",
      spec: { kind: "retention" },
    });
  });

  it("falls back when the model returns out-of-grammar output", async () => {
    const chatComplete = vi.fn().mockResolvedValue("I can't do that.");
    const result = await translate("sign-ups by device last week", {
      configured: true,
      chatComplete,
    });
    expect(result).toMatchObject({
      ok: true,
      engine: "offline",
      spec: { kind: "trends" },
    });
  });
});
