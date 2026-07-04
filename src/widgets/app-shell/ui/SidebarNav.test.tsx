import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  usePathname,
  Link: ({
    href,
    children,
    ...props
  }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { SidebarNav } from "./SidebarNav";

function renderNav() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SidebarNav projectId="p1" />
    </NextIntlClientProvider>,
  );
}

describe("SidebarNav", () => {
  it("renders one link per section, routed under the project", () => {
    usePathname.mockReturnValue("/p/p1");
    renderNav();

    expect(screen.getAllByRole("link")).toHaveLength(7);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/p/p1",
    );
    expect(screen.getByRole("link", { name: "Trends" })).toHaveAttribute(
      "href",
      "/p/p1/trends",
    );
    expect(screen.getByRole("link", { name: "Ask AI" })).toHaveAttribute(
      "href",
      "/p/p1/ask",
    );
  });

  it("marks overview active only on the exact overview path", () => {
    usePathname.mockReturnValue("/p/p1");
    renderNav();

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Trends" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks a section active on its route, not overview", () => {
    usePathname.mockReturnValue("/p/p1/trends");
    renderNav();

    expect(screen.getByRole("link", { name: "Trends" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
