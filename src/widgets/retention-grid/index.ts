/**
 * Public API of the `retention-grid` widget (ADR 0065/0066). The retention route in
 * `src/app` mounts `<RetentionGrid projectId=… />`; nothing imports its segments. The
 * heatmap (CohortGrid) is an internal segment of this slice, kept in `src/widgets/**`
 * so the token gate covers its SVG (ADR 0086/0058).
 */
export { RetentionGrid } from "./ui/RetentionGrid";
