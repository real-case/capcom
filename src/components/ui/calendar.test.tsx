import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import { Calendar } from "./calendar";

const MONTH = new Date(2026, 6, 1); // July 2026

test("renders a month grid of day cells", () => {
  const { container } = render(
    <Calendar mode="single" defaultMonth={MONTH} today={MONTH} />,
  );
  const days = container.querySelectorAll("button[data-day]");
  expect(days.length).toBeGreaterThan(27);
});

test("marks the selected day", () => {
  const { container } = render(
    <Calendar
      mode="single"
      selected={new Date(2026, 6, 10)}
      defaultMonth={MONTH}
      today={MONTH}
    />,
  );
  expect(
    container.querySelector('[data-selected-single="true"]'),
  ).not.toBeNull();
});
