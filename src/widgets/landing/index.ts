/**
 * Public API of the `landing` widget (ADR 0065/0066). The home route in `src/app`
 * mounts `<LandingPage copy={…} />`; nothing imports the slice's segments. The markup
 * lives in `src/widgets/**` so the design-token gate covers it (ADR 0058) — `src/app/**`
 * is not token-gated. `buildLandingJsonLd` + the copy type are exported for the route to
 * assemble the copy object and emit JSON-LD (ADR 0031).
 */
export { LandingPage } from "./ui/LandingPage";
export { buildLandingJsonLd, type JsonLdGraph } from "./model/jsonld";
export {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  METHODOLOGY_KEYS,
  SURFACE_IDS,
  type LandingCopy,
  type MethodologyKey,
  type RoleKey,
  type SurfaceId,
} from "./model/content";
