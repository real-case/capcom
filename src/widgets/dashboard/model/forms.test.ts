import { describe, expect, it } from "vitest";

import { dashboardFormSchema, reportFormSchema } from "./forms";

describe("dashboard create-form schemas (ADR 0017/0020)", () => {
  it("reportFormSchema accepts a name + a valid kind", () => {
    expect(
      reportFormSchema.safeParse({ name: "Sign-ups", kind: "trends" }).success,
    ).toBe(true);
  });

  it("reportFormSchema rejects an empty name and an unknown kind", () => {
    expect(
      reportFormSchema.safeParse({ name: "", kind: "trends" }).success,
    ).toBe(false);
    expect(
      reportFormSchema.safeParse({ name: "ok", kind: "heatmap" }).success,
    ).toBe(false);
  });

  it("reportFormSchema trims the name", () => {
    const parsed = reportFormSchema.parse({
      name: "  Sign-ups  ",
      kind: "funnel",
    });
    expect(parsed.name).toBe("Sign-ups");
  });

  it("dashboardFormSchema accepts a name and rejects an empty one", () => {
    expect(dashboardFormSchema.safeParse({ name: "Growth" }).success).toBe(
      true,
    );
    expect(dashboardFormSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});
