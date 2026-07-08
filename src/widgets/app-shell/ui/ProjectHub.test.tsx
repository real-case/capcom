import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
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

import { ProjectHub } from "./ProjectHub";

function renderHub() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ProjectHub projectId="p1" />
    </NextIntlClientProvider>,
  );
}

describe("ProjectHub", () => {
  it("renders a card link per surface, overview excluded", () => {
    renderHub();

    // Seven surfaces (overview is the current page, so it has no card).
    expect(screen.getAllByRole("link")).toHaveLength(7);
    expect(
      screen.queryByRole("link", { name: /Overview/ }),
    ).not.toBeInTheDocument();
  });

  it("links each surface to its project-scoped route", () => {
    renderHub();

    expect(screen.getByRole("link", { name: /Events/ })).toHaveAttribute(
      "href",
      "/p/p1/events",
    );
    expect(screen.getByRole("link", { name: /Trends/ })).toHaveAttribute(
      "href",
      "/p/p1/trends",
    );
    expect(screen.getByRole("link", { name: /Dashboards/ })).toHaveAttribute(
      "href",
      "/p/p1/dashboards",
    );
    expect(screen.getByRole("link", { name: /Ask AI/ })).toHaveAttribute(
      "href",
      "/p/p1/ask",
    );
  });

  it("shows each surface's description", () => {
    renderHub();

    expect(
      screen.getByText(messages.ProjectOverview.surfaces.trends.description),
    ).toBeInTheDocument();
  });
});
