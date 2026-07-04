import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

// ADR 0036/0042: colocated CSF 3 stories over the container's contentBounds states and
// its density axis, in both themes. `container` is presentational — no play required.
const meta = {
  component: Card,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// contentBounds:min-content — a compact metric card.
export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Weekly active users</CardTitle>
        <CardDescription>Last 7 days vs. the prior week</CardDescription>
        <CardAction>
          <Badge variant="secondary">+12%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-metric text-foreground">18,204</p>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground">Updated a few minutes ago</p>
      </CardFooter>
    </Card>
  ),
};

// density axis — default vs. sm.
export const Sizes: Story = {
  render: () => (
    <div className="flex items-start gap-4">
      <Card size="default" className="w-64">
        <CardHeader>
          <CardTitle>Default</CardTitle>
          <CardDescription>Comfortable spacing</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Body content</p>
        </CardContent>
      </Card>
      <Card size="sm" className="w-64">
        <CardHeader>
          <CardTitle>Small</CardTitle>
          <CardDescription>Condensed spacing</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Body content</p>
        </CardContent>
      </Card>
    </div>
  ),
};

// contentBounds:max-content / line-wrap — a long body wraps within the card.
export const LongContent: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>About this cohort</CardTitle>
        <CardDescription>
          Profiles first seen in the selected period, grouped so their retention
          can be measured against the cohort&rsquo;s original size across every
          following period without the curve ever rebounding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          The densest infographic in the demo renders from a single
          set-returning SQL function over the events table under row-level
          security.
        </p>
      </CardContent>
    </Card>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Weekly active users</CardTitle>
        <CardDescription>Last 7 days vs. the prior week</CardDescription>
        <CardAction>
          <Badge variant="secondary">+12%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-metric text-foreground">18,204</p>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground">Updated a few minutes ago</p>
      </CardFooter>
    </Card>
  ),
};
