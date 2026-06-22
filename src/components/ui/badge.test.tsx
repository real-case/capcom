import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Badge } from "./badge";

test("renders its label", () => {
  render(<Badge>Stable</Badge>);
  expect(screen.getByText("Stable")).toBeInTheDocument();
});

test("applies the variant token class", () => {
  render(<Badge variant="secondary">Beta</Badge>);
  expect(screen.getByText("Beta")).toHaveClass("bg-secondary");
});
