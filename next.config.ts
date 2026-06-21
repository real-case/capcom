import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // ADR 0029: the React Compiler owns memoization.
  reactCompiler: true,
  // ADR 0027: type-check navigation against the project's real routes — a
  // renamed or mistyped `<Link href>` / router target fails the build instead
  // of 404ing in production. Generated route types land in `.next/types`, which
  // tsconfig already includes.
  typedRoutes: true,
};

// ADR 0030: wire the next-intl request config into the build. The explicit
// path keeps it discoverable under src/.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
