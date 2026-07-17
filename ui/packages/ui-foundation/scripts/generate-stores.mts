#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generate `dist/stores.json` — the machine-readable manifest of the
 * Zustand vanilla stores and TanStack Query helpers exposed by
 * `@tetherto/mdk-ui-foundation`.
 *
 * Schema (1.0.0):
 *   {
 *     "version", "package",
 *     "stores": [{ name, category, description, state, actions, factory, singleton, file }],
 *     "queryHelpers": [{ name, signature, description, category, file }]
 *   }
 *
 * Each store entry pairs the `createX` factory with the module-level
 * `xStore` singleton and lists its `State`/`Actions` field/method names
 * (so agents can pick the right setter without reading source).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Node, Project, type SourceFile, type Symbol as TsSymbol, type Type } from "ts-morph";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const SRC_ROOT = join(PACKAGE_ROOT, "src");
const STORE_INDEX = join(SRC_ROOT, "store", "index.ts");
const QUERY_INDEX = join(SRC_ROOT, "query", "index.ts");
const UTILS_INDEX = join(SRC_ROOT, "utils", "index.ts");
const CONSTANTS_INDEX = join(SRC_ROOT, "constants", "index.ts");
const TSCONFIG_PATH = join(PACKAGE_ROOT, "tsconfig.json");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");
const DIST_DIR = join(PACKAGE_ROOT, "dist");
const OUT_PATH = join(DIST_DIR, "stores.json");

const MANIFEST_VERSION = "1.1.0";
const DESCRIPTION_MAX_CHARS = 240;
const TYPE_MAX_CHARS = 160;
const SIGNATURE_MAX_CHARS = 200;

type StoreCategory =
  | "auth"
  | "devices"
  | "notifications"
  | "timezone"
  | "actions"
  | "uncategorised";

type StoreField = { name: string; type: string };
type StoreAction = { name: string; signature: string };

type StoreEntry = {
  name: string;
  category: StoreCategory;
  description: string;
  factory: string;
  state: StoreField[];
  actions: StoreAction[];
  file: string;
};

type QueryHelperEntry = {
  name: string;
  signature: string;
  description: string;
  category: string;
  file: string;
};

type UtilityEntry = {
  name: string;
  /** `function` for callables, `constant` for plain values. */
  kind: "function" | "constant";
  /** Call signature for functions; the value's type for constants. */
  signature: string;
  description: string;
  category: string;
  file: string;
};

type StoresManifest = {
  version: string;
  package: string;
  stores: StoreEntry[];
  queryHelpers: QueryHelperEntry[];
  utilities: UtilityEntry[];
};

const readPackageMeta = (): { name: string } => {
  const raw = readFileSync(PACKAGE_JSON_PATH, "utf8");
  return JSON.parse(raw) as { name: string };
};

const toRelative = (absolute: string): string =>
  relative(PACKAGE_ROOT, absolute).split("\\").join("/");

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

const normaliseWhitespace = (s: string): string => s.replace(/\s+/g, " ").trim();

type JsDocLike = {
  getDescription: () => string;
  getTags: () => Array<{ getTagName: () => string; getCommentText: () => string | undefined }>;
};

const getJsDocsBubbling = (node: Node): JsDocLike[] => {
  let current: Node | undefined = node;
  while (current) {
    if (Node.isJSDocable(current)) {
      const docs = current.getJsDocs() as unknown as JsDocLike[];
      if (docs.length > 0) return docs;
    }
    current = current.getParent();
  }
  return [];
};

const extractDescription = (docs: JsDocLike[]): string => {
  const last = docs[docs.length - 1];
  if (!last) return "";
  const raw = last.getDescription();
  const firstPara = raw.split(/\n\s*\n/)[0] ?? raw;
  return truncate(normaliseWhitespace(firstPara), DESCRIPTION_MAX_CHARS);
};

const VALID_STORE_CATEGORIES: StoreCategory[] = [
  "auth",
  "devices",
  "notifications",
  "timezone",
  "actions",
];

const extractStoreCategory = (docs: JsDocLike[]): StoreCategory => {
  for (const doc of docs) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === "category") {
        const value = (tag.getCommentText() ?? "").trim().toLowerCase();
        if (VALID_STORE_CATEGORIES.includes(value as StoreCategory)) {
          return value as StoreCategory;
        }
      }
    }
  }
  return "uncategorised";
};

const extractAnyCategory = (docs: JsDocLike[], fallback: string): string => {
  for (const doc of docs) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === "category") {
        const value = (tag.getCommentText() ?? "").trim().toLowerCase();
        if (value) return value;
      }
    }
  }
  return fallback;
};

/**
 * Read field names + types from an interface/type-alias by walking its
 * `Type` properties (which already merges intersections, so passing the
 * combined `XStore = XState & XActions` works too).
 */
