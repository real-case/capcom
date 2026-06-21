// Public surface of the design-system root artifacts (ADR 0058/0059/0061). These
// are declarative single sources of truth — controlled vocabularies, state
// registries, and the generated token union — consumed by stories, `design-intent.ts`
// (ADR 0062), and the Stage-1/2 lints and skills. Import from here, not from internals.
export * from "./tokens.generated";
export * from "./usage-roles";
export * from "./archetypes";
export * from "./states";
export * from "./state-precedence";
export * from "./design-intent";
