import type { Command, Option } from 'commander'

/**
 * Schema version of the emitted `dist/cli-manifest.json`. Bump on
 * breaking changes so agents can pin to a known shape.
 */
export const MANIFEST_VERSION = '1.0.0'

export type ManifestOption = {
  flags: string
  description: string
  /**
   * Default value as a JSON-serialisable scalar. Runtime defaults that
   * depend on the invocation environment (e.g. `process.cwd()`) are
   * replaced with placeholder strings so the manifest is reproducible.
   */
  defaultValue?: string | boolean
  /** True when the option itself must be supplied (commander `.requiredOption`). */
  mandatory: boolean
  /** True when the option flag expects a value (e.g. `--cwd <dir>`). */
  takesValue: boolean
}

export type ManifestCommand = {
  name: string
  description: string
  usage: string
  aliases: string[]
  arguments: Array<{ name: string; required: boolean; variadic: boolean }>
  options: ManifestOption[]
  subcommands: ManifestCommand[]
}

export type CliManifest = {
  version: string
  bin: string
  description: string
  commands: ManifestCommand[]
}

const CWD = process.cwd()

const formatDefaultValue = (raw: unknown): string | boolean | undefined => {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    // Replace the build-machine's working directory with a placeholder so
    // the manifest stays portable across machines.
    if (raw === CWD) return '<cwd>'
    return raw
  }
  return String(raw)
}

type CommanderOption = Option & { mandatory?: boolean }

const collectOptions = (cmd: Command): ManifestOption[] =>
  cmd.options.map((opt: CommanderOption) => ({
    flags: opt.flags,
    description: opt.description ?? '',
    defaultValue: formatDefaultValue(opt.defaultValue),
    mandatory: Boolean(opt.mandatory),
    takesValue: Boolean(opt.required),
  }))

type CommanderArg = {
  _name?: string
  name?: () => string
  required?: boolean
  variadic?: boolean
}

const collectArguments = (cmd: Command): ManifestCommand['arguments'] => {
  // commander 12 exposes args via `registeredArguments`; older shapes used
  // `_args`. We accept either to stay compatible with future bumps.
  const raw = cmd as unknown as { registeredArguments?: CommanderArg[]; _args?: CommanderArg[] }
  const list = raw.registeredArguments ?? raw._args ?? []
  return list.map((a) => {
    const name = typeof a.name === 'function' ? a.name() : (a._name ?? '')
    return {
      name,
      required: Boolean(a.required),
      variadic: Boolean(a.variadic),
    }
  })
}

const buildCommand = (cmd: Command): ManifestCommand => ({
  name: cmd.name(),
  description: cmd.description(),
  usage: cmd.usage(),
  aliases: cmd.aliases(),
  arguments: collectArguments(cmd),
  options: collectOptions(cmd),
  subcommands: cmd.commands.map(buildCommand),
})

/**
 * Walks the `commander` Program and returns a flat JSON manifest of every
 * registered command — including nested subcommands like `add page`.
 *
 * Agents can read this from `@tetherto/mdk-ui-cli/cli-manifest.json` to
 * discover the entire CLI surface without spawning the binary or parsing
 * `--help` output.
 */
export const buildManifest = (program: Command): CliManifest => ({
  version: MANIFEST_VERSION,
  bin: program.name(),
  description: program.description(),
  commands: program.commands.map(buildCommand),
})
