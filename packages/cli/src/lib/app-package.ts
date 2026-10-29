import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { Script } from 'node:vm';
import { parse as parseYaml } from 'yaml';
import { checkAppUi } from './app-ui-check.js';
import { isInside } from './names.js';
import { mdkRbac } from './rbac.js';

const require = createRequire(import.meta.url);

export const APP_MANIFEST = 'mdk-app.yaml';
/** Where the app runtime looks for the route table, in order: `plugin/` first, then the package root. */
const ROUTE_TABLES = ['plugin/mdk-plugin.json', 'mdk-plugin.json'];
const MANIFEST_KEYS = ['id', 'version', 'displayName', 'description', 'permissions', 'config', 'main'];
const RULE_KEYS = ['resources', 'verbs', 'resourceNames'];
/** npm lifecycle scripts that run on install of a package, not only in its own checkout. */
const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];
// The app runtime's own rules (@tetherto/mdk-app-runtime lib/manifest.js): a
// looser pattern here would pass a package the runtime then refuses to start.
const ID_PATTERN = /^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9-]*)+$/;
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;

export interface PermissionRule {
  resources: string[];
  verbs: string[];
  resourceNames?: string[];
}

export interface AppManifest {
  id: string;
  version: string;
  displayName: string;
  permissions?: PermissionRule[];
  config?: Record<string, unknown>;
  main?: string;
}

export interface AppValidation {
  errors: string[];
  /** Problems that do not stop publishing, e.g. a UI build older than `ui-src/`. */
  warnings: string[];
  manifest: AppManifest;
  routes: number;
  /** True when the package ships a UI (`ui/`). */
  ui: boolean;
}

export interface ValidateAppOptions {
  /**
   * Also load `ui/index.js` (in a child process, imports stubbed) to check its
   * exports against the app UI contract. That runs the app's top-level code, so
   * only `mdk validate app` sets it — never an install of someone else's app.
   */
  runUiContract?: boolean;
}

interface RouteTable {
  routes: Array<{ id: string; handler: string }>;
}

interface PluginLoader {
  validateManifest(manifest: unknown, label: string): void;
}

export const isMapping = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isNameList = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0 && value.every((s) => typeof s === 'string' && s !== '');

export const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function readFile(dir: string, name: string, parse: (text: string) => unknown, errors: string[]): unknown {
  const file = join(dir, name);
  if (!existsSync(file)) {
    errors.push(`${name}: not found`);
    return undefined;
  }
  try {
    return parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${name}: ${message(error)}`);
    return undefined;
  }
}

/** The error loading a CommonJS file would throw at compile time, without running it. */
export function syntaxError(file: string): string | null {
  try {
    new Script(`(function (exports, require, module, __filename, __dirname) {${readFileSync(file, 'utf8')}\n})`, {
      filename: file,
    });
    return null;
  } catch (error) {
    return message(error);
  }
}

function checkUnknownKeys(value: Record<string, unknown>, allowed: string[], at: string, errors: string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${at}: unknown key "${key}" (allowed: ${allowed.join(', ')})`);
  }
}

function checkRule(rule: unknown, at: string, errors: string[]): void {
  if (!isMapping(rule)) {
    errors.push(`${at} must be a mapping with resources and verbs`);
    return;
  }
  checkUnknownKeys(rule, RULE_KEYS, at, errors);
  for (const key of ['resources', 'verbs']) {
    if (!isNameList(rule[key])) errors.push(`${at}.${key} must be a non-empty list of strings`);
  }
  if (rule.resourceNames !== undefined && !isNameList(rule.resourceNames)) {
    errors.push(`${at}.resourceNames must be a non-empty list of strings`);
  }
}

function checkManifest(manifest: unknown, pkg: unknown, errors: string[]): void {
  if (!isMapping(manifest)) {
    errors.push(`${APP_MANIFEST}: must be a mapping`);
    return;
  }
  checkUnknownKeys(manifest, MANIFEST_KEYS, APP_MANIFEST, errors);

  const { id, version, displayName, permissions, config } = manifest;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    errors.push(`${APP_MANIFEST}: "id" must be reverse-DNS, e.g. io.tether.demo`);
  }
  if (typeof version !== 'string' || !SEMVER_PATTERN.test(version)) {
    errors.push(`${APP_MANIFEST}: "version" must be a semver string, e.g. 0.1.0`);
  } else if (isMapping(pkg) && version !== pkg.version) {
    errors.push(`${APP_MANIFEST}: "version" ${version} does not match package.json version ${String(pkg.version)}`);
  }
  if (typeof displayName !== 'string' || !displayName.trim()) {
    errors.push(`${APP_MANIFEST}: "displayName" must be a non-empty string`);
  }
  if (manifest.description !== undefined && typeof manifest.description !== 'string') {
    errors.push(`${APP_MANIFEST}: "description" must be a string`);
  }
  // Required, even as `[]`: the Kernel refuses every call an app's role does not
  // allow, so an app that says nothing ships without the access it needs.
  if (permissions === undefined) {
    errors.push(`${APP_MANIFEST}: "permissions" is required: the Kernel access the app needs, as a list of rules ([] for none)`);
  } else {
    if (Array.isArray(permissions)) {
      const before = errors.length;
      permissions.forEach((rule, i) => checkRule(rule, `${APP_MANIFEST}: permissions[${i}]`, errors));
      // Well-formed rules are then held to what install can grant: Kernel resources and their verbs.
      if (errors.length === before) errors.push(...mdkRbac().validateAppPermissions(permissions, `${APP_MANIFEST}: permissions`));
    } else {
      errors.push(`${APP_MANIFEST}: "permissions" must be a list of rules`);
    }
  }
  if (config !== undefined && !isMapping(config)) {
    errors.push(`${APP_MANIFEST}: "config" must be a mapping`);
  }
  if (manifest.main !== undefined && (typeof manifest.main !== 'string' || !manifest.main.trim())) {
    errors.push(`${APP_MANIFEST}: "main" must be a "<file>[#export]" string`);
  }
}

