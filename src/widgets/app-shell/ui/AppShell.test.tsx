import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

const { usePathname, push } = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/p/p1/trends"),
  push: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname,
  useRouter: () => ({ push }),
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

import { AppShell } from "./AppShell";

function renderShell() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppShell
        projectId="p1"
        projectName="Web App"
        orgName="Aurora"
        projects={[
          { id: "p1", name: "Web App" },
          { id: "p2", name: "Globex" },
        ]}
      >
        <p>Overview content</p>
      </AppShell>
    </NextIntlClientProvider>,
  );
}

describe("AppShell", () => {
  it("frames the content with the breadcrumb, org, and sidebar", () => {
    renderShell();

    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.getByText("Aurora")).toBeInTheDocument();
    // Project breadcrumb links back to the overview.
    expect(screen.getByRole("link", { name: "Web App" })).toHaveAttribute(
      "href",
      "/p/p1",
    );
    // Sidebar navigation is present.
    expect(screen.getByRole("link", { name: "Trends" })).toHaveAttribute(
      "href",
      "/p/p1/trends",
    );
  });

  it("opens the command palette on ⌘K", async () => {
    renderShell();

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await userEvent.keyboard("{Meta>}k{/Meta}");

    expect(screen.getByRole("option", { name: /Trends/ })).toBeInTheDocument();
  });

  it("opens the command palette from the search trigger", async () => {
    renderShell();

    await userEvent.click(
      screen.getByRole("button", { name: "Open command palette" }),
    );

    expect(
      screen.getByRole("option", { name: /Retention/ }),
    ).toBeInTheDocument();
  });

  it("opens the command palette and renders the telemetry footer", async () => {
    renderShell();

    // The mission-control telemetry footer (reference dressing, ADR 0099) is present.
    expect(
      screen.getByRole("contentinfo", { name: "System telemetry" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ingestion")).toBeInTheDocument();

    // Behavior preserved: ⌘K still opens the palette after the re-skin.
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByRole("option", { name: /Trends/ })).toBeInTheDocument();
  });
});
