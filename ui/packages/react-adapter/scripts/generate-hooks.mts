#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generate `dist/hooks.json` — the machine-readable manifest of public
 * React hooks exposed by `@tetherto/mdk-react-adapter`.
 *
 * For every hook re-exported from `src/hooks/index.ts` (and the provider
 * file) the manifest records:
 *   - `name`            — exported identifier
 *   - `description`     — first paragraph of the JSDoc, plain text
 *   - `category`        — value of the `@category` tag (store | utility | permission | ui)
 *   - `signature`       — `(params) => return-type` text, sourced from the type annotation
 *   - `requiresProvider`— true when the hook reaches into `useMdkContext`
 *   - `file`            — repo-relative path of the source file
 *
 * Agents read this from `@tetherto/mdk-react-adapter/hooks.json` to
 * discover the adapter surface in one lookup.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type ExportedDeclarations, Node, Project, type SourceFile } from "ts-morph";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const SRC_ROOT = join(PACKAGE_ROOT, "src");
const HOOKS_ENTRY = join(SRC_ROOT, "hooks", "index.ts");
const PROVIDER_ENTRY = join(SRC_ROOT, "provider", "mdk-provider.tsx");
const TSCONFIG_PATH = join(PACKAGE_ROOT, "tsconfig.json");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");
const DIST_DIR = join(PACKAGE_ROOT, "dist");
const OUT_PATH = join(DIST_DIR, "hooks.json");

const MANIFEST_VERSION = "1.0.0";
const DESCRIPTION_MAX_CHARS = 240;
const SIGNATURE_MAX_CHARS = 200;

type HookCategory =
  | "store"
  | "utility"
  | "permission"
  | "ui"
  | "external"
  | "auth"
  | "dashboard";

const TANSTACK_REEXPORTS: Record<string, string> = {
  useQuery: "Re-export of TanStack Query's `useQuery`. See @tanstack/react-query docs for full options.",
  useMutation: "Re-export of TanStack Query's `useMutation` for fire-and-forget side effects.",
  useQueryClient: "Re-export of TanStack Query's `useQueryClient` — access the active client inside the tree.",
  useInfiniteQuery: "Re-export of TanStack Query's `useInfiniteQuery` for paginated/streamed lists.",
  useIsFetching: "Re-export of TanStack Query's `useIsFetching` — global fetch-in-flight counter.",
  useIsMutating: "Re-export of TanStack Query's `useIsMutating` — global mutation-in-flight counter.",
  useQueries: "Re-export of TanStack Query's `useQueries` — run a dynamic list of queries in parallel.",
};

type HookEntry = {
  name: string;
  description: string;
  category: HookCategory | "uncategorised";
  signature: string;
  requiresProvider: boolean;
  file: string;
  /** When true, the hook is re-exported from another package (e.g. TanStack Query). */
  external?: boolean;
};

type ProviderProp = {
  name: string;
  type: string;
  optional: boolean;
  description: string;
};

type ProviderEntry = {
  name: "MdkProvider";
  description: string;
  file: string;
  props: ProviderProp[];
};

type HooksManifest = {
  version: string;
  package: string;
  hooks: HookEntry[];
  provider: ProviderEntry | null;
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

const extractDescription = (jsDocs: ReturnType<typeof getJsDocs>): string => {
  const last = jsDocs[jsDocs.length - 1];
  if (!last) return "";
  const raw = last.getDescription();
  // First "paragraph" — stop at the first blank line.
  const firstPara = raw.split(/\n\s*\n/)[0] ?? raw;
  return truncate(normaliseWhitespace(firstPara), DESCRIPTION_MAX_CHARS);
};

type JsDocLike = {
  getDescription: () => string;
  getTags: () => Array<{ getTagName: () => string; getCommentText: () => string | undefined }>;
};

const getJsDocs = (node: Node): JsDocLike[] => {
  // JSDoc on `export const useFoo = ...` lives on the parent VariableStatement,
  // not on the VariableDeclaration itself. Walk up until we find a JSDoc-able
  // ancestor that actually has docs.
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

const extractCategory = (jsDocs: JsDocLike[]): HookEntry["category"] => {
  for (const doc of jsDocs) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === "category") {
        const value = (tag.getCommentText() ?? "").trim().toLowerCase();
        if (
          value === "store"
          || value === "utility"
          || value === "permission"
          || value === "ui"
          || value === "auth"
          || value === "dashboard"
        ) {
          return value;
        }
      }
    }
  }
  return "uncategorised";
};

/**
 * Builds a compact `(params) => Return` string from either:
 *   - the variable's type annotation (`useFoo: (x: X) => Y`)
 *   - the initializer arrow/function expression
 *   - the function declaration itself
 */
