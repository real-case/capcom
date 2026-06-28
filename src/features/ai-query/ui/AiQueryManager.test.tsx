import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

// Mock the Server Action so the REAL hook (use-translate) + the REAL container run,
// but the server-only AI client chain is never imported (ADR 0091). Importing the
// container from the slice's public barrel also exercises index.ts.
const { translateQuery } = vi.hoisted(() => ({ translateQuery: vi.fn() }));
vi.mock("../api/actions", () => ({ translateQuery }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={String(href)}>{children}</a>
  ),
}));

import { AiQueryManager } from "..";

function renderManager(aiConfigured = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <AiQueryManager projectId="p1" aiConfigured={aiConfigured} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("AiQueryManager", () => {
  beforeEach(() => {
    translateQuery.mockReset();
  });

  it("surfaces the offline notice from the page's aiConfigured flag", () => {
    renderManager(false);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("calls the translation action with the project and prompt", async () => {
    translateQuery.mockResolvedValue({
      ok: false,
      engine: "offline",
      reason: "unrecognized",
    });
    const user = userEvent.setup();
    renderManager();

    await user.type(screen.getByLabelText("Your question"), "weekly retention");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    await waitFor(() =>
      expect(translateQuery).toHaveBeenCalledWith({
        projectId: "p1",
        prompt: "weekly retention",
      }),
    );
  });

  it("renders a successful translation as a summary + deep-link", async () => {
    translateQuery.mockResolvedValue({
      ok: true,
      engine: "offline",
      spec: {
        kind: "trends",
        config: {
          event: "sign_up",
          range: "30d",
          interval: "day",
          breakdown: "referrer",
        },
      },
    });
    const user = userEvent.setup();
    renderManager();

    await user.click(
      screen.getByRole("button", {
        name: "Registrations by channel over 30 days",
      }),
    );

    expect(await screen.findByText("Trends")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open analysis/ })).toHaveAttribute(
      "href",
      "/p/p1/trends?event=sign_up&range=30d&interval=day&breakdown=referrer",
    );
  });

  it("renders a failure message when translation is unrecognized", async () => {
    translateQuery.mockResolvedValue({
      ok: false,
      engine: "offline",
      reason: "unrecognized",
    });
    const user = userEvent.setup();
    renderManager();

    await user.type(screen.getByLabelText("Your question"), "tell me a joke");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Couldn’t interpret/i,
    );
  });
});
