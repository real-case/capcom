import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavItem } from "./nav-item";

describe("NavItem", () => {
  it("renders an anchor with its content by default", () => {
    render(<NavItem href="#x">Events</NavItem>);

    const link = screen.getByRole("link", { name: "Events" });
    expect(link).toHaveAttribute("data-slot", "nav-item");
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("sets aria-current and forwards asChild", () => {
    render(
      <NavItem asChild active>
        <a href="#events">Events</a>
      </NavItem>,
    );

    // asChild delegates to the passed <a> — still a single anchor — with the nav
    // styling + data-slot + aria-current merged onto it (radix Slot prop-merge).
    const link = screen.getByRole("link", { name: "Events" });
    expect(link).toHaveAttribute("href", "#events");
    expect(link).toHaveAttribute("data-slot", "nav-item");
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
