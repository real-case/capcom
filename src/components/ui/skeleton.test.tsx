import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import { Skeleton } from "./skeleton";

test("renders a shimmer element with the pulse animation", () => {
  const { container } = render(<Skeleton className="h-4 w-24" />);
  const el = container.querySelector('[data-slot="skeleton"]');
  expect(el).not.toBeNull();
  expect(el).toHaveClass("animate-pulse");
});

test("merges the caller's sizing className", () => {
  const { container } = render(<Skeleton className="h-8 w-40" />);
  expect(container.querySelector('[data-slot="skeleton"]')).toHaveClass("w-40");
});
