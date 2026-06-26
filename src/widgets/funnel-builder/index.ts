/**
 * Public API of the `funnel-builder` widget (ADR 0065/0066). The funnels route in
 * `src/app` mounts `<FunnelBuilder projectId=… />`; nothing imports its segments. The
 * chart UI (FunnelChart) is an internal segment of this slice, kept in `src/widgets/**`
 * so the token gate covers its SVG (ADR 0086/0058).
 */
export { FunnelBuilder } from "./ui/FunnelBuilder";
