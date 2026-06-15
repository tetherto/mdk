#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * One-shot tagger that backfills `@tier` / `@category` / `@domain` JSDoc
 * tags + a one-line description onto every entry in `dist/registry.json`
 * that is missing them.
 *
 * Strategy:
 *   - Categorise by **source folder** (the path the registry already
 *     records) using `FOLDER_META` below.
 *   - Promote a curated set of names (`AGENT_READY_PROMOTIONS`) to
 *     `@tier agent-ready`.
 *   - Walk each affected source file with ts-morph, find the declaration
 *     for each export, attach a JSDoc block on the function declaration
 *     (or owning variable statement) if one isn't already there, then
 *     ensure the block has `@tier` / `@category` / `@domain`.
 *
 * Safe to re-run: only adds tags that aren't already present.
 */

import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Node, Project, type SourceFile } from "ts-morph";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const REGISTRY_PATH = join(PACKAGE_ROOT, "dist/registry.json");
const TSCONFIG_PATH = join(PACKAGE_ROOT, "tsconfig.json");

type Tier = "agent-ready" | "advanced" | "internal";
type Tags = { tier: Tier; category: string; domain: string };

/**
 * Folder → default tags. Keys are matched as a *prefix* against the
 * component's `path` field (relative to the package root). First match wins,
 * so more-specific prefixes should come before broader ones.
 */
