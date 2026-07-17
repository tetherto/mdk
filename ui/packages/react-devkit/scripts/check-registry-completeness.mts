#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Registry completeness gate.
 *
 * Closes the gap where a component or hook is tagged `@tier agent-ready` in
 * source (so it is meant to be part of the public, agent-discoverable
 * surface) yet is silently absent from the generated `dist/registry.json`.
 *
 * The registry generator (`generate-registry.mts`) walks the public barrel
 * and skips any export it cannot resolve as a component — e.g. a value/type
 * name collision in the barrel. So source and registry can drift with nobody
 * noticing: that is exactly how `MinMaxAvg` disappeared from the registry
 * while staying importable.
 *
 * This check scans the source directly for `@tier agent-ready` declarations
 * (independent of the barrel walk) and fails if any of them is missing from
 * the registry. Deliberate exceptions live in
 * `scripts/registry-completeness-exceptions.json` (a `name -> reason` map) so
 * every exemption is an explicit, reviewable decision in the PR diff.
 *
 * Run after `build:registry` so the on-disk registry is current.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Node, Project } from "ts-morph";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const SRC_ROOT = join(PACKAGE_ROOT, "src");
const TSCONFIG_PATH = join(PACKAGE_ROOT, "tsconfig.json");
const ENTRY_PATH = join(SRC_ROOT, "index.ts");
const REGISTRY_PATH = join(PACKAGE_ROOT, "dist", "registry.json");
const EXCEPTIONS_PATH = join(SCRIPT_DIR, "registry-completeness-exceptions.json");

const EXCLUDED_FILE_PATTERNS = [/\.test\.tsx?$/, /\.spec\.tsx?$/, /\/specs\//, /\.example\.tsx?$/, /\.d\.ts$/];

/** Whether an `@tier` value means the export is part of the agent-ready surface. */
const isAgentReady = (raw: string | undefined): boolean => {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return value === "agent-ready" || value === "agent" || value === "ready" || value === "public";
};

/**
 * The registry only tracks components (PascalCase) and hooks (`useX`). Utility
 * functions can carry a tier tag but are never registry entries, so they must
 * not be judged here.
 */
const isComponentName = (name: string): boolean => /^[A-Z]/.test(name);
const isHookName = (name: string): boolean => /^use[A-Z]/.test(name);
const isRegistryName = (name: string): boolean => isComponentName(name) || isHookName(name);

/** Read the raw `@tier` value from a node's JSDoc, if present. */
const readTier = (node: Node): string | undefined => {
  if (!Node.isJSDocable(node)) return undefined;
  for (const doc of node.getJsDocs()) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === "tier") return tag.getCommentText()?.trim() || undefined;
    }
  }
  return undefined;
};

const relativeToPackage = (absolute: string): string => absolute.slice(PACKAGE_ROOT.length + 1);

const main = (): void => {
  if (!existsSync(REGISTRY_PATH)) {
    console.error(`✗ registry not found at ${relativeToPackage(REGISTRY_PATH)} — run \`npm run build:registry\` first.`);
    process.exit(1);
  }

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as {
    components?: { name: string }[];
    hooks?: { name: string }[];
  };
  const registered = new Set<string>([
    ...(registry.components ?? []).map((c) => c.name),
    ...(registry.hooks ?? []).map((h) => h.name),
  ]);

  const exceptions: Record<string, string> = existsSync(EXCEPTIONS_PATH)
    ? (JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8")) as Record<string, string>)
    : {};

  const project = new Project({ tsConfigFilePath: TSCONFIG_PATH, skipAddingFilesFromTsConfig: false });

  // Names actually re-exported from the public barrel — the surface the registry
  // is generated from. We only judge agent-ready exports that reach this barrel.
  const entry = project.getSourceFile(ENTRY_PATH);
  if (!entry) {
    console.error(`✗ could not load the public barrel at ${relativeToPackage(ENTRY_PATH)}.`);
    process.exit(1);
  }
  const barrelExports = new Set<string>(entry.getExportedDeclarations().keys());

  // Component/hook name -> defining source file, for `@tier agent-ready` declarations.
  const agentReady = new Map<string, string>();
  const record = (name: string | undefined, node: Node, file: string): void => {
    if (name && isRegistryName(name) && isAgentReady(readTier(node))) agentReady.set(name, file);
  };

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (!filePath.startsWith(SRC_ROOT)) continue;
    if (EXCLUDED_FILE_PATTERNS.some((re) => re.test(filePath))) continue;

    // `export const Foo = ...` — JSDoc sits on the statement, name on the declaration.
    for (const statement of sourceFile.getVariableStatements()) {
      if (!statement.isExported()) continue;
      for (const declaration of statement.getDeclarations()) record(declaration.getName(), statement, filePath);
    }
    for (const fn of sourceFile.getFunctions()) {
      if (fn.isExported()) record(fn.getName(), fn, filePath);
    }
    for (const cls of sourceFile.getClasses()) {
      if (cls.isExported()) record(cls.getName(), cls, filePath);
    }
  }

  const missing = [...agentReady.entries()]
    .filter(([name]) => barrelExports.has(name) && !registered.has(name) && !(name in exceptions))
    .sort(([a], [b]) => a.localeCompare(b));

  if (missing.length === 0) {
    console.log(`✓ registry completeness: all ${agentReady.size} @tier agent-ready exports are present in the registry.`);
    return;
  }

  console.error(
    `✗ registry completeness: ${missing.length} @tier agent-ready export(s) tagged in source but missing from dist/registry.json:\n`,
  );
  for (const [name, file] of missing) console.error(`  - ${name}  (${relativeToPackage(file)})`);
  console.error(
    "\nThese are exported and tagged agent-ready, but the registry generator dropped them"
    + " (commonly a value/type name collision in the barrel). Fix the export so `npm run build:registry`"
    + " picks it up, or add it to scripts/registry-completeness-exceptions.json with a reason if it is"
    + " intentionally registry-excluded.",
  );
  process.exit(1);
};

main();
