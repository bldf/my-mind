#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([".cjs", ".js", ".mjs", ".ts", ".tsx"]);
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".pnpm-home",
  ".vite",
  ".vitepress",
  ".corepack",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
]);

const INTERNAL_PACKAGES = [
  "@my-mind-node/exporters",
  "@my-mind-node/importers",
  "@my-mind-node/react",
  "@my-mind-node/core",
];

const PACKAGE_RULES = [
  {
    root: "packages/core",
    packageName: "@my-mind-node/core",
    allowedInternal: [],
    forbiddenExternal: [
      "@vitejs/plugin-react",
      "@xyflow/react",
      "lucide-react",
      "next",
      "react",
      "react-dom",
      "vite",
      "vitepress",
    ],
    reason: "packages/core is the DOM-free architectural root.",
  },
  {
    root: "packages/importers",
    packageName: "@my-mind-node/importers",
    allowedInternal: ["@my-mind-node/core"],
    forbiddenExternal: ["@xyflow/react", "lucide-react", "next", "react", "react-dom"],
    reason: "packages/importers must stay an optional adapter over core data.",
  },
  {
    root: "packages/exporters",
    packageName: "@my-mind-node/exporters",
    allowedInternal: ["@my-mind-node/core"],
    forbiddenExternal: ["@xyflow/react", "lucide-react", "next", "react", "react-dom"],
    reason: "packages/exporters must stay an optional adapter over core data.",
  },
  {
    root: "packages/react",
    packageName: "@my-mind-node/react",
    allowedInternal: ["@my-mind-node/core"],
    forbiddenExternal: [],
    forbiddenInternal: ["@my-mind-node/importers", "@my-mind-node/exporters"],
    reason: "packages/react is the default UI package and must not pull optional adapters into its bundle path.",
  },
  {
    root: "apps/playground",
    packageName: "@my-mind-node/playground",
    allowedInternal: [
      "@my-mind-node/core",
      "@my-mind-node/react",
      "@my-mind-node/importers",
      "@my-mind-node/exporters",
    ],
    forbiddenExternal: [],
    reason: "apps/playground is the integration demo and E2E target.",
  },
  {
    root: "apps/next-example",
    packageName: "@my-mind-node/next-example",
    allowedInternal: ["@my-mind-node/core", "@my-mind-node/react"],
    forbiddenExternal: [],
    reason: "apps/next-example should demonstrate SSR-safe core/react usage only.",
  },
  {
    root: "apps/readonly-example",
    packageName: "@my-mind-node/readonly-example",
    allowedInternal: ["@my-mind-node/core", "@my-mind-node/react"],
    forbiddenExternal: [],
    reason: "apps/readonly-example should demonstrate readonly core/react usage only.",
  },
  {
    root: "apps/custom-node-example",
    packageName: "@my-mind-node/custom-node-example",
    allowedInternal: ["@my-mind-node/core", "@my-mind-node/react"],
    forbiddenExternal: [],
    reason: "apps/custom-node-example should demonstrate custom core/react rendering only.",
  },
  {
    root: "apps/docs",
    packageName: "@my-mind-node/docs",
    allowedInternal: [],
    forbiddenExternal: [],
    reason: "apps/docs is a VitePress documentation app.",
  },
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relativePath(absolutePath) {
  return toPosix(path.relative(ROOT, absolutePath));
}

function getRuleForPath(relativeFile) {
  return PACKAGE_RULES.find((rule) => relativeFile === rule.root || relativeFile.startsWith(`${rule.root}/`));
}

function internalPackageForSpecifier(specifier) {
  return INTERNAL_PACKAGES.find((name) => specifier === name || specifier.startsWith(`${name}/`));
}

function hasForbiddenExternal(specifier, rule) {
  return rule.forbiddenExternal.some((name) => specifier === name || specifier.startsWith(`${name}/`));
}

function lineForIndex(content, index) {
  return content.slice(0, index).split("\n").length;
}

function extractImports(content) {
  const imports = [];
  const patterns = [
    /(?:^|\n)\s*import\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s+(?:type\s+)?[^'";]*?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      imports.push({
        specifier: match[1],
        line: lineForIndex(content, match.index ?? 0),
      });
    }
  }

  return imports;
}

async function walkFiles(dir, result = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await walkFiles(absolutePath, result);
      }
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name)) || entry.name === "package.json") {
      result.push(absolutePath);
    }
  }
  return result;
}