const extractSignature = (decl: ExportedDeclarations): string => {
  if (Node.isVariableDeclaration(decl)) {
    const typeNode = decl.getTypeNode();
    if (typeNode) return truncate(normaliseWhitespace(typeNode.getText()), SIGNATURE_MAX_CHARS);

    const init = decl.getInitializer();
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
      const params = init.getParameters().map((p) => p.getText()).join(", ");
      const ret = init.getReturnTypeNode()?.getText() ?? init.getReturnType().getText();
      return truncate(normaliseWhitespace(`(${params}) => ${ret}`), SIGNATURE_MAX_CHARS);
    }
  }

  if (Node.isFunctionDeclaration(decl)) {
    const params = decl.getParameters().map((p) => p.getText()).join(", ");
    const ret = decl.getReturnTypeNode()?.getText() ?? decl.getReturnType().getText();
    return truncate(normaliseWhitespace(`(${params}) => ${ret}`), SIGNATURE_MAX_CHARS);
  }

  return "";
};

const fileTouchesProvider = (source: SourceFile): boolean => {
  const text = source.getFullText();
  return /\buseMdkContext\b/.test(text);
};

const isHookName = (name: string): boolean => /^use[A-Z]/.test(name);

const collectHookEntries = (project: Project): HookEntry[] => {
  const entry = project.addSourceFileAtPath(HOOKS_ENTRY);
  const entries: HookEntry[] = [];

  for (const [name, declarations] of entry.getExportedDeclarations()) {
    if (!isHookName(name)) continue;
    const decl = declarations[0];
    if (!decl) continue;

    const source = decl.getSourceFile();
    const sourcePath = source.getFilePath();
    const isExternal = !sourcePath.startsWith(PACKAGE_ROOT);

    if (isExternal) {
      // TanStack Query (and other) re-exports: we can't annotate their JSDoc
      // from here, so describe them via a small lookup table.
      entries.push({
        name,
        description: TANSTACK_REEXPORTS[name] ?? `Re-exported from \`${source.getFilePath()}\`.`,
        category: "external",
        signature: extractSignature(decl),
        requiresProvider: false,
        file: toRelative(sourcePath),
        external: true,
      });
      continue;
    }

    const jsDocs = getJsDocs(decl);

    entries.push({
      name,
      description: extractDescription(jsDocs),
      category: extractCategory(jsDocs),
      signature: extractSignature(decl),
      requiresProvider: fileTouchesProvider(source),
      file: toRelative(sourcePath),
    });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
};

const collectProviderEntry = (project: Project): ProviderEntry | null => {
  if (!existsSync(PROVIDER_ENTRY)) return null;

  const source = project.addSourceFileAtPath(PROVIDER_ENTRY);

  // Find the `MdkProvider` exported const.
  const providerDecl = source
    .getVariableDeclarations()
    .find((d) => d.getName() === "MdkProvider" && d.isExported());
  if (!providerDecl) return null;

  const providerJsDocs = getJsDocs(providerDecl);

  // Find the props type alias.
  const propsAlias = source.getTypeAlias("MdkProviderProps");
  const props: ProviderProp[] = [];
  if (propsAlias) {
    const type = propsAlias.getType();
    for (const property of type.getProperties()) {
      const valueDecl = property.getValueDeclaration();
      const typeNode = valueDecl && Node.isPropertySignature(valueDecl)
        ? valueDecl.getTypeNode()?.getText()
        : undefined;
      const description = valueDecl && Node.isJSDocable(valueDecl)
        ? extractDescription(valueDecl.getJsDocs() as unknown as JsDocLike[])
        : "";
      props.push({
        name: property.getName(),
        type: typeNode ? truncate(normaliseWhitespace(typeNode), SIGNATURE_MAX_CHARS) : "unknown",
        optional: property.isOptional(),
        description,
      });
    }
  }

  return {
    name: "MdkProvider",
    description: extractDescription(providerJsDocs),
    file: toRelative(source.getFilePath()),
    props,
  };
};

const main = (): void => {
  const project = new Project({
    tsConfigFilePath: TSCONFIG_PATH,
    skipAddingFilesFromTsConfig: true,
  });

  const hooks = collectHookEntries(project);
  const provider = collectProviderEntry(project);

  const manifest: HooksManifest = {
    version: MANIFEST_VERSION,
    package: readPackageMeta().name,
    hooks,
    provider,
  };

  if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    `✓ hooks.json: ${hooks.length} hook(s)` +
      `${provider ? `, MdkProvider (${provider.props.length} props)` : ""}` +
      ` → ${toRelative(OUT_PATH)}`,
  );
};

main();
