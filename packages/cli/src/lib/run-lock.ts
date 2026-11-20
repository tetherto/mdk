import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * One running copy per component and project. Two copies of a worker or app share
 * its identity keys and store, so the second one takes over the first one's DHT
 * key and the first goes unreachable once either stops; two Kernels fight over
 * the store lock. A `.mdk/run/<component>.pid` file names the process that owns
 * the component; a stale file (its process gone) is taken over.
 */

/** A component that holds a run lock: `kernel`, `worker <name>` or `app <name>`. */
export interface RunComponent {
  kind: 'kernel' | 'worker' | 'app';
  name?: string;
}

/** Absolute path of a component's lock file. */
export function runLockFile(projectDir: string, component: RunComponent): string {
  if (component.name !== undefined && !/^[a-z0-9][a-z0-9._-]*$/.test(component.name)) {
    throw new Error(`Invalid ${component.kind} name "${component.name}".`);
  }
  const file = component.name ? `${component.kind}-${component.name}.pid` : `${component.kind}.pid`;
  return join(resolve(projectDir), '.mdk', 'run', file);
}

/**
 * Where `mdk run` records `<runtime pid> <supervisor pid>` for a supervised app.
 * The run lock names the supervisor, which outlives a child that crashed and is
 * waiting to restart: the file keeps the dead runtime's pid until the restart,
 * and goes when the supervisor stops the app.
 */
export function appChildFile(projectDir: string, name: string): string {
  return runLockFile(projectDir, { kind: 'app', name }).replace(/\.pid$/, '.child');
}

/** Records that `supervisor` runs app `name`'s runtime as process `child`. */
export function writeAppChildFile(projectDir: string, name: string, child: number, supervisor = process.pid): void {
  const file = appChildFile(projectDir, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${child} ${supervisor}`);
}

/**
 * The runtime pid in an app's child file, if `supervisor` wrote it: undefined
 * without one (the app runs in-process) or for one a previous run left behind.
 */
export function appChildPid(projectDir: string, name: string, supervisor: number): number | undefined {
  try {
    const [child, owner] = readFileSync(appChildFile(projectDir, name), 'utf8').trim().split(' ').map(Number);
    return owner === supervisor ? child : undefined;
  } catch {
    return undefined;
  }
}

function label(component: RunComponent): string {
  return component.name ? `${component.kind} "${component.name}"` : `The ${component.kind}`;
}

/** True when `pid` is a live process (EPERM still means it exists). */
export function isAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** The live pid holding a component's lock, or null when it is free or stale. */
export function lockHolder(projectDir: string, component: RunComponent): number | null {
  let pid: number;
  try {
    pid = Number(readFileSync(runLockFile(projectDir, component), 'utf8').trim());
  } catch {
    return null;
  }
  return isAlive(pid) ? pid : null;
}

function capitalize(text: string): string {
  return text[0]!.toUpperCase() + text.slice(1);
}

/** Lock files this process owns; removed when it exits. */
const owned = new Set<string>();
let exitHookInstalled = false;

function releaseFile(file: string): void {
  owned.delete(file);
  try {
    if (readFileSync(file, 'utf8').trim() === String(process.pid)) unlinkSync(file);
  } catch {
    /* already gone */
  }
}

function releaseAll(): void {
  for (const file of [...owned]) releaseFile(file);
}

function alreadyRunning(component: RunComponent, file: string, holder: number): Error {
  return new Error(
    `${capitalize(label(component))} is already running for this project (pid ${holder}).\n` +
      `Stop it first, or remove ${file} if that process is not an MDK component.`,
  );
}

const isEexist = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'EEXIST';

/** Blocks the thread for `ms` (lock acquisition is synchronous). */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const TAKEOVER_TRIES = 100;
const TAKEOVER_WAIT_MS = 20;

/**
 * Replaces a stale lock under a `<lock>.takeover` guard, so two processes that
 * both found it stale cannot both pass the check and one delete the lock the
 * other just took. A guard whose process is gone is cleared.
 */
function takeOver(projectDir: string, component: RunComponent, file: string): void {
  const guard = `${file}.takeover`;
  for (let tries = 0; ; tries++) {
    try {
      writeFileSync(guard, String(process.pid), { flag: 'wx' });
      break;
    } catch (error) {
      if (!isEexist(error)) throw error;
      let guardPid = 0;
      try {
        guardPid = Number(readFileSync(guard, 'utf8').trim());
      } catch {
        continue; // released meanwhile
      }
      if (!isAlive(guardPid)) {
        try {
          unlinkSync(guard);
        } catch {
          /* cleared by another process */
        }
        continue;
      }
      if (tries >= TAKEOVER_TRIES) {
        throw new Error(`${capitalize(label(component))} is being started by another process (pid ${guardPid}).`);
      }
      sleepSync(TAKEOVER_WAIT_MS);
    }
  }

  try {
    const holder = lockHolder(projectDir, component);
    if (holder !== null && holder !== process.pid) throw alreadyRunning(component, file, holder);
    try {
      unlinkSync(file);
    } catch {
      /* already gone */
    }
    try {
      writeFileSync(file, String(process.pid), { flag: 'wx' });
    } catch (error) {
      // A process that found no lock at all took it first.
      if (!isEexist(error)) throw error;
      throw alreadyRunning(component, file, lockHolder(projectDir, component) ?? 0);
    }
  } finally {
    try {
      unlinkSync(guard);
    } catch {
      /* already gone */
    }
  }
}

/**
 * Takes the run locks for every component this process is about to start, or
 * throws naming the one already running. All or nothing: on a conflict the
 * locks taken so far are released. The locks are dropped when the process exits.
 */
export function acquireRunLocks(projectDir: string, components: RunComponent[]): { release(): void } {
  const taken: string[] = [];
  const release = (): void => {
    for (const file of taken.splice(0)) releaseFile(file);
  };

  try {
    for (const component of components) {
      const file = runLockFile(projectDir, component);
      mkdirSync(dirname(file), { recursive: true });
      try {
        writeFileSync(file, String(process.pid), { flag: 'wx' });
      } catch (error) {
        if (!isEexist(error)) throw error;
        takeOver(projectDir, component, file);
      }
      taken.push(file);
      owned.add(file);
    }
  } catch (error) {
    release();
    throw error;
  }

  if (!exitHookInstalled) {
    exitHookInstalled = true;
    process.once('exit', releaseAll);
  }
  return { release };
}
