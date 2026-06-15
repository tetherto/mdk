#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Agent-readiness contract gate.
 *
 * Validates every entry in `dist/registry.json` against the contract defined
 * in `packages/react-devkit/AGENT_READY.md`:
 *
 *   - All public exports (tier != internal):
 *       missing-description, missing-category, missing-domain, missing-tier
 *   - Agent-ready additionally:
 *       agent-ready-missing-usage, agent-ready-missing-example,
 *       agent-ready-missing-ork-capability
 *
 * Failures present in `scripts/agent-ready-baseline.json` are reported as
 * `debt` (warnings) and do not fail the build. Failures NOT in the baseline
 * are hard errors — that's what makes new code strict without forcing a
 * flag-day refactor on existing code.
 *
 * Flags:
 *   --list             Print agent-ready surface and exit 0.
 *   --update-baseline  Rewrite the baseline file to match current violations.
 *                      Use after fixing debt. The file can only ever shrink.
 *   --no-baseline      Ignore the baseline (every violation is an error).
 *                      Useful locally to see the total surface of work.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..')
const REGISTRY_PATH = join(PACKAGE_ROOT, 'dist', 'registry.json')
const BLUEPRINTS_PATH = join(PACKAGE_ROOT, 'dist', 'blueprints.json')
const BASELINE_PATH = join(SCRIPT_DIR, 'agent-ready-baseline.json')
const CONTRACT_DOC = 'packages/react-devkit/AGENT_READY.md'

const args = new Set(process.argv.slice(2))
const listOnly = args.has('--list')
const updateBaseline = args.has('--update-baseline')
const ignoreBaseline = args.has('--no-baseline')

if (!existsSync(REGISTRY_PATH)) {
  console.error(`✗ Registry not found at ${REGISTRY_PATH}.`)
  console.error('  Run `npm run build:registry --workspace @tetherto/mdk-react-devkit` first.')
  process.exit(1)
}

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
const agentReady = registry.components.filter((c) => c.tier === 'agent-ready')

if (listOnly) {
  console.log(`${agentReady.length} agent-ready components:`)
  for (const c of agentReady) console.log(`  ${c.name}  (${c.path})`)
  process.exit(0)
}

/**
 * @typedef {{ entry: string, kind: "component" | "hook", rule: string }} Violation
 */

/**
 * Human-readable, one-line fix per rule id. The full rule reference lives
 * in `packages/react-devkit/AGENT_READY.md` (Error catalogue section).
 */
const RULE_FIX = {
  'missing-description':
    'Add a JSDoc summary above the export — the first paragraph is captured into the registry.',
  'missing-category':
    'Add `@category <bucket>` (e.g. charts, tables, cards, forms, dialogs, navigation, layout, misc).',
  'missing-domain':
    'Add `@domain <area>` — one of: mining-operations, financial-reporting, device-management, generic.',
  'missing-tier':
    'Add `@tier agent-ready | advanced | internal`. Every public export must declare its audience.',
  'agent-ready-missing-usage':
    'Create `USAGE.md` next to the component (summary + props table + minimal example).',
  'agent-ready-missing-example':
    'Add `<name>.example.tsx` next to the component (mock data only; import from `@tetherto/mdk-react-devkit`).',
  'agent-ready-missing-ork-capability':
    'Add at least one `@orkCapability <id>` tag so agents can find this by capability.',
  'description-too-short':
    'Replace the placeholder description with a 1–2 sentence summary (what it is + when to use it). Must be ≥40 chars and not match the `"<Name> component."` template.',
}

/**
 * Heuristic for "thin" auto-generated descriptions. We want a real one-liner
 * (≥ MIN_DESCRIPTION_LEN chars) that says more than just the component name.
 * Strict for agent-ready, lenient (baselined) for advanced.
 */
const MIN_DESCRIPTION_LEN = 40
const PLACEHOLDER_PATTERNS = [
  /^[A-Z][\w\s./-]*\scomponent\.?$/i,
  /^Use\s+[A-Z][\w\s]*\shook\.?$/i,
  /^[A-Z][\w\s./-]+\shook\.?$/i,
]
const isThinDescription = (desc) => {
  if (!desc) return false
  const trimmed = desc.trim()
  if (trimmed.length < MIN_DESCRIPTION_LEN) return true
  return PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed))
}

