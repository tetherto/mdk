import { Command } from 'commander';
import { pkg } from './lib/pkg.js';
import { configureHelp, examples } from './lib/help.js';
import { registerOnboard } from './commands/onboard.js';
import { registerCreate } from './commands/create.js';
import { registerAdd } from './commands/add.js';
import { registerValidate } from './commands/validate.js';
import { registerRun } from './commands/run.js';
import { registerStatus } from './commands/inspect.js';
import { registerRbac } from './commands/rbac.js';
import { registerUser } from './commands/user.js';
import { registerSa } from './commands/sa.js';
import { registerSession } from './commands/session.js';
import { registerSkill } from './commands/agent.js';
import { registerVersion } from './commands/meta.js';

/** The help heading each top-level command is listed under. */
const HELP_GROUPS: Record<string, string> = {
  onboard: 'Set up:',
  create: 'Build:',
  add: 'Build:',
  validate: 'Build:',
  run: 'Run:',
  status: 'Run:',
  rbac: 'Auth:',
  user: 'Auth:',
  serviceaccount: 'Auth:',
  login: 'Auth:',
  logout: 'Auth:',
  whoami: 'Auth:',
  skill: 'Other:',
  version: 'Other:',
};

/**
 * Builds the full `mdk` command tree. Every command reads `mdk <verb> [noun]`.
 *
 * `onboard`, `create`, `add`, `validate`, `run`, `status`, `rbac`, `user`, `sa`,
 * `login`, `logout`, `whoami`, `skill add` and `version` are implemented.
 */
export function buildProgram(): Command {
  const program = configureHelp(new Command());

  program
    .name('mdk')
    .usage('<command> [options]')
    .description('Build, run and check an MDK stack: workers, apps, the Kernel and the Gateway.')
    .version(pkg.version, '--version', 'Print the CLI version')
    .option('-o, --output <fmt>', 'Output format for data: table | json | yaml', 'table')
    .option('-v, --verbose', 'Increase log detail', false)
    .option('--debug', 'Print stack traces for unexpected failures', false)
    .showHelpAfterError();

  registerOnboard(program);
  registerCreate(program);
  registerAdd(program);
  registerValidate(program);
  registerRun(program);
  registerStatus(program);
  registerRbac(program);
  registerUser(program);
  registerSa(program);
  registerSession(program);
  registerSkill(program);
  registerVersion(program);

  for (const command of program.commands) {
    const group = HELP_GROUPS[command.name()];
    if (group) command.helpGroup(group);
  }
  // Its own instance: the one the subcommands inherited stays under their `Commands:`.
  program.addHelpCommand(new Command('help').argument('[command]').description('Show help for a command').helpGroup('Other:'));

  program.addHelpText(
    'after',
    examples(
      'mdk onboard                              # new project: writes mdk.yaml',
      'mdk create app ops-center                # scaffold an app into apps/ops-center',
      'mdk add worker @your-org/mdk-worker-rig      # install a worker from npm',
      'mdk validate app ops-center              # check it before publishing',
      'mdk run                                  # start the Kernel, workers, apps and Gateway',
    ) + '\nRun `mdk <command> --help` for the options of a command.\n',
  );

  return program;
}
