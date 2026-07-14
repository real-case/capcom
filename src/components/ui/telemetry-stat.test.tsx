import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TelemetryStat } from "./telemetry-stat";

describe("TelemetryStat", () => {
  it("renders label, mono value and status dot", () => {
    render(
      <TelemetryStat label="Ingestion" level="warning">
        1,240/min
      </TelemetryStat>,
    );

    // The label lives inside the StatusIndicator pill at the given level.
    const label = screen.getByText("Ingestion");
    const pill = label.closest("[data-slot='status-indicator']");
    expect(pill).not.toBeNull();
    expect(pill).toHaveClass("text-status-warning-fg");

    // The value renders through MonoData (the geist-mono value leaf).
    const value = screen.getByText("1,240/min");
    expect(value).toHaveAttribute("data-slot", "mono-data");
  });

  it("defaults to the nominal level", () => {
    render(<TelemetryStat label="RLS">enforced</TelemetryStat>);

    const pill = screen
      .getByText("RLS")
      .closest("[data-slot='status-indicator']");
    expect(pill).toHaveClass("text-status-nominal-fg");
  });
});
