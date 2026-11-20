import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Lowest Node major the CLI and the MDK runtime packages support (their `engines`). */
export const NODE_MIN_MAJOR = 24;

/**
 * A one-line warning when the running Node is below `NODE_MIN_MAJOR`, saying
 * what `consequence` may follow; undefined on a supported Node.
 */
export function nodeVersionWarning(consequence: string, nodeVersion: string = process.versions.node): string | undefined {
  const major = Number(nodeVersion.split('.')[0] ?? '0');
  if (major >= NODE_MIN_MAJOR) return undefined;
  return `Node ${nodeVersion} is too old; MDK needs Node >= ${NODE_MIN_MAJOR}, so ${consequence}.`;
}

export interface Environment {
  nodeVersion: string;
  nodeOk: boolean;
  packageManager: string;
  git: boolean;
  existingSpec: boolean;
  agentClient: string;
}

/**
 * Lightweight, generic environment detection for the onboarding wizard.
 * Nothing here is MDK-specific — it only inspects the current working directory
 * and the running Node process.
 */
export function detectEnvironment(cwd: string = process.cwd()): Environment {
  const nodeVersion = process.versions.node;
  const major = Number(nodeVersion.split('.')[0] ?? '0');

  let packageManager = 'npm';
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
  else if (existsSync(join(cwd, 'yarn.lock'))) packageManager = 'yarn';
  else if (existsSync(join(cwd, 'bun.lockb'))) packageManager = 'bun';

  let agentClient = 'none';
  if (existsSync(join(cwd, '.cursor'))) agentClient = 'cursor';
  else if (existsSync(join(cwd, '.claude'))) agentClient = 'claude';
  else if (existsSync(join(cwd, '.codex'))) agentClient = 'codex';
  else if (existsSync(join(cwd, '.cline'))) agentClient = 'cline';

  return {
    nodeVersion,
    nodeOk: major >= NODE_MIN_MAJOR,
    packageManager,
    git: existsSync(join(cwd, '.git')),
    existingSpec: existsSync(join(cwd, 'mdk.yaml')),
    agentClient,
  };
}
