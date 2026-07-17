#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generate `dist/registry.json` — the machine-readable component registry
 * consumed by AI agents and the `@tetherto/mdk-ui-cli` package.
 *
 * The generator starts from the public entry (`src/index.ts`), enumerates its
 * exported declarations via the TypeScript compiler API (`ts-morph`), and
 * builds a manifest entry for each exported React component and hook.
 *
 * Custom JSDoc tags consumed:
 *   - `@category`        — free-form category (charts, tables, …)
 *   - `@kernelCapability`   — Kernel capability identifier (repeatable)
 *   - `@domain`          — mining-operations | financial-reporting | …
 *
 * Co-located `*.example.tsx` and `USAGE.md` files in the same directory as a
 * component are picked up automatically.
 */
import { Buffer } from "node:buffer";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ArrowFunction,
  type FunctionDeclaration,
  type FunctionExpression,
  type JSDoc,
  Node,
  type ParameterDeclaration,
  Project,
  type SourceFile,
  type Type,
  type VariableDeclaration,
} from "ts-morph";

import { buildBlueprints } from "./generate-blueprints.mts";
import type {
  ComponentMeta,
  HookMeta,
  PropMeta,
  RegistryIndexes,
  RegistryManifest,
  Tier,
} from "./registry-types.ts";
import {
  DEFAULT_TIER,
  DESCRIPTION_MAX_CHARS,
  PROP_DESCRIPTION_MAX_CHARS,
  REGISTRY_SCHEMA_VERSION,
  TYPE_MAX_CHARS,
} from "./registry-types.ts";

const VALID_TIERS: Tier[] = ["agent-ready", "advanced", "internal"];

/**
 * Parse the raw value of an `@tier` JSDoc tag. Returns `undefined` when no
 * tag is present (so the contract gate can flag `missing-tier`) and falls
 * back to the default only on *unrecognised* values.
 */
const parseTier = (raw: string | undefined): Tier | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (VALID_TIERS.includes(trimmed as Tier)) return trimmed as Tier;
  // Accept a few common shorthands for ergonomics.
  if (trimmed === "agent" || trimmed === "ready") return "agent-ready";
  if (trimmed === "public") return "agent-ready";
  // Unrecognised value — treat as `advanced` so we don't surface garbage,
  // but the author will see a CI warning via the description summary.
  return DEFAULT_TIER;
};

// ─── Paths ──────────────────────────────────────────────────────────────────

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const SRC_ROOT = join(PACKAGE_ROOT, "src");
const ENTRY_PATH = join(SRC_ROOT, "index.ts");
const DIST_DIR = join(PACKAGE_ROOT, "dist");
const TSCONFIG_PATH = join(PACKAGE_ROOT, "tsconfig.json");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");
const BLUEPRINTS_DIR = join(PACKAGE_ROOT, "blueprints");

const EXCLUDED_FILE_PATTERNS = [/\.test\.tsx?$/, /\.spec\.tsx?$/, /\/specs\//, /\.d\.ts$/];

// ─── Helpers ────────────────────────────────────────────────────────────────

const readPackageJson = (): { name: string; version: string } => {
  const raw = readFileSync(PACKAGE_JSON_PATH, "utf8");
  const json = JSON.parse(raw) as { name: string; version: string };
  return { name: json.name, version: json.version };
};

const toRelativeFromPackage = (absolute: string): string =>
  relative(PACKAGE_ROOT, absolute).split("\\").join("/");

const isExampleFile = (file: string): boolean => /\.example\.tsx?$/.test(file);
const isUsageFile = (file: string): boolean => /^USAGE\.md$/i.test(file);

const findFilesInDir = (dir: string, predicate: (f: string) => boolean): string[] => {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isFile() && predicate(entry)) found.push(full);
  }
  return found;
};

const firstParagraph = (text: string | undefined): string => {
  if (!text) return "";
  return text.split(/\n\s*\n/)[0]!.replace(/\s+/g, " ").trim();
};

const truncate = (text: string, max: number, suffix = "…"): string => {
  if (text.length <= max) return text;
  return `${text.slice(0, max - suffix.length).trimEnd()}${suffix}`;
};

const truncateType = (text: string): string => {
  if (text.length <= TYPE_MAX_CHARS) return text;
  return `${text.slice(0, TYPE_MAX_CHARS).trimEnd()}… /* see source */`;
};

const getJsDocDescription = (jsDocs: JSDoc[]): string => {
  if (!jsDocs.length) return "";
  return firstParagraph(jsDocs[0]!.getDescription());
};

