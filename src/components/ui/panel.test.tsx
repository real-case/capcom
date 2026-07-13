import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Panel } from "./panel";

test("renders its children", () => {
  render(<Panel>Telemetry</Panel>);
  expect(screen.getByText("Telemetry")).toBeInTheDocument();
});

test("applies the default panel surface token class", () => {
  render(<Panel>Default</Panel>);
  expect(screen.getByText("Default")).toHaveClass("bg-surface-panel");
});

test("applies the elevated surface token class", () => {
  render(<Panel surface="elevated">Elevated</Panel>);
  expect(screen.getByText("Elevated")).toHaveClass("bg-surface-elevated");
});
