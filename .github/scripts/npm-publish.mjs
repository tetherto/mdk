#!/usr/bin/env node
// Plans, verifies and publishes the MDK npm packages for
// .github/workflows/publish.yml and the release-PR pack check in ci.yml.
// Plain Node, no dependencies.
//
//   plan       [--ref <branch>] [--dist-tag latest] [--build-all]
//   verify     <tarball>...
//   preflight  --plan plan.json --dir <tarball dir>
//   publish    --plan plan.json --dir <tarball dir>
//
// Every release publishes all packages at one version: the root package.json
// version, set by hand before the release (bump-mdk) and never bumped here. Packages are discovered from the workspaces of the two install
// roots: the repo root (backend + packages/*) and ui/. A package is publishable
// when its package.json is not `private`, and ready when it also declares
// public access and a repository pointing at this repo (npm checks that
// against the provenance). Publish order comes from the internal dependency
// graph: a package goes out only after everything it depends on.

import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const GROUPS = [
  { group: 'backend', root: '.' },
  { group: 'ui', root: 'ui' }
]
const REPOSITORY = 'tetherto/mdk'
const REGISTRY = 'https://registry.npmjs.org'
const RUNTIME_DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies']
const MIN_NPM = [11, 5, 1] // npm trusted publishing (OIDC)

const [command, ...rest] = process.argv.slice(2)
const { flags, positional } = parseArgs(rest)

try {
  if (command === 'plan') plan()
  else if (command === 'verify') verify()
  else if (command === 'preflight') await preflight()
  else if (command === 'publish') publish()
  else fail(`unknown command "${command}" (expected plan, verify, preflight or publish)`)
} catch (err) {
  fail(err instanceof Error ? err.message : String(err))
}

// --- plan -------------------------------------------------------------------

function plan () {
  const version = readJson('package.json').version
  const distTag = flags['dist-tag'] || 'latest'

  if (version.includes('-') && distTag === 'latest') {
    fail(`${version} is a prerelease; publish it under a dist-tag other than "latest"`)
  }

  const workspaces = discover()
  const byName = new Map(workspaces.map((w) => [w.name, w]))
  const publishable = workspaces.filter((w) => !w.private)
  const notReady = new Map(publishable.map((p) => [p.name, readinessGaps(p)]).filter(([, gaps]) => gaps.length))
  const ready = publishable.filter((p) => !notReady.has(p.name))
  const errors = []

  if (!ready.length) errors.push('no packages are ready for npm')

  for (const pkg of ready) {
    if (pkg.version !== version) errors.push(`${pkg.name} is at ${pkg.version}, but the release is ${version} (see the bump-mdk skill)`)

    // Every runtime dependency on another workspace must go out in this
    // release and pin its version, otherwise the published package can't be
    // installed or pulls a different version than it was built against.
    for (const [dep, spec] of internalDeps(pkg, byName)) {
      if (byName.get(dep).private) {
        errors.push(`${pkg.name} depends on ${dep}, which is private and won't be on npm`)
      } else if (notReady.has(dep)) {
        errors.push(`${pkg.name} depends on ${dep}, which isn't ready for npm: ${notReady.get(dep).join('; ')}`)
      } else if (![version, `^${version}`, `~${version}`].includes(spec)) {
        errors.push(`${pkg.name} depends on ${dep}@"${spec}"; expected "^${version}" (see the bump-mdk skill)`)
      }
    }
  }

  if (errors.length) fail('plan failed:\n  - ' + [...new Set(errors)].join('\n  - '))

  // Versions already on npm are skipped, so re-running a release that stopped
  // halfway picks up where it left off.
  const waves = computeWaves(publishable, byName)
  const packages = ready
    .map((pkg) => ({
      name: pkg.name,
      group: pkg.group,
      path: pkg.path,
      wave: waves.get(pkg.name),
      tarball: tarballName(pkg.name, version),
      status: npmHasVersion(pkg.name, version) ? 'published' : 'publish'
    }))
    .sort((a, b) => a.wave - b.wave || a.name.localeCompare(b.name))

  const pending = packages.filter((p) => p.status === 'publish')
  const skipped = publishable.filter((p) => notReady.has(p.name))

  console.log(`npm publish plan for ${flags.ref}: ${version} (dist-tag: ${distTag})`)
  for (const p of packages) {
    console.log(`  wave ${p.wave}  ${p.name.padEnd(30)} ${p.status === 'publish' ? 'to publish' : 'already on npm, skipped'}`)
  }
  for (const p of skipped) {
    console.log(`::warning::${p.name} skipped, not ready for npm: ${notReady.get(p.name).join('; ')}`)
  }

  summary([
    `### npm publish plan: ${version}`,
    '',
    `ref \`${flags.ref}\` · dist-tag \`${distTag}\` · ${pending.length} to publish, ${packages.length - pending.length} already on npm, ${skipped.length} not ready`,
    '',
    '| Wave | Package | Path | Status |',
    '| --- | --- | --- | --- |',
    ...packages.map((p) => `| ${p.wave} | \`${p.name}\` | \`${p.path}\` | ${p.status === 'publish' ? 'publish' : 'already on npm'} |`),
    ...skipped.map((p) => `| – | \`${p.name}\` | \`${p.path}\` | not ready: ${notReady.get(p.name).join('; ')} |`)
  ])

  // A release builds what it will publish. --build-all (the CI pack check)
  // builds every ready package, so a PR that breaks one is caught even when
  // its version is already on npm.
  const build = flags['build-all'] === undefined ? pending : packages
  const names = (group) => build.filter((p) => p.group === group).map((p) => p.name).join(' ')
  output('version', version)
  output('plan', JSON.stringify({ version, distTag, packages }))
  output('backend-packages', names('backend'))
  output('ui-packages', names('ui'))
  output('build-count', String(build.length))
  output('publish-count', String(pending.length))
}

