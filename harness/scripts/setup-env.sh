#!/usr/bin/env bash
# Prepare local prerequisites for harness execution.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "==> Checking my-mind-node harness environment"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. Install pnpm 9.15.0 before running this workspace."
  exit 1
fi

if [ "${HARNESS_INSTALL_DEPS:-0}" = "1" ]; then
  echo "Installing dependencies with pnpm install..."
  pnpm install
elif [ ! -d "node_modules" ]; then
  echo "node_modules is missing."
  echo "Run 'pnpm install' or set HARNESS_INSTALL_DEPS=1 when invoking this script."
  exit 1
fi

echo "No database, cache, broker, Docker, or Kubernetes services are required."
echo "==> Environment ready"
