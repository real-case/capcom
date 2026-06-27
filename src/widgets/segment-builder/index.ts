/**
 * Public API of the `segment-builder` widget (ADR 0065/0066). The segments route in
 * `src/app` mounts `<SegmentBuilder projectId=… />`; nothing imports its segments. The
 * distribution chart (SegmentDistribution) is an internal segment of this slice, kept in
 * `src/widgets/**` so the token gate covers its SVG (ADR 0086/0058).
 */
export { SegmentBuilder } from "./ui/SegmentBuilder";
