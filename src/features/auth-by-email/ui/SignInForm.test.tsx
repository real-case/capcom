import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

const { push, refresh, signIn } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  Link: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../api/actions", () => ({ signIn }));

import { SignInForm } from "./SignInForm";

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SignInForm />
    </NextIntlClientProvider>,
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    signIn.mockReset();
  });

  it("client-validates before calling the action (ADR 0020)", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("submits valid credentials and navigates on success", async () => {
    signIn.mockResolvedValue({ ok: true });
    renderForm();
    await userEvent.type(screen.getByLabelText("Email"), "alice@capcom.dev");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith({
        email: "alice@capcom.dev",
        password: "password123",
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/p"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows a generic message when credentials are rejected (ADR 0019)", async () => {
    signIn.mockResolvedValue({ ok: false, reason: "invalid_credentials" });
    renderForm();
    await userEvent.type(screen.getByLabelText("Email"), "alice@capcom.dev");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