/** Full JSDoc description: all paragraphs, trimmed, paragraph breaks preserved. */
const getJsDocDescriptionFull = (jsDocs: JSDoc[]): string => {
  if (!jsDocs.length) return "";
  return jsDocs[0]!
    .getDescription()
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
};

/**
 * Emit the long-form description only when it adds information over the
 * truncated short form, so the common case adds no registry payload.
 */
const descriptionFullIfDiffers = (full: string, short: string): string | undefined =>
  full && full !== short ? full : undefined;

/** Best-effort HEAD commit of the checkout; `null` outside a git repo (e.g. tarball builds). */
const resolveGitSha = (): string | null => {
  try {
    return execSync("git rev-parse HEAD", { cwd: PACKAGE_ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim() || null;
  } catch {
    return null;
  }
};

const getJsDocTagValues = (jsDocs: JSDoc[], tagName: string): string[] => {
  const values: string[] = [];
  for (const doc of jsDocs) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === tagName) {
        const text = tag.getCommentText();
        if (text) values.push(text.trim());
      }
    }
  }
  return values;
};

const isReactComponentName = (name: string): boolean => /^[A-Z]/.test(name);
const isHookName = (name: string): boolean => /^use[A-Z]/.test(name);

const cleanImportPaths = (text: string): string => {
  // Strip absolute `import("/abs/path").Name` to bare `Name`, since the absolute
  // path is meaningless to registry consumers (it's a generator-machine artifact).
  return text.replace(/import\("[^"]+"\)\./g, "");
};

const formatType = (type: Type): string => {
  return cleanImportPaths(type.getText()).replace(/\s+/g, " ").trim();
};

const isExcludedSourceFile = (filePath: string): boolean =>
  EXCLUDED_FILE_PATTERNS.some((re) => re.test(filePath)) || isExampleFile(filePath);

// ─── Prop extraction ────────────────────────────────────────────────────────

const propsFromType = (type: Type): PropMeta[] => {
  const props: PropMeta[] = [];

  // Unwrap `Partial<T>` so we expose the inner shape with required=false.
  let unwrapped = type;
  const aliasSymbol = type.getAliasSymbol();
  const isPartial = aliasSymbol?.getName() === "Partial";
  if (isPartial) {
    const args = type.getAliasTypeArguments();
    if (args[0]) unwrapped = args[0];
  }

  for (const prop of unwrapped.getProperties()) {
    const declarations = prop.getDeclarations();
    const declaration = declarations[0];

    // Skip props inherited from `node_modules/` (HTMLAttributes, SVGAttributes,
    // AriaAttributes, Radix primitive props, etc.). An LLM already knows the
    // standard React/DOM surface; surfacing them per component would bloat
    // the registry by 10x with zero added value.
    if (declaration) {
      const declFile = declaration.getSourceFile().getFilePath();
      if (declFile.includes("/node_modules/")) continue;
    }

    let propType: Type | undefined;
    try {
      propType = declaration ? prop.getTypeAtLocation(declaration) : prop.getDeclaredType();
    } catch {
      propType = undefined;
    }
    const propTypeText = propType ? formatType(propType) : "unknown";

    let description: string | undefined;
    let descriptionFull: string | undefined;
    let defaultValue: string | undefined;
    let isOptionalFromDecl = false;
    if (
      declaration
      && (Node.isPropertySignature(declaration) || Node.isPropertyDeclaration(declaration))
    ) {
      const docs = (declaration as { getJsDocs?: () => JSDoc[] }).getJsDocs?.() ?? [];
      const raw = getJsDocDescription(docs);
      description = raw ? truncate(raw, PROP_DESCRIPTION_MAX_CHARS) : undefined;
      descriptionFull = descriptionFullIfDiffers(getJsDocDescriptionFull(docs), description ?? "");
      defaultValue = getJsDocTagValues(docs, "default")[0];
      const hasQ = (declaration as { hasQuestionToken?: () => boolean }).hasQuestionToken;
      isOptionalFromDecl = hasQ ? hasQ.call(declaration) : false;
    }

    props.push({
      name: prop.getName(),
      type: truncateType(propTypeText),
      required: !isPartial && !isOptionalFromDecl,
      ...(defaultValue ? { default: defaultValue } : {}),
      description,
      ...(descriptionFull ? { descriptionFull } : {}),
    });
  }

  return props;
};

// ─── Component / hook extraction ────────────────────────────────────────────

type ResolvedComponent = {
  name: string;
  sourceFile: SourceFile;
  jsDocs: JSDoc[];
  parameters: ParameterDeclaration[];
};

type ResolvedHook = {
  name: string;
  sourceFile: SourceFile;
  jsDocs: JSDoc[];
  signature: string;
};

const resolveComponent = (
  name: string,
  declaration: Node,
  ownerSourceFile: SourceFile,
): ResolvedComponent | null => {
  let jsDocs: JSDoc[] = [];
  let parameters: ParameterDeclaration[] = [];
  let sourceFile = ownerSourceFile;

  if (Node.isFunctionDeclaration(declaration)) {
    const fn = declaration as FunctionDeclaration;
    jsDocs = fn.getJsDocs();
    parameters = fn.getParameters();
    sourceFile = fn.getSourceFile();
  } else if (Node.isVariableDeclaration(declaration)) {
    const variable = declaration as VariableDeclaration;
    sourceFile = variable.getSourceFile();
    const statement = variable.getVariableStatement();
    jsDocs = statement ? statement.getJsDocs() : [];

    const initializer = variable.getInitializer();
    if (initializer) {
      if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
        parameters = (initializer as ArrowFunction | FunctionExpression).getParameters();
      } else if (Node.isCallExpression(initializer)) {
        // forwardRef / memo / withErrorBoundary wrappers — pull params from the callback / inner ref.
        const args = initializer.getArguments();
        const first = args[0];
        if (first) {
          if (Node.isArrowFunction(first) || Node.isFunctionExpression(first)) {
            parameters = (first as ArrowFunction | FunctionExpression).getParameters();
          } else if (Node.isIdentifier(first)) {
            const innerName = first.getText();
            const innerFn = sourceFile.getFunction(innerName);
            const innerVar = sourceFile.getVariableDeclaration(innerName);
            if (innerFn) {
              parameters = innerFn.getParameters();
              if (!jsDocs.length) jsDocs = innerFn.getJsDocs();
            } else if (innerVar) {
              const init = innerVar.getInitializer();
              if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
                parameters = (init as ArrowFunction | FunctionExpression).getParameters();
              }
              const innerStmt = innerVar.getVariableStatement();
              if (!jsDocs.length && innerStmt) jsDocs = innerStmt.getJsDocs();
            }
          }
        }
      }
    }
  } else if (Node.isExportSpecifier(declaration)) {
    return null;
  } else {
    return null;
  }

  if (!parameters.length && !jsDocs.length) return null;

  return { name, sourceFile, jsDocs, parameters };
};

