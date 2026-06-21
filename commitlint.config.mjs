// Conventional Commits enforcement (ADR 0072). CI lints the PR's commit range against
// the conventional grammar; merge commits are ignored by config-conventional's defaults.
// The `git-commit` skill already drafts conforming messages — this makes the format the
// changelog automation (ADR 0050) assumes a verifiable invariant rather than a convention.
const config = {
  extends: ["@commitlint/config-conventional"],
};

export default config;
