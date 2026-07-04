import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "./date-range-picker";

test("shows the placeholder when no range is selected", () => {
  render(<DateRangePicker placeholder="Pick a range" />);
  expect(
    screen.getByRole("button", { name: /Pick a range/ }),
  ).toBeInTheDocument();
});

test("formats a complete range on the trigger", () => {
  const value: DateRange = {
    from: new Date(2026, 6, 8),
    to: new Date(2026, 6, 14),
  };
  render(<DateRangePicker value={value} onValueChange={() => {}} />);
  expect(screen.getByRole("button")).toHaveTextContent("–");
});