const resolveHook = (
  name: string,
  declaration: Node,
  ownerSourceFile: SourceFile,
): ResolvedHook | null => {
  let jsDocs: JSDoc[] = [];
  let signature = "";
  let sourceFile = ownerSourceFile;

  if (Node.isFunctionDeclaration(declaration)) {
    const fn = declaration as FunctionDeclaration;
    jsDocs = fn.getJsDocs();
    sourceFile = fn.getSourceFile();
    try {
      signature = formatType(fn.getType());
    } catch {
      signature = "";
    }
  } else if (Node.isVariableDeclaration(declaration)) {
    const variable = declaration as VariableDeclaration;
    sourceFile = variable.getSourceFile();
    const statement = variable.getVariableStatement();
    jsDocs = statement ? statement.getJsDocs() : [];
    try {
      signature = formatType(variable.getType());
    } catch {
      signature = "";
    }
  } else {
    return null;
  }

  return { name, sourceFile, jsDocs, signature };
};

const buildComponentMeta = (resolved: ResolvedComponent): ComponentMeta => {
  const description = truncate(getJsDocDescription(resolved.jsDocs), DESCRIPTION_MAX_CHARS);
  const descriptionFull = descriptionFullIfDiffers(getJsDocDescriptionFull(resolved.jsDocs), description);
  const category = getJsDocTagValues(resolved.jsDocs, "category")[0];
  const kernelCapabilities = getJsDocTagValues(resolved.jsDocs, "kernelCapability");
  const domainContext = getJsDocTagValues(resolved.jsDocs, "domain")[0];
  const tier = parseTier(getJsDocTagValues(resolved.jsDocs, "tier")[0]);

  let props: PropMeta[] = [];
  const firstParam = resolved.parameters[0];
  if (firstParam) {
    try {
      props = propsFromType(firstParam.getType());
    } catch {
      props = [];
    }
  }

  const filePath = resolved.sourceFile.getFilePath();
  const dir = dirname(filePath);
  // Examples + USAGE.md only ship in the registry for agent-ready components.
  // Advanced exports keep prop info (engineers extending the library still
  // need it) but skip doc pointers to keep the payload tight.
  const isAgentReady = tier === "agent-ready";
  const examplePaths = isAgentReady ? findFilesInDir(dir, isExampleFile) : [];
  const usagePath = isAgentReady ? findFilesInDir(dir, isUsageFile)[0] : undefined;

  return {
    name: resolved.name,
    path: toRelativeFromPackage(filePath),
    description,
    ...(descriptionFull ? { descriptionFull } : {}),
    ...(tier ? { tier } : {}),
    public: tier !== "internal",
    category: category || undefined,
    kernelCapabilities: kernelCapabilities.length
      ? (kernelCapabilities as ComponentMeta["kernelCapabilities"])
      : undefined,
    domainContext: domainContext ? (domainContext as ComponentMeta["domainContext"]) : undefined,
    props,
    ...(isAgentReady && examplePaths.length
      ? { examples: examplePaths.map(toRelativeFromPackage) }
      : {}),
    ...(usagePath ? { usageDoc: toRelativeFromPackage(usagePath) } : {}),
  };
};