const collectFieldsFromType = (
  type: Type,
  predicate: (sym: TsSymbol) => boolean,
  signatureFromCallable: boolean,
): Array<{ name: string; signature: string }> => {
  const out: Array<{ name: string; signature: string }> = [];
  for (const property of type.getProperties()) {
    if (!predicate(property)) continue;
    const valueDecl = property.getValueDeclaration();
    if (!valueDecl) continue;

    let typeText: string;
    if (signatureFromCallable && Node.isPropertySignature(valueDecl)) {
      typeText = valueDecl.getTypeNode()?.getText() ?? valueDecl.getType().getText();
    } else if (Node.isPropertySignature(valueDecl)) {
      typeText = valueDecl.getTypeNode()?.getText() ?? valueDecl.getType().getText();
    } else {
      typeText = property.getValueDeclarationOrThrow().getType().getText();
    }
    out.push({
      name: property.getName(),
      signature: truncate(
        normaliseWhitespace(typeText),
        signatureFromCallable ? SIGNATURE_MAX_CHARS : TYPE_MAX_CHARS,
      ),
    });
  }
  return out;
};

const isCallableProperty = (sym: TsSymbol): boolean => {
  const decl = sym.getValueDeclaration();
  if (!decl || !Node.isPropertySignature(decl)) return false;
  const typeNode = decl.getTypeNode();
  if (!typeNode) return false;
  const text = typeNode.getText().trim();
  return text.startsWith("(") || text.includes("=>");
};

const collectStoresFromFile = (source: SourceFile): StoreEntry[] => {
  const entries: StoreEntry[] = [];

  // Find singletons of the shape:
  //   `export const xStore = createXStore()`                       — named factory
  //   `export const xStore = createStore<X>()(persist(...))`       — curried zustand form
  for (const decl of source.getVariableDeclarations()) {
    if (!decl.isExported()) continue;
    const name = decl.getName();
    if (!name.endsWith("Store") || name.startsWith("create")) continue;

    const init = decl.getInitializer();
    if (!init || !Node.isCallExpression(init)) continue;

    const headExpr = init.getExpression();
    let factoryName: string;
    let curriedStoreTypeArg: Type | undefined;
    if (Node.isCallExpression(headExpr) && headExpr.getExpression().getText() === "createStore") {
      // Curried `createStore<T>()(middleware(...))`. The singleton owns the
      // store config inline; derive the conventional factory name from the
      // singleton (e.g. `authStore` → `createAuthStore`) so docs + category
      // lookup against the local factory still work. Read the explicit
      // `createStore<T>` type arg so we collect fields on the unwrapped
      // store type (persist/middleware-wrapped return types lose them).
      factoryName = `create${name.charAt(0).toUpperCase()}${name.slice(1)}`;
      const typeArgNode = headExpr.getTypeArguments()[0];
      if (typeArgNode) curriedStoreTypeArg = typeArgNode.getType();
    } else {
      factoryName = headExpr.getText();
      if (!/^create.*Store$/.test(factoryName)) continue;
    }

    // Singleton JSDoc lives on the VariableStatement; bubble to find it.
    const singletonDocs = getJsDocsBubbling(decl);

    // Locate the matching factory declaration in the same file.
    const factoryDecl = source
      .getVariableDeclarations()
      .find((d) => d.getName() === factoryName);
    const factoryDocs = factoryDecl ? getJsDocsBubbling(factoryDecl) : [];

    // Prefer the singleton's description; fall back to the factory's.
    const description = extractDescription(singletonDocs) || extractDescription(factoryDocs);
    const category =
      extractStoreCategory(singletonDocs) !== "uncategorised"
        ? extractStoreCategory(singletonDocs)
        : extractStoreCategory(factoryDocs);

    // Resolve the store's type via the call signature of the factory.
    // `createXStore()` returns `StoreApi<XStore>`; we want `XStore`. For
    // curried `createStore<T>()(...)`, the explicit type arg from the head
    // expression already names the unwrapped store type.
    const callRetType = init.getReturnType();
    const storeTypeArg =
      curriedStoreTypeArg ?? callRetType.getTypeArguments()[0] ?? callRetType;

    const state = collectFieldsFromType(storeTypeArg, (s) => !isCallableProperty(s), false);
    const actions = collectFieldsFromType(storeTypeArg, isCallableProperty, true);

    entries.push({
      name,
      category,
      description,
      factory: factoryName,
      state,
      actions,
      file: toRelative(source.getFilePath()),
    });
  }

  return entries;
};

const collectStores = (project: Project): StoreEntry[] => {
  const entry = project.addSourceFileAtPath(STORE_INDEX);
  const stores: StoreEntry[] = [];

  // The index re-exports from each store file; walk the explicit list so we
  // don't accidentally treat `*.test.ts` files as sources.
  const seen = new Set<string>();
  for (const decl of entry.getExportDeclarations()) {
    const target = decl.getModuleSpecifierSourceFile();
    if (!target || seen.has(target.getFilePath())) continue;
    seen.add(target.getFilePath());
    if (/\.test\.tsx?$/.test(target.getFilePath())) continue;
    project.addSourceFileAtPath(target.getFilePath());
    stores.push(...collectStoresFromFile(target));
  }

  stores.sort((a, b) => a.name.localeCompare(b.name));
  return stores;
};

