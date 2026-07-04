import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

function Fixture() {
  return (
    <Command aria-label="Commands">
      <CommandInput aria-label="Search" placeholder="Search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Analysis">
          <CommandItem>Trends</CommandItem>
          <CommandItem>Funnels</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

test("renders the provided items", () => {
  render(<Fixture />);
  expect(screen.getByText("Trends")).toBeInTheDocument();
  expect(screen.getByText("Funnels")).toBeInTheDocument();
});

test("filters items as the query is typed", async () => {
  render(<Fixture />);
  await userEvent.type(screen.getByLabelText("Search"), "fun");
  expect(screen.getByText("Funnels")).toBeInTheDocument();
  expect(screen.queryByText("Trends")).not.toBeInTheDocument();
});
