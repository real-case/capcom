import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import storybook from "eslint-plugin-storybook";

const eslintConfig = defineConfig([
  // eslint-config-next composes the framework rules, typescript-eslint, and the
  // React Compiler / Rules-of-React checks from eslint-plugin-react-hooks (ADR
  // 0006, 0029).
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // ADR 0003: `any` is banned — use `unknown` + narrowing.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // ADR 0018: application code reads typed env from the two env modules; raw
  // `process.env` access anywhere else in `src/` fails lint.
  {
    files: ["src/**"],
    ignores: ["src/lib/env.ts", "src/lib/env.server.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Read typed env from src/lib/env.ts (public) or src/lib/env.server.ts (secrets) — ADR 0018.",
        },
      ],
      // `no-restricted-properties` misses `const { env } = process` — close
      // the destructuring path too.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "VariableDeclarator[init.name='process'] Property[key.name='env']",
          message:
            "Read typed env from src/lib/env.ts (public) or src/lib/env.server.ts (secrets) — ADR 0018.",
        },
      ],
    },
  },
  // ADR 0058: token-usage enforcement in component source (the ESLint half of the
  // Stage-1 deterministic layer — stylelint can't see Tailwind classes or JSX). No raw
  // color literals, no raw CSS color functions, no Tailwind numbered palette; components
  // reference the semantic token layer only (@theme/:root, ADR 0032/0033). Scoped to
  // component source — stories/tests are demo/fixture code. NOTE: this block's
  // `no-restricted-syntax` replaces the `src/**` one above for these files, so the ADR
  // 0018 env-destructuring guard is re-included here.
  {
    // Components AND widgets: chart widgets (ADR 0086) draw SVG and must take color
    // from the token layer only, so the token gate covers src/widgets/** too — ADR
    // 0086's confirmation made operative. The check:tokens script passes both dirs to
    // eslint (this glob alone does not run the linter over widgets).
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/widgets/**/*.{ts,tsx}",
      "src/shared/**/*.{ts,tsx}",
    ],
    ignores: [
      "src/components/**/*.test.{ts,tsx}",
      "src/components/**/*.stories.{ts,tsx}",
      "src/components/**/__snapshots__/**",
      "src/widgets/**/*.test.{ts,tsx}",
      "src/widgets/**/*.stories.{ts,tsx}",
      "src/widgets/**/__snapshots__/**",
      // shared/ui carries reusable UI (token-gated); shared/testing is test infra.
      "src/shared/**/*.test.{ts,tsx}",
      "src/shared/**/*.stories.{ts,tsx}",
      "src/shared/testing/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "VariableDeclarator[init.name='process'] Property[key.name='env']",
          message:
            "Read typed env from src/lib/env.ts (public) or src/lib/env.server.ts (secrets) — ADR 0018.",
        },
        {
          selector:
            "Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
          message:
            "Raw hex color is banned in components — use a semantic token utility (bg-primary, text-muted-foreground) or var(--color-*); ADR 0058/0033.",
        },
        {
          selector:
            "Literal[value=/\\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\\(/i]",
          message:
            "Raw CSS color function is banned in components — use a semantic token; ADR 0058/0033.",
        },
        {
          selector:
            "Literal[value=/\\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b/]",
          message:
            "Tailwind numbered palette is banned in components — use a semantic token utility (bg-primary, text-destructive, …); ADR 0058/0033.",
        },
      ],
    },
  },
  // ADR 0036: stories are CSF 3 only. `flat/csf-strict` enforces the CSF shape and
  // bans the legacy `storiesOf` API (it auto-scopes to *.stories.* + .storybook/**).
  ...storybook.configs["flat/csf-strict"],
  {
    // The strict config alone polices neither `meta satisfies Meta` nor the CSF 2
    // `Template.bind({})` idiom, so turn both on explicitly for story files (ADR 0036).
    files: ["src/**/*.stories.@(ts|tsx)"],
    rules: {
      "storybook/meta-satisfies-type": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='Template'][property.name='bind']",
          message:
            "CSF 2 `Template.bind({})` is banned — author CSF 3 object stories (ADR 0036).",
        },
      ],
    },
  },
  // ADR 0006: Prettier owns formatting — last, so it disables every stylistic
  // rule the configs above may have enabled.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tool output (ADR 0007, 0008, 0035):
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
