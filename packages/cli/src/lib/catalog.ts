import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { checkoutRoot } from './checkout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Package root of the CLI itself — the anchor for finding the MDK checkout. */
const CLI_ROOT = resolve(__dirname, '..', '..');

export interface CatalogEntry {
  /** npm package name — what `mdk.yaml` references when it resolves from the registry. */
  value: string;
  label: string;
  hint: string;
  /**
   * Location inside the MDK checkout, for a package that ships with MDK but is
   * not on npm yet. When the CLI runs from the checkout, the project depends on
   * it via `addFileDependency`: a relative `file:` link to the checkout
   * path (whether that path sits inside the project folder or elsewhere in the
   * monorepo) — never by appending the path to `workspaces`, and never via bare
   * `*` (npm would treat that as a registry range outside a parent workspace).
   * `npm install` links it into `node_modules/<package>`, exactly as it would a
   * published package. No project folder is created for it: `workers/*` and
   * `apps/*` are reserved for packages the user actually owns
   * (`mdk create ...`).
   *
   * Linking (rather than copying) also keeps in-checkout relative resolution
   * working: Node resolves a symlinked package from its real location, so a
   * device mock finds its shared framework and an app finds the deps
   * in its own node_modules.
   */
  repoPath?: string;
}

export interface CatalogApp extends CatalogEntry {
  /** `spec.apps[].mount` to write, when the app's clients call it somewhere other than `/apps/<name>`. */
  mount?: string;
}

export interface CatalogWorker extends CatalogEntry {
  /** Worker-level config the plugin reads, beyond its device list. */
  config?: Record<string, unknown>;
  /**
   * Per-device opts beyond the `host`/`port`/`serial` every seed device gets.
   *
   * One object is handed to both the plugin's `connect()` and the device mock,
   * so it has to satisfy both at once.
   */
  deviceOpts?: Record<string, unknown>;
  /** Boot a device simulator from `<pkg>/mock/server.js`, so no hardware is needed. */
  mock?: boolean;
}

/**
 * Worker plugins offered by `mdk onboard`. Empty today — the bundled demo
 * worker was removed from the monorepo. When an entry is added, a `repoPath`
 * makes it a checkout-linked package; without one it is installed from the
 * registry (and its device config would need to be filled in by hand).
 */
export const WORKER_CATALOG: CatalogWorker[] = [];

/**
 * Apps offered by `mdk onboard`. Each lives in its own repo and installs from
 * the registry by package name; `mdk add app github:<owner>/<repo>` installs
 * one from GitHub and still picks up its `mount` here.
 */
export const APP_CATALOG: CatalogApp[] = [
  {
    value: '@tetherto/mdk-app-agent',
    label: 'mdk-app-agent',
    hint: 'auth-gated operator agent chat (sessions, SSE, approvals)',
    // The UI's agent transport (ui/packages/ui-agent) calls /agent/... at the Gateway root.
    mount: '/',
  },
  {
    value: '@tetherto/mdk-app-demo',
    label: 'mdk-app-demo',
    hint: 'fleet summary + history across your hashrate_rt miners',
  },
];

export function findCatalogWorker(pkg: string): CatalogWorker | undefined {
  return WORKER_CATALOG.find((entry) => entry.value === pkg);
}

export function findCatalogApp(pkg: string): CatalogApp | undefined {
  return APP_CATALOG.find((entry) => entry.value === pkg);
}

/**
 * Absolute path to `repoPath` in the MDK checkout the CLI runs from (only the
 * `<root>/packages/cli` layout counts, see `checkoutRoot`). Returns null when
 * the CLI is installed standalone from npm, where there is no checkout to point at.
 */
function findInCheckout(repoPath: string): string | null {
  const root = checkoutRoot(CLI_ROOT);
  if (!root) return null;
  const candidate = join(root, repoPath);
  return existsSync(join(candidate, 'package.json')) ? candidate : null;
}

export interface ResolvedCatalogPackage {
  /** npm package name — what `mdk.yaml` references and what lands in node_modules. */
  packageName: string;
  /** True when the package is linked from the checkout rather than the registry. */
  bundled: boolean;
  /** Set when the entry wanted the checkout but the CLI is running standalone. */
  unavailable?: boolean;
  /** Absolute checkout path — present when bundled and resolvable. */
  checkoutDir?: string;
}

/**
 * Decides how a selected catalog entry (worker or app) should be
 * installed. A bundled package is path-backed with a relative `file:` dep to
 * its checkout directory; everything else is installed from the registry.
 */
export function resolveCatalogPackage(entry: CatalogEntry): ResolvedCatalogPackage {
  const packageName = entry.value;
  if (!entry.repoPath) return { packageName, bundled: false };

  const dir = findInCheckout(entry.repoPath);
  if (dir) return { packageName, bundled: true, checkoutDir: dir };
  return { packageName, bundled: false, unavailable: true };
}
