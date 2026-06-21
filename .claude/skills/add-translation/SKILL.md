---
name: add-translation
description: >-
  Add or change user-facing copy the i18n way (ADR 0030/0055) — author the string in
  the canonical source catalog (messages/<defaultLocale>.json) under the right
  namespace, draft the matching entry for every other locale from the source while
  preserving ICU placeholders exactly, wire it through next-intl
  (useTranslations / getTranslations), and pass the key-parity + ICU gate. Use when
  adding/editing UI text, when asked to "add a translation", "add an i18n key",
  "translate this string", "sync locales", "add a locale", or "/add-translation".
  Never hard-code user-facing strings or edit a non-source catalog by hand.
---

# Add / change translated copy (source-canonical, ADR 0055)

Every user-facing string lives in a next-intl catalog, authored **only** in the canonical
source locale; the other locales are **drafted from it** in the same change. This skill keeps
that direction-of-truth and ends with the parity + ICU gate green.

> Node 24 is required. The catalogs are `messages/<locale>.json`; the canonical source locale
> is `defaultLocale` in `src/i18n/routing.ts` (today `en`).

## The one rule: author in the source catalog only (ADR 0055)

- **Authoring happens in `messages/<defaultLocale>.json`** (the canonical catalog). Developers
  and the agent write strings **there and nowhere else**.
- **Non-source catalogs are derived**, never hand-authored. When the source changes, the
  matching entries for **every other locale** are drafted in the **same change**, so no
  lagging-catalog state ever exists (locale-prefixed routes never render missing-key
  fallbacks). Editing a non-source catalog as the source of a string is the drift failure the
  gate is designed to catch.

## 1. Find the canonical locale and the namespace

```bash
npm run check:i18n     # prints the canonical locale + current key count, or the problems
```

Strings are grouped by **namespace** = the top-level object key, which must match the
consuming component's call: `useTranslations("HomePage")` / `getTranslations("HomePage")`
read the `"HomePage"` object. Reuse an existing namespace (`Metadata`, `HomePage`, `Error`,
`NotFound`, …) when the copy belongs to that surface; add a new top-level namespace only for a
new surface.

## 2. Add the key in the source catalog

Edit `messages/<defaultLocale>.json` (e.g. `messages/en.json`). Nest under the namespace; the
leaf value is the string. Use **ICU MessageFormat** for any dynamic content — and keep it
valid (the gate checks balanced braces and rejects an empty `{}`):

```jsonc
{
  "HomePage": {
    "heading": "It works.",
    "greeting": "Welcome back, {name}.",                         // placeholder
    "cartCount": "{count, plural, =0 {Cart is empty} one {# item} other {# items}}"  // plural
  }
}
```

Placeholders `{name}`, plurals `{count, plural, …}`, and selects `{kind, select, …}` are part
of the string's structure — preserve them **exactly** across every locale (step 4).

## 3. Consume it through next-intl (never hard-code)

- **Server Components / metadata** — `await getTranslations("Namespace")` (the default; ADR
  0002):
  ```tsx
  import { getTranslations } from "next-intl/server";
  const t = await getTranslations("HomePage");
  // t("heading"); t("greeting", { name }); t("cartCount", { count });
  ```
- **Client (interactive) leaves** — `useTranslations("Namespace")`:
  ```tsx
  import { useTranslations } from "next-intl";
  const t = useTranslations("Error");
  ```
- For links/redirects use the locale-aware wrappers from `@/i18n/navigation`
  (`Link`, `useRouter`, `redirect`) — not `next/link` / `next/navigation` — so the locale
  prefix is preserved (ADR 0030/0031).

## 4. Draft the other locales from the source (ADR 0055)

For **each** non-source catalog `messages/<other>.json`, add the **same key path** with a
translation drafted from the source string, **preserving every ICU placeholder, plural
category, and select branch exactly** (translate the words, not the `{tokens}`). Key parity is
absolute: no missing keys, no orphaned keys — a key that should not exist is removed from the
**source**, never added only to a translation.

> Today the project ships a single locale (`en`), so this step is a no-op and parity is
> vacuous — but the workflow and the gate are multi-locale from day one (`src/i18n/routing.ts`
> comment). The moment a second locale exists, every source change drafts its entries here.

**Adding a whole locale** is a larger change: add the code to `routing.ts` `locales`, create
`messages/<locale>.json` drafted in full from the canonical catalog (same keys, ICU
preserved), and confirm the i18n machinery picks it up. Surface this as a deliberate step.

## 5. Run the gate — green before done

```bash
npm run check:i18n     # ADR 0055: key parity across locales + ICU validity (the CI gate)
npx tsc --noEmit       # typed routes / message access still resolve
```

A red gate names the file + key: a missing/extra key is a parity break (fix it in the
**source**, then re-draft), an `unbalanced {`/`}` or empty `{}` is malformed ICU.

## 6. What stays human-owned (👤)

- **Translation review (ADR 0047/0055):** drafted translations ship in the same PR as the
  source string and are **human-reviewed** — locale-competent (native/fluent) review is
  required for **tone-sensitive** surfaces; mechanical strings may be accepted as drafted.
  The agent drafts; it does not ratify translation quality.
- Adding a locale touches routing config reviewed like any other change.

End by reporting: the namespace + key(s) added, which catalogs were drafted, the consuming
call-site, the gate result, and the 👤 translation review still owed.
