import { describe, expect, it, vi } from 'vitest';
import type { Command } from 'commander';
import { buildProgram } from '../src/program.js';
import { pkg } from '../src/lib/pkg.js';
import { applyGlobalFlags, failureText } from '../src/lib/flags.js';

/** Stub commands that were removed; none may be registered or listed in help. */
const RETIRED_COMMANDS = ['get', 'describe', 'logs', 'discover', 'manifest', 'mcp'];

const helpOf = (...path: string[]): string => {
  let command: Command = buildProgram();
  for (const name of path) command = command.commands.find((c) => c.name() === name)!;
  return command.helpInformation();
};

describe('buildProgram', () => {
  it('names the program mdk and sets the version from package.json', () => {
    const program = buildProgram();
    expect(program.name()).toBe('mdk');
    expect(program.version()).toBe(pkg.version);
  });

  it('registers every implemented top-level command', () => {
    const program = buildProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toEqual(
      expect.arrayContaining([
        'onboard',
        'create',
        'add',
        'validate',
        'run',
        'status',
        'skill',
        'version',
      ]),
    );
  });

  it('does not register or list the retired stub commands', () => {
    const names = buildProgram().commands.map((c) => c.name());
    for (const stub of RETIRED_COMMANDS) {
      expect(names).not.toContain(stub);
    }
    expect(helpOf()).not.toMatch(new RegExp(`^ {2}(${RETIRED_COMMANDS.join('|')})\\b`, 'm'));
  });

  it('declares the global --output, --verbose and --debug options', () => {
    const program = buildProgram();
    const flags = program.options.map((o) => o.long);
    expect(flags).toEqual(expect.arrayContaining(['--output', '--verbose', '--debug']));
  });

  it('applies -v and --debug before the command runs', async () => {
    const saved = process.env.DEBUG;
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      delete process.env.DEBUG;
      const error = new Error('boom');
      await buildProgram().parseAsync(['node', 'mdk', 'version']);
      expect(failureText(error), 'without --debug: the message').toBe('boom');
      expect(process.env.DEBUG).toBeUndefined();

      await buildProgram().parseAsync(['node', 'mdk', 'version', '-v', '--debug']);
      expect(failureText(error), 'with --debug: the stack trace').toBe(error.stack);
      expect(process.env.DEBUG, "-v turns on the MDK components' debug logs").toBe('mdk:*');

      process.env.DEBUG = 'mdk:kernel*';
      await buildProgram().parseAsync(['node', 'mdk', '-v', 'version']);
      expect(process.env.DEBUG, 'a DEBUG the user set wins').toBe('mdk:kernel*');
      expect(failureText('not an Error')).toBe('not an Error');
    } finally {
      applyGlobalFlags({});
      if (saved === undefined) delete process.env.DEBUG;
      else process.env.DEBUG = saved;
      vi.restoreAllMocks();
    }
  });

  it('groups the top-level commands under headings', () => {
    const help = helpOf();
    expect(help).toContain('Usage: mdk <command> [options]');
    expect(help).toMatch(/Set up:\n {2}onboard[\s\S]*Build:\n {2}create[\s\S]*Run:\n {2}run[\s\S]*Auth:\n {2}rbac[\s\S]*Other:\n {2}skill/);
    expect(help).not.toMatch(/^Commands:/m);
  });

  it('describes arguments, hides unfinished flags and omits "(default: false)"', () => {
    const run = helpOf('run');
    expect(run).toMatch(/Arguments:\n {2}target/);
    expect(run).not.toContain('--detach');

    const create = helpOf('create', 'app');
    expect(create).toContain('--force');
    expect(create).not.toContain('(default: false)');

    expect(helpOf('add', 'worker')).toMatch(/source\s+An npm package/);
  });
});
