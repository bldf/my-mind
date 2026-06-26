SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c

.PHONY: deps dev build test typecheck lint lint-arch format fixtures bench bundle e2e docs-build verify

deps:
	pnpm install

dev:
	pnpm --filter @my-mind-node/playground dev

build:
	pnpm build

test:
	pnpm test

typecheck:
	pnpm typecheck

lint:
	pnpm lint

lint-arch:
	node scripts/lint-deps.mjs
	node scripts/lint-quality.mjs

format:
	pnpm format

fixtures:
	pnpm fixtures

bench:
	pnpm bench

bundle:
	pnpm bundle

e2e:
	pnpm e2e

docs-build:
	pnpm docs:build

verify: lint-arch typecheck lint test build bundle
