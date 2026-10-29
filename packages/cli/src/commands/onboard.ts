import type { Command } from 'commander';
import { examples } from '../lib/help.js';
import {
  intro,
  outro,
  text,
  select,
  multiselect,
  confirm,
  spinner,
  note,
  log,
  isCancel,
  cancel,
} from '@clack/prompts';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { stringify as toYaml } from 'yaml';
import { detectEnvironment, NODE_MIN_MAJOR } from '../lib/detect.js';
import { buildStackSpec, isLocalPackagePath } from '../lib/spec.js';
import {
  findCatalogApp,
  findCatalogWorker,
  resolveCatalogPackage,
  APP_CATALOG,
  WORKER_CATALOG,
  type CatalogEntry,
} from '../lib/catalog.js';
import { installSkill as installSkillSuite, type SkillClient } from '../lib/skill.js';
import { installDeps, installPackages } from '../lib/npm.js';
import {
  applySetupAnswers,
  applySetupAnswersToStackFile,
  externalizeSecrets,
  promptSetup,
  readSetupQuestions,
} from '../lib/plugin-setup.js';
import { writeProjectEnv } from '../lib/env-file.js';
import { validateApp } from '../lib/app-package.js';
import { grantApp } from '../lib/rbac.js';
import { resolveProjectPackageDir } from '../lib/runtime.js';
import { createDashboard, dashboardNameFromStack } from '../lib/dashboard.js';
import {
  addFileDependency,
  ensureProjectGitignore,
  ensureProjectManifest,
  ensureProjectReadme,
} from '../lib/project.js';
import { theme, badge, banner, kvBlock, cmdBlock, tick } from '../lib/theme.js';
import { pkg } from '../lib/pkg.js';
import { NAME_RE } from '../lib/names.js';

