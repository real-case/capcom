import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { ThemeToggle } from "./ThemeToggle";

// ADR 0042/0092: the theme toggle across both theme axes, plus a play asserting the behavior
// (flips the root `.dark` class + persists the cookie), not the render.
const meta = {
  component: ThemeToggle,
  parameters: { layout: "centered" },
  args: { label: "Toggle light or dark theme" },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  globals: { theme: "dark" },
};

// interaction (play, ADR 0038): a click flips the `.dark` root class and writes the theme
// cookie; a second click flips back — covering both branches. Clears the cookie afterward so
// it does not bleed across stories in the browser-mode run (ADR 0037).
export const Toggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    const root = document.documentElement;

    await userEvent.click(button);
    await expect(root.classList.contains("dark")).toBe(true);
    await expect(document.cookie).toContain("theme=dark");

    await userEvent.click(button);
    await expect(root.classList.contains("dark")).toBe(false);
    await expect(document.cookie).toContain("theme=light");

    document.cookie = "theme=;path=/;max-age=0";
  },
};
