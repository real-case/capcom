import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, within } from "storybook/test";

import { Combobox, type ComboboxOption } from "./combobox";

const OPTIONS: ComboboxOption[] = [
  { value: "trends", label: "Trends" },
  { value: "funnels", label: "Funnels" },
  { value: "retention", label: "Retention" },
  { value: "segments", label: "Segments" },
];

// ADR 0036/0042: colocated CSF 3 stories over the picker's states in both themes.
// `selection-control` mandates the interaction axis, so a `play` drives open + select
// (ADR 0038). The open list is a cmdk Command — see the documented aria-required-children
// exclusion below.
const meta = {
  component: Combobox,
  args: { options: OPTIONS },
  parameters: {
    layout: "centered",
    // Narrow, documented a11y rule exclusion (ADR 0039): the open list is cmdk, which
    // nests its `role="option"` rows inside a role-less `[cmdk-list-sizer]` and trips
    // axe's strict `aria-required-children` though the options ARE exposed to AT. Only
    // this rule is disabled; the full axe pass still runs on every other rule.
    a11y: {
      options: {
        rules: { "aria-required-children": { enabled: false } },
      },
    },
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

// interaction:default + validation:pristine + unchecked — closed, showing the placeholder.
export const Default: Story = {
  render: () => (
    <div className="w-64">
      <Combobox
        options={OPTIONS}
        aria-label="Analysis type"
        placeholder="Select an analysis…"
      />
    </div>
  ),
};

// validation:valid + checked — a value chosen, shown on the closed trigger.
export const Selected: Story = {
  render: () => (
    <div className="w-64">
      <Combobox
        options={OPTIONS}
        aria-label="Analysis type"
        value="funnels"
        onValueChange={() => {}}
        placeholder="Select an analysis…"
      />
    </div>
  ),
};

// interaction:disabled.
export const Disabled: Story = {
  render: () => (
    <div className="w-64">
      <Combobox
        options={OPTIONS}
        aria-label="Analysis type"
        disabled
        placeholder="Select an analysis…"
      />
    </div>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <div className="w-64">
      <Combobox
        options={OPTIONS}
        aria-label="Analysis type"
        value="retention"
        onValueChange={() => {}}
        placeholder="Select an analysis…"
      />
    </div>
  ),
};

function Interactive() {
  const [value, setValue] = React.useState<string>();
  return (
    <div className="w-64">
      <Combobox
        options={OPTIONS}
        aria-label="Analysis type"
        value={value}
        onValueChange={setValue}
        placeholder="Select an analysis…"
      />
    </div>
  );
}

// interaction (play, ADR 0038): open, pick an option, the trigger reflects the choice.
export const Select: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("combobox");
    await expect(trigger).toHaveTextContent("Select an analysis…");
    // Keyboard: the trigger is focus-reachable and opens on Enter (ADR 0039).
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    // The list is portalled to the body.
    const option = await screen.findByRole("option", { name: "Funnels" });
    await userEvent.click(option);
    await expect(trigger).toHaveTextContent("Funnels");
  },
};
