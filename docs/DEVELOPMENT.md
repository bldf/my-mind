# Development Setup

## 1 Prerequisites

- Node.js: CI uses Node `22`; the repository currently does not pin a local Node version.
- Package manager: pnpm `9.15.0`.
- Browser tests: Playwright browsers may need one local install with `pnpm exec playwright install chromium firefox webkit`.
- Services: no database, cache, broker, Docker, Kubernetes, or runtime `.env` file is required for the default workspace flow.

> Sources: `package.json:7`, `.github/workflows/pages.yml:22`, `.github/workflows/pages.yml:25`, `.gitignore:14`, `playwright.config.ts:5`

## 2 Quick Start

```bash
pnpm install
make lint-arch
pnpm typecheck
pnpm test
pnpm build
pnpm bundle
```

Run the playground:

```bash
pnpm --filter @my-mind-node/playground dev
```

> Sources: `package.json:8`, `package.json:19`, `apps/playground/package.json:7`, `apps/playground/vite.config.ts:17`

## 3 Build Commands

| Command | Description | Notes |
| --- | --- | --- |
| `pnpm build` | Builds `packages/*`, playground, and docs | Root script composes package/app builds |
| `pnpm --filter @my-mind-node/docs build` | Builds VitePress docs only | Also available as `pnpm docs:build` |
| `pnpm --filter @my-mind-node/playground build` | Builds playground only | Uses Vite and source aliases |
| `pnpm --recursive --filter './packages/*' build` | Builds publishable packages | Uses `tsup` and declarations |

> Sources: `package.json:9`, `package.json:19`, `packages/core/package.json:16`, `packages/react/package.json:17`, `apps/playground/package.json:8`, `apps/docs/package.json:8`

## 4 Verification Commands

| Command | Scope |
| --- | --- |
| `make lint-arch` | Dependency layer lint and harness quality lint |
| `pnpm typecheck` | Package and playground TypeScript checks |
| `pnpm lint` | ESLint for source files |
| `pnpm test` | Package metadata test, package unit tests, benchmark generation |
| `pnpm e2e` | Playwright Chromium, Firefox, WebKit, mobile matrix |
| `pnpm bundle` | Gzip budget checks after build artifacts exist |
| `git diff --check` | Whitespace and conflict marker check |

> Sources: `Makefile:21`, `package.json:10`, `package.json:12`, `package.json:13`, `package.json:17`, `package.json:18`, `playwright.config.ts:14`

## 5 Local App Targets

| Target | Command | Default URL |
| --- | --- | --- |
| Playground | `harness/scripts/start-server.sh playground` | `http://127.0.0.1:5187` |
| Docs | `harness/scripts/start-server.sh docs` | VitePress default |
| Readonly example | `harness/scripts/start-server.sh readonly` | Vite default |
| Custom node example | `harness/scripts/start-server.sh custom-node` | Vite default |
| Next example | `harness/scripts/start-server.sh next` | Next default |

> Sources: `harness/scripts/start-server.sh:9`, `apps/playground/vite.config.ts:17`, `apps/docs/package.json:7`, `apps/readonly-example/package.json:7`, `apps/custom-node-example/package.json:7`, `apps/next-example/package.json:7`

## 6 Project Structure

```text
.
├── packages/core              # DOM-free document model and operations
├── packages/react             # React Flow editor/viewer and UI controls
├── packages/importers         # optional input format adapters
├── packages/exporters         # optional output format adapters
├── apps/playground            # Vite integration app and E2E target
├── apps/docs                  # VitePress docs app
├── tests                      # metadata tests, fixtures, Playwright specs
├── scripts                    # fixtures, bench, bundle, harness lint
└── harness                    # runtime contract and smoke eval config
```

> Sources: `README.md:8`, `README.md:14`, `pnpm-workspace.yaml:1`

## 7 Environment Variables

No runtime environment variables are required by the checked-in source. `.env` and `.env.*` are ignored; `.env.example` is allowed if a future task needs safe placeholders.

> Sources: `.gitignore:14`, `.gitignore:16`, `harness/config/environment.json:36`

## 8 CI

`.github/workflows/ci.yml` installs pnpm `9.15.0` on Node `22`, runs `make lint-arch`, typecheck, lint, test, build, bundle, and a separate Playwright E2E job. `.github/workflows/pages.yml` remains responsible for GitHub Pages deployment.

> Sources: `.github/workflows/ci.yml:13`, `.github/workflows/ci.yml:21`, `.github/workflows/ci.yml:32`, `.github/workflows/pages.yml:1`, `.github/workflows/pages.yml:31`