const collectQueryHelpers = (project: Project): QueryHelperEntry[] => {
  if (!existsSync(QUERY_INDEX)) return [];

  const entry = project.addSourceFileAtPath(QUERY_INDEX);
  const helpers: QueryHelperEntry[] = [];

  for (const [name, declarations] of entry.getExportedDeclarations()) {
    const decl = declarations[0];
    if (!decl) continue;

    // We only want function-shaped helpers (factories + utilities), not type
    // aliases or value-less re-exports.
    if (!Node.isVariableDeclaration(decl) && !Node.isFunctionDeclaration(decl)) continue;

    const source = decl.getSourceFile();
    if (!source.getFilePath().startsWith(PACKAGE_ROOT)) continue;

    let signature = "";
    if (Node.isVariableDeclaration(decl)) {
      const init = decl.getInitializer();
      if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
        const params = init.getParameters().map((p) => p.getText()).join(", ");
        const ret = init.getReturnTypeNode()?.getText() ?? init.getReturnType().getText();
        signature = `(${params}) => ${ret}`;
      } else {
        const typeNode = decl.getTypeNode();
        if (typeNode) signature = typeNode.getText();
        else continue;
      }
    } else if (Node.isFunctionDeclaration(decl)) {
      const params = decl.getParameters().map((p) => p.getText()).join(", ");
      const ret = decl.getReturnTypeNode()?.getText() ?? decl.getReturnType().getText();
      signature = `(${params}) => ${ret}`;
    }

    const docs = getJsDocsBubbling(decl);
    helpers.push({
      name,
      signature: truncate(normaliseWhitespace(signature), SIGNATURE_MAX_CHARS),
      description: extractDescription(docs),
      category: extractAnyCategory(docs, "query"),
      file: toRelative(source.getFilePath()),
    });
  }

  helpers.sort((a, b) => a.name.localeCompare(b.name));
  return helpers;
};

/**
 * Collect the public utilities + constants exposed from `src/utils/index.ts`
 * and `src/constants/index.ts` — the framework-agnostic helpers and values
 * consumers import from the package root. Functions get a call signature;
 * constants get their value type.
 */
const collectUtilities = (project: Project): UtilityEntry[] => {
  const indexes = [UTILS_INDEX, CONSTANTS_INDEX].filter((p) => existsSync(p));
  const utilities: UtilityEntry[] = [];
  const seen = new Set<string>();

  for (const indexPath of indexes) {
    const entry = project.addSourceFileAtPath(indexPath);
    for (const [name, declarations] of entry.getExportedDeclarations()) {
      if (seen.has(name)) continue;
      const decl = declarations[0];
      if (!decl) continue;

      // Values only — skip type aliases, interfaces, enums.
      if (!Node.isVariableDeclaration(decl) && !Node.isFunctionDeclaration(decl)) continue;

      const source = decl.getSourceFile();
      if (!source.getFilePath().startsWith(PACKAGE_ROOT)) continue;
      if (/\.test\.tsx?$/.test(source.getFilePath())) continue;

      let kind: UtilityEntry["kind"] = "constant";
      let signature = "";
      if (Node.isFunctionDeclaration(decl)) {
        kind = "function";
        const params = decl.getParameters().map((p) => p.getText()).join(", ");
        const ret = decl.getReturnTypeNode()?.getText() ?? decl.getReturnType().getText();
        signature = `(${params}) => ${ret}`;
      } else {
        const init = decl.getInitializer();
        if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
          kind = "function";
          const params = init.getParameters().map((p) => p.getText()).join(", ");
          const ret = init.getReturnTypeNode()?.getText() ?? init.getReturnType().getText();
          signature = `(${params}) => ${ret}`;
        } else {
          kind = "constant";
          signature = decl.getTypeNode()?.getText() ?? decl.getType().getText();
        }
      }

      seen.add(name);
      const docs = getJsDocsBubbling(decl);
      utilities.push({
        name,
        kind,
        signature: truncate(normaliseWhitespace(signature), SIGNATURE_MAX_CHARS),
        description: extractDescription(docs),
        category: extractAnyCategory(docs, "general"),
        file: toRelative(source.getFilePath()),
      });
    }
  }

  utilities.sort((a, b) => a.name.localeCompare(b.name));
  return utilities;
};

const main = (): void => {
  const project = new Project({
    tsConfigFilePath: TSCONFIG_PATH,
    skipAddingFilesFromTsConfig: true,
  });

  const stores = collectStores(project);
  const queryHelpers = collectQueryHelpers(project);
  const utilities = collectUtilities(project);

  const manifest: StoresManifest = {
    version: MANIFEST_VERSION,
    package: readPackageMeta().name,
    stores,
    queryHelpers,
    utilities,
  };

  if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    `✓ stores.json: ${stores.length} store(s), ${queryHelpers.length} query helper(s), ` +
      `${utilities.length} utilit(ies) → ${toRelative(OUT_PATH)}`,
  );
};

main();