/** `<file>[#export]` beside the route table: inside it, present, and compiling. */
function checkModule(dir: string, pluginDir: string, spec: string, what: string, errors: string[]): void {
  const file = spec.split('#')[0] ?? '';
  // The loader refuses these at boot (ERR_PLUGIN_HANDLER_OUTSIDE_PLUGIN).
  const target = resolve(pluginDir, file);
  if (isAbsolute(file) || target === pluginDir || !isInside(pluginDir, target)) {
    errors.push(`${what} "${spec}" must be inside ${relative(dir, pluginDir) || 'the package'}`);
    return;
  }
  let resolved: string;
  try {
    resolved = require.resolve(target);
  } catch {
    errors.push(`${what} "${spec}" not found`);
    return;
  }
  const syntax = syntaxError(resolved);
  if (syntax) errors.push(`${what} "${spec}" does not compile: ${syntax}`);
}

function checkRouteTable(dir: string, errors: string[]): { routes: number; pluginDir: string | null } {
  const name = ROUTE_TABLES.find((candidate) => existsSync(join(dir, candidate)));
  if (!name) {
    errors.push('mdk-plugin.json: not found (looked in plugin/ and the package root)');
    return { routes: 0, pluginDir: null };
  }
  const pluginDir = resolve(dir, name, '..');
  const table = readFile(dir, name, JSON.parse, errors);
  if (table === undefined) return { routes: 0, pluginDir };

  const loader = require('@tetherto/mdk-gateway/workers/lib/plugin-loader') as PluginLoader;
  try {
    loader.validateManifest(table, name);
  } catch (error) {
    errors.push(message(error));
    return { routes: 0, pluginDir };
  }

  const { routes } = table as RouteTable;
  for (const route of routes) {
    checkModule(dir, pluginDir, route.handler, `${name}: route "${route.id}" handler`, errors);
  }
  return { routes: routes.length, pluginDir };
}

/**
 * Checks an app package before it is published: the manifest, its version against
 * package.json, the permission rules' shape, the route table (by the Gateway's own
 * rules) and that every handler and `main` compiles. Nothing is executed, so a module
 * that throws when loaded or a missing named export only shows when the app starts.
 * A built UI (`ui/`) is checked by `checkAppUi`: syntax, imports, no bundled React,
 * and with `runUiContract` its exports.
 */
export function validateApp(dir: string, opts: ValidateAppOptions = {}): AppValidation {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return { errors: [`${dir}: not a directory`], warnings: [], manifest: undefined as unknown as AppManifest, routes: 0, ui: false };
  }
  const errors: string[] = [];
  const warnings: string[] = [];
  const pkg = readFile(dir, 'package.json', JSON.parse, errors);
  // `mdk add` installs with --ignore-scripts, so an app that needs one of these installs broken.
  if (isMapping(pkg) && isMapping(pkg.scripts)) {
    for (const script of INSTALL_SCRIPTS) {
      if (pkg.scripts[script] !== undefined) {
        warnings.push(`package.json: scripts.${script} does not run when the app is installed (mdk add passes --ignore-scripts)`);
      }
    }
  }
  const manifest = readFile(dir, APP_MANIFEST, parseYaml, errors);
  if (manifest !== undefined) {
    checkManifest(manifest, pkg, errors);
  }

  const { routes, pluginDir } = checkRouteTable(dir, errors);
  const main = isMapping(manifest) ? manifest.main : undefined;
  if (pluginDir && typeof main === 'string' && main.trim()) {
    checkModule(dir, pluginDir, main, `${APP_MANIFEST}: main`, errors);
  }

  const ui = existsSync(join(dir, 'ui'));
  if (ui) {
    const id = isMapping(manifest) && typeof manifest.id === 'string' ? manifest.id : undefined;
    const check = checkAppUi(dir, { id, runContract: opts.runUiContract });
    errors.push(...check.errors);
    warnings.push(...check.warnings);
  }

  return { errors, warnings, manifest: manifest as AppManifest, routes, ui };
}
