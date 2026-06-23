/**
 * Public API of the `membership` entity (ADR 0065/0066). Consumers import
 * `@/entities/membership`, never a deep segment path.
 */
export type { AppRole, Membership } from "./model/types";
export { ROLE_ORDER, ROLE_RANK, roleAtLeast } from "./model/types";
export { fetchMyMemberships } from "./api/queries";