function readinessGaps (pkg) {
  const gaps = []
  const repo = pkg.manifest.repository
  const url = typeof repo === 'string' ? repo : repo?.url || ''
  if (pkg.manifest.publishConfig?.access !== 'public') gaps.push('publishConfig.access is not "public"')
  if (!url.replace(/\.git$/, '').endsWith(`github.com/${REPOSITORY}`)) gaps.push(`repository.url doesn't point at ${REPOSITORY}`)
  else if (repo?.directory !== pkg.path) gaps.push(`repository.directory should be "${pkg.path}"`)
  return gaps
}

// Wave 1 has no internal dependencies; every other package sits one wave after
// the latest of its dependencies. Packages in the same wave are independent.
function computeWaves (publishable, byName) {
  const waves = new Map()
  const visiting = new Set()
  const visit = (pkg) => {
    if (waves.has(pkg.name)) return waves.get(pkg.name)
    if (visiting.has(pkg.name)) fail(`dependency cycle through ${pkg.name}`)
    visiting.add(pkg.name)
    let wave = 1
    for (const [dep] of internalDeps(pkg, byName)) {
      const target = byName.get(dep)
      if (!target.private) wave = Math.max(wave, visit(target) + 1)
    }
    visiting.delete(pkg.name)
    waves.set(pkg.name, wave)
    return wave
  }
  for (const pkg of publishable) visit(pkg)
  return waves
}

function internalDeps (pkg, byName) {
  const out = new Map()
  for (const field of RUNTIME_DEP_FIELDS) {
    for (const [dep, spec] of Object.entries(pkg.manifest[field] || {})) {
      if (byName.has(dep) && dep !== pkg.name) out.set(dep, spec)
    }
  }
  return out
}

