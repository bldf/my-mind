#!/usr/bin/env node
import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "AGENTS.md",
  "docs/ARCHITECTURE.md",
  "docs/DEVELOPMENT.md",
  "docs/QUALITY.md",
  "harness/config/environment.json",
  "harness/scripts/setup-env.sh",
  "harness/scripts/start-server.sh",
  "harness/scripts/teardown-env.sh",
  "harness/evals/smoke.json",
  "scripts/lint-deps.mjs",
  "scripts/lint-quality.mjs",
  "Makefile",
  ".github/workflows/ci.yml",
];

const REQUIRED_RULES = [
  ".agents/rules/coding-style.md",
  ".agents/rules/testing.md",
  ".agents/rules/security.md",
  ".agents/rules/git-workflow.md",
];
const MAX_TS_TSX_LINES = 800;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIP_SOURCE_DIRS = new Set([
  ".git",
  ".next",
  ".vite",
  ".vitepress",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
]);

function resolvePath(relativePath) {
  return path.join(ROOT, relativePath);
}

async function exists(relativePath) {
  try {
    await access(resolvePath(relativePath));
    return true;
  } catch {
    return false;
  }
}

function lineCount(content) {
  return content.trimEnd().split("\n").length;
}

function addViolation(violations, file, what, why, how) {
  violations.push({ file, what, why, how });
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolvePath(relativePath), "utf8"));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function walkFiles(dir, result = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_SOURCE_DIRS.has(entry.name)) {
        await walkFiles(absolutePath, result);
      }
      continue;
    }
    result.push(absolutePath);
  }
  return result;
}

function isTsOrTsx(relativePath) {
  return SOURCE_EXTENSIONS.has(path.extname(relativePath));
}

function isTestSource(relativePath) {
  return (
    relativePath.includes("/__tests__/") ||
    relativePath.startsWith("tests/") ||
    /\.(test|spec)\.[cm]?[tj]sx?$/.test(relativePath)
  );
}

async function checkRequiredFiles(violations) {
  for (const file of REQUIRED_FILES) {
    if (!(await exists(file))) {
      addViolation(
        violations,
        file,
        "Required harness file is missing.",
        "Agents need stable documentation, lint, CI, and runtime entry points.",
        `Create ${file} or remove it from REQUIRED_FILES only if the harness contract changed.`,
      );
    }
  }
}

async function checkAgentsMd(violations) {
  const content = await readFile(resolvePath("AGENTS.md"), "utf8");
  const lines = lineCount(content);
  if (lines < 80 || lines > 120) {
    addViolation(
      violations,
      "AGENTS.md",
      `AGENTS.md has ${lines} lines; expected 80-120.`,
      "AGENTS.md should be a concise navigation map, not a tiny stub or full manual.",
      "Keep commands and links here, and move detailed explanations into docs/.",
    );
  }

  for (const rulePath of REQUIRED_RULES) {
    if (!content.includes(rulePath)) {
      addViolation(
        violations,
        "AGENTS.md",
        `${rulePath} is not referenced.`,
        "Codex must read project rules before editing.",
        `Add ${rulePath} to the Quick Start rules list.`,
      );
    }
    if (!(await exists(rulePath))) {
      addViolation(
        violations,
        rulePath,
        "Referenced project rule file is missing.",
        "AGENTS.md must not point agents at dead paths.",
        "Restore the rule file or update AGENTS.md to the real path.",
      );
    }
  }

  if (content.includes(".claude/") && !(await exists(".claude"))) {
    addViolation(
      violations,
      "AGENTS.md",
      "AGENTS.md references .claude/, but this checkout has no .claude directory.",
      "Dead paths waste agent context and cause false assumptions.",
      "Remove the .claude reference or restore the directory.",
    );
  }
}

async function checkDocs(violations) {
  const architecture = await readFile(resolvePath("docs/ARCHITECTURE.md"), "utf8");
  for (const required of ["```mermaid", "> Sources:", "packages/core", "packages/react", "packages/importers", "packages/exporters"]) {
    if (!architecture.includes(required)) {
      addViolation(
        violations,
        "docs/ARCHITECTURE.md",
        `Architecture doc is missing ${required}.`,
        "The architecture page must be source-grounded and mechanically useful.",
        "Add the missing diagram, source citation, or package boundary section.",
      );
    }
  }

  const designDir = resolvePath("docs/design-docs");
  const designDocs = (await readdir(designDir)).filter((file) => file.endsWith(".md") && file !== "index.md");
  if (designDocs.length < 3) {
    addViolation(
      violations,
      "docs/design-docs",
      `Only ${designDocs.length} component design doc(s) found; expected at least 3.`,
      "Agents need component-level docs, not only an architecture overview.",
      "Add focused docs for core, react, adapters, and app surfaces.",
    );
  }
}