const buildHookMeta = (resolved: ResolvedHook): HookMeta => {
  const description = truncate(getJsDocDescription(resolved.jsDocs), DESCRIPTION_MAX_CHARS);
  const descriptionFull = descriptionFullIfDiffers(getJsDocDescriptionFull(resolved.jsDocs), description);
  const category = getJsDocTagValues(resolved.jsDocs, "category")[0];
  const kernelCapabilities = getJsDocTagValues(resolved.jsDocs, "kernelCapability");
  const domainContext = getJsDocTagValues(resolved.jsDocs, "domain")[0];
  const tier = parseTier(getJsDocTagValues(resolved.jsDocs, "tier")[0]);
  return {
    name: resolved.name,
    path: toRelativeFromPackage(resolved.sourceFile.getFilePath()),
    description,
    ...(descriptionFull ? { descriptionFull } : {}),
    ...(tier ? { tier } : {}),
    public: tier !== "internal",
    signature: truncateType(resolved.signature),
    category: category || undefined,
    kernelCapabilities: kernelCapabilities.length ? (kernelCapabilities as HookMeta["kernelCapabilities"]) : undefined,
    domainContext: domainContext ? (domainContext as HookMeta["domainContext"]) : undefined,
  };
};

/**
 * Build O(1) lookup indexes that ship alongside the flat arrays. Values are
 * either an index into the array (`byName`) or arrays of names (everything
 * else). Keeps payload tiny while letting agents skip linear scans.
 */
const buildIndexes = (components: ComponentMeta[], hooks: HookMeta[]): RegistryIndexes => {
  const componentsByName: Record<string, number> = {};
  const hooksByName: Record<string, number> = {};
  const componentsByCategory: Record<string, string[]> = {};
  const componentsByDomain: Record<string, string[]> = {};
  const componentsByKernelCapability: Record<string, string[]> = {};
  const componentsByTier: Record<string, string[]> = {};
  const componentsByPublic: Record<string, string[]> = {};
  const hooksByDomain: Record<string, string[]> = {};
  const hooksByKernelCapability: Record<string, string[]> = {};
  const hooksByPublic: Record<string, string[]> = {};

  const pushUnique = (bucket: Record<string, string[]>, key: string, value: string): void => {
    if (!bucket[key]) bucket[key] = [];
    if (!bucket[key]!.includes(value)) bucket[key]!.push(value);
  };

  components.forEach((c, i) => {
    componentsByName[c.name] = i;
    if (c.tier) pushUnique(componentsByTier, c.tier, c.name);
    if (c.category) pushUnique(componentsByCategory, c.category, c.name);
    if (c.domainContext) pushUnique(componentsByDomain, c.domainContext, c.name);
    for (const cap of c.kernelCapabilities ?? []) pushUnique(componentsByKernelCapability, cap, c.name);
    pushUnique(componentsByPublic, String(c.public), c.name);
  });

  hooks.forEach((h, i) => {
    hooksByName[h.name] = i;
    if (h.domainContext) pushUnique(hooksByDomain, h.domainContext, h.name);
    for (const cap of h.kernelCapabilities ?? []) pushUnique(hooksByKernelCapability, cap, h.name);
    pushUnique(hooksByPublic, String(h.public), h.name);
  });

  return {
    componentsByName,
    hooksByName,
    componentsByCategory,
    componentsByDomain,
    componentsByKernelCapability,
    componentsByTier,
    componentsByPublic,
    hooksByDomain,
    hooksByKernelCapability,
    hooksByPublic,
  };
};

// ─── Main ───────────────────────────────────────────────────────────────────