const FOLDER_META: Array<[string, Tags]> = [
  // ── Core primitives ──────────────────────────────────────────────────────
  ["src/core/components/accordion/", { tier: "advanced", category: "layout", domain: "generic" }],
  ["src/core/components/action-button/", { tier: "advanced", category: "actions", domain: "generic" }],
  ["src/core/components/alert-dialog/", { tier: "advanced", category: "dialogs", domain: "generic" }],
  ["src/core/components/alert/", { tier: "advanced", category: "feedback", domain: "generic" }],
  ["src/core/components/avatar/", { tier: "advanced", category: "display", domain: "generic" }],
  ["src/core/components/badge/", { tier: "agent-ready", category: "display", domain: "generic" }],
  ["src/core/components/bar-chart/", { tier: "advanced", category: "charts", domain: "generic" }],
  ["src/core/components/breadcrumbs/", { tier: "agent-ready", category: "navigation", domain: "generic" }],
  ["src/core/components/btc-average-price/", { tier: "agent-ready", category: "display", domain: "generic" }],
  ["src/core/components/card/", { tier: "agent-ready", category: "layout", domain: "generic" }],
  ["src/core/components/cascader/", { tier: "advanced", category: "forms", domain: "generic" }],
  ["src/core/components/chart-container/", { tier: "advanced", category: "charts", domain: "generic" }],
  ["src/core/components/chart-stats-footer/", { tier: "advanced", category: "charts", domain: "generic" }],
  ["src/core/components/checkbox/", { tier: "agent-ready", category: "forms", domain: "generic" }],
  ["src/core/components/currency-toggler/", { tier: "advanced", category: "forms", domain: "generic" }],
  ["src/core/components/data-table/", { tier: "agent-ready", category: "tables", domain: "generic" }],
  ["src/core/components/date-picker/", { tier: "agent-ready", category: "forms", domain: "generic" }],
  ["src/core/components/detail-legend/", { tier: "advanced", category: "charts", domain: "generic" }],
  ["src/core/components/dialog/", { tier: "agent-ready", category: "dialogs", domain: "generic" }],
  ["src/core/components/divider/", { tier: "advanced", category: "layout", domain: "generic" }],
  ["src/core/components/doughnut-chart/", { tier: "advanced", category: "charts", domain: "generic" }],
  ["src/core/components/dropdown-menu/", { tier: "advanced", category: "menus", domain: "generic" }],
  ["src/core/components/empty-state/", { tier: "agent-ready", category: "feedback", domain: "generic" }],
  ["src/core/components/error-boundary/", { tier: "advanced", category: "feedback", domain: "generic" }],
  ["src/core/components/error-card/", { tier: "advanced", category: "feedback", domain: "generic" }],
  ["src/core/components/form/", { tier: "agent-ready", category: "forms", domain: "generic" }],
  ["src/core/components/gauge-chart/", { tier: "advanced", category: "charts", domain: "generic" }],
  ["src/core/components/icons/", { tier: "advanced", category: "media", domain: "generic" }],
  ["src/core/components/indicator/", { tier: "advanced", category: "display", domain: "generic" }],
  ["src/core/components/input/", { tier: "agent-ready", category: "forms", domain: "generic" }],
  ["src/core/components/label/", { tier: "agent-ready", category: "forms", domain: "generic" }],
  ["src/core/components/labeled-card/", { tier: "advanced", category: "layout", domain: "generic" }],
  ["src/core/components/lazy-tab-wrapper/", { tier: "advanced", category: "layout", domain: "generic" }],
  ["src/core/components/line-chart/", { tier: "agent-ready", category: "charts", domain: "generic" }],
  ["src/core/components/list-view-filter/", { tier: "advanced", category: "filters", domain: "generic" }],
  ["src/core/components/loader/", { tier: "advanced", category: "feedback", domain: "generic" }],
  ["src/core/components/logs/", { tier: "advanced", category: "monitoring", domain: "generic" }],
  ["src/core/components/mosaic/", { tier: "advanced", category: "layout", domain: "generic" }],
  ["src/core/components/not-found-page/", { tier: "advanced", category: "pages", domain: "generic" }],
  ["src/core/components/pagination/", { tier: "agent-ready", category: "navigation", domain: "generic" }],
  ["src/core/components/popover/", { tier: "agent-ready", category: "overlays", domain: "generic" }],
  ["src/core/components/progress/", { tier: "advanced", category: "feedback", domain: "generic" }],
  ["src/core/components/radio/", { tier: "advanced", category: "forms", domain: "generic" }],
  ["src/core/components/select/", { tier: "agent-ready", category: "forms", domain: "generic" }],
  ["src/core/components/separator/", { tier: "advanced", category: "layout", domain: "generic" }],
  ["src/core/components/sidebar/", { tier: "agent-ready", category: "navigation", domain: "generic" }],
  ["src/core/components/skeleton/", { tier: "advanced", category: "feedback", domain: "generic" }],
  ["src/core/components/slider/", { tier: "advanced", category: "forms", domain: "generic" }],
  ["src/core/components/spinner/", { tier: "agent-ready", category: "feedback", domain: "generic" }],
  ["src/core/components/switch/", { tier: "agent-ready", category: "forms", domain: "generic" }],
  ["src/core/components/tabs/", { tier: "agent-ready", category: "layout", domain: "generic" }],
  ["src/core/components/tag-input/", { tier: "advanced", category: "forms", domain: "generic" }],
  ["src/core/components/tag/", { tier: "advanced", category: "display", domain: "generic" }],
  ["src/core/components/textarea/", { tier: "advanced", category: "forms", domain: "generic" }],
  ["src/core/components/toast/", { tier: "agent-ready", category: "feedback", domain: "generic" }],
  ["src/core/components/tooltip/", { tier: "agent-ready", category: "overlays", domain: "generic" }],
  ["src/core/components/typography/", { tier: "agent-ready", category: "display", domain: "generic" }],
  ["src/core/components/button/", { tier: "agent-ready", category: "actions", domain: "generic" }],
  ["src/core/components/area-chart/", { tier: "agent-ready", category: "charts", domain: "generic" }],

  // ── Foundation ───────────────────────────────────────────────────────────
  ["src/foundation/components/active-incidents-card/", { tier: "agent-ready", category: "cards", domain: "mining-operations" }],
  ["src/foundation/components/alarm/", { tier: "advanced", category: "feedback", domain: "mining-operations" }],
  ["src/foundation/components/alerts/", { tier: "advanced", category: "tables", domain: "mining-operations" }],
  ["src/foundation/components/chart-wrapper/", { tier: "advanced", category: "charts", domain: "generic" }],
  ["src/foundation/components/container-charts-builder/", { tier: "advanced", category: "charts", domain: "mining-operations" }],
  ["src/foundation/components/container-params-settings/", { tier: "advanced", category: "forms", domain: "device-management" }],
  ["src/foundation/components/container/", { tier: "advanced", category: "widgets", domain: "device-management" }],
  ["src/foundation/components/dashboard/", { tier: "advanced", category: "charts", domain: "mining-operations" }],
  ["src/foundation/components/device-explorer/", { tier: "advanced", category: "tables", domain: "device-management" }],
  ["src/foundation/components/explorer/", { tier: "advanced", category: "widgets", domain: "device-management" }],
  ["src/foundation/components/info-container/", { tier: "advanced", category: "widgets", domain: "device-management" }],
  ["src/foundation/components/line-chart-card/", { tier: "agent-ready", category: "charts", domain: "generic" }],
  ["src/foundation/components/pool-details-card/", { tier: "agent-ready", category: "cards", domain: "mining-operations" }],
  ["src/foundation/components/pool-details-popover/", { tier: "agent-ready", category: "dialogs", domain: "mining-operations" }],
  ["src/foundation/components/pool-manager/", { tier: "advanced", category: "dashboards", domain: "mining-operations" }],
  ["src/foundation/components/domain/reporting-tool/multi-site/", { tier: "advanced", category: "dashboards", domain: "financial-reporting" }],
  ["src/foundation/components/reporting-tool/financial/", { tier: "advanced", category: "charts", domain: "financial-reporting" }],
  ["src/foundation/components/reporting-tool/operational/", { tier: "advanced", category: "tables", domain: "financial-reporting" }],
  ["src/foundation/components/reporting-tool/report-time-frame-selector/", { tier: "advanced", category: "filters", domain: "financial-reporting" }],
  ["src/foundation/components/reporting-tool/", { tier: "advanced", category: "widgets", domain: "financial-reporting" }],
  ["src/foundation/components/settings/", { tier: "advanced", category: "settings", domain: "device-management" }],
  ["src/foundation/components/stats-export/", { tier: "agent-ready", category: "actions", domain: "financial-reporting" }],
  ["src/foundation/components/timeline-chart/", { tier: "advanced", category: "charts", domain: "mining-operations" }],
  ["src/foundation/components/widget-top-row/", { tier: "agent-ready", category: "widgets", domain: "mining-operations" }],

  // ── Foundation features (additional surface area) ────────────────────────
  ["src/foundation/features/alerts/", { tier: "advanced", category: "tables", domain: "mining-operations" }],
  ["src/foundation/features/pool-manager/miner-explorer/", { tier: "advanced", category: "tables", domain: "mining-operations" }],
  ["src/foundation/features/pool-manager/pools/", { tier: "advanced", category: "tables", domain: "mining-operations" }],
  ["src/foundation/features/pool-manager/site-overview-details/", { tier: "advanced", category: "cards", domain: "mining-operations" }],
  ["src/foundation/features/pool-manager/sites-overview/", { tier: "advanced", category: "dashboards", domain: "mining-operations" }],
  ["src/foundation/features/", { tier: "advanced", category: "widgets", domain: "mining-operations" }],

  // ── Hooks ────────────────────────────────────────────────────────────────
  ["src/core/components/sidebar/use-sidebar-state", { tier: "advanced", category: "navigation", domain: "generic" }],
  ["src/foundation/notification/", { tier: "advanced", category: "feedback", domain: "generic" }],
  ["src/foundation/actions/", { tier: "advanced", category: "misc", domain: "generic" }],
  ["src/foundation/utils/use-notification", { tier: "advanced", category: "feedback", domain: "generic" }],
  ["src/foundation/utils/use-list-view-filters", { tier: "advanced", category: "filters", domain: "generic" }],
  ["src/foundation/utils/use-update-existed-actions", { tier: "advanced", category: "misc", domain: "generic" }],
  ["src/foundation/utils/", { tier: "advanced", category: "misc", domain: "generic" }],

  // ── Utility constants / formatters ───────────────────────────────────────
  ["src/core/utils/number", { tier: "advanced", category: "utilities", domain: "generic" }],
  ["src/core/utils/format", { tier: "advanced", category: "utilities", domain: "generic" }],
  ["src/core/utils/", { tier: "advanced", category: "utilities", domain: "generic" }],
  ["src/foundation/constants/", { tier: "advanced", category: "utilities", domain: "generic" }],
];

