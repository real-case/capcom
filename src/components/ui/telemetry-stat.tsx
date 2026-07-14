import * as React from "react";

import { cn } from "@/lib/utils";
import { MonoData } from "@/components/ui/mono-data";
import { StatusIndicator } from "@/components/ui/status-indicator";

// Mission-control telemetry stat (ADR 0099 / 0081): a compact labeled telemetry cell for the
// console chrome (the app-shell footer; overview signals) — a `data-display` composite
// (ADR 0100) composing a StatusIndicator status pill (`level` + `label`) with a MonoData value
// (`children`). Presentational: the value's absence / loading is the composing widget's job,
// not this leaf (the data-display mandate). Cross-kit imports are absolute so the composition
// graph reconciles composedOf (ADR 0059/0060). Semantic tokens only (ADR 0058); no external
// margin.
export function TelemetryStat({
  label,
  level = "nominal",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode;
  level?: "nominal" | "caution" | "warning" | "critical";
}) {
  return (
    <div
      data-slot="telemetry-stat"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <StatusIndicator level={level}>{label}</StatusIndicator>
      <MonoData tone="primary">{children}</MonoData>
    </div>
  );
}
