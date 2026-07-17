/**
 * <PropsTable name="Accordion" />
 *
 * Renders the prop table for a single component from the generated docs
 * dataset. Installed into the mdk-docs repo by `mdk-ui docs:build`; do not
 * edit it there by hand — re-run the command to pick up template changes.
 *
 * Data source: `src/data/<version>/generated/components.json`, produced from the
 * MDK component registry. This is a React Server Component — it reads the JSON
 * off disk at build time (the docs site is statically exported), so no bundler
 * loader or client JS is involved.
 *
 * The active version is read from `src/data/active-version.ts`, which
 * `mdk-ui docs:build` regenerates — no hardcoded version segment to keep in sync.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ACTIVE_DOCS_VERSION } from "../data/active-version";

const GENERATED_DIR = join(process.cwd(), "src", "data", ACTIVE_DOCS_VERSION, "generated");

type GeneratedProp = {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
};

type GeneratedComponent = {
  name: string;
  props: GeneratedProp[];
};

const loadComponents = (): GeneratedComponent[] => {
  const raw = readFileSync(join(GENERATED_DIR, "components.json"), "utf8");
  return JSON.parse(raw) as GeneratedComponent[];
};

export function PropsTable({ name }: { name: string }) {
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

  if (component.props.length === 0) {
    return (
      <p>
        <em>
          <code>{name}</code> exposes no documented props.
        </em>
      </p>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Prop</th>
          <th>Status</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {component.props.map((prop) => (
          <tr key={prop.name}>
            <td>
              <code>{prop.name}</code>
            </td>
            <td>{prop.required ? "Required" : "Optional"}</td>
            <td>
              <code>{prop.type}</code>
            </td>
            <td>{prop.default ? <code>{prop.default}</code> : "—"}</td>
            <td>{prop.description ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default PropsTable;