/**
 * Some exports are renamed at the barrel level (e.g.
 * `export { Alert as CoreAlert }`). The registry entry uses the *exported*
 * name, but the source declaration uses the original. This map covers the
 * gap so the tagger can still locate the host declaration.
 */
const NAME_ALIAS: Record<string, string> = {
  CoreAlert: "Alert",
};

/**
 * Per-export name → tier override. Used to keep "sub-parts" of an
 * agent-ready primitive at `advanced` (e.g. `DialogContent` while `Dialog`
 * itself is agent-ready). Empty here means folder-level tier is used.
 */
const NAME_TIER_OVERRIDE: Record<string, Tier> = {
  // dialog sub-parts
  DialogContent: "advanced",
  DialogHeader: "advanced",
  DialogFooter: "advanced",
  DialogTitle: "advanced",
  DialogDescription: "advanced",
  DialogOverlay: "advanced",
  // alert-dialog sub-parts already advanced via folder
  // popover sub-parts
  PopoverAnchor: "advanced",
  PopoverArrow: "advanced",
  PopoverClose: "advanced",
  PopoverContent: "advanced",
  PopoverPortal: "advanced",
  PopoverTrigger: "advanced",
  SimplePopover: "advanced",
  // tooltip sub-parts
  TooltipArrow: "advanced",
  TooltipContent: "advanced",
  TooltipPortal: "advanced",
  TooltipProvider: "advanced",
  TooltipTrigger: "advanced",
  SimpleTooltip: "agent-ready",
  // tabs sub-parts
  TabsList: "advanced",
  TabsTrigger: "advanced",
  TabsContent: "advanced",
  // toast sub-parts
  ToastProvider: "advanced",
  ToastViewport: "advanced",
  Toaster: "agent-ready",
  // form sub-parts
  FormItem: "advanced",
  FormField: "advanced",
  FormControl: "advanced",
  FormMessage: "advanced",
  FormLabel: "advanced",
  FormDescription: "advanced",
  FormInput: "advanced",
  FormSelect: "advanced",
  FormCheckbox: "advanced",
  FormSwitch: "advanced",
  FormTextArea: "advanced",
  FormRadioGroup: "advanced",
  FormCascader: "advanced",
  FormDatePicker: "advanced",
  FormTagInput: "advanced",
  // accordion sub-parts
  AccordionContent: "advanced",
  AccordionItem: "advanced",
  AccordionRoot: "advanced",
  AccordionTrigger: "advanced",
  // alert-dialog sub-parts
  AlertDialogAction: "advanced",
  AlertDialogCancel: "advanced",
  AlertDialogContent: "advanced",
  AlertDialogDescription: "advanced",
  AlertDialogFooter: "advanced",
  AlertDialogHeader: "advanced",
  AlertDialogOverlay: "advanced",
  AlertDialogTitle: "advanced",
  // avatar sub-parts
  AvatarFallback: "advanced",
  AvatarImage: "advanced",
  // select sub-parts
  SelectContent: "advanced",
  SelectItem: "advanced",
  SelectLabel: "advanced",
  SelectSeparator: "advanced",
  SelectTrigger: "advanced",
  // card sub-parts
  CardBody: "advanced",
  CardFooter: "advanced",
  CardHeader: "advanced",
};

