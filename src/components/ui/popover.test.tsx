import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

test("renders the trigger and keeps content hidden until opened", () => {
  render(
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Panel</PopoverTitle>
      </PopoverContent>
    </Popover>,
  );
  expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  expect(screen.queryByText("Panel")).not.toBeInTheDocument();
});

test("renders content when defaultOpen", () => {
  render(
    <Popover defaultOpen>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Panel</PopoverTitle>
      </PopoverContent>
    </Popover>,
  );
  expect(screen.getByText("Panel")).toBeInTheDocument();
});
