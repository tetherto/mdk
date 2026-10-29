import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { checkoutRoot } from './checkout.js';
import { installDeps, installScaffold, npmBin, npmNeedsShell } from './npm.js';
import { pkg as cliPkg } from './pkg.js';
import { DIRS } from './project.js';
import { NAME_RE, parseOrg } from './names.js';
import {
  appendToStackList,
  copyTemplate,
  linkCheckoutBackend,
  linkIntoProject,
  updateJson,
  type StackFileUpdate,
} from './scaffold.js';
import { toAppName } from './spec.js';
import { findCatalogApp } from './catalog.js';
import { grantApp, type GrantSummary } from './rbac.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Placeholders baked into `templates/app/**`, replaced at scaffold time. */
const NAME_TOKEN = '__PLUGIN_NAME__';
/** The `spec.apps[].name` (see `toAppName`), also the last segment of the `mdk-app.yaml` id. */
const APP_TOKEN = '__PLUGIN_APP__';
/** The package name, scoped under `--org` when given. */
const PACKAGE_TOKEN = '__PACKAGE_NAME__';

/**
 * Absolute path to the bundled app template (`templates/app`).
 * Resolves the same from `dist/lib` (built) and `src/lib` (tsx dev) since both
 * sit one level under the package root.
 */
function templateDir(): string {
  return resolve(__dirname, '..', '..', 'templates', 'app');
}

const CLI_ROOT = resolve(__dirname, '..', '..');

/** The starter UI (`templates/app-ui`): `ui-src/` with its own Vite build. */
export function appUiTemplateDir(): string {
  return resolve(CLI_ROOT, 'templates', 'app-ui');
}

/** The MDK UI packages the starter imports, by their directory under `ui/packages/`. */
const MDK_UI_PACKAGES: Record<string, string> = {
  '@tetherto/mdk-ui-foundation': 'ui-foundation',
  '@tetherto/mdk-react-adapter': 'react-adapter',
  '@tetherto/mdk-react-devkit': 'react-devkit',
};

/**
 * What the starter UI needs to build, in `ui-src/package.json` — its own
 * package, so building the UI never installs the app's backend dependencies.
 * None of it ships with the app: the built `ui/index.js` leaves React and the
 * MDK packages to the dashboard. Inside an MDK checkout the MDK packages link to
 * it, like a scaffolded dashboard; elsewhere they take the CLI's published range.
 */
function uiDevDependencies(): Record<string, string> {
  const root = checkoutRoot(CLI_ROOT);
  const mdk = Object.fromEntries(
    Object.entries(MDK_UI_PACKAGES).map(([name, dir]) => [
      name,
      root ? `file:${join(root, 'ui', 'packages', dir)}` : `^${cliPkg.version}`,
    ]),
  );
  return {
    ...mdk,
    '@tanstack/react-query': '^5.59.0',
    '@types/react': '^19.2.14',
    '@vitejs/plugin-react': '^5.1.4',
    react: '^19.2.0',
    'react-dom': '^19.2.0',
    'react-router': '^8.3.0',
    typescript: '^7.0.2',
    vite: '^7.0.0',
  };
}

const writeJson = (file: string, value: unknown): void =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

/**
 * Writes the starter UI into `<appPath>/ui-src/` (one page and one Home panel
 * showing the app's `summary` route, across the three MDK UI layers), its own
 * package.json and tsconfig, the `build:ui` / `dev:ui` / `typecheck:ui` scripts,
 * and a placeholder `ui/index.js` the build replaces.
 */
