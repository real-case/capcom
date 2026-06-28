/**
 * Public API of the `dashboard` widget (ADR 0065/0066). The dashboards route in
 * `src/app` mounts `<DashboardManager projectId=… />`; nothing imports its segments. The
 * presentational `DashboardBoard` (which the stories exercise) stays internal to the
 * slice in `src/widgets/**` so the token gate covers it (ADR 0086/0058).
 */
export { DashboardManager } from "./ui/DashboardManager";
