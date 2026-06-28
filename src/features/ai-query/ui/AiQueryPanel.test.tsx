import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";
import type { TranslateActionResult } from "../api/actions";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={String(href)}>{children}</a>
  ),
}));

import { AiQueryPanel } from "./AiQueryPanel";

const trendsResult: TranslateActionResult = {
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
};

function renderPanel(
  props: Partial<React.ComponentProps<typeof AiQueryPanel>> = {},
) {
  const onSubmit = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AiQueryPanel
        projectId="p1"
        aiConfigured
        isPending={false}
        result={null}
        onSubmit={onSubmit}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { onSubmit };
}

describe("AiQueryPanel", () => {
  it("shows the offline-mode notice only when AI is not configured", () => {
    const { unmount } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AiQueryPanel
          projectId="p1"
          aiConfigured={false}
          isPending={false}
          result={null}
          onSubmit={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("note")).toBeInTheDocument();
    unmount();

    renderPanel({ aiConfigured: true });
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("submits the typed prompt (trimmed)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPanel();
    await user.type(
      screen.getByLabelText("Your question"),
      "  show sign-ups  ",
    );
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(onSubmit).toHaveBeenCalledWith("show sign-ups");
  });

  it("submits an example chip's prompt on click", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPanel();
    await user.click(
      screen.getByRole("button", {
        name: "Registrations by channel over 30 days",
      }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      "Registrations by channel over 30 days",
    );
  });

  it("renders a successful result as a labelled summary + deep-link", () => {
    renderPanel({ result: trendsResult });
    expect(screen.getByText("Trends")).toBeInTheDocument();
    expect(screen.getByText("sign_up")).toBeInTheDocument();
    expect(screen.getByText("referrer")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Open analysis/ });
    expect(link).toHaveAttribute(
      "href",
      "/p/p1/trends?event=sign_up&range=30d&interval=day&breakdown=referrer",
    );
  });

  it("notes an offline interpretation when the live model was configured", () => {
    renderPanel({ aiConfigured: true, result: trendsResult });
    expect(screen.getByText(/Interpreted offline/i)).toBeInTheDocument();
  });

  it("shows a failure message for an unrecognized prompt", () => {
    renderPanel({
      result: { ok: false, engine: "offline", reason: "unrecognized" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn’t interpret/i);
  });

  it("shows the interpreting state and disables Ask while pending", () => {
    renderPanel({ isPending: true });
    expect(screen.getByText(/Interpreting your question/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Interpreting/i }),
    ).toBeDisabled();
  });
});
