import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { ScrollArea } from "./scroll-area";

test("renders its content inside the viewport", () => {
  render(
    <ScrollArea aria-label="List" className="h-32 w-32">
      <ul>
        <li>alpha</li>
        <li>omega</li>
      </ul>
    </ScrollArea>,
  );
  expect(screen.getByText("alpha")).toBeInTheDocument();
  expect(screen.getByText("omega")).toBeInTheDocument();
});
