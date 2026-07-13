import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import { Hairline } from "./hairline";

test("renders a decorative horizontal hairline by default", () => {
  const { container } = render(<Hairline />);
  const el = container.querySelector('[data-slot="hairline"]');
  expect(el).toHaveClass("bg-border-hairline");
  expect(el).toHaveClass("h-px");
});

test("applies the divider tone and vertical orientation", () => {
  const { container } = render(
    <Hairline tone="divider" orientation="vertical" />,
  );
  const el = container.querySelector('[data-slot="hairline"]');
  expect(el).toHaveClass("bg-divider");
  expect(el).toHaveClass("w-px");
});

test("passes role through for the semantic separator case", () => {
  const { getByRole } = render(<Hairline role="separator" />);
  expect(getByRole("separator")).toBeInTheDocument();
});