const main = (): void => {
  const pkg = readPackageJson();

  console.log(`📚 Generating registry for ${pkg.name}@${pkg.version}…`);

  const project = new Project({
    tsConfigFilePath: TSCONFIG_PATH,
    skipAddingFilesFromTsConfig: false,
    skipFileDependencyResolution: false,
  });

  const entry = project.getSourceFile(ENTRY_PATH);
  if (!entry) {
    throw new Error(`Could not load entry source file at ${ENTRY_PATH}`);
  }

  const components: ComponentMeta[] = [];
  const hooks: HookMeta[] = [];
  const seenComponentNames = new Set<string>();
  const seenHookNames = new Set<string>();

  for (const [name, declarations] of entry.getExportedDeclarations()) {
    const declaration = declarations[0];
    if (!declaration) continue;

    const filePath = declaration.getSourceFile().getFilePath();
    if (isExcludedSourceFile(filePath)) continue;
    if (!filePath.startsWith(SRC_ROOT)) continue;

    if (isReactComponentName(name) && !isHookName(name)) {
      if (seenComponentNames.has(name)) continue;
      const resolved = resolveComponent(name, declaration, entry);
      if (!resolved) continue;
      seenComponentNames.add(name);
      components.push(buildComponentMeta(resolved));
    } else if (isHookName(name)) {
      if (seenHookNames.has(name)) continue;
      const resolved = resolveHook(name, declaration, entry);
      if (!resolved) continue;
      seenHookNames.add(name);
      hooks.push(buildHookMeta(resolved));
    }
  }

  // Internal entries are excluded from the public registry manifest.
  // They are tracked locally for counting but never shipped to consumers.
  const allComponents = components;
  const allHooks = hooks;
  const publicComponents = allComponents.filter((c) => c.public);
  const publicHooks = allHooks.filter((h) => h.public);

  publicComponents.sort((a, b) => a.name.localeCompare(b.name));
  publicHooks.sort((a, b) => a.name.localeCompare(b.name));

  const indexes = buildIndexes(publicComponents, publicHooks);

  const manifest: RegistryManifest = {
    version: REGISTRY_SCHEMA_VERSION,
    package: pkg.name,
    packageVersion: pkg.version,
    generatedAt: new Date().toISOString(),
    generatedFrom: { gitSha: resolveGitSha() },
    components: publicComponents,
    hooks: publicHooks,
    indexes,
  };

  if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true });
  const outPath = join(DIST_DIR, "registry.json");
  // Minified: this is a generated, machine-consumed artifact (the CLI JSON.parses
  // it) shipped in the published tarball. Dropping the indentation trims ~29% off
  // the installed file with no functional change.
  const serialised = `${JSON.stringify(manifest)}\n`;
  writeFileSync(outPath, serialised, "utf8");

  const sizeKb = (Buffer.byteLength(serialised, "utf8") / 1024).toFixed(1);
  const agentReady = publicComponents.filter((c) => c.tier === "agent-ready").length;
  const advancedC = publicComponents.filter((c) => c.tier === "advanced").length;
  const internalC = allComponents.length - publicComponents.length;
  const internalH = allHooks.length - publicHooks.length;
  console.log(
    `✓ Wrote ${toRelativeFromPackage(outPath)} (${sizeKb} KB) — ${publicComponents.length} components `
    + `(${agentReady} agent-ready, ${advancedC} advanced, ${internalC} internal), `
    + `${publicHooks.length} hooks (${publicHooks.length} public, ${internalH} internal).`,
  );

  // Blueprints: curated intent → recipe layer. Validation errors are non-fatal
  // here (we still emit the manifest); `check:agent-ready` re-runs validation
  // and fails the build for new violations.
  // Blueprints only reference the public surface — no internal components.
  const blueprintsResult = buildBlueprints({
    blueprintsDir: BLUEPRINTS_DIR,
    packageRoot: PACKAGE_ROOT,
    packageName: pkg.name,
    components: publicComponents,
    hooks: publicHooks,
  });
  const blueprintsPath = join(DIST_DIR, "blueprints.json");
  const blueprintsSerialised = `${JSON.stringify(blueprintsResult.manifest)}\n`;
  writeFileSync(blueprintsPath, blueprintsSerialised, "utf8");
  const bpSizeKb = (Buffer.byteLength(blueprintsSerialised, "utf8") / 1024).toFixed(1);
  console.log(
    `✓ Wrote ${toRelativeFromPackage(blueprintsPath)} (${bpSizeKb} KB) — `
    + `${blueprintsResult.manifest.blueprints.length} blueprints.`,
  );
  if (blueprintsResult.errors.length > 0) {
    console.warn(
      `⚠ ${blueprintsResult.errors.length} blueprint validation issue(s):`,
    );
    for (const err of blueprintsResult.errors) console.warn(`  - ${err}`);
  }
};

main();
