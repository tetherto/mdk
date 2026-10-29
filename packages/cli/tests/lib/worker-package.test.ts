import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateWorker } from '../../src/lib/worker-package.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const TEMPLATE = resolve(__dirname, '..', '..', 'templates', 'worker');

function worker(): string {
  const dir = makeTmpDir();
  cpSync(TEMPLATE, dir, { recursive: true });
  const pkg = join(dir, 'package.json');
  writeFileSync(pkg, readFileSync(pkg, 'utf8').replaceAll('__WORKER_NAME__', 'demo-miner'));
  for (const file of ['mdk-contract.json', 'README.md']) {
    const path = join(dir, file);
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('__WORKER_NAME__', 'demo-miner'));
  }
  return dir;
}

afterEach(cleanupTmpDirs);

describe('validateWorker', () => {
  it('accepts the bundled worker template with no warnings: the scaffold is v1-native', () => {
    const result = validateWorker(worker());
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.name).toBe('demo-miner');
    expect(result.telemetry).toBeGreaterThan(0);
    expect(result.commands).toBeGreaterThan(0);
  });

  it('reports v1 gaps on a legacy contract as warnings, and as errors under strict', () => {
    const dir = worker();
    const file = join(dir, 'mdk-contract.json');
    const contract = JSON.parse(readFileSync(file, 'utf8'));
    delete contract.contractVersion;
    delete contract.capabilities.telemetry[0].unit;
    writeFileSync(file, JSON.stringify(contract));

    const legacy = validateWorker(dir);
    expect(legacy.errors).toEqual([]);
    expect(legacy.warnings.some((w) => w.includes("'contractVersion'"))).toBe(true);
    expect(legacy.warnings.some((w) => w.includes("'unit'"))).toBe(true);

    const strict = validateWorker(dir, { strict: true });
    expect(strict.warnings).toEqual([]);
    expect(strict.errors.some((e) => e.includes("'unit'"))).toBe(true);
  });

  it('reports a missing package.json and a missing contract together', () => {
    const dir = makeTmpDir();
    expect(validateWorker(dir).errors).toEqual([
      'package.json: not found',
      'mdk-contract.json: not found (a Worker Plugin has its contract at the package root)',
    ]);
  });

  it('reports an unreadable package.json and missing name/version', () => {
    const dir = worker();
    writeFileSync(join(dir, 'package.json'), '{ nope');
    expect(validateWorker(dir).errors[0]).toMatch(/^package\.json: /);
    writeFileSync(join(dir, 'package.json'), '{}');
    expect(validateWorker(dir).errors).toEqual([
      'package.json: "name" must be a non-empty string',
      'package.json: "version" must be a non-empty string',
    ]);
  });

  it('surfaces the loader error for a broken contract and a missing handler', () => {
    const dir = worker();
    writeFileSync(join(dir, 'mdk-contract.json'), '{ not json');
    expect(validateWorker(dir).errors[0]).toMatch(/^mdk-contract\.json: ERR_CONTRACT_INVALID_JSON/);

    const good = worker();
    rmSync(join(good, 'src', 'commands', 'reboot.js'));
    expect(validateWorker(good).errors[0]).toMatch(/^mdk-contract\.json: /);
  });

  it('reports every schema and semantic problem at once: unexpected key, missing bounds, duplicate name', () => {
    const dir = worker();
    const file = join(dir, 'mdk-contract.json');
    const contract = JSON.parse(readFileSync(file, 'utf8'));
    contract.transport = 'hrpc';
    contract.capabilities.commands[1].params.push({ name: 'watts', type: 'number' });
    contract.capabilities.telemetry.push({ ...contract.capabilities.telemetry[0] });
    writeFileSync(file, JSON.stringify(contract));

    const { errors } = validateWorker(dir);
    expect(errors.some((e) => e.includes('ERR_CONTRACT_UNEXPECTED') && e.includes("'transport'"))).toBe(true);
    expect(errors.some((e) => e.includes('ERR_CONTRACT_REQUIRED') && e.includes("'min'"))).toBe(true);
    expect(errors.some((e) => e.includes('ERR_CONTRACT_DUPLICATE_NAME'))).toBe(true);
  });

  it('refuses a contract that cannot do anything: no entries, params that are not a list, a handler that does not compile', () => {
    const edit = (dir: string, change: (contract: { capabilities: Record<string, unknown[]> }) => void) => {
      const file = join(dir, 'mdk-contract.json');
      const contract = JSON.parse(readFileSync(file, 'utf8'));
      change(contract);
      writeFileSync(file, JSON.stringify(contract));
      return dir;
    };

    expect(validateWorker(edit(worker(), (c) => { c.capabilities = {}; })).errors).toContain(
      'mdk-contract.json: declares no telemetry and no commands',
    );
    const params = validateWorker(edit(worker(), (c) => { (c.capabilities.commands[1] as { params: unknown }).params = 'mode'; }));
    expect(params.errors).toContain('mdk-contract.json: commands.setPowerMode.params must be a list');

    const dir = worker();
    writeFileSync(join(dir, 'src', 'telemetry', 'power.js'), 'module.exports = (\n');
    expect(validateWorker(dir).errors[0]).toMatch(/^mdk-contract\.json: telemetry\.power handler does not compile: /);
  });
});
