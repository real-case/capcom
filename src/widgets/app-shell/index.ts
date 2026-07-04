/**
 * Public API of the `app-shell` widget (ADR 0065/0066). The composition root
 * (`src/app`) mounts the project-scoped shell around the analysis surfaces and the
 * project hub on the overview route; the sidebar, command palette, and section
 * registry stay internal to the slice.
 */
export { AppShell } from "./ui/AppShell";
export { ProjectHub } from "./ui/ProjectHub";
