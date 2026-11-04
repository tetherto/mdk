import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { installSkills, CLIENT_DIRS } from '../src/index.mjs'

const quiet = { onWarn: () => {} }

describe('installSkills', () => {
  let root
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-install-')) })
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }) })

  it('installs into an empty project', () => {
    const r = installSkills({ client: 'claude', target: root, ...quiet })
    assert.ok(r.skills.includes('mdk'))
    assert.deepEqual(r.skipped, [])
    assert.ok(fs.existsSync(path.join(root, '.claude', 'skills', 'mdk', 'SKILL.md')))
  })

  it('replaces an existing suite skill', () => {
    installSkills({ client: 'claude', target: root, ...quiet })
    const stale = path.join(root, '.claude', 'skills', 'mdk', 'stale.txt')
    fs.writeFileSync(stale, 'old')
    const r = installSkills({ client: 'claude', target: root, ...quiet })
    assert.deepEqual(r.skipped, [])
    assert.equal(fs.existsSync(stale), false)
  })

  it('keeps a same-named skill without the suite marker and warns', () => {
    const own = path.join(root, '.claude', 'skills', 'mdk')
    fs.mkdirSync(own, { recursive: true })
    fs.writeFileSync(path.join(own, 'SKILL.md'), '---\nname: mdk\ndescription: mine\n---\nmine\n')
    const warnings = []
    const r = installSkills({ client: 'claude', target: root, onWarn: (m) => warnings.push(m) })
    assert.equal(fs.readFileSync(path.join(own, 'SKILL.md'), 'utf8'), '---\nname: mdk\ndescription: mine\n---\nmine\n')
    assert.deepEqual(r.skipped.map((s) => s.skill), ['mdk'])
    assert.equal(warnings.length, 1)
    assert.ok(fs.existsSync(path.join(root, '.claude', 'skills', 'mdk-worker', 'SKILL.md')))
  })

  it('refuses a symlinked client dir', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-outside-'))
    try {
      fs.symlinkSync(outside, path.join(root, '.claude'))
      assert.throws(() => installSkills({ client: 'claude', target: root, ...quiet }), /symlink/)
      assert.deepEqual(fs.readdirSync(outside), [])
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })

  it('refuses a symlinked skills dir', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-outside-'))
    try {
      fs.mkdirSync(path.join(root, '.cursor'))
      fs.symlinkSync(outside, path.join(root, '.cursor', 'skills'))
      assert.throws(() => installSkills({ client: 'cursor', target: root, ...quiet }), /symlink/)
      assert.deepEqual(fs.readdirSync(outside), [])
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })

  it('follows symlinked skills dirs that stay inside the project, as in the monorepo', () => {
    // The monorepo layout: one real skills/ with hand-written skills, and each
    // client's skills dir a relative link to it.
    const real = path.join(root, 'skills')
    fs.mkdirSync(path.join(real, 'my-own'), { recursive: true })
    fs.writeFileSync(path.join(real, 'my-own', 'SKILL.md'), USER)
    for (const c of ['.claude', '.cursor']) {
      fs.mkdirSync(path.join(root, c))
      fs.symlinkSync('../skills', path.join(root, c, 'skills'))
    }
    const r = installSkills({ client: 'all', target: root, ...quiet })
    const realRoot = fs.realpathSync(root)
    assert.deepEqual(r.installed.map((i) => i.dir), [path.join(realRoot, 'skills'), path.join(realRoot, 'skills')])
    assert.ok(fs.existsSync(path.join(real, 'mdk', 'SKILL.md')))
    assert.equal(fs.readFileSync(path.join(real, 'my-own', 'SKILL.md'), 'utf8'), USER)
    assert.ok(fs.lstatSync(path.join(root, '.claude', 'skills')).isSymbolicLink())
  })

  it('refuses a dangling symlinked skills dir', () => {
    fs.mkdirSync(path.join(root, '.claude'))
    fs.symlinkSync('../missing', path.join(root, '.claude', 'skills'))
    assert.throws(() => installSkills({ client: 'claude', target: root, ...quiet }), /dangling symlink/)
  })

  it('refuses a symlinked skills dir that points at a file inside the project', () => {
    fs.writeFileSync(path.join(root, 'notes.txt'), 'x')
    fs.mkdirSync(path.join(root, '.claude'))
    fs.symlinkSync('../notes.txt', path.join(root, '.claude', 'skills'))
    assert.throws(() => installSkills({ client: 'claude', target: root, ...quiet }), /not a directory/)
  })

  it('refuses an inside symlink that hops back out of the project', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-outside-'))
    try {
      fs.symlinkSync(outside, path.join(root, 'escape'))
      fs.mkdirSync(path.join(root, '.claude'))
      fs.symlinkSync('../escape', path.join(root, '.claude', 'skills'))
      assert.throws(() => installSkills({ client: 'claude', target: root, ...quiet }), /leaves the project/)
      assert.deepEqual(fs.readdirSync(outside), [])
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })

  it('skips a symlinked skill dir without touching its target', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-outside-'))
    try {
      fs.writeFileSync(path.join(outside, 'keep.txt'), 'x')
      fs.mkdirSync(path.join(root, '.claude', 'skills'), { recursive: true })
      fs.symlinkSync(outside, path.join(root, '.claude', 'skills', 'mdk'))
      const r = installSkills({ client: 'claude', target: root, ...quiet })
      assert.deepEqual(r.skipped.map((s) => s.reason), ['is a symlink'])
      assert.deepEqual(fs.readdirSync(outside), ['keep.txt'])
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })
})

