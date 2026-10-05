import type { Command } from 'commander';
import { resolve } from 'node:path';
import { stub } from '../lib/stub.js';
import { installSkill, type SkillClient } from '../lib/skill.js';

const SKILL_CLIENTS = new Set<SkillClient>(['cursor', 'claude', 'all']);

// Group F — Agent enablement
export function registerSkill(program: Command): void {
  const skill = program
    .command('skill')
    .description('Coding-agent skill management');

  skill
    .command('add')
    .description('Install the MDK Developer Skill suite into the project')
    .option('--client <client>', 'Target client: cursor | claude | all', 'all')
    .option('--dir <path>', 'Target project directory', '.')
    .action((opts: { client: string; dir: string }) => {
      const client = opts.client as SkillClient;
      if (!SKILL_CLIENTS.has(client)) {
        process.stderr.write(`mdk skill add: unknown client '${opts.client}' — use cursor | claude | all\n`);
        process.exitCode = 1;
        return;
      }
      const result = installSkill(client, resolve(opts.dir));
      if (!result.ok) {
        process.stderr.write(`mdk skill add: ${result.message}\n`);
        if (result.detail) process.stderr.write(`${result.detail}\n`);
        process.exitCode = 1;
        return;
      }
      if (result.message) process.stdout.write(`${result.message}\n`);
      process.stderr.write('MDK Developer Skill installed.\n');
    });
}

export function registerMcp(program: Command): void {
  const mcp = program
    .command('mcp')
    .description('MCP registration for coding-agent clients (stub)');

  mcp
    .command('register')
    .description('Register the MCP endpoint in the client config (stub)')
    .action(() => stub('mcp register'));
}