function discover () {
  const found = []
  for (const { group, root } of GROUPS) {
    const patterns = readJson(path.join(root, 'package.json')).workspaces || []
    const exclude = new Set(patterns.filter((p) => p.startsWith('!')).flatMap((p) => glob(root, p.slice(1))))
    for (const pattern of patterns.filter((p) => !p.startsWith('!'))) {
      for (const dir of glob(root, pattern)) {
        if (exclude.has(dir)) continue
        const manifest = readJson(path.join(root, dir, 'package.json'))
        if (!manifest.name) continue
        found.push({
          name: manifest.name,
          version: manifest.version,
          private: manifest.private === true,
          group,
          path: path.posix.join(root, dir),
          manifest
        })
      }
    }
  }

  const seen = new Map()
  for (const w of found) {
    if (seen.has(w.name) && seen.get(w.name).path !== w.path) {
      fail(`${w.name} is declared twice: ${seen.get(w.name).path} and ${w.path}`)
    }
    seen.set(w.name, w)
  }
  return [...seen.values()]
}

function glob (root, pattern) {
  return fs.globSync(`${pattern.replace(/\/$/, '')}/package.json`, { cwd: root })
    .filter((f) => !f.split(path.sep).includes('node_modules'))
    .map((f) => path.dirname(f))
}

// --- verify -----------------------------------------------------------------

// Checks that each tarball carries the version its package.json has in this
// checkout and every file its manifest points at (main, types, bin, exports),
// so a missing build fails here instead of shipping a package without its entry
// point.
function verify () {
  if (!positional.length) fail('verify needs at least one tarball')

  const versions = new Map(discover().map((w) => [w.name, w.version]))
  const errors = []
  for (const tarball of positional) {
    const files = new Set(execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).split('\n').filter(Boolean))
    const manifest = JSON.parse(execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' }))
    const expected = versions.get(manifest.name)
    const before = errors.length

    if (!expected) errors.push(`${tarball}: ${manifest.name} is not a workspace in this checkout`)
    else if (manifest.version !== expected) errors.push(`${tarball}: version ${manifest.version}, but ${manifest.name} is at ${expected}`)
    if (manifest.private) errors.push(`${tarball}: ${manifest.name} is private`)

    for (const entry of entryPoints(manifest)) {
      if (!files.has('package/' + entry)) errors.push(`${manifest.name}: ${entry} is referenced in package.json but missing from the tarball`)
    }
    if (errors.length === before) console.log(`ok ${manifest.name}@${manifest.version} (${files.size} files)`)
  }
  if (errors.length) fail('verify failed:\n  - ' + errors.join('\n  - '))
}

function entryPoints (manifest) {
  const out = new Set()
  const add = (value) => {
    if (typeof value === 'string') {
      if (!value.includes('*')) out.add(path.posix.normalize(value).replace(/^\.\//, ''))
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value)) add(v)
    }
  }
  for (const field of ['main', 'module', 'types', 'typings', 'bin', 'exports']) add(manifest[field])
  return [...out]
}

// --- publish ----------------------------------------------------------------

