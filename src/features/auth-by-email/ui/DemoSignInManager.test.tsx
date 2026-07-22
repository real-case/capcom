import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

const { push, refresh, signInAsDemo } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInAsDemo: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));
vi.mock("../api/actions", () => ({ signInAsDemo }));

import { DemoSignInManager } from "./DemoSignInManager";

function renderManager() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DemoSignInManager />
    </NextIntlClientProvider>,
  );
}

describe("DemoSignInManager (ADR 0101)", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    signInAsDemo.mockReset();
  });

  it("signs in with the picked demo key and navigates to the workspace home", async () => {
    signInAsDemo.mockResolvedValue({ ok: true });
    renderManager();
    await userEvent.click(
      screen.getByRole("button", { name: /Continue as Dave/ }),
    );

    await waitFor(() => expect(signInAsDemo).toHaveBeenCalledWith("dave"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/p"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows a generic error and does not navigate on failure (ADR 0019)", async () => {
    signInAsDemo.mockResolvedValue({
      ok: false,
      reason: "invalid_credentials",
    });
    renderManager();
    await userEvent.click(
      screen.getByRole("button", { name: /Continue as Bob/ }),
    );

    expect(
      await screen.findByText("Couldn't sign you in. Please try again."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
