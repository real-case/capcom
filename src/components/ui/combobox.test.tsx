import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Combobox, type ComboboxOption } from "./combobox";

const OPTIONS: ComboboxOption[] = [
  { value: "trends", label: "Trends" },
  { value: "funnels", label: "Funnels" },
];

test("shows the placeholder when nothing is selected", () => {
  render(<Combobox options={OPTIONS} placeholder="Pick one" />);
  expect(screen.getByRole("combobox")).toHaveTextContent("Pick one");
});

test("shows the selected option's label on the trigger", () => {
  render(
    <Combobox options={OPTIONS} value="funnels" onValueChange={() => {}} />,
  );
  expect(screen.getByRole("combobox")).toHaveTextContent("Funnels");
});
