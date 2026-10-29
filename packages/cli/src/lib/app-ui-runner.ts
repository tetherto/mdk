/**
 * Child process for `checkAppUi`'s contract check: imports an app's built
 * `ui/index.js` with every bare import replaced by a stub, then checks its
 * default export against the app UI contract the dashboard enforces
 * (`checkAppUiModule` in @tetherto/mdk-react-adapter).
 *
 * Runs in its own process so the app's top-level code never touches the CLI's
 * module graph. It has no imports of its own beyond `node:`, so it also runs
 * as `.ts` (tests) under Node's type stripping.
 *
 * Input (env): MDK_UI_ENTRY (absolute path), MDK_UI_ID (expected id),
 * MDK_UI_IMPORTS (JSON: specifier → the names imported from it).
 * Output (stdout, one JSON line): { errors: string[], warnings: string[] }.
 */
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const STUB_PREFIX = 'mdk-ui-stub:';

// Exports whose real value an app's default export is built from, so a stub
// would fail the contract check: kept as they are in @tetherto/mdk-react-adapter
// (a test runs the same modules through both checkers).
const REAL_EXPORTS: Record<string, string> = {
  defineMdkApp: 'export const defineMdkApp = (ui) => ui;',
  MDK_APP_PANEL_SLOT: "export const MDK_APP_PANEL_SLOT = Object.freeze({ HOME: 'home' });",
};
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const entry = process.env.MDK_UI_ENTRY ?? '';
const expectedId = process.env.MDK_UI_ID ?? '';
const imports = JSON.parse(process.env.MDK_UI_IMPORTS ?? '{}') as Record<string, string[]>;

const isBare = (specifier: string): boolean =>
  !specifier.startsWith('.') && !specifier.startsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(specifier);

// A value that survives anything top-level code does with an import it got from
// the dashboard: call it, construct it, read any property of it.
const stubSource = (specifier: string): string => {
  const names = imports[specifier] ?? [];
  const lines = [
    'const stub = new Proxy(function () {}, {',
    '  get: (_t, key) => (key === Symbol.toPrimitive ? () => "" : stub),',
    '  apply: () => stub,',
    '  construct: () => stub,',
    '});',
    'export default stub;',
  ];
  for (const name of new Set(names)) {
    if (name === 'default' || !IDENTIFIER.test(name)) continue;
    lines.push(REAL_EXPORTS[name] ?? `export const ${name} = stub;`);
  }
  return lines.join('\n');
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (isBare(specifier)) return { url: `${STUB_PREFIX}${specifier}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(STUB_PREFIX)) {
      return { format: 'module', source: stubSource(url.slice(STUB_PREFIX.length)), shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';
const isComponent = (value: unknown): boolean => typeof value === 'function' || (isRecord(value) && '$$typeof' in value);

const errors: string[] = [];
const warnings: string[] = [];

function checkContract(ui: unknown): void {
  if (!isRecord(ui)) {
    errors.push('ui/index.js must default-export the app UI object (defineMdkApp({ ... }))');
    return;
  }
  if (ui.id !== expectedId) {
    errors.push(`ui/index.js declares id "${String(ui.id)}", but mdk-app.yaml says "${expectedId}" — the dashboard refuses a mismatch`);
  }
  if (typeof ui.displayName !== 'string' || !ui.displayName) errors.push('ui/index.js must export a non-empty `displayName`');

  if (!Array.isArray(ui.routes)) errors.push('ui/index.js must export `routes` as an array');
  else {
    ui.routes.forEach((route: unknown, i) => {
      if (!isRecord(route) || typeof route.path !== 'string') errors.push(`ui/index.js routes[${i}] needs a string \`path\``);
      else if (!isComponent(route.component)) errors.push(`ui/index.js routes[${i}] ("${route.path}") needs a React \`component\``);
      else if (route.section !== undefined && (typeof route.section !== 'string' || !route.section)) {
        errors.push(`ui/index.js routes[${i}] ("${route.path}") has a \`section\` that is not a non-empty string`);
      }
    });
  }

  // Valid, but invisible: no sidebar entry and nothing on Home — usually the
  // placeholder `mdk create app` writes before the UI is built.
  if (Array.isArray(ui.routes) && Array.isArray(ui.panels) && !ui.routes.length && !ui.panels.length) {
    warnings.push('ui/index.js exports no pages and no panels, so the app will not show in the dashboard — build the UI with `npm run build:ui`');
  }

  if (!Array.isArray(ui.panels)) errors.push('ui/index.js must export `panels` as an array');
  else {
    const ids = new Set<string>();
    ui.panels.forEach((panel: unknown, i) => {
      if (!isRecord(panel) || typeof panel.id !== 'string' || !panel.id) {
        errors.push(`ui/index.js panels[${i}] needs a string \`id\``);
        return;
      }
      if (ids.has(panel.id)) errors.push(`ui/index.js has two panels with id "${panel.id}"`);
      ids.add(panel.id);
      if (typeof panel.slot !== 'string' || !panel.slot) errors.push(`ui/index.js panel "${panel.id}" needs a string \`slot\``);
      if (!isComponent(panel.component)) errors.push(`ui/index.js panel "${panel.id}" needs a React \`component\``);
    });
  }

  if (ui.sections === undefined) return;
  if (!Array.isArray(ui.sections)) {
    errors.push('ui/index.js must export `sections` as an array');
    return;
  }
  const labels = new Set<string>();
  ui.sections.forEach((section: unknown, i) => {
    if (!isRecord(section) || typeof section.label !== 'string' || !section.label) {
      errors.push(`ui/index.js sections[${i}] needs a string \`label\``);
      return;
    }
    if (labels.has(section.label)) errors.push(`ui/index.js has two sections labelled "${section.label}"`);
    labels.add(section.label);
    if (section.icon !== undefined && !isComponent(section.icon)) {
      errors.push(`ui/index.js section "${section.label}" has an \`icon\` that is not a React component`);
    }
  });
}

try {
  const mod = (await import(pathToFileURL(entry).href)) as { default?: unknown };
  checkContract(mod.default);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  // Syntax is checked before this runs; anything thrown here is the app's
  // top-level code meeting a stub or a browser-only global. The dashboard still
  // checks the contract when it loads the app, so this is not fatal.
  warnings.push(`could not check the UI contract in Node (${message.split('\n')[0]}); the dashboard checks it when it loads the app`);
}

process.stdout.write(`${JSON.stringify({ errors, warnings })}\n`);
