import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

const { push, refresh, signOut } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));
vi.mock("../api/actions", () => ({ signOut }));

import { SignOutButton } from "./SignOutButton";

describe("SignOutButton", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    signOut.mockReset();
  });

  it("clears the session and returns to sign-in", async () => {
    signOut.mockResolvedValue({ ok: true });
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SignOutButton />
      </NextIntlClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/sign-in"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