function writeStarterUi(appPath: string, name: string): void {
  const manifest = parseYaml(readFileSync(join(appPath, 'mdk-app.yaml'), 'utf8')) as { id: string; displayName: string };
  const pkgFile = join(appPath, 'package.json');
  const packageName = (JSON.parse(readFileSync(pkgFile, 'utf8')) as { name: string }).name;
  const uiSrc = join(appPath, 'ui-src');

  // Tokens are slugs or come from the generated manifest, so they are safe
  // inside the string literals and class names they replace.
  copyTemplate(join(appUiTemplateDir(), 'ui-src'), uiSrc, {
    __APP_NAME__: name,
    __APP_ID__: manifest.id,
    __APP_DISPLAY_NAME__: manifest.displayName,
    __APP_CSS__: name.replace(/[^a-z0-9_-]/g, '-'),
  });
  writeJson(join(uiSrc, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      noUncheckedIndexedAccess: true,
      skipLibCheck: true,
      noEmit: true,
      isolatedModules: true,
    },
    include: ['.'],
  });
  writeJson(join(uiSrc, 'package.json'), {
    name: `${packageName}-ui`,
    private: true,
    type: 'module',
    scripts: { build: 'vite build', dev: 'vite build --watch', typecheck: 'tsc --noEmit' },
    devDependencies: uiDevDependencies(),
  });
  writeFileSync(join(appPath, '.gitignore'), 'node_modules/\n', 'utf8');
  updateJson(pkgFile, {
    // Publish what the app runs and shows; ui-src/ is local build input.
    files: ['mdk-app.yaml', 'plugin/', 'ui/', 'README.md'],
    scripts: {
      'build:ui': 'npm --prefix ui-src run build',
      'dev:ui': 'npm --prefix ui-src run dev',
      'typecheck:ui': 'npm --prefix ui-src run typecheck',
    },
  });

  // A placeholder the build replaces: the app is a valid package, and loads in
  // the dashboard, even before (or without) its UI is built.
  mkdirSync(join(appPath, 'ui'), { recursive: true });
  writeFileSync(
    join(appPath, 'ui', 'index.js'),
    `export default ${JSON.stringify({ id: manifest.id, displayName: manifest.displayName, routes: [], panels: [] }, null, 2)};\n`,
    'utf8',
  );
}

/** Installs the starter UI's build dependencies and builds `ui/`; returns why it did not, if it did not. */
function buildStarterUi(appPath: string): string | undefined {
  const install = installDeps(join(appPath, 'ui-src'));
  if (!install.ok) return install.message;
  const res = spawnSync(npmBin(), ['run', 'build:ui'], {
    cwd: appPath,
    encoding: 'utf8',
    env: process.env,
    shell: npmNeedsShell(),
  });
  if (res.error) return `npm run build:ui failed to start: ${res.error.message}`;
  if (res.status !== 0) {
    const detail = (res.stderr || res.stdout || '').trim().split('\n').slice(-8).join('\n');
    return `npm run build:ui exited with code ${res.status}.${detail ? `\n${detail}` : ''}`;
  }
  return undefined;
}

export interface AppScaffoldOptions {
  /** App name — used for the folder, route ids/paths, and the package name. */
  name: string;
  /** Project directory; the app is created under `<parentDir>/apps/<name>`. */
  parentDir: string;
  /** npm scope/org for the generated package name (e.g. `demo` -> `@demo/<name>`). */
  org?: string;
  /** Overwrite the target if it already exists (default: false). */
  force?: boolean;
  /** Run `npm install` after scaffolding (default: true). */
  install?: boolean;
  /** Add the app to `<parentDir>/mdk.yaml` under `spec.apps` (default: true). */
  updateStackFile?: boolean;
}

export interface AppScaffoldResult {
  ok: boolean;
  message?: string;
  detail?: string;
  /** Absolute path of the scaffolded app. */
  appPath?: string;
  /** Resolved package.json `name` — the value referenced in mdk.yaml. */
  packageName?: string;
  /** The `spec.apps[].name` the app is registered under. */
  appName?: string;
  /** Warning surfaced when `npm install` could not complete (scaffold still ok). */
  installWarning?: string;
  /** Directory `npm install` ran in (the workspace root for a linked app). */
  installDir?: string;
  /** How the `mdk.yaml` update went (so the caller can guide the user). */
  stackFile?: StackFileUpdate;
  /** What listing the app did to its role in spec.rbac, when mdk.yaml lists it; `error` when that could not be written. */
  grant?: GrantSummary | { error: string };
  /** True when the starter UI was built into `ui/`. */
  uiBuilt?: boolean;
  /** Why `ui/` still holds the placeholder (install or build failed, or was skipped). */
  uiWarning?: string;
}

/**
 * Appends an app to `spec.apps` in `<parentDir>/mdk.yaml`. Unlike workers, apps are
 * referenced by **package name** (resolved from node_modules), not a local path.
 * No-ops (`'exists'`) when this app (same name and package) is already listed;
 * `'name-taken'` when another package holds the name. The same package under
 * another name is a second app.
 */
