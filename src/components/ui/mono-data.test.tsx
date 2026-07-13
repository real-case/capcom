import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { MonoData } from "./mono-data";

test("renders the value in the mono-data role at the primary tone", () => {
  render(<MonoData>0x7f3a91c2</MonoData>);
  const el = screen.getByText("0x7f3a91c2");
  expect(el).toHaveClass("text-mono-data");
  expect(el).toHaveClass("text-text-primary");
});

test("applies the secondary tone", () => {
  render(<MonoData tone="secondary">1,204</MonoData>);
  expect(screen.getByText("1,204")).toHaveClass("text-text-secondary");
});
