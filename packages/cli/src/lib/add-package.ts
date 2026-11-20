import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { validateApp } from './app-package.js';
import { addAppToStackFile } from './app-scaffold.js';
import { installDeps, installPackages } from './npm.js';
import { parseSource } from './package-source.js';
import { ensureProjectManifest, readStackName } from './project.js';
import { ensureAppCredential } from './credentials.js';
import { conflictMessage, planAppGrant, writeAppGrant, type GrantSummary } from './rbac.js';
import { resolveProjectPackageDir } from './runtime.js';
import { shortName, toAppName } from './spec.js';
import type { StackFileUpdate } from './scaffold.js';
import { addWorkerToStackFile } from './worker-scaffold.js';
import { validateWorker } from './worker-package.js';

export type PackageKind = 'app' | 'worker';

export interface AddPackageOptions {
  kind: PackageKind;
  /** npm spec or GitHub repo, see `parseSource`. */
  source: string;
  /** Project directory holding `mdk.yaml`. */
  dir: string;
  /** Instance name in `mdk.yaml` (default: derived from the package name). */
  name?: string;
  /** Run `npm install` (default: true). A GitHub source needs it to learn the package name. */
  install?: boolean;
  /** An app whose requested Kernel access changed: replace its role in spec.rbac with the new request. */
  acceptPermissions?: boolean;
  /** An app whose requested Kernel access changed: keep its role in spec.rbac as it is. */
  keepPermissions?: boolean;
}

export interface AddPackageResult {
  ok: boolean;
  message?: string;
  /** Validation errors that stopped the add (package.json is restored). */
  errors?: string[];
  packageName?: string;
  /** npm ran, so package.json lists the dependency. */
  installed?: boolean;
  /** A GitHub source: the commit the lockfile resolved, now recorded in package.json too. */
  commit?: string;
  /** What `mdk.yaml` references: the package name, plus the subpath if any. */
  reference?: string;
  instanceName?: string;
  stackFile?: StackFileUpdate;
  /** A worker without a bundled mock needs its `devices[].opts` filled in. */
  needsDeviceOpts?: boolean;
  /** An app: what install did to its role in spec.rbac (see GrantAction), and its service account. */
  grant?: GrantSummary;
  /** An app: its service-account credential in this instance (`.mdk/credentials`), never in the package. */
  credential?: { file: string; created: boolean } | { error: string };
}

const fail = (message: string, extra: Partial<AddPackageResult> = {}): AddPackageResult => ({
  ok: false,
  message,
  ...extra,
});

function readDependencies(dir: string): Record<string, string> {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    return pkg.dependencies ?? {};
  } catch {
    return {};
  }
}

/** The dependency npm just added: new, or changed, or (for a re-add) pointing at the spec we asked for. */
function installedName(before: Record<string, string>, after: Record<string, string>, spec: string): string | undefined {
  const changed = Object.keys(after).filter((k) => after[k] !== before[k]);
  if (changed.length === 1) return changed[0];
  return Object.keys(after).find((k) => after[k] === spec || after[k]?.includes(spec.replace(/^github:/, '')));
}

/**
 * A third-party package's install scripts would run before it is validated, and
 * a range would let the next install pick a version nobody checked.
 */
const ADD_INSTALL_ARGS = ['--ignore-scripts', '--save-exact'];

const MANIFESTS = ['package.json', 'package-lock.json'];

/** A git dependency's resolved URL ends in its full commit SHA. */
const RESOLVED_SHA = /#([0-9a-f]{40})$/;

/** Re-serializes `value` the way `original` was laid out: its indent (spaces or tab) and trailing newline. */
function asWritten(original: string, value: unknown): string {
  const indent = /^([ \t]+)"/m.exec(original)?.[1] ?? 2;
  return `${JSON.stringify(value, null, indent)}${original.endsWith('\n') ? '\n' : ''}`;
}

/**
 * npm records a git dependency as the bare spec (`github:owner/repo`, or with the
 * branch or tag given), so package.json would follow whatever that ref points at
 * next; only the lockfile pins the commit. Writes that commit into the spec, in
 * package.json and in the lockfile's root entry, so the two stay in sync for
 * `npm ci`, keeping each file's own indent. Returns the commit, or undefined when
 * the lockfile has none to copy. If either write fails, both files are put back
 * as npm left them (bare spec, still consistent), and undefined is returned.
 */
