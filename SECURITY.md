# Security Policy

This document explains how to report a security vulnerability in the template and which
security controls the template enforces by default. The template is built for agentic
development, where an AI agent writes most of the code, so its security posture is held in
place by deterministic machine checks rather than left to convention.

## Reporting a vulnerability

Report vulnerabilities privately, not in a public issue or pull request, so the problem can
be assessed before it becomes widely known.

Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Describe the issue with enough detail to reproduce it.

If private reporting is not enabled on the repository you are using, open an issue that asks
for a private contact channel, without including any vulnerability details in it.

A useful report includes:

- the affected file, script, workflow, or dependency;
- the impact — what someone could do by exploiting it;
- the steps to reproduce, ideally with a minimal example;
- a suggested remediation, if you have one.

This is a community template maintained on a best-effort basis. Expect an initial
acknowledgement within a few days, and please allow time for a fix before disclosing the
issue publicly.

## Supported versions

Security fixes land on the `main` branch, which is always kept deployable. There is no
separate long-term-support branch, so adopt the latest `main` to receive them. Because this
is a starter template rather than a running service, the security of any application built
from it rests with that application's maintainers.

## Scope

In scope is the template's own code and tooling:

- the application scaffolding under `src/`;
- the gate scripts, edit-time hooks, and advisory jobs under `scripts/`;
- the CI workflows under `.github/`;
- the Claude Code configuration under `.claude/` and `.mcp.json`.

Out of scope is the product code you build on top of the template, along with vulnerabilities
in third-party dependencies themselves. The template does triage dependency advisories
through `npm audit` and Renovate, so a report about how the template _uses_ a dependency is
welcome even when the flaw originates upstream.

## What the template enforces

The template ships with deterministic security controls so that a class of mistakes cannot
reach `main`. They run both locally and in CI, and you inherit them on the first commit.

| Control                   | Mechanism                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Secret scanning           | `gitleaks` scans incoming commits for credentials (ADR 0056).                                                        |
| Static analysis           | CodeQL runs the `security-extended` query suite; it stays inert until a maintainer enables code scanning (ADR 0068). |
| Dependency audit          | `npm audit` fails the gate on high-severity advisories in production dependencies (ADR 0069).                        |
| License compliance        | Production dependencies are checked against an SPDX allowlist (ADR 0071).                                            |
| Pinned actions            | Every GitHub Actions `uses:` is pinned to a full commit SHA (ADR 0044/0070).                                         |
| Secret fence              | Secrets are validated in a `server-only` module and cannot be imported into client code (ADR 0018).                  |
| Data access under RLS     | User-facing access runs as the user under Row-Level Security; the service-role key stays server-only (ADR 0013).     |
| Credentials as references | `.mcp.json` holds environment-variable references, never literal secrets (ADR 0044).                                 |

These controls are recorded as Architecture Decision Records under
[`docs/decisions/`](docs/decisions/); the rationale for the secret-scan-and-review approach is
in [ADR 0056](docs/decisions/0056-security-gate-secret-scan-and-ai-review.md).

## Handling secrets

Never commit real credentials. Local environment files (`.env`, `.env.*`) are ignored by
git, and only `.env.example`, which holds placeholder values, is tracked. If you believe a
secret has been committed, treat it as compromised: rotate it first, then report the exposure
through the channel above.
