import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push }) }));

import { CommandPalette } from "./CommandPalette";

const PROJECTS = [
  { id: "p1", name: "Aurora Web" },
  { id: "p2", name: "Globex App" },
];

function renderPalette(onOpenChange = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        projectId="p1"
        projects={PROJECTS}
      />
    </NextIntlClientProvider>,
  );
  return onOpenChange;
}

describe("CommandPalette", () => {
  beforeEach(() => push.mockReset());

  it("lists the sections and other projects, excluding the current one", () => {
    renderPalette();

    expect(screen.getByRole("option", { name: /Trends/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Ask AI/ })).toBeInTheDocument();
    // The other project is switchable; the current project is not offered.
    expect(
      screen.getByRole("option", { name: /Globex App/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Aurora Web/ }),
    ).not.toBeInTheDocument();
  });

  it("filters the options as the query is typed", async () => {
    renderPalette();

    await userEvent.type(
      screen.getByPlaceholderText(messages.AppShell.command.placeholder),
      "reten",
    );

    expect(
      screen.getByRole("option", { name: /Retention/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Trends/ }),
    ).not.toBeInTheDocument();
  });

  it("navigates to a section and closes on select", async () => {
    const onOpenChange = renderPalette();

    await userEvent.click(screen.getByRole("option", { name: /Retention/ }));

    expect(push).toHaveBeenCalledWith("/p/p1/retention");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("switches project on select", async () => {
    renderPalette();

    await userEvent.click(screen.getByRole("option", { name: /Globex App/ }));

    expect(push).toHaveBeenCalledWith("/p/p2");
  });
});