const STAMPED = '---\nname: x\nmetadata:\n  suite: mdk-developer-skill\n  mdk_version: "0.0.0"\n---\n# old\n'
const USER = '---\nname: mdk-mine\ndescription: user-authored\n---\n# mine\n'

describe('installSkills stale sweep', () => {
  let target
  before(() => { target = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-install-')) })
  after(() => { fs.rmSync(target, { recursive: true, force: true }) })

  it('sweeps stale MDK-shipped skills and leaves user-authored skills alone', () => {
    const dir = path.join(target, ...CLIENT_DIRS.claude)
    fs.mkdirSync(path.join(dir, 'mdk-renamed-away'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'mdk-renamed-away', 'SKILL.md'), STAMPED)
    fs.mkdirSync(path.join(dir, 'mdk-mine'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'mdk-mine', 'SKILL.md'), USER)
    fs.mkdirSync(path.join(dir, 'no-skill-md'), { recursive: true })

    const { skills, installed } = installSkills({ client: 'claude', target, ...quiet })

    assert.ok(skills.includes('mdk'))
    assert.deepEqual(installed[0].removed, ['mdk-renamed-away'])
    assert.equal(fs.existsSync(path.join(dir, 'mdk-renamed-away')), false)
    assert.equal(fs.existsSync(path.join(dir, 'mdk-mine', 'SKILL.md')), true)
    assert.equal(fs.existsSync(path.join(dir, 'no-skill-md')), true)
    for (const s of skills) assert.equal(fs.existsSync(path.join(dir, s, 'SKILL.md')), true)
  })

  it('reports nothing removed on a clean rerun', () => {
    const { installed } = installSkills({ client: 'claude', target, ...quiet })
    assert.deepEqual(installed[0].removed, [])
  })
})

describe('assembled skill links', () => {
  const dist = path.join(import.meta.dirname, '..', 'dist', 'skills')
  const walk = (d) => fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n)
    return fs.statSync(p).isDirectory() ? walk(p) : [p]
  })

  it('leaves no relative link that dangles once the skills leave the repo', () => {
    const dangling = []
    for (const file of walk(dist).filter((f) => f.endsWith('.md'))) {
      let fenced = false
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
        if (fenced) continue
        for (const [, target] of line.matchAll(/\]\(\s*<?([^)\s>#]+)/g)) {
          if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/')) continue
          const to = path.resolve(path.dirname(file), target)
          if (!to.startsWith(dist + path.sep) || !fs.existsSync(to)) dangling.push(`${path.relative(dist, file)}: ${target}`)
        }
      }
    }
    assert.deepEqual(dangling, [])
  })

  it('pins links into the rest of the repo to the release on GitHub', () => {
    const { version } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', '..', '..', 'package.json'), 'utf8'))
    const recipe = fs.readFileSync(path.join(dist, 'mdk-ui-component', 'references', 'page-recipe.md'), 'utf8')
    assert.ok(recipe.includes(`](https://github.com/tetherto/mdk/blob/v${version}/examples/mdk-ui-shell-template/USAGE.md)`))
    const skill = fs.readFileSync(path.join(dist, 'mdk-ui-component', 'SKILL.md'), 'utf8')
    assert.ok(skill.includes('](../mdk-app-routes/SKILL.md)'), 'sibling-skill links stay relative')
  })
})
