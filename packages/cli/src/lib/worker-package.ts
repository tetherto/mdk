import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { isMapping, message, readFile, syntaxError } from './app-package.js';

const require = createRequire(import.meta.url);

export const WORKER_CONTRACT = 'mdk-contract.json';

export interface WorkerValidation {
  errors: string[];
  /** v1 strictness gaps on a legacy contract (no contractVersion): report, don't fail. */
  warnings: string[];
  /** The package.json `name` / `version`, when readable. */
  name?: string;
  version?: string;
  telemetry: number;
  commands: number;
}

interface MdkWorkerLoader {
  loadContract(dir: string): {
    contract: { capabilities?: { commands?: Array<{ name?: string; params?: unknown }> } };
    entries: { telemetry: Map<string, string>; commands: Map<string, string> };
  };
  validateContract(
    contract: unknown,
    opts?: { dir?: string; semantic?: boolean; strict?: boolean },
  ): { ok: boolean; errors: string[]; warnings: string[] };
}

/**
 * Checks a worker package before it is run or published: a readable package.json with a
 * name and version, and a contract-first Worker Plugin — `mdk-contract.json` at the root,
 * validated against the runtime's mdk-contract.schema.json plus its semantic rules
 * (unique names, number-param bounds, handler files on disk) and by the Worker runtime's
 * own loader, with at least one entry, command params as lists, and every handler
 * compiling. None of them is executed.
 */
export function validateWorker(dir: string, opts: { strict?: boolean } = {}): WorkerValidation {
  const errors: string[] = [];
  const result: WorkerValidation = { errors, warnings: [], telemetry: 0, commands: 0 };
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    errors.push(`${dir}: not a directory`);
    return result;
  }

  const pkg = readFile(dir, 'package.json', JSON.parse, errors);
  if (isMapping(pkg)) {
    for (const key of ['name', 'version'] as const) {
      if (typeof pkg[key] === 'string' && pkg[key]) result[key] = pkg[key];
      else errors.push(`package.json: "${key}" must be a non-empty string`);
    }
  }

  if (!existsSync(join(dir, WORKER_CONTRACT))) {
    errors.push(`${WORKER_CONTRACT}: not found (a Worker Plugin has its contract at the package root)`);
    return result;
  }
  const loader = require('@tetherto/mdk-worker') as MdkWorkerLoader;

  // Schema + semantic conformance first: it reports every problem at once
  // (ERR_CONTRACT_*), where the loader below stops at the first. Unparseable
  // JSON is left to the loader so it keeps its ERR_CONTRACT_INVALID_JSON shape.
  let contractJson: unknown;
  try {
    contractJson = JSON.parse(readFileSync(join(dir, WORKER_CONTRACT), 'utf8'));
  } catch {
    contractJson = undefined;
  }
  if (contractJson !== undefined) {
    const validated = loader.validateContract(contractJson, { dir, strict: opts.strict });
    errors.push(...validated.errors.map((e) => `${WORKER_CONTRACT}: ${e}`));
    // A standalone install can resolve an older @tetherto/mdk-worker whose validator predates warnings.
    result.warnings.push(...(validated.warnings ?? []).map((w) => `${WORKER_CONTRACT}: ${w}`));
  }

  try {
    const { contract, entries } = loader.loadContract(dir);
    result.telemetry = entries.telemetry.size;
    result.commands = entries.commands.size;
    if (result.telemetry + result.commands === 0) {
      errors.push(`${WORKER_CONTRACT}: declares no telemetry and no commands`);
    }
    for (const command of contract.capabilities?.commands ?? []) {
      if (command.params !== undefined && !Array.isArray(command.params)) {
        errors.push(`${WORKER_CONTRACT}: commands.${command.name}.params must be a list`);
      }
    }
    for (const section of ['telemetry', 'commands'] as const) {
      for (const [name, file] of entries[section]) {
        const syntax = syntaxError(file);
        if (syntax) errors.push(`${WORKER_CONTRACT}: ${section}.${name} handler does not compile: ${syntax}`);
      }
    }
  } catch (error) {
    errors.push(`${WORKER_CONTRACT}: ${message(error)}`);
  }
  return result;
}
