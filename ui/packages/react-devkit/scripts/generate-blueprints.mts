#!/usr/bin/env node
/**
 * Parse `packages/react-devkit/blueprints/*.md` files into
 * `dist/blueprints.json`. Each markdown file carries YAML-ish frontmatter
 * (see `blueprints/README.md`) plus a free-form markdown body.
 *
 * Validation:
 *   - every `components[]` entry must exist in `registry.json` and be
 *     `tier: agent-ready` (otherwise LLMs following the blueprint would
 *     land on an advanced surface).
 *   - every `hooks[]` entry must exist in `registry.json` (any tier).
 *   - frontmatter `id` must be unique across all blueprints.
 *
 * Returns the parsed blueprints so the registry generator can invoke this
 * inline and share the registry's component / hook lookup tables.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

import type {
  BlueprintIndexes,
  BlueprintMeta,
  BlueprintsManifest,
  ComponentMeta,
  DomainContext,
  HookMeta,
  KernelCapability,
} from "./registry-types.ts";
import { BLUEPRINTS_SCHEMA_VERSION } from "./registry-types.ts";

const VALID_DOMAINS: DomainContext[] = [
  "mining-operations",
  "financial-reporting",
  "device-management",
  "generic",
];

// ─── Minimal YAML parser ────────────────────────────────────────────────────
// Our frontmatter is restricted: top-level scalars, single-line lists
// `[a, b]`, or indented `- value` lists. No nested maps. Folded scalars
// (`>` followed by indented lines) are supported for `intent`.

type Frontmatter = Record<string, string | string[]>;

const parseFrontmatter = (raw: string): Frontmatter => {
  const lines = raw.split(/\r?\n/);
  const out: Frontmatter = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;
  let folded: string[] | null = null;
  let foldedIndent = 0;

  const flushFolded = () => {
    if (currentKey && folded !== null) {
      out[currentKey] = folded.join(" ").replace(/\s+/g, " ").trim();
    }
    folded = null;
    foldedIndent = 0;
  };

  const flushList = () => {
    if (currentKey && currentList !== null) out[currentKey] = currentList;
    currentList = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const indent = line.match(/^ */)?.[0].length ?? 0;
    const content = line.trim();
    if (!content) continue;

    if (folded !== null && indent >= foldedIndent && !content.startsWith("- ")) {
      folded.push(content);
      continue;
    }
    if (folded !== null) flushFolded();

    if (currentList !== null && content.startsWith("- ")) {
      currentList.push(content.slice(2).trim().replace(/^["']|["']$/g, ""));
      continue;
    }
    if (currentList !== null) flushList();

    const m = content.match(/^([a-z][\w-]*)\s*:\s?(.*)$/i);
    if (!m) continue;
    const key = m[1]!;
    const value = m[2] ?? "";
    currentKey = key;

    if (value === ">") {
      folded = [];
      foldedIndent = indent + 2;
      continue;
    }
    if (value === "" || value === "[]") {
      if (value === "[]") {
        out[key] = [];
        currentKey = null;
        continue;
      }
      currentList = [];
      continue;
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      out[key] = inner
        ? inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
        : [];
      currentKey = null;
      continue;
    }
    out[key] = value.replace(/^["']|["']$/g, "");
    currentKey = null;
  }

  flushFolded();
  flushList();
  return out;
};

const splitFrontmatter = (
  raw: string,
): { frontmatter: string; body: string } | null => {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  return {
    frontmatter: raw.slice(3, end).replace(/^\r?\n/, ""),
    body: raw.slice(end + 4).replace(/^\r?\n/, ""),
  };
};

// ─── Public API ─────────────────────────────────────────────────────────────

export type BuildBlueprintsArgs = {
  blueprintsDir: string;
  packageRoot: string;
  packageName: string;
  components: ComponentMeta[];
  hooks: HookMeta[];
};

export type BlueprintBuildResult = {
  manifest: BlueprintsManifest;
  /** Validation issues that should be reported by the caller. */
  errors: string[];
};

const requireStringList = (fm: Frontmatter, key: string): string[] => {
  const v = fm[key];
  if (v === undefined) return [];
  if (Array.isArray(v)) return v;
  return [v];
};

const buildBlueprintIndexes = (blueprints: BlueprintMeta[]): BlueprintIndexes => {
  const byId: Record<string, number> = {};
  const byDomain: Record<string, string[]> = {};
  const byKernelCapability: Record<string, string[]> = {};
  const byComponent: Record<string, string[]> = {};
  const pushUnique = (bucket: Record<string, string[]>, key: string, value: string) => {
    if (!bucket[key]) bucket[key] = [];
    if (!bucket[key]!.includes(value)) bucket[key]!.push(value);
  };
  blueprints.forEach((b, i) => {
    byId[b.id] = i;
    pushUnique(byDomain, b.domain, b.id);
    for (const cap of b.kernelCapabilities) pushUnique(byKernelCapability, cap, b.id);
    for (const comp of b.components) pushUnique(byComponent, comp, b.id);
  });
  return { byId, byDomain, byKernelCapability, byComponent };
};

export const buildBlueprints = (args: BuildBlueprintsArgs): BlueprintBuildResult => {
  const { blueprintsDir, packageRoot, packageName, components, hooks } = args;
  const errors: string[] = [];
  const blueprints: BlueprintMeta[] = [];

  if (!existsSync(blueprintsDir)) {
    return {
      manifest: {
        version: BLUEPRINTS_SCHEMA_VERSION,
        package: packageName,
        generatedAt: new Date().toISOString(),
        blueprints: [],
        indexes: { byId: {}, byDomain: {}, byKernelCapability: {}, byComponent: {} },
      },
      errors,
    };
  }

  const componentByName = new Map(components.map((c) => [c.name, c]));
  const hookByName = new Map(hooks.map((h) => [h.name, h]));

  const seenIds = new Set<string>();
  const files = readdirSync(blueprintsDir)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => basename(f).toLowerCase() !== "readme.md")
    .sort();

  for (const file of files) {
    const full = join(blueprintsDir, file);
    const raw = readFileSync(full, "utf8");
    const split = splitFrontmatter(raw);
    if (!split) {
      errors.push(`${file}: missing YAML frontmatter`);
      continue;
    }
    const fm = parseFrontmatter(split.frontmatter);

    const id = typeof fm.id === "string" ? fm.id : "";
    const title = typeof fm.title === "string" ? fm.title : "";
    const intent = typeof fm.intent === "string" ? fm.intent : "";
    const domain = (typeof fm.domain === "string" ? fm.domain : "") as DomainContext;

    if (!id) errors.push(`${file}: missing \`id\``);
    if (!title) errors.push(`${file}: missing \`title\``);
    if (!intent) errors.push(`${file}: missing \`intent\``);
    if (!domain || !VALID_DOMAINS.includes(domain)) {
      errors.push(`${file}: \`domain\` must be one of ${VALID_DOMAINS.join(", ")}`);
    }
    if (id && seenIds.has(id)) errors.push(`${file}: duplicate id \`${id}\``);
    if (id) seenIds.add(id);

    const kernelCapabilities = requireStringList(fm, "kernelCapabilities") as KernelCapability[];
    const referencedComponents = requireStringList(fm, "components");
    const referencedHooks = requireStringList(fm, "hooks");

    for (const compName of referencedComponents) {
      const c = componentByName.get(compName);
      if (!c) {
        errors.push(`${file}: component \`${compName}\` does not exist in the registry`);
      } else if (c.tier !== "agent-ready") {
        errors.push(
          `${file}: component \`${compName}\` is \`${c.tier}\` — blueprints may only reference agent-ready components`,
        );
      }
    }
    for (const hookName of referencedHooks) {
      if (!hookByName.has(hookName)) {
        errors.push(`${file}: hook \`${hookName}\` does not exist in the registry`);
      }
    }

    blueprints.push({
      id,
      title,
      intent,
      domain,
      kernelCapabilities,
      components: referencedComponents,
      hooks: referencedHooks,
      demoRoute: typeof fm.demoRoute === "string" ? fm.demoRoute : undefined,
      path: relative(packageRoot, full).split("\\").join("/"),
      body: split.body.trim(),
    });
  }

  blueprints.sort((a, b) => a.id.localeCompare(b.id));

  const manifest: BlueprintsManifest = {
    version: BLUEPRINTS_SCHEMA_VERSION,
    package: packageName,
    generatedAt: new Date().toISOString(),
    blueprints,
    indexes: buildBlueprintIndexes(blueprints),
  };

  return { manifest, errors };
};
