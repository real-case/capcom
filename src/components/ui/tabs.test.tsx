import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function Fixture() {
  return (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">First</TabsTrigger>
        <TabsTrigger value="b">Second</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel A</TabsContent>
      <TabsContent value="b">Panel B</TabsContent>
    </Tabs>
  );
}

test("shows the default panel and marks its tab selected", () => {
  render(<Fixture />);
  expect(screen.getByRole("tab", { name: "First" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByText("Panel A")).toBeInTheDocument();
});

test("switches panels when another tab is activated", async () => {
  render(<Fixture />);
  await userEvent.click(screen.getByRole("tab", { name: "Second" }));
  expect(screen.getByRole("tab", { name: "Second" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByText("Panel B")).toBeInTheDocument();
});