const AGENT_CLIENTS = [
  { value: 'cursor', label: 'Cursor' },
  { value: 'claude', label: 'Claude Code' },
  { value: 'all', label: 'Both (Cursor + Claude)' },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bail(): never {
  cancel('Onboarding cancelled — no files were changed.');
  process.exit(0);
}

/** Lightweight section divider so related prompts read as a group. */
function section(title: string): void {
  log.step(theme.brand(title));
}

function shortLabel(pkgName: string): string {
  return pkgName.split('/').pop() ?? pkgName;
}

// Group A — Onboarding & project lifecycle
export function registerOnboard(program: Command): void {
  program
    .command('onboard')
    .summary('Set up a new MDK project interactively')
    .description(
      'Set up a new MDK project interactively: checks the environment, asks which workers, apps and ' +
        'dashboard to include, writes mdk.yaml and package.json, and prints the commands to run it. ' +
        'Needs an interactive terminal.',
    )
    .addHelpText('after', examples('mdk onboard'))
    .action(runOnboard);
}

async function runOnboard(): Promise<void> {
  if (!process.stdin.isTTY) {
    process.stderr.write('mdk onboard needs an interactive terminal (TTY).\n');
    process.exit(1);
  }

  console.log(banner());
  intro(`${badge('MDK')}  ${theme.brand('developer onboarding')}  ${theme.muted(`v${pkg.version}`)}`);
  log.message(
    theme.muted('A few quick questions — each has a sensible default. Press Enter to accept.'),
  );

  // 1. Detect environment ---------------------------------------------------
  const s = spinner();
  s.start('Detecting environment');
  await delay(500);
  const env = detectEnvironment();
  s.stop(`${tick} Environment detected`);

  note(
    kvBlock([
      [
        'Node',
        env.nodeOk ? theme.ok(env.nodeVersion) : theme.warn(`${env.nodeVersion} (need >= ${NODE_MIN_MAJOR})`),
      ],
      ['Package manager', theme.value(env.packageManager)],
      ['Git repo', env.git ? theme.ok('yes') : theme.muted('no')],
      ['Existing spec', env.existingSpec ? theme.warn('mdk.yaml present') : theme.muted('none')],
      ['Agent client', env.agentClient === 'none' ? theme.muted('none') : theme.ok(env.agentClient)],
    ]),
    theme.accent('environment'),
  );

  // 2. Project --------------------------------------------------------------
  section('Project');

  const projectDir = await text({
    message: 'Project directory',
    placeholder: '.',
    defaultValue: '.',
    initialValue: '.',
  });
  if (isCancel(projectDir)) bail();

  // The stack name becomes `<stack>-dashboard`, a folder and package name, so it
  // is held to the same rule as worker/plugin/app names.
  const stackNameInput = await text({
    message: 'Stack name',
    placeholder: 'my-stack',
    defaultValue: 'my-stack',
    initialValue: 'my-stack',
    validate: (v) =>
      !v?.trim() || NAME_RE.test(v.trim())
        ? undefined
        : "Use lowercase letters, digits, '.', '_' or '-' (starting with a letter or digit).",
  });
  if (isCancel(stackNameInput)) bail();
  const stackName = (stackNameInput as string).trim() || 'my-stack';

  // 3. Runtime — fixed defaults, not prompted --------------------------------
  // Ports land in `mdk.yaml`, but are not a real upfront decision: whether you
  // run everything together (`mdk run`) or split it across terminals
  // (`mdk run kernel` / `gateway` / `worker <name>`) is just which command(s)
  // you type later, not a spec setting. Custom ports are a one-line edit to
  // `mdk.yaml` if the defaults ever collide with something.
  const gatewayPort = 3847;
  const kernelPort = 3848;
  const workerBasePort = 3850;

  // 4. Workers and apps -----------------------------------------------------
  section('Workers and apps');

  // Nothing to offer while the worker catalog is empty — skip the prompt rather
  // than show a multiselect with no options.
  let workerPackages: string[] | symbol = [];
  if (WORKER_CATALOG.length > 0) {
    workerPackages = await multiselect({
      message: 'Worker plugins to install',
      options: WORKER_CATALOG.map(({ value, label, hint }) => ({ value, label, hint })),
      required: false,
    });
    if (isCancel(workerPackages)) bail();
  }

  // A bundled worker is only runnable from an MDK checkout — its device mock
  // loads a framework that sits beside it in the source tree. Say so now rather
  // than letting `mdk run` fail on a package that was never installable.
  for (const pkg of workerPackages as string[]) {
    const entry = findCatalogWorker(pkg);
    if (entry && resolveCatalogPackage(entry).unavailable) {
      log.warn(
        `${shortLabel(pkg)} ships with the MDK source tree, which is not present here — ` +
          'so it cannot be linked, and installing it from the registry will fail.',
      );
    }
  }

  const appPackages = await multiselect({
    message: 'Apps to install',
    options: APP_CATALOG.map(({ value, label, hint }) => ({ value, label, hint })),
    required: false,
  });
  if (isCancel(appPackages)) bail();

  for (const pkg of appPackages as string[]) {
    const entry = findCatalogApp(pkg);
    if (entry && resolveCatalogPackage(entry).unavailable) {
      log.warn(
        `${shortLabel(pkg)} ships with the MDK source tree, which is not present here — ` +
          'so it cannot be linked, and installing it from the registry will fail.',
      );
    }
  }

  // Bundled apps' manifests are readable from the checkout before any
  // install, so their setup questions are asked now and the answers (defaults
  // included) are part of mdk.yaml from the first write — each app's
  // answers under its own `spec.apps[].config` block, the spec the
  // source of truth and the app's built-in defaults only a fallback.
  const pluginConfigs: Record<string, Record<string, unknown>> = {};
  // Secret answers, held until the project files are written (cancelling must
  // leave nothing on disk); mdk.yaml only gets `${MDK_<PLUGIN>_<KEY>}` placeholders.
  const pendingSecrets: Record<string, string> = {};
  const askedUpfront = new Set<string>();
  for (const pkg of appPackages as string[]) {
    const entry = findCatalogApp(pkg);
    const resolved = entry ? resolveCatalogPackage(entry) : undefined;
    if (!resolved?.bundled || !resolved.checkoutDir) continue;
    let questions;
    try {
      questions = readSetupQuestions(resolved.checkoutDir);
    } catch {
      continue; // malformed manifest — surfaces at load time, not here
    }
    if (!questions.length) continue;
    section(`${shortLabel(pkg)} setup`);
    const { answers, env: secrets } = externalizeSecrets(pkg, questions, await promptSetup(questions, bail));
    Object.assign(pendingSecrets, secrets);
    pluginConfigs[pkg] = applySetupAnswers({}, answers);
    askedUpfront.add(pkg);
  }

  // 5. Developer experience -------------------------------------------------
  section('Developer experience');

  const addUi = await confirm({
    message: 'Add the UI dashboard (MDK UI shell)?',
    initialValue: true,
  });
  if (isCancel(addUi)) bail();

  const installSkill = await confirm({
    message: 'Install the MDK Developer Skill (makes your coding agent MDK-aware)?',
    initialValue: true,
  });
  if (isCancel(installSkill)) bail();

  let client: string =
    env.agentClient === 'cursor' || env.agentClient === 'claude' ? env.agentClient : 'all';
  if (installSkill) {
    const picked = await select({
      message: 'Coding-agent client',
      options: AGENT_CLIENTS,
      initialValue: client,
    });
    if (isCancel(picked)) bail();
    client = picked as string;
  }

  // 6. Build spec + review --------------------------------------------------
  const spec = buildStackSpec({
    stackName,
    gatewayPort,
    kernelPort,
    workerBasePort,
    workerPackages: workerPackages as string[],
    appPackages: appPackages as string[],
    pluginConfigs,
  });
  const workers = spec.spec.workers;

  const targetDir = resolve(projectDir as string);
  const specPath = resolve(targetDir, 'mdk.yaml');
  const specExists = existsSync(specPath);

  // Summarise by what the user picked, not by the resolved `package` — a bundled
  // worker resolves to a checkout path, which is noise in a review panel.
  const workerSummary = (workerPackages as string[]).length
    ? (workerPackages as string[])
        .map((pkg) => {
          const entry = findCatalogWorker(pkg);
          const bundled = entry ? resolveCatalogPackage(entry).bundled : false;
          return bundled ? `${shortLabel(pkg)} ${theme.muted('(bundled, with mock)')}` : shortLabel(pkg);
        })
        .join(', ')
    : theme.muted('none');
  const appSummary = (appPackages as string[]).length
    ? (appPackages as string[])
        .map((pkg) => {
          const entry = findCatalogApp(pkg);
          const bundled = entry ? resolveCatalogPackage(entry).bundled : false;
          return bundled ? `${shortLabel(pkg)} ${theme.muted('(bundled)')}` : shortLabel(pkg);
        })
        .join(', ')
    : theme.muted('none');

  note(
    kvBlock([
      ['Stack', theme.value(stackName)],
      ['Ports', theme.value(`gateway ${gatewayPort} · kernel ${kernelPort} · workers ${workerBasePort}+`)],
      ['Workers', workerSummary],
      ['Apps', appSummary],
      ['UI dashboard', addUi ? theme.ok('yes') : theme.muted('no')],
      ['Developer Skill', installSkill ? theme.ok(`yes (${client})`) : theme.muted('no')],
      ['Spec file', specExists ? theme.warn(`${specPath} (overwrite)`) : theme.value(specPath)],
    ]),
    theme.accent('review'),
  );

  const proceed = await confirm({
    message: specExists
      ? 'Overwrite mdk.yaml with these settings?'
      : 'Write mdk.yaml with these settings?',
    initialValue: true,
  });
  if (isCancel(proceed) || !proceed) bail();

  // 7. Write the project files ----------------------------------------------
  const w = spinner();
  w.start('Writing project files');
  await delay(400);
  try {
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(specPath, toYaml(spec), 'utf8');
    const manifest = ensureProjectManifest(targetDir, stackName);
    const gitignore = ensureProjectGitignore(targetDir);
    if (Object.keys(pendingSecrets).length) writeProjectEnv(targetDir, pendingSecrets);
    w.stop(`${tick} Wrote ${theme.value(specPath)}`);
    if (manifest !== 'present') {
      log.message(
        theme.muted('Created package.json — path-backed packages use relative file: deps'),
      );
    }
    if (gitignore !== 'present') {
      log.message(
        theme.muted(
          `${gitignore === 'created' ? 'Created' : 'Updated'} .gitignore — ignores .mdk/ runtime state`,
        ),
      );
    }
  } catch (error) {
    w.stop(theme.warn('Could not write the project files'));
    log.error(error instanceof Error ? error.message : String(error));
    bail();
  }

  // 8. Side-effects ---------------------------------------------------------
  // Install the selected plugins so the runtime can resolve them from the
  // project's node_modules. A bundled package is path-backed with a relative
  // `file:` dependency to its checkout (inside or outside the project folder);
  // no checkout path is written into `workspaces`. `npm install` links it into
  // `node_modules` under the package name; no `workers/<name>`/`apps/<name>`
  // folder is created (those are only for packages the user owns via
  // `mdk create`). Registry packages install normally. Local-path packages
  // (scaffolded workers) are skipped — they are linked by `file:` deps from
  // `mdk create` instead. Best-effort: a failed install is a warning, never a
  // hard stop (the spec is already valid).
  const registryPackages: string[] = [];
  let linkedBundled = false;

  const selections: Array<[string, CatalogEntry | undefined]> = [
    ...spec.spec.workers.map((wk): [string, CatalogEntry | undefined] => [
      wk.package,
      findCatalogWorker(wk.package),
    ]),
    ...spec.spec.apps.map((a): [string, CatalogEntry | undefined] => [
      a.package,
      findCatalogApp(a.package),
    ]),
  ];

  for (const [pkgName, entry] of selections) {
    if (entry) {
      const resolved = resolveCatalogPackage(entry);
      if (resolved.bundled && resolved.checkoutDir) {
        try {
          addFileDependency(targetDir, pkgName, resolved.checkoutDir);
          linkedBundled = true;
        } catch (error) {
          log.warn(
            `Could not link ${shortLabel(pkgName)}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        continue;
      }
    }
    if (!isLocalPackagePath(pkgName)) registryPackages.push(pkgName);
  }
  const npmPlugins = [...new Set(registryPackages)];
  const needsInstall = linkedBundled || npmPlugins.length > 0;

  if (needsInstall) {
    const count = (linkedBundled ? 1 : 0) + npmPlugins.length;
    log.step(theme.brand(`Installing ${count} package${count === 1 ? '' : 's'}`));
    const result = npmPlugins.length
      ? installPackages(targetDir, npmPlugins)
      : installDeps(targetDir);
    if (result.ok) {
      log.success(`${tick} Packages installed`);
    } else {
      log.warn(`Package install skipped: ${result.message}`);
      log.message(
        theme.muted(
          npmPlugins.length
            ? `Install manually: npm install ${npmPlugins.join(' ')}`
            : 'Install manually: npm install',
        ),
      );
    }
  }

  // The spec above binds the CLI and the Gateway; each app gets its own grant
  // from its mdk-app.yaml, as `mdk add app` writes it, so the first `mdk run`
  // finds it granted. An app that is not installed is granted by `mdk rbac init`.
  for (const app of spec.spec.apps) {
    let permissions: unknown[];
    try {
      const { manifest, errors } = validateApp(resolveProjectPackageDir(targetDir, app.package));
      if (errors.length) {
        log.warn(`${shortLabel(app.package)} is not granted in spec.rbac (${errors[0]}); fix it, then run \`mdk rbac init\`.`);
        continue;
      }
      permissions = manifest.permissions ?? [];
    } catch {
      continue;
    }
    // The spec was just written, so the role is new: what can still refuse is the
    // app itself, a name that is a Kernel resource or permissions the policy cannot grant.
    try {
      grantApp(targetDir, app.name, permissions);
    } catch (error) {
      log.warn(`${shortLabel(app.package)} is not granted in spec.rbac (${(error instanceof Error ? error.message : String(error)).split('\n')[0]}); fix it, then run \`mdk rbac init\`.`);
    }
  }

  // Registry-installed apps may declare their own setup questions —
  // only readable now that their packages are in node_modules. Answers are
  // patched into the already-written mdk.yaml under the app's own entry in
  // `spec.apps[].config`. Bundled apps were asked before the
  // spec was written.
  for (const pluginPkg of spec.spec.apps.map((a) => a.package)) {
    if (askedUpfront.has(pluginPkg)) continue;
    let questions;
    try {
      questions = readSetupQuestions(resolveProjectPackageDir(targetDir, pluginPkg));
    } catch {
      continue; // not installed or malformed manifest — nothing to ask
    }
    if (!questions.length) continue;
    section(`${shortLabel(pluginPkg)} setup`);
    const { answers, env: secrets } = externalizeSecrets(
      pluginPkg,
      questions,
      await promptSetup(questions, bail),
    );
    if (Object.keys(secrets).length) {
      try {
        writeProjectEnv(targetDir, secrets);
      } catch (error) {
        log.warn(`Could not write ${shortLabel(pluginPkg)} secrets to .env: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (Object.keys(answers).length && !applySetupAnswersToStackFile(targetDir, pluginPkg, answers)) {
      log.warn(`Could not write ${shortLabel(pluginPkg)} setup answers to mdk.yaml — add them manually under its config in spec.apps.`);
    }
  }

  if (installSkill) {
    const sk = spinner();
    sk.start(`Installing MDK Developer Skill (${client})`);
    const result = installSkillSuite(client as SkillClient, targetDir);
    if (result.ok) {
      sk.stop(`${tick} Developer Skill installed`);
      if (result.message) log.message(theme.muted(result.message));
      if (result.detail) log.message(theme.muted(result.detail));
      if (result.warning) log.warn(result.warning);
    } else {
      sk.stop(theme.warn(`Skill install skipped: ${result.message}`));
      if (result.detail) log.message(theme.muted(result.detail));
    }
  } else {
    log.message(theme.muted('Skipped skill install. Later: mdk skill add'));
  }

  let dashboardPath: string | undefined;
  if (addUi) {
    const ui = spinner();
    ui.start('Downloading UI dashboard (MDK UI shell)');
    const result = await createDashboard({
      name: dashboardNameFromStack(stackName),
      parentDir: targetDir,
    });
    if (result.ok) {
      dashboardPath = result.appPath;
      ui.stop(`${tick} UI dashboard scaffolded${dashboardPath ? ` at ${theme.value(dashboardPath)}` : ''}`);
    } else {
      ui.stop(theme.warn(`UI dashboard skipped: ${result.message}`));
      if (result.detail) log.message(theme.muted(result.detail));
    }
  }

  // The README documents the layout, so it is written last — once it is known
  // whether this project has a dashboard.
  const readme = ensureProjectReadme(targetDir, {
    stackName,
    workerNames: workers.map((wk) => wk.name),
    dashboardDir: dashboardPath ? relative(targetDir, dashboardPath) : undefined,
  });
  if (readme === 'created') {
    log.message(theme.muted('Created README.md — project layout and commands'));
  }

  // 9. Next steps -----------------------------------------------------------
  const runRows: Array<[string, string?]> = [
    ['mdk run', 'boots Kernel, workers, apps and Gateway together'],
  ];
  const perComponentHint = workers.length
    ? workers.map((wk) => `mdk run worker ${wk.name}`).join(' · ')
    : 'mdk run worker <name>';

  // A worker is bootable only once its devices are declared. Bundled workers were
  // seeded with one already, so the spec is runnable as written — tell the user
  // which of the two situations they are in.
  const seeded = workers.filter((wk) => Array.isArray((wk.config as { devices?: unknown }).devices));
  const specHint =
    seeded.length === workers.length && workers.length > 0
      ? `${seeded.length === 1 ? 'a seed device is' : 'seed devices are'} already declared — runnable as-is`
      : 'add devices & plugin config, then save';

  const parts = [
    theme.label('1. Review your spec'),
    cmdBlock([['mdk.yaml', specHint]]),
    '',
    theme.label('2. Start the stack'),
    cmdBlock(runRows),
    theme.muted(`Or separately: mdk run kernel · ${perComponentHint} · mdk run app <name> · mdk run gateway`),
    '',
    theme.label('3. Manage it'),
    cmdBlock([
      ['mdk status', 'check the stack'],
      ['mdk create worker', 'scaffold a new worker plugin'],
      ['mdk create app', 'scaffold a new app (HTTP routes over your devices)'],
    ]),
  ];
  if (dashboardPath) {
    const rel = relative(process.cwd(), dashboardPath) || dashboardPath;
    parts.push(
      '',
      theme.label('4. Start the dashboard'),
      cmdBlock([[`cd ${rel}`], ['npm run dev', 'dependencies are already installed']]),
    );
  }

  note(parts.join('\n'), theme.accent('next steps'));

  outro(`${tick} ${theme.brand('MDK is ready.')} ${theme.muted('Happy building.')}`);
}
