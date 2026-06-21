import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";

import LocaleError from "./error";

const renderError = (error: Error & { digest?: string }, reset = vi.fn()) => {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LocaleError error={error} reset={reset} />
    </NextIntlClientProvider>,
  );
  return reset;
};

describe("LocaleError", () => {
  it("shows generic copy and never leaks the internal error detail (ADR 0019)", () => {
    renderError(new Error("DB connection string leaked"));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /something went wrong/i,
    );
    expect(
      screen.queryByText(/DB connection string leaked/i),
    ).not.toBeInTheDocument();
  });

  it("calls reset when the retry button is pressed", async () => {
    const reset = renderError(new Error("boom"));

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("surfaces the digest as a safe correlation reference when present", () => {
    renderError(Object.assign(new Error("boom"), { digest: "abc123" }));

    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });
});
