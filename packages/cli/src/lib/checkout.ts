import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/**
 * Root of the MDK monorepo checkout the CLI runs from, or null for a published
 * install. Only the known `<root>/packages/cli` layout is accepted — never a walk
 * up the tree, which would let any ancestor directory (a shared `/tmp`, a home
 * directory) plant the templates or packages the CLI then copies and installs.
 */
export function checkoutRoot(cliRoot: string): string | null {
  const packagesDir = dirname(cliRoot);
  if (basename(cliRoot) !== 'cli' || basename(packagesDir) !== 'packages') return null;
  return dirname(packagesDir);
}

/** Builds a checkout's UI packages, run from the checkout root. */
export const UI_PACKAGES_BUILD = 'npm run setup:ui && npm run build:ui';

/**
 * The linked package directories among `packageDirs` that have no `dist/`. The
 * MDK UI packages export `./dist/*` and have no `prepare` step, so a `file:` link
 * to an unbuilt one installs but fails to resolve at build or dev time.
 */
export function unbuiltPackages(packageDirs: string[]): string[] {
  return packageDirs.filter((dir) => existsSync(join(dir, 'package.json')) && !existsSync(join(dir, 'dist')));
}