function pinGitCommit(dir: string, name: string): string | undefined {
  const pkgFile = join(dir, 'package.json');
  const lockFile = join(dir, 'package-lock.json');
  let pkgText: string;
  let lockText: string;
  let pkg: { dependencies?: Record<string, string> };
  let lock: { packages?: Record<string, { resolved?: string; dependencies?: Record<string, string> }> };
  try {
    pkgText = readFileSync(pkgFile, 'utf8');
    lockText = readFileSync(lockFile, 'utf8');
    pkg = JSON.parse(pkgText) as typeof pkg;
    lock = JSON.parse(lockText) as typeof lock;
  } catch {
    return undefined;
  }

  const sha = RESOLVED_SHA.exec(lock.packages?.[`node_modules/${name}`]?.resolved ?? '')?.[1];
  const spec = pkg.dependencies?.[name];
  if (!sha || !spec?.startsWith('github:')) return undefined;

  const pinned = `${spec.split('#')[0]}#${sha}`;
  if (pinned === spec) return sha;
  pkg.dependencies![name] = pinned;
  const root = lock.packages?.[''];
  if (root?.dependencies?.[name] !== undefined) root.dependencies[name] = pinned;

  try {
    writeFileSync(pkgFile, asWritten(pkgText, pkg), 'utf8');
    writeFileSync(lockFile, asWritten(lockText, lock), 'utf8');
    return sha;
  } catch {
    // Half-written, package.json and the lockfile would disagree and `npm ci` stop.
    for (const [file, text] of [[pkgFile, pkgText], [lockFile, lockText]] as const) {
      try {
        writeFileSync(file, text, 'utf8');
      } catch {
        // Nothing more to do: the add itself stands either way.
      }
    }
    return undefined;
  }
}

type Snapshot = Array<[string, string | null]>;

function snapshot(dir: string): Snapshot {
  return MANIFESTS.map((name) => {
    const file = join(dir, name);
    return [file, existsSync(file) ? readFileSync(file, 'utf8') : null];
  });
}

/**
 * Puts package.json and the lockfile back as they were and resyncs node_modules,
 * so a refused package neither stays installed nor replaces the version an app
 * already listed in mdk.yaml runs.
 */
function restore(dir: string, saved: Snapshot): void {
  for (const [file, content] of saved) {
    if (content === null) rmSync(file, { force: true });
    else writeFileSync(file, content, 'utf8');
  }
  installDeps(dir, true, ['--ignore-scripts']);
}

/** The name `spec.apps` already runs `reference` under, if it lists it. */
function listedAppName(dir: string, reference: string): string | undefined {
  try {
    const doc = parseYaml(readFileSync(resolve(dir, 'mdk.yaml'), 'utf8')) as {
      spec?: { apps?: Array<{ name?: string; package?: string }> };
    };
    return doc.spec?.apps?.find((a) => a.package === reference)?.name;
  } catch {
    return undefined;
  }
}

/**
 * `mdk add app|worker <source>`: installs the package from npm or GitHub, checks it is a
 * valid app or worker, and registers it in `mdk.yaml`. `package.json` is updated by npm
 * itself, and restored if the package is refused. `mdk.yaml` is only touched once the
 * package validates.
 */
