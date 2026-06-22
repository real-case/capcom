import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { StatusIndicator } from "./status-indicator";

test("renders its label", () => {
  render(<StatusIndicator>Nominal</StatusIndicator>);
  expect(screen.getByText("Nominal")).toBeInTheDocument();
});

test("applies the level token class", () => {
  render(<StatusIndicator level="critical">Critical</StatusIndicator>);
  expect(screen.getByText("Critical")).toHaveClass("text-status-critical-fg");
});
