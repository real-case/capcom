import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { toast } from "sonner";
import { expect, test } from "vitest";

import { Toaster } from "./sonner";

test("surfaces a toast raised through the sonner API", async () => {
  render(
    <div>
      <Toaster />
      <button onClick={() => toast("Saved")}>Save</button>
    </div>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Saved")).toBeInTheDocument();
});