export function addPackage(opts: AddPackageOptions): AddPackageResult {
  const stackName = readStackName(opts.dir);
  if (!stackName) {
    return fail(`No mdk.yaml in ${opts.dir}. Run \`mdk onboard\` first, or pass --dir <project>.`);
  }

  let source;
  try {
    source = parseSource(opts.source);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  const install = opts.install !== false;
  if (!install && source.kind === 'github') {
    return fail('A GitHub source has to be installed to learn its package name; drop --no-install.');
  }

  try {
    ensureProjectManifest(opts.dir, stackName);
  } catch (error) {
    return fail(`Could not prepare package.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  const before = readDependencies(opts.dir);
  const saved = install ? snapshot(opts.dir) : null;
  const refuse = (message: string, extra: Partial<AddPackageResult> = {}): AddPackageResult => {
    if (saved) restore(opts.dir, saved);
    return fail(saved ? `${message} package.json was restored.` : message, extra);
  };

  const result = installPackages(opts.dir, [source.installSpec], install, ADD_INSTALL_ARGS);
  if (!result.ok) return refuse(result.message ?? 'npm install failed.');

  const packageName = source.packageName ?? installedName(before, readDependencies(opts.dir), source.installSpec);
  if (!packageName) {
    return refuse(`Installed ${source.installSpec} but could not tell which package it added.`);
  }
  const reference = source.subpath ? `${packageName}/${source.subpath}` : packageName;

  let packageDir: string;
  try {
    packageDir = resolveProjectPackageDir(opts.dir, reference);
  } catch (error) {
    return refuse(error instanceof Error ? error.message : String(error), { packageName });
  }

  const app = opts.kind === 'app' ? validateApp(packageDir) : undefined;
  const errors = app ? app.errors : validateWorker(packageDir).errors;
  if (errors.length) {
    return refuse(`${reference} is not a valid ${opts.kind}; mdk.yaml was not changed.`, {
      errors,
      packageName,
      reference,
    });
  }

  const commit = install && source.kind === 'github' ? pinGitCommit(opts.dir, packageName) : undefined;

  const instanceName = toAppName(opts.name?.trim() || shortName(source.subpath ?? packageName));
  if (app) {
    // A re-add without --name updates the app already running this package;
    // another --name is a second app.
    const listed = opts.name ? undefined : listedAppName(opts.dir, reference);
    const appName = listed ?? instanceName;

    // Decided before mdk.yaml is touched, so a refused grant changes nothing.
    if (opts.acceptPermissions && opts.keepPermissions) {
      return refuse('Pass --accept-permissions or --keep-permissions, not both.', { packageName, reference, instanceName: appName });
    }
    const permissions = app.manifest.permissions ?? [];
    let plan;
    try {
      plan = planAppGrant(opts.dir, appName, permissions, { accept: opts.acceptPermissions, keep: opts.keepPermissions });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      return refuse(`${text.split('\n')[0]} mdk.yaml was not changed.`, {
        errors: (error as { errors?: string[] }).errors ?? [],
        packageName,
        reference,
        instanceName: appName,
      });
    }
    if (plan.action === 'conflict') {
      return refuse(conflictMessage(plan, reference), { packageName, reference, instanceName: appName });
    }

    const stackFile = addAppToStackFile(opts.dir, reference, appName);
    if (stackFile === 'name-taken') {
      return refuse(
        `spec.apps already has an app named "${instanceName}" with another package; mdk.yaml was not changed. ` +
          'Pick another name with --name.',
        { packageName, reference, instanceName, stackFile },
      );
    }
    const written = stackFile === 'added' || stackFile === 'exists' ? writeAppGrant(opts.dir, plan) : false;
    let credential: AddPackageResult['credential'];
    try {
      const c = ensureAppCredential(opts.dir, appName);
      credential = { file: c.file, created: c.created };
    } catch (error) {
      // `mdk run` creates it at boot; the add itself stands.
      credential = { error: error instanceof Error ? error.message : String(error) };
    }
    return {
      ok: true,
      packageName,
      reference,
      instanceName: appName,
      stackFile,
      installed: install,
      commit,
      grant: { action: plan.action, role: plan.roleName, serviceAccount: plan.serviceAccount, written },
      credential,
    };
  }

  const mock = detectMockModule(packageDir);
  const { update } = addWorkerToStackFile(opts.dir, instanceName, reference, { mock });
  if (update === 'name-taken') {
    return refuse(
      `spec.workers already has a worker named "${instanceName}" with another package; mdk.yaml was not changed. ` +
        'Pick another name with --name.',
      { packageName, reference, instanceName, stackFile: update },
    );
  }
  return { ok: true, packageName, reference, instanceName, stackFile: update, needsDeviceOpts: !mock, installed: install, commit };
}

/**
 * What `config.mock` should say for a worker package: `true` for the
 * conventional `mock/server.js`, the module's path when the package ships its
 * simulator under one other `*server*.js` name (`mock/cgi-server.js`), and
 * `false` when there is nothing `mdk run` could start.
 */
export function detectMockModule(packageDir: string): boolean | string {
  const dir = join(packageDir, 'mock');
  if (existsSync(join(dir, 'server.js'))) return true;
  if (!existsSync(dir)) return false;
  const servers = readdirSync(dir).filter((f) => /server[\w.-]*\.js$/.test(f));
  return servers.length === 1 ? `mock/${servers[0]!}` : false;
}
