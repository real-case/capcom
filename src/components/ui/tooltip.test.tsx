import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

test("renders the trigger and its label when defaultOpen", () => {
  render(
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger>Info</TooltipTrigger>
        <TooltipContent>Details</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
  expect(screen.getByRole("button", { name: "Info" })).toBeInTheDocument();
  expect(screen.getAllByText("Details").length).toBeGreaterThan(0);
});
