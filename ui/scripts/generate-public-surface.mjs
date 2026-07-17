#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Generate a machine-readable public API surface for the UI packages.
 *
 * For each package listed in PACKAGES this script invokes TypeDoc against the
 * package barrel and writes two artifacts under api/ (repo root):
 *
 *   - <pkg>.typedoc.json         Full TypeDoc reflection dump (raw, large).
 *   - <pkg>.public-surface.json  Normalized one-row-per-export view.
 *
 * Schema (Zod): ../api/schema.mjs — validated before writing each JSON file.
 *
 * Run from repo root:
 *   npm run api:surface
 */

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Application, ReflectionKind, TSConfigReader } from 'typedoc'

import { validatePublicSurface } from '../api/schema.mjs'

const require = createRequire(import.meta.url)
const typedocPkg = require('typedoc/package.json')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UI_ROOT = path.resolve(__dirname, '..')
const API_DIR = path.join(UI_ROOT, 'api')

const META = {
  status: 'experimental',
  framework: 'react',
  schemaVersion: '1.0',
  disclaimer: 'Generated. See api/README.md before consuming.',
  generator: 'scripts/generate-public-surface.mjs',
  typedocVersion: typedocPkg.version,
}

const PACKAGES = [
  {
    name: 'core',
    entryPoint: 'packages/react-devkit/src/primitives/index.ts',
    tsconfig: 'packages/react-devkit/tsconfig.json',
  },
  {
    name: 'foundation',
    entryPoint: 'packages/react-devkit/src/domain/index.ts',
    tsconfig: 'packages/react-devkit/tsconfig.json',
  },
]

async function generateForPackage(pkg) {
  const app = await Application.bootstrapWithPlugins(
    {
      entryPoints: [path.join(UI_ROOT, pkg.entryPoint)],
      tsconfig: path.join(UI_ROOT, pkg.tsconfig),
      excludeExternals: true,
      excludePrivate: true,
      excludeProtected: true,
      excludeInternal: true,
      readme: 'none',
      logLevel: 'Warn',
      skipErrorChecking: true,
    },
    [new TSConfigReader()],
  )

  const project = await app.convert()
  if (!project) {
    throw new Error(`TypeDoc conversion failed for ${pkg.name}`)
  }

  fs.mkdirSync(API_DIR, { recursive: true })

  const rawPath = path.join(API_DIR, `${pkg.name}.typedoc.json`)
  await app.generateJson(project, rawPath)

  const normalized = normalize(project, pkg.name)
  validatePublicSurface(normalized)

  const normalizedPath = path.join(API_DIR, `${pkg.name}.public-surface.json`)
  fs.writeFileSync(normalizedPath, `${JSON.stringify(normalized, null, 2)}\n`)

  console.log(
    `[public-surface] ${pkg.name}: ${normalized.exports.length} exports → ${path.relative(UI_ROOT, normalizedPath)}`,
  )
}

/**
 * Coarse classification used by the docs audit. Names are intentionally
 * conservative: anything we can't confidently call a component falls back to
 * "value" or "type" so reviewers spot it during spot-checks.
 */
function classifyKind(refl) {
  const isPascalName = /^[A-Z][a-zA-Z0-9]*$/.test(refl.name) && /[a-z]/.test(refl.name)
  const isUpperFirst = /^[A-Z]/.test(refl.name)

  switch (refl.kind) {
    case ReflectionKind.Class:
      return isUpperFirst ? 'class' : 'value'
    case ReflectionKind.Interface:
      return 'type'
    case ReflectionKind.TypeAlias:
      return 'type'
    case ReflectionKind.Enum:
      return 'enum'
    case ReflectionKind.Namespace:
    case ReflectionKind.Module:
      return 'namespace'
    case ReflectionKind.Function: {
      if (looksLikeHook(refl)) return 'hook'
      if (isPascalName) return 'component'
      return 'function'
    }
    case ReflectionKind.Variable: {
      if (isPascalName && looksLikeComponent(refl)) return 'component'
      if (isUpperFirst) return 'value'
      return 'const'
    }
    default:
      return 'value'
  }
}

function looksLikeHook(refl) {
  if (!/^use[A-Z]/.test(refl.name)) return false
  const src = relSource(refl) ?? ''
  return /(?:^|\/)hooks\//.test(src)
}

/**
 * Variables exported as React components are usually one of:
 *   - typed as a known React component type (forwardRef/memo/FC/etc.)
 *   - declared in a /components/ source file
 *   - documented with a JSX @example like <Name ... />
 *
 * Any one of those is a strong enough signal to tag the row as a component.
 * Otherwise we fall back to "value" so reviewers notice during spot-checks.
 */
function looksLikeComponent(refl) {
  const typeStr = typeString(refl.type) ?? ''
  if (
    /ForwardRefExoticComponent|ComponentType|FunctionComponent|FC<|JSX\.Element|ReactElement|MemoExoticComponent/.test(
      typeStr,
    )
  ) {
    return true
  }

  const src = relSource(refl) ?? ''
  if (/(?:^|\/)components\//.test(src) && /\.(?:tsx|jsx)$/.test(src)) {
    return true
  }

  const blockTags = refl.comment?.blockTags
  if (Array.isArray(blockTags)) {
    const exampleTag = blockTags.find((t) => t.tag === '@example')
    if (exampleTag && Array.isArray(exampleTag.content)) {
      const text = exampleTag.content.map((p) => p.text ?? '').join('')
      if (new RegExp(`<${refl.name}[\\s/>]`).test(text)) return true
    }
  }

  return false
}

