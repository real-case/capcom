/**
 * Public API of the `trends-explorer` widget (ADR 0065/0066). The trends route in
 * `src/app` mounts `<TrendsExplorer projectId=… />`; nothing imports its segments.
 * The chart UI (TrendsChart, TopEventsBar) are internal segments of this slice, kept
 * in `src/widgets/**` so the token gate covers their SVG (ADR 0086/0058).
 */
export { TrendsExplorer } from "./ui/TrendsExplorer";
