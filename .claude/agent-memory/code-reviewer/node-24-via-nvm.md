---
name: node-24-via-nvm
description: Project commands need Node 24 on PATH; shell default is Node 22 — prepend the nvm path before running gates
metadata:
  type: project
---

The shell default is Node 22, but `engines.node` pins `>=24 <25` (ADR 0004). Before running any project gate (vitest, eslint, tsc, next, playwright), prepend Node 24 to PATH:

```
export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
```

**Why:** Running gates under Node 22 can diverge from CI (which uses Node 24, `npm ci`). Verified the exact nvm path `~/.nvm/versions/node/v24.16.0/bin` exists on this machine 2026-06-11.

**How to apply:** Put the export at the top of any Bash block that runs the toolchain. Re-verify the version slug if a newer 24.x is installed.