function relSource(refl) {
  const src = refl.sources?.[0]
  if (!src?.fullFileName) return null
  return path.relative(UI_ROOT, src.fullFileName).replace(/\\/g, '/')
}

function summary(refl) {
  const parts = refl.comment?.summary
  if (!Array.isArray(parts) || parts.length === 0) return null
  const text = parts
    .map((p) => p.text ?? '')
    .join('')
    .trim()
  if (!text) return null
  return text.split('\n')[0].trim()
}

function blockTagSummary(comment, tag) {
  if (!comment?.blockTags) return null
  const normalized = tag.startsWith('@') ? tag.slice(1) : tag
  const t = comment.blockTags.find(
    (b) => b.tag === tag || b.tag === `@${normalized}` || b.tag === normalized,
  )
  if (!t?.content) return null
  const text = t.content
    .map((p) => p.text ?? '')
    .join('')
    .trim()
  return text || null
}

function typeString(t) {
  if (!t) return null
  try {
    return t.toString()
  } catch {
    return null
  }
}

function defaultValueString(v) {
  if (v == null) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

/**
 * Pull the property list off an interface, type-alias-of-object-literal,
 * variable typed as object literal, or enum. Returns null when not introspectable.
 */
function extractMembers(refl) {
  if (
    (refl.kind === ReflectionKind.Interface || refl.kind === ReflectionKind.Enum) &&
    Array.isArray(refl.children) &&
    refl.children.length > 0
  ) {
    return refl.children.map(memberRow)
  }

  if (refl.kind === ReflectionKind.TypeAlias) {
    if (Array.isArray(refl.children) && refl.children.length > 0) {
      return refl.children.map(memberRow)
    }
    const t = refl.type
    if (t?.type === 'reflection' && Array.isArray(t.declaration?.children)) {
      return t.declaration.children.map(memberRow)
    }
  }

  if (refl.kind === ReflectionKind.Variable) {
    const t = refl.type
    if (t?.type === 'reflection' && Array.isArray(t.declaration?.children)) {
      return t.declaration.children.map(memberRow)
    }
  }

  return null
}

function memberRow(child) {
  return {
    name: child.name,
    required: !child.flags?.isOptional,
    type: typeString(child.type),
    summary: summary(child),
  }
}

function extractSignature(refl) {
  if (refl.kind !== ReflectionKind.Function) return null
  const sig = Array.isArray(refl.signatures) ? refl.signatures[0] : null
  if (!sig) return null
  const parameters = (sig.parameters ?? []).map((p) => ({
    name: p.name,
    required: !p.flags?.isOptional,
    type: typeString(p.type),
    defaultValue: defaultValueString(p.defaultValue),
    summary: summary(p),
  }))
  return {
    parameters,
    returnType: typeString(sig.type),
    returnSummary: blockTagSummary(sig.comment, 'returns'),
  }
}

function emitRow(refl, namespace, packageName) {
  const kind = classifyKind(refl)
  const row = {
    name: refl.name,
    package: packageName,
    kind,
    namespace,
    sourcePath: relSource(refl) ?? '',
    summary: summary(refl),
  }

  if (kind === 'type' || kind === 'enum') {
    const members = extractMembers(refl)
    if (members) row.members = members
    const aliasType = refl.kind === ReflectionKind.TypeAlias ? typeString(refl.type) : null
    if (aliasType && !row.members) row.aliasOf = aliasType
  }

  if (kind === 'const' || kind === 'value') {
    const members = extractMembers(refl)
    if (members) {
      row.members = members
    } else {
      const t = typeString(refl.type)
      if (t) row.type = t
    }
  }

  if (kind === 'function' || kind === 'hook') {
    const sig = extractSignature(refl)
    if (sig) row.signature = sig
  }

  return row
}

function visit(refl, namespace, packageName, out) {
  if (!Array.isArray(refl.children)) return
  for (const child of refl.children) {
    out.push(emitRow(child, namespace, packageName))

    if (child.kind === ReflectionKind.Namespace || child.kind === ReflectionKind.Module) {
      visit(child, child.name, packageName, out)
    }
  }
}

function normalize(project, packageName) {
  const out = []
  visit(project, null, packageName, out)
  out.sort((a, b) => {
    const ns = (a.namespace ?? '').localeCompare(b.namespace ?? '')
    if (ns !== 0) return ns
    return a.name.localeCompare(b.name)
  })
  return {
    _meta: META,
    package: packageName,
    generatedAt: new Date().toISOString(),
    exports: out,
  }
}

async function main() {
  let failed = false
  for (const pkg of PACKAGES) {
    try {
      await generateForPackage(pkg)
    } catch (err) {
      console.error(`[public-surface] ${pkg.name} failed:`, err)
      failed = true
    }
  }
  if (failed) process.exit(1)
}

main()
