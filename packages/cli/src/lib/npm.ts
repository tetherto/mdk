import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isFileLinkedFromProject, isWorkspaceMember } from './project.js';

export interface InstallResult {
  ok: boolean;
  /** Skipped when there is nothing to install (no package.json) or `run: false`. */
  skipped?: boolean;
  message?: string;
  /** npm's exit code when it ran and failed (unset when it never started). */
  exitCode?: number;
}

export interface ScaffoldInstall extends InstallResult {
  /** The directory npm actually ran in — the workspace root, or the package. */
  dir: string;
}

/** The npm executable name for the current platform. */
export function npmBin(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * Whether npm must be spawned through a shell. Node refuses to spawn a `.cmd`
 * file without one on Windows (EINVAL since the CVE-2024-27980 fix), so win32
 * needs `shell: true`. A shell joins argv unescaped, which is why every caller
 * passes fixed arguments or specs checked against `INSTALL_SPEC_RE` only.
 */
export function npmNeedsShell(): boolean {
  return process.platform === 'win32';
}

/** A bare or scoped npm package name — nothing a shell would interpret. */
export const NPM_PACKAGE_RE = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

/**
 * What `installPackages` hands to `npm install`: a package name with an optional
 * `@version` / `@range`, or `github:owner/repo[#ref]`. No quote, `%`, `&`, `;`,
 * `$`, space or newline can appear, so a spec is safe to pass through a shell
 * once double-quoted (see `shellArg`); quoting keeps a range's `^ < > |` literal.
 */
export const INSTALL_SPEC_RE =
  /^(?:(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:@[0-9A-Za-z.~^*<>=|+-]+)?|github:[A-Za-z0-9][\w.-]*\/[\w.-]+(?:#[\w./-]+)?)$/;

/** A checked spec as one argument: quoted when npm runs through a shell. */
function shellArg(spec: string): string {
  return npmNeedsShell() ? `"${spec}"` : spec;
}

/**
 * The gist of a failed npm run: the `npm error code` and the first message line
 * after it (e.g. `E404 404 Not Found - GET https://…`). Reads npm's stderr
 * (`npm error …`, or `npm ERR! …` before npm 10) and its debug log, which holds
 * the same lines as `<n> error …`. Undefined when there are no error lines.
 */
export function npmErrorSummary(output: string): string | undefined {
  const lines = output
    .split(/\r?\n/)
    .map((line) => /^(?:npm (?:error|ERR!)|\d+ error)\s?(.*)$/.exec(line)?.[1]?.trim())
    .filter((line): line is string => !!line && !/^A complete log of this run/.test(line));
  const code = lines.find((line) => /^code\s/.test(line))?.slice(5).trim();
  const message = lines.find((line) => !/^(code|errno|syscall)\s/.test(line) && !/^\d{3}$/.test(line));
  if (!code && !message) return undefined;
  return [code, message].filter(Boolean).join(' ');
}

/** A fresh dir for npm's debug log, or undefined when the temp dir can't take one. */
function makeLogsDir(): string | undefined {
  try {
    return mkdtempSync(join(tmpdir(), 'mdk-npm-logs-'));
  } catch {
    return undefined;
  }
}

/** Removes the logs dir; a leftover temp dir is not worth failing an install over. */
function removeLogsDir(logsDir: string | undefined): void {
  if (!logsDir) return;
  try {
    rmSync(logsDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

/** Every debug log npm wrote to `logsDir`, joined; empty when there are none. */
function readNpmDebugLogs(logsDir: string | undefined): string {
  if (!logsDir) return '';
  try {
    return readdirSync(logsDir)
      .filter((name) => name.endsWith('.log'))
      .map((name) => readFileSync(join(logsDir, name), 'utf8'))
      .join('\n');
  } catch {
    return '';
  }
}

/**
 * Runs `npm install <args>` in `dir` with the terminal handed straight to npm.
 * npm draws its progress spinner only when stdout and stderr are both TTYs, so
 * piping stderr (even to forward it live) would leave a cold install looking
 * hung. To still put npm's own error in a failure message, npm writes its debug
 * log to a fresh `--logs-dir`, read only when npm fails. A failed run keeps that
 * log, since npm's last stderr line points the user at it; a clean run removes
 * it. The logs dir is best-effort: when it can't be made, npm runs without one
 * and a failure reports just the exit code. `what` names the fallback for a
 * missing npm.
 */
function runNpmInstall(dir: string, args: string[], what: string): InstallResult {
  const logsDir = makeLogsDir();
  const logsArgs = !logsDir ? [] : [npmNeedsShell() ? `--logs-dir="${logsDir}"` : `--logs-dir=${logsDir}`];
  const res = spawnSync(npmBin(), ['install', ...args, ...logsArgs], {
    cwd: dir,
    stdio: 'inherit',
    env: process.env,
    shell: npmNeedsShell(),
  });

  if (res.error) {
    removeLogsDir(logsDir);
    const missing = (res.error as NodeJS.ErrnoException).code === 'ENOENT';
    return {
      ok: false,
      message: missing ? `npm was not found on PATH — ${what} manually.` : `npm install failed to start: ${res.error.message}`,
    };
  }
  if (typeof res.status === 'number' && res.status !== 0) {
    const summary = npmErrorSummary(readNpmDebugLogs(logsDir));
    return {
      ok: false,
      message: `npm install exited with code ${res.status}${summary ? `: ${summary}` : ''}.`,
      exitCode: res.status,
    };
  }
  removeLogsDir(logsDir);
  return { ok: true };
}

/**
 * Runs `npm install` in `dir` (best-effort). npm owns the terminal, so its
 * progress is visible. Never throws: a missing `package.json`, a missing `npm`, or a
 * non-zero exit is reported via the result so the scaffold still succeeds and
 * the user can install manually.
 */
export function installDeps(dir: string, run = true, extraArgs: string[] = []): InstallResult {
  if (!run) return { ok: true, skipped: true, message: 'install skipped (--no-install)' };
  if (!existsSync(join(dir, 'package.json'))) {
    return { ok: true, skipped: true, message: 'no package.json — nothing to install' };
  }

  return runNpmInstall(dir, extraArgs, 'install dependencies');
}

/**
 * Adds one or more packages to `dir`'s `dependencies` and installs them
 * (`npm install <pkg>...`), so the runtime can later resolve them from the
 * project's `node_modules`. Same best-effort, never-throw contract as
 * `installDeps`: a missing `npm`, a missing manifest, or a non-zero exit is
 * reported via the result rather than thrown. No-ops when `packages` is empty.
 */
export function installPackages(dir: string, packages: string[], run = true, extraArgs: string[] = []): InstallResult {
  if (!run) return { ok: true, skipped: true, message: 'install skipped (--no-install)' };
  if (packages.length === 0) {
    return { ok: true, skipped: true, message: 'no packages to install' };
  }
  if (!existsSync(join(dir, 'package.json'))) {
    return { ok: false, message: 'no package.json — run `mdk onboard` first' };
  }

  const invalid = packages.find((spec) => !INSTALL_SPEC_RE.test(spec));
  if (invalid) return { ok: false, message: `refusing to install "${invalid}": not a valid npm package or GitHub spec` };

  return runNpmInstall(dir, [...extraArgs, ...packages.map(shellArg)], 'install the plugins');
}

/**
 * Installs dependencies for a freshly scaffolded component. When the package is
 * a workspace member or already declared as a `file:` dep of the project root,
 * npm must run at the project root so the symlink lands in the project's
 * `node_modules`. Everything else installs in its own directory.
 */
export function installScaffold(
  projectDir: string,
  packageDir: string,
  run = true,
): ScaffoldInstall {
  const atRoot =
    isWorkspaceMember(projectDir, packageDir) || isFileLinkedFromProject(projectDir, packageDir);
  const dir = atRoot ? projectDir : packageDir;
  return { ...installDeps(dir, run), dir };
}