/**
 * Per-name description fallback. Used only when we cannot derive a
 * meaningful description from existing code (i.e. no comments at all). Keep
 * each entry short — one sentence, no trailing period needed.
 */
const NAME_DESCRIPTION: Record<string, string> = {};

const lookupTags = (path: string, name: string): Tags | null => {
  for (const [prefix, tags] of FOLDER_META) {
    if (path.startsWith(prefix)) {
      const tier = NAME_TIER_OVERRIDE[name] ?? tags.tier;
      return { ...tags, tier };
    }
  }
  return null;
};

const humanise = (name: string): string => {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
};

const fallbackDescription = (name: string, kind: "component" | "hook"): string => {
  if (NAME_DESCRIPTION[name]) return NAME_DESCRIPTION[name];
  if (kind === "hook") return `${humanise(name)} hook.`;
  // Detect "all-caps constants"
  if (/^[A-Z0-9_]+$/.test(name)) return `${name} constant.`;
  return `${humanise(name)} component.`;
};

type Entry = {
  name: string;
  path: string;
  kind: "component" | "hook";
  tier?: string;
  category?: string;
  domainContext?: string;
  description?: string;
};

const expandSingleLineJsDoc = (jsdocText: string): string => {
  // Convert `/** Foo */` → `/**\n * Foo\n */` so we have a place to splice
  // additional tag lines into. Uses simple string slicing instead of a
  // single capture-group regex to avoid super-linear-backtracking warnings.
  const trimmed = jsdocText.trim();
  if (!trimmed.startsWith("/**") || !trimmed.endsWith("*/")) return jsdocText;
  const body = trimmed.slice(3, -2).trim();
  return body ? `/**\n * ${body}\n */` : `/**\n *\n */`;
};

