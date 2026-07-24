/**
 * Public API of the `workspace-launcher` widget (ADR 0065/0066/0101) — the mission-control
 * workspace home. Consumers (the `/p` route) import `@/widgets/workspace-launcher`, never a
 * deep segment path. The route also needs `lastActiveDaysAgo` to build each project's
 * localized activity line server-side (an ICU plural it cannot compute inside the
 * presentational widget).
 */
export { WorkspaceLauncher } from "./ui/WorkspaceLauncher";
export type { WorkspaceLauncherProps } from "./ui/WorkspaceLauncher";
export type {
  LauncherCopy,
  LauncherOrg,
  LauncherProject,
  ProjectRpcResult,
} from "./model/launcher";
export { buildLauncherProjects, lastActiveDaysAgo } from "./model/launcher";
