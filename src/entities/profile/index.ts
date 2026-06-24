/**
 * Public API of the `profile` entity (ADR 0065/0066). Consumers import
 * `@/entities/profile`, never a deep segment path.
 */
export type { Profile } from "./model/types";
export { fetchProfiles, fetchProfile } from "./api/queries";
