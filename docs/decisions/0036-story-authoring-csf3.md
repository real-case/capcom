---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Story authoring standard: Component Story Format 3 (CSF 3)

## Context and Problem Statement

**0035** adopted Storybook as the component workbench, with stories doubling as component
tests through the Vitest addon. That leaves an open convention: in *what format* are stories
authored? Storybook accepts more than one — the legacy function form (CSF 2,
`Template.bind({})`), the modern object form (CSF 3, args-first), and MDX (stories defined
inside markdown). The format is a convention every `*.stories.tsx` follows, so it should be
fixed before stories accumulate and a mixed corpus becomes expensive to normalise.

The format is not cosmetic here. **0035**'s stories-as-tests reuse — `composeStories` /
portable stories executed by the Vitest addon — is built around CSF 3's *object* stories;
the authoring format and the test strategy are coupled, so this record settles the format
that strategy assumes.

## Decision Drivers

* **Consistency and low boilerplate** — one format across every story file, with minimal
  ceremony per story.
* **Fit with stories-as-tests (0035)** — the chosen format must compose cleanly into the
  portable-stories / `composeStories` reuse the Vitest addon depends on.
* **Strict typing (0003)** — story metadata and args should be statically typed with no
  `any`, ideally via the `satisfies` pattern.
* **Mechanical enforceability (0006)** — the standard should be a lint rule, not a wiki
  guideline, so the corpus cannot drift back to the legacy form.

## Considered Options

* **CSF 3** — object stories (`meta satisfies Meta`, named `StoryObj` exports built from
  `args`)
* **CSF 2** — function stories (`Template.bind({})`)
* **MDX-defined stories** — stories declared inside `.mdx` documentation files

## Decision Outcome

Chosen option: "Component Story Format 3 (CSF 3)", because its args-first object stories are
exactly what **0035**'s stories-as-tests reuse (`composeStories`, portable stories) is built
around, it carries the least per-story boilerplate, and it types cleanly under strict
TypeScript (**0003**). Each `*.stories.tsx` exports a default `meta` typed with
`satisfies Meta<typeof Component>` and one or more named `StoryObj<typeof meta>` exports
defined through `args` (and `play` for interactions). The legacy CSF 2 `Template.bind({})`
form and the older `storiesOf` API are disallowed. **MDX is permitted only for supplementary
documentation pages (autodocs)** — never to *define* stories; stories themselves are always
CSF 3.

The standard is enforced as a lint gate, not a guideline. The plugin's shared `recommended`
config alone does not police the format, so the flat ESLint setup (**0006**) enables
`eslint-plugin-storybook`'s **`csf-strict`** config (which includes
`storybook/no-stories-of`), turns on **`storybook/meta-satisfies-type`** explicitly (it
ships in no shared config), and bans the CSF 2 idiom itself with a **`no-restricted-syntax`**
rule matching `Template.bind` in story files. Running in the CI quality gate (**0010**),
this makes a story written in CSF 2 fail lint rather than merge.

### Consequences

* Good, because every story file looks the same — args-first object stories with minimal
  ceremony — making them easy to read, review, and compose via spreads.
* Good, because object stories drop straight into `composeStories` as tests, so **0035**'s
  stories-as-tests bargain works without per-story adaptation.
* Good, because `satisfies Meta<typeof Component>` gives arg autocomplete and catches prop
  drift at compile time, aligning with strict TypeScript and the no-`any` rule (**0003**).
* Good, because `eslint-plugin-storybook` makes the standard mechanical (**0006**, **0010**),
  so the corpus cannot silently regress to CSF 2.
* Bad, because contributors used to the CSF 2 `Template.bind` idiom must learn the object
  form.
* Bad, because it pins authoring to the CSF 3 lifecycle; a future CSF revision would require a
  new superseding record rather than a quiet migration.

### Confirmation

`eslint-plugin-storybook`'s `csf-strict` config, the explicitly enabled
`storybook/meta-satisfies-type` rule, and the `no-restricted-syntax` ban on `Template.bind`
are active in the flat ESLint config (**0006**) and run in CI (**0010**); story files use
`Meta` / `StoryObj` with the `satisfies` pattern,
and no `Template.bind({})` or `storiesOf` usage appears in `src/**/*.stories.tsx`. Any `.mdx`
under `.storybook`/stories defines documentation pages only, not stories.

## Pros and Cons of the Options

### CSF 3 — object stories (chosen)

* Good, because it is args-first with minimal boilerplate and composes via spreads.
* Good, because object stories are what `composeStories` / the Vitest addon (**0035**) reuse
  as tests directly.
* Good, because `satisfies Meta<typeof Component>` types stories strictly with no `any`
  (**0003**).
* Neutral, because it is the current Storybook default, so tooling and docs assume it.
* Bad, because it ties the corpus to the CSF 3 format lifecycle.

### CSF 2 — function stories (`Template.bind({})`)

* Good, because it is familiar to anyone who used Storybook before CSF 3.
* Neutral, because it still renders identically in the workbench.
* Bad, because each story repeats `Template.bind({})` boilerplate, composes worse, and does
  **not** drop cleanly into the portable-stories test reuse (**0035**) — defeating the main
  reason Storybook was adopted with the Vitest addon.

### MDX-defined stories

* Good, because it co-locates prose documentation and examples in one file.
* Neutral, because MDX remains useful for *doc pages* layered over CSF 3 stories (autodocs).
* Bad, because defining the stories themselves in MDX mixes markup with story logic, types
  poorly, and is awkward to consume as tests — so it is unfit as the authoring standard,
  though acceptable for supplementary docs.

## More Information

Builds directly on **0035** (the workbench and the stories-as-tests reuse this format serves),
**0003** (the strict-TypeScript / `satisfies` typing pattern stories follow), **0006** (ESLint
flat config that hosts `eslint-plugin-storybook`), and **0010** (the CI gate that runs lint).
CSF 3 is the default authoring format on the Storybook 10 line targeted in **0035**. MDX stays
in scope only for autodocs/documentation pages. Revisit when Storybook's announced successor
format — the experimental CSF Factories ("CSF Next") already shipping on the Storybook 10
line — stabilizes; adopting it would be recorded as a new superseding ADR rather than an
in-place edit.
