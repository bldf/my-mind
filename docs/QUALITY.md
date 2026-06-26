# Quality Standards

## 1 Architecture Boundaries

The workspace depends on explicit package layers. `packages/core` is the root data package, import/export packages are optional adapters, `packages/react` is the UI adapter, and apps are integration consumers. `make lint-arch` runs `scripts/lint-deps.mjs` to enforce those boundaries with WHAT/WHY/HOW errors.

> Sources: `docs/ARCHITECTURE.md:43`, `scripts/lint-deps.mjs:20`, `scripts/lint-deps.mjs:52`, `Makefile:21`

## 2 Harness Quality

`scripts/lint-quality.mjs` checks that agent entry points, architecture docs, component docs, harness scripts, environment config, Makefile targets, and CI commands exist and remain internally consistent.

> Sources: `scripts/lint-quality.mjs:5`, `scripts/lint-quality.mjs:101`, `scripts/lint-quality.mjs:146`, `scripts/lint-quality.mjs:213`, `Makefile:21`

## 3 Required Checks By Change Type

| Change | Required checks |
| --- | --- |
| Any file | `git diff --check` |
| Package source or shared TS config | `pnpm typecheck`, focused tests, usually `pnpm test` |
| Package boundaries, harness, docs map | `make lint-arch` |
| UI, playground, or browser behavior | `pnpm e2e` when feasible |
| Build/package config | `pnpm build`, `pnpm bundle` |
| Prompt/skill/agent assets | Read `.agents/rules/*` and perform a cold-start walkthrough |

> Sources: `.agents/rules/testing.md:8`, `.agents/rules/testing.md:10`, `.agents/rules/testing.md:12`, `.agents/rules/testing.md:14`, `.agents/rules/testing.md:16`, `.agents/rules/testing.md:18`

## 4 TS/TSX File Size

Non-test `.ts` and `.tsx` files must stay within 800 lines. Files under `tests/`, files under `__tests__/`, and `*.test.*` or `*.spec.*` files are exempt because comprehensive tests often need larger fixtures and scenario coverage.

> Sources: `scripts/lint-quality.mjs:28`, `scripts/lint-quality.mjs:72`, `scripts/lint-quality.mjs:294`

## 5 Error Handling Expectations

Core and adapters should prefer structured result unions with `MindMapError` codes over string-only exceptions for expected validation and format failures. Browser-only failures in React should flow through `onError` so host apps can decide how to surface them.

> Sources: `packages/core/src/types.ts:109`, `packages/core/src/types.ts:117`, `packages/core/src/validation.ts:15`, `packages/importers/src/index.ts:21`, `packages/exporters/src/index.ts:17`, `packages/react/src/MindMapEditor.tsx:150`

## 6 Security Rules

Do not commit API keys, tokens, cookies, private keys, OAuth secrets, real `.env` files, browser profiles, or private user data. Harness config must describe secrets by environment variable name only; this workspace currently has no required runtime secrets.

> Sources: `.agents/rules/security.md:9`, `.agents/rules/security.md:11`, `.gitignore:14`, `.gitignore:22`, `harness/config/environment.json:36`

## 7 Documentation Rules

Agent-facing docs should be source-cited, short enough to navigate, and split by responsibility. `AGENTS.md` stays a map; architecture and design details live under `docs/`.

> Sources: `AGENTS.md:1`, `AGENTS.md:36`, `docs/ARCHITECTURE.md:1`, `docs/design-docs/core.md:1`

## 8 CI Gates

The CI workflow runs architecture lint, TypeScript checks, ESLint, tests, build, bundle budget, and Playwright E2E. GitHub Pages deployment is intentionally separate from quality validation.

> Sources: `.github/workflows/ci.yml:21`, `.github/workflows/ci.yml:26`, `.github/workflows/ci.yml:32`, `.github/workflows/pages.yml:1`
