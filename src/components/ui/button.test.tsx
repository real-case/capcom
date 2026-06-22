import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { userEvent } from "@testing-library/user-event";

import { Button } from "./button";

test("renders its label", () => {
  render(<Button>Save</Button>);
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

test("applies the variant token class", () => {
  render(<Button variant="secondary">Beta</Button>);
  expect(screen.getByRole("button", { name: "Beta" })).toHaveClass(
    "bg-secondary",
  );
});

test("fires onClick when activated", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Go</Button>);
  await userEvent.click(screen.getByRole("button", { name: "Go" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("does not fire onClick when disabled", async () => {
  const onClick = vi.fn();
  render(
    <Button onClick={onClick} disabled>
      Go
    </Button>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Go" }));
  expect(onClick).not.toHaveBeenCalled();
});