const ensureTagInJsDoc = (jsdocText: string, tag: string, value: string): string => {
  const re = new RegExp(`@${tag}\\b`);
  if (re.test(jsdocText)) return jsdocText;
  let text = jsdocText;
  if (!text.includes("\n")) text = expandSingleLineJsDoc(text);
  const lines = text.split("\n");
  const closeIdx = lines.findIndex((l) => l.trim() === "*/");
  if (closeIdx === -1) return jsdocText;
  lines.splice(closeIdx, 0, ` * @${tag} ${value}`);
  return lines.join("\n");
};

const buildFreshJsDoc = (description: string, tags: Tags): string => {
  return [
    "/**",
    ` * ${description}`,
    ` *`,
    ` * @category ${tags.category}`,
    ` * @domain ${tags.domain}`,
    ` * @tier ${tags.tier}`,
    " */",
  ].join("\n");
};

const findOwningJsDocHost = (
  sourceFile: SourceFile,
  name: string,
): { kind: "fn" | "stmt"; node: Node } | null => {
  const candidates = [name];
  if (NAME_ALIAS[name]) candidates.push(NAME_ALIAS[name]);

  for (const candidate of candidates) {
    const fn = sourceFile.getFunction(candidate);
    if (fn) return { kind: "fn", node: fn };

    const v = sourceFile.getVariableDeclaration(candidate);
    if (v) {
      const stmt = v.getVariableStatement();
      if (stmt) return { kind: "stmt", node: stmt };
    }

    for (const decl of sourceFile.getDescendants()) {
      if (Node.isFunctionDeclaration(decl) && decl.getName() === candidate) {
        return { kind: "fn", node: decl };
      }
      if (Node.isVariableDeclaration(decl) && decl.getName() === candidate) {
        const stmt = decl.getVariableStatement();
        if (stmt) return { kind: "stmt", node: stmt };
      }
    }
  }
  return null;
};

type ApplyResult = "tagged-existing" | "added-jsdoc" | "noop" | "not-found";

