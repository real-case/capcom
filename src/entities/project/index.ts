/**
 * Public API of the `project` entity (ADR 0065/0066). Consumers import
 * `@/entities/project`, never a deep segment path.
 */
export type { Project } from "./model/types";
export { fetchProjects, fetchProject } from "./api/queries";
