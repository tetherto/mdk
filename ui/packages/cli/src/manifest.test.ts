import { Command } from 'commander'
import { describe, expect, it } from 'vitest'

import { buildManifest, MANIFEST_VERSION } from './manifest.js'

const buildSample = () => {
  const program = new Command()
  program.name('sample').description('Sample CLI for tests.')

  program
    .command('ping')
    .description('Reply with pong.')
    .option('--loud', 'Shout the reply')
    .option('--count <n>', 'How many pongs', '1')

  const group = program.command('group').description('Grouped commands.')
  group
    .command('page <name>')
    .description('Generate a page.')
    .requiredOption('-c, --component <C>', 'Component name')

  return program
}

describe('buildManifest', () => {
  it('captures top-level commands, options and nested subcommands', () => {
    const manifest = buildManifest(buildSample())

    expect(manifest.version).toBe(MANIFEST_VERSION)
    expect(manifest.bin).toBe('sample')
    expect(manifest.description).toBe('Sample CLI for tests.')
    expect(manifest.commands.map((c) => c.name)).toEqual(['ping', 'group'])

    const ping = manifest.commands.find((c) => c.name === 'ping')
    expect(ping?.options).toHaveLength(2)
    expect(ping?.options[0]).toMatchObject({ flags: '--loud', mandatory: false, takesValue: false })
    expect(ping?.options[1]).toMatchObject({
      flags: '--count <n>',
      defaultValue: '1',
      mandatory: false,
      takesValue: true,
    })
  })

  it('flags requiredOption() as mandatory and records positional arguments', () => {
    const manifest = buildManifest(buildSample())
    const group = manifest.commands.find((c) => c.name === 'group')
    const page = group?.subcommands[0]

    expect(page?.name).toBe('page')
    expect(page?.arguments).toEqual([{ name: 'name', required: true, variadic: false }])
    expect(page?.options[0]).toMatchObject({
      flags: '-c, --component <C>',
      mandatory: true,
      takesValue: true,
    })
  })

  it('replaces the build machine cwd with the <cwd> placeholder', () => {
    const program = new Command()
    program.name('sample').description('d')
    program.command('run').description('r').option('--cwd <dir>', 'wd', process.cwd())

    const manifest = buildManifest(program)
    expect(manifest.commands[0]?.options[0]?.defaultValue).toBe('<cwd>')
  })

  it('coerces numeric defaultValue to a string', () => {
    const program = new Command()
    program.name('sample').description('d')
    program.command('run').description('r').option('--count <n>', 'count', 5)

    const manifest = buildManifest(program)
    expect(manifest.commands[0]?.options[0]?.defaultValue).toBe('5')
  })

  it('omits defaultValue when none is set', () => {
    const program = new Command()
    program.name('sample').description('d')
    program.command('run').description('r').option('--flag', 'flag')

    const manifest = buildManifest(program)
    expect(manifest.commands[0]?.options[0]?.defaultValue).toBeUndefined()
  })
})
