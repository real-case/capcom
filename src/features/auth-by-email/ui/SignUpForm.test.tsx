import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

const { push, refresh, signUp } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  Link: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../api/actions", () => ({ signUp }));

import { SignUpForm } from "./SignUpForm";

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SignUpForm />
    </NextIntlClientProvider>,
  );
}

describe("SignUpForm", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    signUp.mockReset();
  });

  it("enforces the minimum password length client-side", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText("Email"), "new@capcom.dev");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(
      await screen.findByText("Password must be at least 8 characters."),
    ).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("creates the account and navigates on success", async () => {
    signUp.mockResolvedValue({ ok: true });
    renderForm();
    await userEvent.type(screen.getByLabelText("Email"), "new@capcom.dev");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith({
        email: "new@capcom.dev",
        password: "password123",
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/p"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows a generic message when sign-up fails", async () => {
    signUp.mockResolvedValue({ ok: false, reason: "signup_failed" });
    renderForm();
    await userEvent.type(screen.getByLabelText("Email"), "taken@capcom.dev");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(
      await screen.findByText(
        "We couldn't create that account. Try a different email.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