const applyToFile = (
  sourceFile: SourceFile,
  entries: Entry[],
  log: (msg: string) => void,
): ApplyResult[] => {
  const results: ApplyResult[] = [];
  for (const entry of entries) {
    const tags = lookupTags(entry.path, entry.name);
    if (!tags) {
      log(`  ! no folder mapping for ${entry.name} (${entry.path})`);
      results.push("noop");
      continue;
    }
    const host = findOwningJsDocHost(sourceFile, entry.name);
    if (!host) {
      log(`  ! could not locate declaration for ${entry.name} in ${sourceFile.getFilePath()}`);
      results.push("not-found");
      continue;
    }

    const docHost = host.node as unknown as {
      getJsDocs: () => Array<{ getText: () => string; replaceWithText: (s: string) => void }>;
      getStart: () => number;
      getStartLineNumber: () => number;
    };

    const docs = docHost.getJsDocs();
    if (docs.length > 0) {
      const lastDoc = docs[docs.length - 1]!;
      let text = lastDoc.getText();
      text = ensureTagInJsDoc(text, "category", tags.category);
      text = ensureTagInJsDoc(text, "domain", tags.domain);
      text = ensureTagInJsDoc(text, "tier", tags.tier);
      if (text !== lastDoc.getText()) {
        lastDoc.replaceWithText(text);
        results.push("tagged-existing");
      } else {
        results.push("noop");
      }
    } else {
      const desc = fallbackDescription(entry.name, entry.kind);
      const block = buildFreshJsDoc(desc, tags);
      // Insert JSDoc immediately before the host node.
      const node = host.node as unknown as { replaceWithText: (s: string) => void; getText: () => string };
      const newText = `${block}\n${node.getText()}`;
      node.replaceWithText(newText);
      results.push("added-jsdoc");
    }
  }
  return results;
};

const main = async (): Promise<void> => {
  if (!existsSync(REGISTRY_PATH)) {
    console.error(`Registry missing at ${REGISTRY_PATH}. Run \`npm run build:registry\` first.`);
    process.exit(1);
  }
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as {
    components: Entry[];
    hooks: Entry[];
  };

  const allEntries: Entry[] = [
    ...registry.components.map((c) => ({ ...c, kind: "component" as const })),
    ...registry.hooks.map((h) => ({ ...h, kind: "hook" as const })),
  ];

  const untagged = allEntries.filter(
    (e) => !e.tier || !e.category || !e.domainContext || !e.description,
  );

  console.log(`Found ${untagged.length} entries needing tags (of ${allEntries.length} total).`);

  const byFile = new Map<string, Entry[]>();
  for (const e of untagged) {
    const abs = join(PACKAGE_ROOT, e.path);
    if (!byFile.has(abs)) byFile.set(abs, []);
    byFile.get(abs)!.push(e);
  }

  console.log(`Distributed across ${byFile.size} source files.`);

  const project = new Project({
    tsConfigFilePath: TSCONFIG_PATH,
    skipAddingFilesFromTsConfig: false,
  });

  let totalTagged = 0;
  let totalAdded = 0;
  let totalNotFound = 0;
  const changedFiles = new Set<SourceFile>();

  for (const [abs, entries] of byFile) {
    const sf = project.getSourceFile(abs);
    if (!sf) {
      console.warn(`  ! source file not loaded: ${abs}`);
      continue;
    }
    const before = sf.getFullText();
    const results = applyToFile(sf, entries, console.warn);
    if (sf.getFullText() !== before) changedFiles.add(sf);
    for (const r of results) {
      if (r === "tagged-existing") totalTagged++;
      else if (r === "added-jsdoc") totalAdded++;
      else if (r === "not-found") totalNotFound++;
    }
  }

  console.log(
    `Modified ${changedFiles.size} files. Tagged-existing: ${totalTagged}, added new JSDoc: ${totalAdded}, not-found: ${totalNotFound}.`,
  );

  let totalBytes = 0;
  for (const sf of changedFiles) {
    await sf.save();
    totalBytes += Buffer.byteLength(sf.getFullText());
  }
  console.log(`Wrote ${changedFiles.size} files (${(totalBytes / 1024).toFixed(1)} KB total).`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
