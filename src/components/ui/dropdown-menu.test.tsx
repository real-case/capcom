import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

test("renders the menu items when defaultOpen", () => {
  render(
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Share</DropdownMenuItem>
        <DropdownMenuItem disabled>Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  expect(screen.getByRole("menuitem", { name: "Share" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});
