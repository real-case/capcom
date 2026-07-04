import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Card, CardContent, CardHeader, CardTitle } from "./card";

test("renders header and content", () => {
  render(
    <Card>
      <CardHeader>
        <CardTitle>Metric</CardTitle>
      </CardHeader>
      <CardContent>Value</CardContent>
    </Card>,
  );
  expect(screen.getByText("Metric")).toBeInTheDocument();
  expect(screen.getByText("Value")).toBeInTheDocument();
});

test("reflects the density axis on the card element", () => {
  const { container } = render(<Card size="sm">Body</Card>);
  expect(container.querySelector('[data-slot="card"]')).toHaveAttribute(
    "data-size",
    "sm",
  );
});
