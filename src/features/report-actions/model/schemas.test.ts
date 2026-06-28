import { describe, expect, it } from "vitest";

import {
  addReportInput,
  createDashboardInput,
  createReportInput,
  renameReportInput,
  reorderInput,
} from "./schemas";

const UUID = "00000000-0000-0000-0000-000000000001";

describe("report-action input schemas (ADR 0017/0090)", () => {
  it("createReportInput requires a uuid project, a name, a kind, and an object config", () => {
    expect(
      createReportInput.safeParse({
        projectId: UUID,
        name: "Daily views",
        kind: "trends",
        config: { event: "page_view" },
      }).success,
    ).toBe(true);

    expect(
      createReportInput.safeParse({
        projectId: "not-a-uuid",
        name: "n",
        kind: "trends",
        config: {},
      }).success,
    ).toBe(false);
  });

  it("renameReportInput requires a uuid id and a non-empty name", () => {
    expect(renameReportInput.safeParse({ id: UUID, name: "New" }).success).toBe(
      true,
    );
    expect(renameReportInput.safeParse({ id: UUID, name: "" }).success).toBe(
      false,
    );
  });

  it("createDashboardInput requires a uuid project and a name", () => {
    expect(
      createDashboardInput.safeParse({ projectId: UUID, name: "Board" })
        .success,
    ).toBe(true);
    expect(
      createDashboardInput.safeParse({ projectId: UUID, name: "" }).success,
    ).toBe(false);
  });

  it("addReportInput requires a non-negative integer position", () => {
    expect(
      addReportInput.safeParse({
        projectId: UUID,
        dashboardId: UUID,
        reportId: UUID,
        position: 0,
      }).success,
    ).toBe(true);
    expect(
      addReportInput.safeParse({
        projectId: UUID,
        dashboardId: UUID,
        reportId: UUID,
        position: -1,
      }).success,
    ).toBe(false);
  });

  it("reorderInput requires at least one item id", () => {
    expect(
      reorderInput.safeParse({ dashboardId: UUID, orderedItemIds: [UUID] })
        .success,
    ).toBe(true);
    expect(
      reorderInput.safeParse({ dashboardId: UUID, orderedItemIds: [] }).success,
    ).toBe(false);
  });
});
