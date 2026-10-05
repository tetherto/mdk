#!/usr/bin/env node
'use strict'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { listTrackedMarkdown } from './lib/tracked-markdown.mjs'

const files = listTrackedMarkdown()

const tracked = new Set(files)
const cache = new Map()

const slug = (text) => text
  .replace(/`([^`]*)`/g, '$1')
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, '$1')
  .replace(/[*_~]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, '')
  .replace(/\s/g, '-')

function proseLines (file) {
  let fenced = false
  return readFileSync(file, 'utf8').split('\n').filter((line) => {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      fenced = !fenced
      return false
    }
    return !fenced
  })
}

function anchorsOf (file) {
  const hit = cache.get(file)
  if (hit) return hit

  const anchors = new Set()
  const seen = new Map()

  for (const line of proseLines(file)) {
    const heading = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line)
    if (heading) {
      const base = slug(heading[1].replace(/\s+#+\s*$/, ''))
      const n = seen.get(base) ?? 0
      seen.set(base, n + 1)
      anchors.add(n === 0 ? base : `${base}-${n}`)
    }
    for (const [, id] of line.matchAll(/<a\s[^>]*?(?:name|id)=["']([^"']+)["']/gi)) {
      anchors.add(id)
    }
  }

  cache.set(file, anchors)
  return anchors
}

const failures = []

for (const file of files) {
  const source = proseLines(file).join('\n')
  const targets = [
    ...source.matchAll(/\]\(\s*<?([^)\s<>]+)>?/g),
    ...source.matchAll(/^\[[^\]]+\]:\s*<?([^\s<>]+)>?/gm)
  ]

  for (const [, target] of targets) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue

    const hash = target.indexOf('#')
    if (hash < 0) continue

    const fragment = decodeURIComponent(target.slice(hash + 1))
    if (!fragment) continue

    const relative = target.slice(0, hash)
    const resolved = relative === ''
      ? file
      : path.posix.normalize(path.posix.join(path.posix.dirname(file), relative))
    if (!tracked.has(resolved)) continue

    if (!anchorsOf(resolved).has(fragment)) {
      failures.push(`${file} -> ${target}`)
    }
  }
}

if (failures.length > 0) {
  console.error(`Broken Markdown anchors (${failures.length}):`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`Markdown anchors OK: ${files.length} files.`)
