import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/en.json";

import { TelemetryFooter } from "./TelemetryFooter";

describe("TelemetryFooter", () => {
  it("renders the four reference-dressing telemetry stats", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <TelemetryFooter />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("contentinfo", { name: "System telemetry" }),
    ).toBeInTheDocument();
    for (const label of ["Ingestion", "RLS", "Freshness", "Events"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // A representative illustrative value (static reference dressing, ADR 0083).
    expect(screen.getByText("1,240/min")).toBeInTheDocument();
  });
});