async function checkEnvironment(violations) {
  const environment = await readJson("harness/config/environment.json");
  if (environment.version !== "2.0") {
    addViolation(
      violations,
      "harness/config/environment.json",
      `environment.json version is ${environment.version}; expected 2.0.`,
      "harness-executor expects the v2 runtime ecosystem schema.",
      "Update version and fields according to docs/DEVELOPMENT.md and the harness environment guide.",
    );
  }
  if (await exists("harness/config/verify.json")) {
    addViolation(
      violations,
      "harness/config/verify.json",
      "Static verify.json must not exist.",
      "Verification config is generated at task runtime from environment.json plus changed files.",
      "Delete harness/config/verify.json and keep runtime facts in environment.json.",
    );
  }

  const serialized = JSON.stringify(environment);
  const secretPatterns = [/sk-[A-Za-z0-9]/, /ghp_[A-Za-z0-9]/, /xox[baprs]-/, /-----BEGIN [A-Z ]+PRIVATE KEY-----/];
  if (secretPatterns.some((pattern) => pattern.test(serialized))) {
    addViolation(
      violations,
      "harness/config/environment.json",
      "environment.json appears to contain a real secret.",
      "Harness config is committed and must use placeholders only.",
      "Replace the value with ${VAR_NAME} or document it in _meta.requires_user_input.",
    );
  }
}

async function checkScripts(violations) {
  for (const scriptPath of [
    "harness/scripts/setup-env.sh",
    "harness/scripts/start-server.sh",
    "harness/scripts/teardown-env.sh",
  ]) {
    const content = await readFile(resolvePath(scriptPath), "utf8");
    if (!content.startsWith("#!/usr/bin/env bash")) {
      addViolation(
        violations,
        scriptPath,
        "Shell script is missing the bash shebang.",
        "Harness scripts should be directly executable and predictable.",
        "Start the file with #!/usr/bin/env bash.",
      );
    }
    if (!content.includes("set -euo pipefail")) {
      addViolation(
        violations,
        scriptPath,
        "Shell script is missing set -euo pipefail.",
        "Harness scripts should fail fast on unset variables and command errors.",
        "Add set -euo pipefail near the top of the script.",
      );
    }
  }

  const makefile = await readFile(resolvePath("Makefile"), "utf8");
  if (!makefile.includes("lint-arch:")) {
    addViolation(
      violations,
      "Makefile",
      "Makefile is missing lint-arch target.",
      "Agents need one stable architecture lint command.",
      "Add lint-arch and run scripts/lint-deps.mjs plus scripts/lint-quality.mjs.",
    );
  }
}

async function checkCi(violations) {
  const ci = await readFile(resolvePath(".github/workflows/ci.yml"), "utf8");
  for (const command of ["make lint-arch", "pnpm typecheck", "pnpm lint", "pnpm test", "pnpm build", "pnpm bundle"]) {
    if (!ci.includes(command)) {
      addViolation(
        violations,
        ".github/workflows/ci.yml",
        `CI does not run ${command}.`,
        "CI must gate the same checks agents are expected to run locally.",
        `Add a workflow step for ${command}.`,
      );
    }
  }
}

async function checkExecutableBits(violations) {
  for (const scriptPath of [
    "scripts/lint-deps.mjs",
    "scripts/lint-quality.mjs",
    "harness/scripts/setup-env.sh",
    "harness/scripts/start-server.sh",
    "harness/scripts/teardown-env.sh",
  ]) {
    const mode = (await stat(resolvePath(scriptPath))).mode;
    if ((mode & 0o111) === 0) {
      addViolation(
        violations,
        scriptPath,
        "Script is not executable.",
        "Harness scripts should work as direct command entry points.",
        `Run chmod +x ${scriptPath}.`,
      );
    }
  }
}

async function checkSourceLineCounts(violations) {
  const files = await walkFiles(ROOT);
  for (const file of files) {
    const relativePath = toPosix(path.relative(ROOT, file));
    if (!isTsOrTsx(relativePath) || isTestSource(relativePath)) continue;

    const lines = lineCount(await readFile(file, "utf8"));
    if (lines > MAX_TS_TSX_LINES) {
      addViolation(
        violations,
        relativePath,
        `${relativePath} has ${lines} lines; non-test TS/TSX files must stay within ${MAX_TS_TSX_LINES} lines.`,
        "Large implementation files are harder for agents to review, patch safely, and keep within context.",
        "Split cohesive helpers, hooks, components, or adapters into nearby modules. Test files are exempt from this limit.",
      );
    }
  }
}

const violations = [];
await checkRequiredFiles(violations);
if (violations.length === 0) {
  await checkAgentsMd(violations);
  await checkDocs(violations);
  await checkEnvironment(violations);
  await checkScripts(violations);
  await checkCi(violations);
  await checkExecutableBits(violations);
  await checkSourceLineCounts(violations);
}

if (violations.length === 0) {
  console.log("OK lint-quality: harness docs, scripts, and CI are valid.");
  process.exit(0);
}

console.error(`Found ${violations.length} harness quality violation(s):`);
for (const item of violations) {
  console.error("");
  console.error(item.file);
  console.error(`WHAT: ${item.what}`);
  console.error(`WHY: ${item.why}`);
  console.error(`HOW: ${item.how}`);
}
process.exit(1);
