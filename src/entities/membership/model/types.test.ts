import { describe, expect, it } from "vitest";

import { ROLE_ORDER, ROLE_RANK, roleAtLeast } from "./types";

describe("membership role ladder", () => {
  it("ranks owner > admin > analyst > viewer", () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.analyst);
    expect(ROLE_RANK.analyst).toBeGreaterThan(ROLE_RANK.viewer);
  });

  it("orders roles most-privileged first", () => {
    expect(ROLE_ORDER).toEqual(["owner", "admin", "analyst", "viewer"]);
  });

  it("roleAtLeast is reflexive — a role meets its own threshold", () => {
    for (const role of ROLE_ORDER) {
      expect(roleAtLeast(role, role)).toBe(true);
    }
  });

  it("roleAtLeast lets a higher role clear a lower threshold", () => {
    expect(roleAtLeast("owner", "admin")).toBe(true);
    expect(roleAtLeast("admin", "viewer")).toBe(true);
  });

  it("roleAtLeast denies a lower role a higher threshold", () => {
    expect(roleAtLeast("viewer", "admin")).toBe(false);
    expect(roleAtLeast("analyst", "owner")).toBe(false);
  });
});