export function addAppToStackFile(parentDir: string, packageName: string, appName: string): StackFileUpdate {
  return appendToStackList(
    parentDir,
    'apps',
    appName,
    (entry) => entry.get('name') === appName && entry.get('package') === packageName,
    (doc) => {
      const mount = findCatalogApp(packageName)?.mount;
      return doc.createNode({ name: appName, package: packageName, config: {}, ...(mount !== undefined ? { mount } : {}) });
    },
  );
}

/**
 * Writes the role and binding for the access the scaffolded manifest requests
 * into `<parentDir>/mdk.yaml`, as `mdk add app` does, so the first `mdk run`
 * finds the app granted. A role the operator edited (a re-scaffold with
 * --force) is left alone and reported as a conflict.
 */
function grantScaffold(parentDir: string, appPath: string, appName: string): NonNullable<AppScaffoldResult['grant']> {
  try {
    const manifest = parseYaml(readFileSync(join(appPath, 'mdk-app.yaml'), 'utf8')) as { permissions?: unknown[] };
    return grantApp(parentDir, appName, manifest.permissions ?? []);
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)).split('\n')[0] };
  }
}

/**
 * Scaffolds a new app package (`mdk-app.yaml` + `plugin/` route table and
 * controllers) from the bundled template into `<parentDir>/apps/<name>` —
 * the linked layout `mdk run` resolves from node_modules. Substitutes the name
 * tokens, sets the package.json and manifest `name`, links the package, and
 * registers it under `spec.apps` in mdk.yaml, with its grant in `spec.rbac`.
 */
export function createApp(opts: AppScaffoldOptions): AppScaffoldResult {
  const name = opts.name.trim();
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      message: `Invalid app name "${opts.name}". Use lowercase letters, digits, '.', '_' or '-'.`,
    };
  }

  const org = parseOrg(opts.org);
  if (!org.ok) return { ok: false, message: org.message };

  const src = templateDir();
  if (!existsSync(src)) {
    return { ok: false, message: `App template not found at ${src}.` };
  }

  const appPath = resolve(opts.parentDir, DIRS.apps, name);
  if (appPath === resolve(opts.parentDir, DIRS.dashboard)) {
    return {
      ok: false,
      message: `"${name}" is reserved for the dashboard (${DIRS.dashboard}, see \`mdk create dashboard\`); pick another app name.`,
    };
  }
  if (existsSync(appPath) && !opts.force) {
    return { ok: false, message: `${appPath} already exists (use --force to overwrite).` };
  }

  try {
    mkdirSync(resolve(opts.parentDir, DIRS.apps), { recursive: true });
    const appName = toAppName(name);
    // Scope the package name when an org is given; the manifest name mirrors it
    // so logs and the mdk.yaml entry agree. A new app starts at the manifest's
    // version, not the template's release pin.
    const packageName = org.org ? `@${org.org}/${name}` : name;
    copyTemplate(src, appPath, { [NAME_TOKEN]: name, [APP_TOKEN]: appName, [PACKAGE_TOKEN]: packageName });
    updateJson(join(appPath, 'package.json'), { name: packageName, version: '0.1.0' });
    linkCheckoutBackend(join(appPath, 'package.json'));
    updateJson(join(appPath, 'plugin', 'mdk-plugin.json'), { name: packageName });
    writeStarterUi(appPath, name);

    const linkWarning = linkIntoProject(opts.parentDir, packageName, appPath);
    const install = installScaffold(opts.parentDir, appPath, opts.install !== false);
    const stackFile =
      opts.updateStackFile === false ? undefined : addAppToStackFile(opts.parentDir, packageName, appName);
    const grant = stackFile === 'added' || stackFile === 'exists' ? grantScaffold(opts.parentDir, appPath, appName) : undefined;
    const uiWarning = opts.install === false ? 'install skipped (--no-install)' : buildStarterUi(appPath);

    return {
      ok: true,
      appPath,
      packageName,
      appName,
      installWarning: linkWarning ?? (install.ok ? undefined : install.message),
      installDir: install.dir,
      stackFile,
      ...(grant ? { grant } : {}),
      uiBuilt: uiWarning === undefined,
      ...(uiWarning !== undefined ? { uiWarning } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      message: 'Could not scaffold the app.',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
