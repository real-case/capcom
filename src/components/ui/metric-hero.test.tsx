import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { MetricHero } from "./metric-hero";

test("renders the value", () => {
  render(<MetricHero>12,480</MetricHero>);
  expect(screen.getByText("12,480")).toBeInTheDocument();
});

test("renders the optional label", () => {
  render(<MetricHero label="Active users">12,480</MetricHero>);
  expect(screen.getByText("Active users")).toBeInTheDocument();
});

test("renders the value at the metric-hero type role", () => {
  render(<MetricHero>12,480</MetricHero>);
  expect(screen.getByText("12,480")).toHaveClass("text-metric-hero");
});
