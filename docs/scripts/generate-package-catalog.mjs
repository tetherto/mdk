#!/usr/bin/env node
// Generates docs/reference/packages.md, the reader-facing list of every package in this monorepo.
//
// Everything is inferred, so no package carries metadata for this page. The group comes from where a
// package lives and availability from `private`. A package with an mdk-contract.json is an
// integration: its section, name, models, and purpose come from the contract's metadata. Every other
// package shows its package.json description. Contract schema conformance is checked by
// backend/workers/scripts/generate-catalogue.js, not here.
//
//   npm run generate:package-catalog        rewrite the page (repo root)
//   npm run regenerate-docs -- --check      report whether it is stale
//
// A package that cannot be listed (no description, a duplicate name, an unreadable contract) fails the
// run (exit 1) before anything is written.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = 'docs/reference/packages.md'
const GITHUB_BLOB = 'https://github.com/tetherto/mdk/blob/main/'

const MANIFESTS = [
  ':(glob)backend/core/*/package.json',
  ':(glob)backend/plugins/*/package.json',
  ':(glob)backend/workers/**/package.json',
  ':(glob)ui/packages/*/package.json',
  ':(glob)packages/*/package.json'
]
const EXCLUDED = ['backend/workers/samples/', 'backend/plugins/demo/']
const CONTRACTS = ['mdk-contract.json', 'plugin/mdk-contract.json']
const GROUPS = [
  ['backend/core/', 'Core'],
  ['backend/plugins/', 'Extensions'],
  ['backend/workers/', 'Extensions'],
  ['ui/packages/', 'UI'],
  ['packages/', 'Tools']
]
const FAMILY_LABELS = {
  miner: 'Miners',
  container: 'Containers',
  'power-meter': 'Power meters',
  sensor: 'Sensors',
  minerpool: 'Mining pools'
}
const OTHER_EXTENSIONS = 'Plugins and tooling'

export function buildCatalog (root, manifestPaths) {
  const entries = []
  const errors = []
  const names = new Set()

  for (const manifestPath of manifestPaths) {
    const dir = path.posix.dirname(manifestPath)
    if (EXCLUDED.some((prefix) => `${dir}/`.startsWith(prefix))) continue

    const pkg = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'))
    const fail = (msg) => errors.push(`${manifestPath}: ${msg}`)

    if (names.has(pkg.name)) fail(`duplicate package name ${pkg.name}`)
    names.add(pkg.name)

    let contract = null
    const contractPath = CONTRACTS.find((file) => fs.existsSync(path.join(root, dir, file)))
    if (contractPath) {
      try {
        contract = JSON.parse(fs.readFileSync(path.join(root, dir, contractPath), 'utf8')).metadata ?? {}
      } catch (err) {
        fail(`${contractPath}: ${err.message}`)
      }
    }

    const purpose = contract?.overview?.split(/(?<=\.)\s/)[0] ?? pkg.description
    if (!purpose) fail('missing description')

    entries.push({
      group: GROUPS.find(([prefix]) => dir.startsWith(prefix))[1],
      section: contract && (FAMILY_LABELS[contract.deviceFamily] ?? contract.deviceFamily),
      name: pkg.name,
      label: contract?.brand,
      purpose,
      availability: pkg.private ? 'workspace' : 'publishable',
      docs: path.posix.join(dir, fs.existsSync(path.join(root, dir, 'README.md')) ? 'README.md' : 'package.json'),
      models: contract?.modelsSupported ?? []
    })
  }

  entries.sort((a, b) => (a.label ?? a.name).localeCompare(b.label ?? b.name))
  return { entries, errors }
}

const cell = (value) => String(value).replace(/\|/g, '\\|').trimEnd().replace(/\.$/, '')

export function render (entries) {
  const links = []
  const packageLink = (entry) => {
    const slug = entry.name.slice(entry.name.indexOf('/') + 1)
    links.push(`[${slug}]: ${path.posix.relative('docs/reference', entry.docs)}\n<!-- docs@tether.io: ${slug} → ${GITHUB_BLOB}${entry.docs} -->`)
    return `[\`${entry.name}\`][${slug}]`
  }
  const table = (rows, integrations) => {
    let out = integrations
      ? '| Name | Package | Purpose | Models | Availability |\n| --- | --- | --- | --- | --- |\n'
      : '| Package | Purpose | Availability |\n| --- | --- | --- |\n'
    for (const e of rows) {
      const cells = integrations
        ? [cell(e.label ?? ''), packageLink(e), cell(e.purpose), cell(e.models.join(', ')), `\`${e.availability}\``]
        : [packageLink(e), cell(e.purpose), `\`${e.availability}\``]
      out += `| ${cells.join(' | ')} |\n`
    }
    return out + '\n'
  }

  let body = ''
  for (const group of new Set(GROUPS.map(([, name]) => name))) {
    const rows = entries.filter((e) => e.group === group)
    if (!rows.length) continue
    body += `## ${group}\n\n`
    if (group !== 'Extensions') {
      body += table(rows, false)
      continue
    }
    for (const section of new Set([...Object.values(FAMILY_LABELS), ...rows.map((e) => e.section).filter(Boolean), OTHER_EXTENSIONS])) {
      const sectionRows = rows.filter((e) => (e.section || OTHER_EXTENSIONS) === section)
      if (sectionRows.length) body += `### ${section}\n\n` + table(sectionRows, section !== OTHER_EXTENSIONS)
    }
  }

  return `---
title: Packages
description: Every package in the MDK monorepo, grouped into Core, Extensions, UI, and Tools, with what each is for and how to get it.
docs@tether_slug: reference/packages
---

<!-- GENERATED FILE, DO NOT EDIT. Run \`npm run generate:package-catalog\` from the repo root. Sources: each package's package.json and, for integrations, its mdk-contract.json. -->

## Overview

This page lists every package in the MDK monorepo. Core is the Kernel, the Gateway, and the runtimes around them. Extensions are the Workers and
Gateway plugins that connect MDK to hardware, pools, and agents. UI is the browser toolkit, and Tools are what you develop with.

Availability says how you get a package:

- \`workspace\`: private to the monorepo, used from a clone
- \`publishable\`: not marked private, so it can be published to a registry

${body}## Next steps

- Check [which models each Worker supports][supported-hardware]
- Learn how to [connect your own hardware][build-a-worker] with a new Worker

## Links

[supported-hardware]: supported-hardware.md
<!-- docs@tether.io: supported-hardware → reference/supported-hardware -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

${links.join('\n\n')}
`
}

function main () {
  const manifests = execFileSync('git', ['ls-files', '--', ...MANIFESTS], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
  const { entries, errors } = buildCatalog(REPO_ROOT, manifests)

  if (errors.length) {
    console.error('[generate-package-catalog] fix these packages, nothing was written:')
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }

  fs.writeFileSync(path.join(REPO_ROOT, OUT), render(entries))
  console.log(`[generate-package-catalog] wrote ${OUT} (${entries.length} packages).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