function violation({ file, line, what, why, how }) {
  return { file, line, what, why, how };
}

async function checkSourceFile(file) {
  const relativeFile = relativePath(file);
  const rule = getRuleForPath(relativeFile);
  if (!rule || relativeFile.endsWith("package.json")) return [];

  const content = await readFile(file, "utf8");
  const violations = [];
  for (const item of extractImports(content)) {
    const internalPackage = internalPackageForSpecifier(item.specifier);
    if (internalPackage && internalPackage !== rule.packageName && !rule.allowedInternal.includes(internalPackage)) {
      violations.push(
        violation({
          file: relativeFile,
          line: item.line,
          what: `${rule.root} imports ${item.specifier}.`,
          why: rule.reason,
          how: `Move the integration to an app/test layer, pass data through @my-mind-node/core types, or add the dependency to PACKAGE_RULES only after updating docs/ARCHITECTURE.md.`,
        }),
      );
    }

    if (rule.forbiddenInternal?.some((name) => item.specifier === name || item.specifier.startsWith(`${name}/`))) {
      violations.push(
        violation({
          file: relativeFile,
          line: item.line,
          what: `${rule.root} imports optional adapter ${item.specifier}.`,
          why: rule.reason,
          how: "Keep import/export actions in apps/playground or caller code. Do not wire adapters through @my-mind-node/react.",
        }),
      );
    }

    if (hasForbiddenExternal(item.specifier, rule)) {
      violations.push(
        violation({
          file: relativeFile,
          line: item.line,
          what: `${rule.root} imports UI/runtime package ${item.specifier}.`,
          why: rule.reason,
          how: "Move UI or framework-specific logic to packages/react or an app. Keep lower packages format/data focused.",
        }),
      );
    }
  }
  return violations;
}

async function checkPackageManifest(file) {
  const relativeFile = relativePath(file);
  if (!relativeFile.endsWith("package.json")) return [];
  const rule = getRuleForPath(relativeFile);
  if (!rule) return [];

  const manifest = JSON.parse(await readFile(file, "utf8"));
  const dependencySections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  const violations = [];
  for (const section of dependencySections) {
    for (const dependency of Object.keys(manifest[section] ?? {})) {
      const internalPackage = internalPackageForSpecifier(dependency);
      if (!internalPackage || internalPackage === rule.packageName) continue;
      if (!rule.allowedInternal.includes(internalPackage)) {
        violations.push(
          violation({
            file: relativeFile,
            line: 1,
            what: `${manifest.name ?? rule.root} declares ${dependency} in ${section}.`,
            why: rule.reason,
            how: `Remove the dependency, move the code to an allowed layer, or update PACKAGE_RULES and docs/ARCHITECTURE.md together if the architecture intentionally changed.`,
          }),
        );
      }
    }
  }
  return violations;
}

async function checkWorkspaceCoverage() {
  const violations = [];
  for (const workspaceRoot of ["packages", "apps"]) {
    const entries = await readdir(path.join(ROOT, workspaceRoot), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packageRoot = `${workspaceRoot}/${entry.name}`;
      if (!PACKAGE_RULES.some((rule) => rule.root === packageRoot)) {
        violations.push(
          violation({
            file: `${packageRoot}/package.json`,
            line: 1,
            what: `${packageRoot} is a workspace package without a lint-deps layer rule.`,
            why: "Every workspace must be covered so agents cannot create unguarded dependency paths.",
            how: `Add a PACKAGE_RULES entry for ${packageRoot} with explicit allowedInternal dependencies.`,
          }),
        );
      }
    }
  }
  return violations;
}

const files = await walkFiles(ROOT);
const violations = [
  ...(await checkWorkspaceCoverage()),
  ...(
    await Promise.all(
      files.map(async (file) => [
        ...(await checkPackageManifest(file)),
        ...(await checkSourceFile(file)),
      ]),
    )
  ).flat(),
];

if (violations.length === 0) {
  console.log("OK lint-deps: workspace dependency layers are valid.");
  process.exit(0);
}

console.error(`Found ${violations.length} dependency layer violation(s):`);
for (const item of violations) {
  console.error("");
  console.error(`${item.file}:${item.line}`);
  console.error(`WHAT: ${item.what}`);
  console.error(`WHY: ${item.why}`);
  console.error(`HOW: ${item.how}`);
}
process.exit(1);
