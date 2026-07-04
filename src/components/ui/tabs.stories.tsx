import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

// ADR 0036/0042: colocated CSF 3 stories over the tablist's states + variants in both
// themes. `navigation` mandates the interaction axis, so a `play` drives tab switching
// (ADR 0038).
const meta = {
  component: Tabs,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

function Panels() {
  return (
    <>
      <TabsList>
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="funnels">Funnels</TabsTrigger>
        <TabsTrigger value="retention">Retention</TabsTrigger>
      </TabsList>
      <TabsContent value="trends">Event trends over time.</TabsContent>
      <TabsContent value="funnels">Ordered-step conversion.</TabsContent>
      <TabsContent value="retention">Cohort retention grid.</TabsContent>
    </>
  );
}

// interaction:default + selected — the resting tablist with the first tab active.
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="trends" className="w-96">
      <Panels />
    </Tabs>
  ),
};

// variant:line — the underlined treatment.
export const Line: Story = {
  render: () => (
    <Tabs defaultValue="trends" className="w-96">
      <TabsList variant="line">
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="funnels">Funnels</TabsTrigger>
        <TabsTrigger value="retention">Retention</TabsTrigger>
      </TabsList>
      <TabsContent value="trends">Event trends over time.</TabsContent>
      <TabsContent value="funnels">Ordered-step conversion.</TabsContent>
      <TabsContent value="retention">Cohort retention grid.</TabsContent>
    </Tabs>
  ),
};

// interaction:disabled — a disabled trigger is skipped by keyboard + pointer.
export const WithDisabled: Story = {
  render: () => (
    <Tabs defaultValue="trends" className="w-96">
      <TabsList>
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="funnels">Funnels</TabsTrigger>
        <TabsTrigger value="segments" disabled>
          Segments
        </TabsTrigger>
      </TabsList>
      <TabsContent value="trends">Event trends over time.</TabsContent>
      <TabsContent value="funnels">Ordered-step conversion.</TabsContent>
      <TabsContent value="segments">Segment distribution.</TabsContent>
    </Tabs>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <Tabs defaultValue="trends" className="w-96">
      <Panels />
    </Tabs>
  ),
};

// interaction (play, ADR 0038): activating a tab reveals its panel and marks it selected.
export const Switch: Story = {
  render: () => (
    <Tabs defaultValue="trends" className="w-96">
      <Panels />
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const funnels = canvas.getByRole("tab", { name: "Funnels" });
    await expect(funnels).toHaveAttribute("aria-selected", "false");
    await userEvent.click(funnels);
    await expect(funnels).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByText("Ordered-step conversion."),
    ).toBeInTheDocument();
    // Keyboard: roving arrow navigation moves focus and (automatic activation)
    // selects the next tab (ADR 0039/0052).
    await userEvent.keyboard("{ArrowRight}");
    const retention = canvas.getByRole("tab", { name: "Retention" });
    await expect(retention).toHaveFocus();
    await expect(retention).toHaveAttribute("aria-selected", "true");
  },
};
