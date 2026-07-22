import { z } from "zod";

/**
 * The closed set of seeded demo identities the one-click sign-in may assume (ADR 0101).
 *
 * The KEY is the injection boundary: the client sends only a value from this enum — never an
 * email or password — and `signInAsDemo` rejects anything outside it (the closed-grammar
 * pattern of ADR 0089/0091 applied to an auth input). The matching email + shared seed
 * password live server-side in the `signInAsDemo` action and never reach the client.
 *
 * Curated to the Aurora Labs role ladder (owner → analyst → viewer) so a visitor signs in as a
 * role and watches RBAC change what they can see and do. `carol` (Globex owner, the isolation
 * fixture) is intentionally NOT reachable here — one org, three roles, one clear story.
 */
export const demoAccountKeySchema = z.enum(["alice", "dave", "bob"], {
  error: "[demo] Unknown demo account",
});

export type DemoAccountKey = z.infer<typeof demoAccountKeySchema>;

/** Role each demo identity carries in Aurora Labs (a key of the `Roles` i18n namespace). */
type DemoRoleKey = "owner" | "analyst" | "viewer";

/**
 * Presentational metadata for the "Sign in as …" cards. Names are proper nouns (not
 * translated); the role label is resolved through the `Roles` namespace. No credential
 * appears here — the client only ever holds a key, a display name, and a role label.
 */
export const DEMO_ACCOUNTS = [
  { key: "alice", name: "Alice", roleKey: "owner" },
  { key: "dave", name: "Dave", roleKey: "analyst" },
  { key: "bob", name: "Bob", roleKey: "viewer" },
] as const satisfies readonly {
  key: DemoAccountKey;
  name: string;
  roleKey: DemoRoleKey;
}[];
