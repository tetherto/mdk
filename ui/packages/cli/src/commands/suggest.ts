import {
  loadBlueprints,
  loadHooksManifest,
  loadRegistry,
  loadStoresManifest,
} from '../registry-loader.js'

export type SuggestOptions = {
  packageName: string
  /** Free-text intent. */
  query: string
  /** Number of top components / blueprints to return per group. */
  limit?: number
  /**
   * Adapter package to include in scoring. Defaults to
   * `@tetherto/mdk-react-adapter`. Pass `null` to skip.
   */
  adapterPackage?: string | null
  /**
   * ui-core package to include in scoring. Defaults to
   * `@tetherto/mdk-ui-core`. Pass `null` to skip.
   */
  corePackage?: string | null
  cwd?: string
  out?: (line: string) => void
}

export type SuggestResultItem = {
  name: string
  score: number
  reasons: string[]
}

export type SuggestResult = {
  components: SuggestResultItem[]
  /** Devkit hooks (from registry.json) */
  hooks: SuggestResultItem[]
  blueprints: SuggestResultItem[]
  /** Adapter hooks (from hooks.json) — empty when the manifest isn't present. */
  adapterHooks: SuggestResultItem[]
  /** Zustand stores (from stores.json) — empty when the manifest isn't present. */
  stores: SuggestResultItem[]
}

/** Lower-case alphanumeric tokens of length ≥ 3, deduplicated. */
const tokenise = (text: string): Set<string> => {
  const tokens = new Set<string>()
  for (const m of text.toLowerCase().matchAll(/[a-z0-9]+/g)) {
    if (m[0].length >= 3) tokens.add(m[0])
  }
  return tokens
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'have',
  'has',
  'are',
  'was',
  'were',
  'use',
  'using',
  'want',
  'build',
  'show',
  'see',
  'get',
  'give',
  'make',
  'add',
  'new',
  'into',
  'out',
  'this',
  'that',
  'these',
  'those',
  'all',
  'any',
  'some',
  'one',
  'two',
  'now',
  'then',
  'than',
  'such',
  'but',
  'not',
])

const cleanTokens = (set: Set<string>): Set<string> => {
  for (const t of set) if (STOPWORDS.has(t)) set.delete(t)
  return set
}

const scoreOverlap = (haystack: string, needle: Set<string>): { score: number; hits: string[] } => {
  const hay = tokenise(haystack)
  const hits: string[] = []
  for (const t of needle) {
    if (hay.has(t)) hits.push(t)
  }
  // Normalise by query size so longer queries don't inflate scores artificially.
  const score = needle.size > 0 ? hits.length / needle.size : 0
  return { score, hits }
}

const topN = (items: SuggestResultItem[], n: number): SuggestResultItem[] =>
  items
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, n)

const DEFAULT_ADAPTER = '@tetherto/mdk-react-adapter'
const DEFAULT_CORE = '@tetherto/mdk-ui-core'

/**
 * Local, deterministic keyword-overlap scoring across the registry,
 * blueprints, adapter hooks and ui-core stores. No network, no embeddings.
 * Good-enough routing for an agent that will then read `docs` / `example` /
 * `blueprint` / `hooks` / `stores` for the top hits.
 */
export const runSuggest = (opts: SuggestOptions): SuggestResult => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })
  const limit = opts.limit ?? 5
  const queryTokens = cleanTokens(tokenise(opts.query))

  const { registry } = loadRegistry({ packageName: opts.packageName, cwd: opts.cwd })
  const blueprints = loadBlueprints({ packageName: opts.packageName, cwd: opts.cwd })

  const adapterPkg = opts.adapterPackage === undefined ? DEFAULT_ADAPTER : opts.adapterPackage
  const corePkg = opts.corePackage === undefined ? DEFAULT_CORE : opts.corePackage

  const hooksManifest = adapterPkg
    ? loadHooksManifest({ packageName: adapterPkg, cwd: opts.cwd })
    : null
  const storesManifest = corePkg
    ? loadStoresManifest({ packageName: corePkg, cwd: opts.cwd })
    : null

  const publicComponents = registry.components.filter((c) => c.public !== false)
  const publicHooks = registry.hooks.filter((h) => h.public !== false)

  const componentScores: SuggestResultItem[] = publicComponents.map((c) => {
    const corpus = [
      c.name,
      c.description ?? '',
      c.category ?? '',
      c.domainContext ?? '',
      (c.orkCapabilities ?? []).join(' '),
    ].join(' ')
    const { score, hits } = scoreOverlap(corpus, queryTokens)
    return { name: c.name, score, reasons: hits }
  })

  const hookScores: SuggestResultItem[] = publicHooks.map((h) => {
    const corpus = [
      h.name,
      h.description ?? '',
      h.domainContext ?? '',
      (h.orkCapabilities ?? []).join(' '),
    ].join(' ')
    const { score, hits } = scoreOverlap(corpus, queryTokens)
    return { name: h.name, score, reasons: hits }
  })

  const blueprintScores: SuggestResultItem[] = (blueprints?.blueprints ?? []).map((b) => {
    const corpus = [b.id, b.title, b.intent, b.domain, b.orkCapabilities.join(' '), b.body].join(
      ' ',
    )
    const { score, hits } = scoreOverlap(corpus, queryTokens)
    return { name: b.id, score, reasons: hits }
  })

  const adapterHookScores: SuggestResultItem[] = (hooksManifest?.hooks ?? []).map((h) => {
    const corpus = [h.name, h.description, h.category, h.signature].join(' ')
    const { score, hits } = scoreOverlap(corpus, queryTokens)
    return { name: h.name, score, reasons: hits }
  })

  const storeScores: SuggestResultItem[] = (storesManifest?.stores ?? []).map((s) => {
    const corpus = [
      s.name,
      s.description,
      s.category,
      s.state.map((f) => f.name).join(' '),
      s.actions.map((a) => a.name).join(' '),
    ].join(' ')
    const { score, hits } = scoreOverlap(corpus, queryTokens)
    return { name: s.name, score, reasons: hits }
  })

  const result: SuggestResult = {
    components: topN(componentScores, limit),
    hooks: topN(hookScores, limit),
    blueprints: topN(blueprintScores, limit),
    adapterHooks: topN(adapterHookScores, limit),
    stores: topN(storeScores, limit),
  }

  out(JSON.stringify(result, null, 2))
  return result
}
