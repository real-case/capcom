/**
 * Public API of the `organization` entity (ADR 0065/0066). Consumers import
 * `@/entities/organization`, never a deep segment path.
 */
export type { Organization } from "./model/types";
export { fetchOrganizations, fetchOrganization } from "./api/queries";
