import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

test("renders the modal content and title when defaultOpen", () => {
  render(
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>Are you sure?</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>,
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Confirm" })).toBeInTheDocument();
});

test("exposes an accessible close control", () => {
  render(
    <Dialog defaultOpen>
      <DialogContent closeLabel="Dismiss">
        <DialogHeader>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>Are you sure?</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>,
  );
  expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
});
