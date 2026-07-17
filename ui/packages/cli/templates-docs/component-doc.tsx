/**
 * <ComponentDoc name="LineChartCard" />
 *
 * Renders the full reference block for a single component from the generated
 * docs dataset: description, import line, props table, usage guide, and runnable
 * examples. Installed into the mdk-docs repo by `mdk-ui docs:build`; do not edit
 * it there by hand — re-run the command to pick up template changes.
 *
 * Keep your own prose, headings, and page grouping around it — this component
 * only renders the parts that go stale when the code changes.
 *
 * Data source: `src/data/<version>/generated/` (catalog JSON + usage/example
 * files), produced from the MDK component registry. This is a React Server
 * Component — it reads files off disk at build time (the docs site is statically
 * exported), so no bundler loader or client JS is involved.
 *
 * The active version is read from `src/data/active-version.ts`, which
 * `mdk-ui docs:build` regenerates — no hardcoded version segment to keep in sync.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type { ReactNode } from "react";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { ACTIVE_DOCS_VERSION } from "../data/active-version";
import { PropsTable } from "./props-table";

/** Package every devkit component is imported from. */
const IMPORT_PACKAGE = "@tetherto/mdk-react-devkit";

const GENERATED_DIR = join(process.cwd(), "src", "data", ACTIVE_DOCS_VERSION, "generated");

type GeneratedComponent = {
  name: string;
  subpackage: "primitives" | "domain" | "other";
  description: string;
  usageFile?: string;
  exampleFiles?: string[];
};

const loadComponents = (): GeneratedComponent[] => {
  const raw = readFileSync(join(GENERATED_DIR, "components.json"), "utf8");
  return JSON.parse(raw) as GeneratedComponent[];
};

/** Read a dataset-relative file (e.g. `usage/Foo.md`), or null when absent. */
const readDatasetFile = (relPath: string): string | null => {
  const abs = join(GENERATED_DIR, relPath);
  return existsSync(abs) ? readFileSync(abs, "utf8") : null;
};

/**
 * The generated USAGE.md is a full standalone doc (title, props table,
 * example, notes). This template already renders the title, props table, and
 * examples structurally, so strip those sections from the usage prose to avoid
 * showing them twice — leaving only the authored guidance (intro, notes).
 *
 * Beyond the exact `## Props` and `## Example`/`## Examples` headings, this also
 * strips labelled example sections like `## Minimal example` / `## Wired example`:
 * any H2 whose title ends in "example"/"examples" is re-rendered structurally
 * from the `*.example.tsx` sources below, so leaving it in the prose duplicates it.
 */
const EXAMPLE_HEADING = /\bexamples?$/;

const isRedundantUsageHeading = (title: string): boolean => {
  const normalized = title.trim().toLowerCase();
  return normalized === "props" || EXAMPLE_HEADING.test(normalized);
};

const stripRedundantUsageSections = (markdown: string): string => {
  const out: string[] = [];
  let skipping = false;
  for (const line of markdown.split("\n")) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) continue; // drop the leading H1 (duplicates the page title)
      if (level === 2) {
        skipping = isRedundantUsageHeading(heading[2]);
        if (skipping) continue;
      }
      // deeper headings (###+) inherit the current section's skip state
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

/** Render a markdown string to React nodes (GFM, no raw HTML). */
const renderMarkdown = async (markdown: string): Promise<ReactNode> => {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
  const tree = await processor.run(processor.parse(markdown));
  return toJsxRuntime(tree, { Fragment, jsx, jsxs });
};

export async function ComponentDoc({ name }: { name: string }) {
  const component = loadComponents().find((c) => c.name === name);

  if (!component) {
    return (
      <p>
        <em>
          No generated data for <code>{name}</code>. Check the name against{" "}
          <code>components.json</code>, or re-run <code>mdk-ui docs:build</code>.
        </em>
      </p>
    );
  }

  const description = component.description
    ? await renderMarkdown(component.description)
    : null;

  const usageSource = component.usageFile ? readDatasetFile(component.usageFile) : null;
  const usageProse = usageSource ? stripRedundantUsageSections(usageSource) : "";
  const usage = usageProse ? await renderMarkdown(usageProse) : null;

  const examples = (component.exampleFiles ?? [])
    .map((rel) => readDatasetFile(rel))
    .filter((src): src is string => src !== null);

  return (
    <div className="mdk-component-doc">
      {description}

      <DynamicCodeBlock
        lang="tsx"
        code={`import { ${component.name} } from "${IMPORT_PACKAGE}";`}
      />

      <PropsTable name={component.name} />

      {usage ? (
        <>
          <h3>Usage</h3>
          {usage}
        </>
      ) : null}

      {examples.length > 0 ? (
        <>
          <h3>{examples.length > 1 ? "Examples" : "Example"}</h3>
          <div
            className="mdk-examples"
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {examples.map((code, i) => (
              <DynamicCodeBlock key={i} lang="tsx" code={code.replace(/\n$/, "")} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default ComponentDoc;