/** @returns {Violation[]} the flat list of violations across components and hooks. */
const collectViolations = () => {
  /** @type {Violation[]} */
  const out = []

  /**
   * @param {{ entry: string, kind: "component" | "hook", tier?: string, description?: string, category?: string, domainContext?: string }} v
   * @param {{ requireExample?: boolean, requireUsage?: boolean, examples?: string[], usageDoc?: string, orkCapabilities?: string[] }} extra
   */
  const checkEntry = (v, extra = {}) => {
    if (v.tier === 'internal') return
    if (!v.tier) out.push({ entry: v.entry, kind: v.kind, rule: 'missing-tier' })
    if (!v.description) out.push({ entry: v.entry, kind: v.kind, rule: 'missing-description' })
    else if (isThinDescription(v.description))
      out.push({ entry: v.entry, kind: v.kind, rule: 'description-too-short' })
    if (!v.category) out.push({ entry: v.entry, kind: v.kind, rule: 'missing-category' })
    if (!v.domainContext) out.push({ entry: v.entry, kind: v.kind, rule: 'missing-domain' })

    if (v.tier === 'agent-ready') {
      if (extra.requireUsage && !extra.usageDoc) {
        out.push({ entry: v.entry, kind: v.kind, rule: 'agent-ready-missing-usage' })
      }
      if (extra.requireExample && (!extra.examples || extra.examples.length === 0)) {
        out.push({ entry: v.entry, kind: v.kind, rule: 'agent-ready-missing-example' })
      }
      // ORK capabilities are mining-specific. Generic primitives (Button,
      // Form, ...) carry `@domain generic` and are exempt — there's no
      // sensible capability tag for them.
      const isGeneric = v.domainContext === 'generic'
      if (!isGeneric && (!extra.orkCapabilities || extra.orkCapabilities.length === 0)) {
        out.push({ entry: v.entry, kind: v.kind, rule: 'agent-ready-missing-ork-capability' })
      }
    }
  }

  for (const c of registry.components) {
    checkEntry(
      {
        entry: c.name,
        kind: 'component',
        tier: c.tier,
        description: c.description,
        category: c.category,
        domainContext: c.domainContext,
      },
      {
        requireExample: true,
        requireUsage: true,
        examples: c.examples,
        usageDoc: c.usageDoc,
        orkCapabilities: c.orkCapabilities,
      },
    )
  }
  for (const h of registry.hooks) {
    checkEntry(
      {
        entry: h.name,
        kind: 'hook',
        tier: h.tier,
        description: h.description,
        category: h.category,
        domainContext: h.domainContext,
      },
      { orkCapabilities: h.orkCapabilities },
    )
  }

  return out
}

const blueprintErrors = []
if (existsSync(BLUEPRINTS_PATH)) {
  const bp = JSON.parse(readFileSync(BLUEPRINTS_PATH, 'utf8'))
  const componentsByName = new Map(registry.components.map((c) => [c.name, c]))
  const hooksByName = new Map(registry.hooks.map((h) => [h.name, h]))
  for (const b of bp.blueprints ?? []) {
    for (const compName of b.components ?? []) {
      const c = componentsByName.get(compName)
      if (!c) {
        blueprintErrors.push(
          `blueprint:${b.id}: component \`${compName}\` does not exist in registry`,
        )
      } else if (c.tier !== 'agent-ready') {
        blueprintErrors.push(
          `blueprint:${b.id}: component \`${compName}\` is \`${c.tier}\` — blueprints may only reference agent-ready components`,
        )
      }
    }
    for (const hookName of b.hooks ?? []) {
      if (!hooksByName.has(hookName)) {
        blueprintErrors.push(`blueprint:${b.id}: hook \`${hookName}\` does not exist in registry`)
      }
    }
  }
}

const violations = collectViolations()
violations.sort((a, b) => a.entry.localeCompare(b.entry) || a.rule.localeCompare(b.rule))

const violationKey = (v) => `${v.kind}:${v.entry}:${v.rule}`

const loadBaseline = () => {
  if (!existsSync(BASELINE_PATH)) return new Set()
  try {
    const raw = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    const list = Array.isArray(raw) ? raw : (raw.violations ?? [])
    return new Set(list.map((v) => `${v.kind}:${v.entry}:${v.rule}`))
  } catch (err) {
    console.error(`✗ Could not parse ${BASELINE_PATH}: ${err.message}`)
    process.exit(1)
  }
}

if (updateBaseline) {
  const payload = {
    generatedAt: new Date().toISOString(),
    description:
      'Baseline of pre-existing agent-readiness violations. Only `--update-baseline` writes here; PRs that grow it MUST fail CI. Shrink at will by fixing JSDoc / docs.',
    violations,
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`✓ Wrote ${violations.length} violations to ${BASELINE_PATH}.`)
  process.exit(0)
}

const baseline = ignoreBaseline ? new Set() : loadBaseline()
const newViolations = violations.filter((v) => !baseline.has(violationKey(v)))
const fixed = [...baseline].filter((key) => !violations.some((v) => violationKey(v) === key))

const printViolationGroup = (header, items) => {
  if (!items.length) return
  console.error(header)
  for (const v of items) {
    console.error(`  - [${v.rule}] ${v.kind} ${v.entry}`)
    const fix = RULE_FIX[v.rule]
    if (fix) console.error(`      fix: ${fix}`)
  }
  console.error('')
}

if (newViolations.length > 0) {
  printViolationGroup(
    `✗ ${newViolations.length} new agent-readiness violation(s) (not in baseline):`,
    newViolations,
  )
  console.error(`  See ${CONTRACT_DOC} for the full contract.`)
  console.error(
    `  To accept this as debt: \`npm run check:agent-ready -- --update-baseline\` (only shrinks).`,
  )
  console.error('')
}

if (blueprintErrors.length > 0) {
  console.error(`✗ ${blueprintErrors.length} blueprint validation error(s):`)
  for (const err of blueprintErrors) console.error(`  - ${err}`)
  console.error(`  Edit the offending blueprint under packages/react-devkit/blueprints/`)
  console.error('')
}

if (fixed.length > 0) {
  console.log(`✓ ${fixed.length} previously-baselined violation(s) are now fixed.`)
  console.log(`  Run \`npm run check:agent-ready -- --update-baseline\` to shrink the baseline.`)
  console.log('')
}

const debt = violations.length - newViolations.length
console.log(
  `Summary — ${agentReady.length} agent-ready components | ` +
    `violations: ${violations.length} (new: ${newViolations.length}, debt: ${debt}) | ` +
    `baseline size: ${baseline.size}`,
)

if (newViolations.length > 0 || blueprintErrors.length > 0) process.exit(1)
process.exit(0)
