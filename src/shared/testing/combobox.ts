import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Drive a `Combobox` in a test (ADR 0034, PR-15): open the labelled trigger, then click an
 * option by its visible label. Unlike a native `<select>`, a combobox's options exist in
 * the DOM only while the popover is open, so every interaction opens first. Shared by the
 * analytics-widget suites (trends / funnels / retention / segments).
 */
export async function selectCombo(
  name: string,
  optionName: string | RegExp,
): Promise<void> {
  await userEvent.click(screen.getByRole("combobox", { name }));
  await userEvent.click(
    await screen.findByRole("option", { name: optionName }),
  );
}