// Runs before anything is tagged or published, so a release goes out whole or
// not at all: every planned tarball must be there, and npm must accept this
// workflow as the trusted publisher of every package. That's the same OIDC
// token exchange `npm publish` does per package (npm's lib/utils/oidc.js), done
// up front for all of them; the tokens it returns are discarded.
async function preflight () {
  if (!flags.plan || !flags.dir) fail('preflight needs --plan and --dir')
  checkNpm()

  const { packages } = readJson(flags.plan)
  const pending = packages.filter((p) => p.status === 'publish')
  const errors = []

  for (const pkg of pending) {
    if (!fs.existsSync(path.join(flags.dir, pkg.tarball))) errors.push(`${pkg.name}: tarball ${pkg.tarball} is missing`)
  }

  const { ACTIONS_ID_TOKEN_REQUEST_URL: tokenUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: tokenAuth } = process.env
  if (!tokenUrl || !tokenAuth) fail('no GitHub OIDC token available; the job needs `id-token: write`')

  const url = new URL(tokenUrl)
  url.searchParams.append('audience', `npm:${new URL(REGISTRY).hostname}`)
  const res = await fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${tokenAuth}` } })
  const idToken = res.ok ? (await res.json()).value : null
  if (!idToken) fail(`couldn't get a GitHub OIDC token (HTTP ${res.status})`)

  for (const pkg of pending) {
    const exchange = await fetch(`${REGISTRY}/-/npm/v1/oidc/token/exchange/package/${pkg.name.replace('/', '%2f')}`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` }
    })
    const body = await exchange.json().catch(() => ({}))
    if (exchange.ok && body.token) console.log(`ok ${pkg.name}: npm accepts this workflow as trusted publisher`)
    else errors.push(`${pkg.name}: npm rejected the trusted publisher check (HTTP ${exchange.status}${body.message ? `: ${body.message}` : ''})`)
  }

  if (errors.length) {
    summary(['### npm publish preflight failed', '', 'Nothing was tagged or published.', '', ...errors.map((e) => `- ${e}`)])
    fail('preflight failed, nothing was tagged or published:\n  - ' + errors.join('\n  - '))
  }
}

// Publishes the planned tarballs wave by wave and stops at the first failure.
// Versions already on npm are skipped, so re-running the workflow picks up
// where a failed run stopped.
function publish () {
  if (!flags.plan || !flags.dir) fail('publish needs --plan and --dir')
  checkNpm()

  const { version, distTag, packages } = readJson(flags.plan)
  const rows = []

  for (const pkg of packages) {
    if (pkg.status !== 'publish' || npmHasVersion(pkg.name, version)) {
      console.log(`skip ${pkg.name}@${version}: already on npm`)
      rows.push(`| ${pkg.wave} | \`${pkg.name}\` | already on npm |`)
      continue
    }

    const tarball = path.join(flags.dir, pkg.tarball)
    if (!fs.existsSync(tarball)) fail(`missing tarball ${tarball} for ${pkg.name}`)

    console.log(`::group::wave ${pkg.wave}: publish ${pkg.name}@${version}`)
    // --provenance makes a missing attestation fail the publish; npm's own
    // auto-enable skips provenance silently when its visibility check fails.
    const res = spawnSync('npm', ['publish', tarball, '--access', 'public', '--tag', distTag, '--provenance', '--ignore-scripts'], { stdio: 'inherit' })
    console.log('::endgroup::')

    if (res.status !== 0) {
      rows.push(`| ${pkg.wave} | \`${pkg.name}\` | **failed** |`)
      summary(['### npm publish', '', '| Wave | Package | Result |', '| --- | --- | --- |', ...rows])
      fail(`publishing ${pkg.name}@${version} failed; fix the cause and re-run (already published packages are skipped)`)
    }
    rows.push(`| ${pkg.wave} | \`${pkg.name}\` | published |`)
  }

  summary(['### npm publish', '', `\`${version}\` under dist-tag \`${distTag}\``, '', '| Wave | Package | Result |', '| --- | --- | --- |', ...rows])
}

function checkNpm () {
  const current = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()
  const parts = current.split('.').map(Number)
  for (let i = 0; i < MIN_NPM.length; i++) {
    if (parts[i] > MIN_NPM[i]) return
    if (parts[i] < MIN_NPM[i]) fail(`npm ${current} can't use trusted publishing; need ${MIN_NPM.join('.')} or newer`)
  }
}

// --- helpers ----------------------------------------------------------------

// `npm view name@version version` prints the version when it exists, prints
// nothing when the package exists without that version, and fails with E404
// when the package doesn't exist at all.
function npmHasVersion (name, version) {
  const res = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' })
  if (res.status === 0) return res.stdout.trim() !== ''
  if (/E404|404 Not Found/.test(res.stderr)) return false
  fail(`npm view ${name}@${version} failed:\n${res.stderr}`)
}

function tarballName (name, version) {
  return `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`
}

function readJson (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function output (key, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`)
}

function summary (lines) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n\n')
}

function parseArgs (args) {
  const flags = {}
  const positional = []
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const next = args[i + 1]
      flags[key] = next === undefined || next.startsWith('--') ? '' : args[++i]
    } else {
      positional.push(args[i])
    }
  }
  return { flags, positional }
}

function fail (message) {
  console.error(`::error::${message.split('\n')[0]}`)
  console.error(message)
  process.exit(1)
}
