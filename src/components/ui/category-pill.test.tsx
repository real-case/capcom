import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CategoryPill } from "./category-pill";

describe("CategoryPill", () => {
  it("renders the hue dot and composes a badge", () => {
    const { container } = render(
      <CategoryPill hue="var(--color-viz-categorical-3)">pro</CategoryPill>,
    );

    // The label renders inside the composed Badge (compositionSignature ["badge"]).
    const label = screen.getByText("pro");
    const badge = label.closest("[data-slot='badge']");
    expect(badge).not.toBeNull();
    expect(badge).toHaveClass("text-text-primary");

    // A decorative (aria-hidden) hue dot leads the label, carrying the viz token.
    const dot = container.querySelector("[data-slot='category-pill-dot']");
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute("aria-hidden");
    // Assert on the inline style attribute string — robust to jsdom's version-dependent
    // handling of a `var()` inside the `background` shorthand.
    expect(dot?.getAttribute("style")).toContain(
      "var(--color-viz-categorical-3)",
    );
  });

  it("renders no dot when no hue is given", () => {
    const { container } = render(<CategoryPill>free</CategoryPill>);

    expect(screen.getByText("free")).toBeInTheDocument();
    expect(
      container.querySelector("[data-slot='category-pill-dot']"),
    ).toBeNull();
  });

  it("forwards className and aria to the composed badge", () => {
    render(
      <CategoryPill className="capitalize" aria-label="plan tier">
        enterprise
      </CategoryPill>,
    );

    const badge = screen.getByText("enterprise").closest("[data-slot='badge']");
    expect(badge).toHaveClass("capitalize");
    expect(badge).toHaveAttribute("aria-label", "plan tier");
  });
});
