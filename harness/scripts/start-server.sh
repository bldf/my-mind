#!/usr/bin/env bash
# Start a local app target for harness or manual verification.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

TARGET="${1:-playground}"

case "$TARGET" in
  playground)
    exec pnpm --filter @my-mind-node/playground dev
    ;;
  docs)
    exec pnpm --filter @my-mind-node/docs dev
    ;;
  readonly)
    exec pnpm --filter @my-mind-node/readonly-example dev
    ;;
  custom-node)
    exec pnpm --filter @my-mind-node/custom-node-example dev
    ;;
  next)
    exec pnpm --filter @my-mind-node/next-example dev
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Expected one of: playground, docs, readonly, custom-node, next"
    exit 2
    ;;
esac
