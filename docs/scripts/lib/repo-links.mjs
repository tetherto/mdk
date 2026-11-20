'use strict'

// Every link that stays inside this repository, resolved offline against the git
// tree: relative links in Markdown and in source comments (a file, a folder, a
// heading), the port-signal routing comments, and public URLs into this tree from
// any tracked file. Nothing here fetches, so a folder is as valid a target as a
// file and a link pinned to a tag that does not exist yet is still checkable.
//
// What is left over, every other http(s) URL a reader can follow, is returned as
// `external` for link-check.mjs to hand to linkinator. Policy:
// docs/reference/maintainers/linters.md#nightly-and-pr-diff-link-verification--linkinator
//
// Pure under checkRepoLinks(); the listers below read the tree.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { listTrackedFiles, listTrackedMarkdown } from './tracked-markdown.mjs'

// GitHub's id for a heading. Emphasis markers go; an underscore inside a word or
// a code span stays (held as \0 until the emphasis pass is over).
export const slug = (text) => text
  .replace(/`([^`]*)`/g, (_, code) => code.replaceAll('_', '\0'))
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, '$1')
  .replace(/[*~]|(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu, '')
  .replaceAll('\0', '_')
  .trim()
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s_-]/gu, '')
  .replace(/\s/g, '-')

// A routing comment for this tree: the slug it routes, the ref, the
// repo-relative path (blob or tree, trailing slash dropped) and an optional
// fragment. Anchored on this repository's public name, so a comment that routes
// to another repository (mdk-app-demo and friends) is not matched.
const ROUTING_COMMENT = /<!--\s*docs@tether\.io:\s*(\S+?)\s*→\s*https:\/\/github\.com\/tetherto\/mdk\/(?:blob|tree)\/([^/\s]+)\/([^#\s]+?)\/?(?:#([^\s>]+))?\s*-->/
// Anything that claims to be one: a line that fits this but not the above is
// malformed (ASCII arrow, spaced slug) and fails rather than being skipped.
const ROUTING_COMMENT_LIKE = /<!--.*docs@tether\.io:.*github\.com\/tetherto\/mdk\/(?:blob|tree)\//
// A public URL into this tree: its ref, its repo-relative path and an optional fragment.
// A query (`?plain=1`) is not part of the path.
const REPO_URL = /^https:\/\/(?:github\.com\/tetherto\/mdk\/(?:blob|tree)|raw\.githubusercontent\.com\/tetherto\/mdk)\/([^/#?]+)(?:\/([^#?]*))?(?:\?([^#]*))?(?:#(.*))?$/
// GitHub's line anchor, which a Markdown file takes only when shown as source (`?plain=1`).
const LINE_ANCHOR = /^L\d+(?:C\d+)?(?:-L\d+(?:C\d+)?)?$/
const PLAIN = /(?:^|&)plain=1(?:&|$)/
// The same, as a `git grep -E` pattern.
const REPO_URL_GREP = 'github\\.com/tetherto/mdk/(blob|tree)/|raw\\.githubusercontent\\.com/tetherto/mdk/'
// Files whose repository links are fixtures or are built at run time, not read.
const REPO_LINK_EXCLUDE = ['test/**', '**/*.test.*', 'scripts/release/**', 'docs/scripts/**']
// History: a changelog names the tag it was written at, so its refs are neither pinned nor checked.
export const HISTORY = ['CHANGELOG.md', 'docs/reference/changelog-archive']
const isHistory = (file) => HISTORY.some((p) => file === p || file.startsWith(`${p}/`))

// goatail: a URL ends at whitespace, a quote or a bracket, so one carrying a literal
// "(" or "[" is cut short; percent-encode it in the source if one ever matters.
const URL_LIKE = /https?:\/\/[^\s"'`<>()[\]{}|\\^]+/g
// A host a crawler can reach: a dotted name. `localhost`, an IP literal or `…` is a sample.
const REACHABLE = /^https?:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?=[:/?#]|$)/i
// Build output a README may link to: never tracked, so not this check's to resolve.
const BUILD_OUTPUT = /(^|\/)(dist|coverage)\//
// A target that is not a path: it names a scheme, or a host (`//cdn…`).
const SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i
// `<!-->` and `<!--->` are empty comments, so the body alternates with the
// short forms rather than relying on a body to span to a `-->` that is not
// there. The body is `[\s\S]` rather than `.`, so a comment carrying a newline
// is matched as one too.
const HTML_COMMENT_LINE = /^\s*<!--(?:-?>|[\s\S]*?-->)\s*$/
// A destination in angle brackets may hold spaces; a bare one ends at the first.
const INLINE_LINK = /\]\(\s*(?:<([^<>\n]+)>|([^)\s<>]+))/g
// `[label]: target`; a footnote (`[^1]: text`) is not one.
const REFERENCE_DEFINITION = /^\s{0,3}\[(?!\^)[^\]]+\]:\s*(?:<([^<>\n]+)>|([^\s<>]+))/gm
const HTML_ATTRIBUTE = /<(?:a|img)\s[^>]*?(?:href|src)=["']([^"']+)["']/gi
// In source only a ./ or ../ target is unambiguously a link: `[x](y)` is also call syntax.
const COMMENT_LINK = /\]\(\s*(\.{1,2}\/[^)\s]+)\)/g
// Source files whose comments are read, and the tests among them, which are not.
const SOURCE = ['*.js', '*.mjs', '*.cjs', '*.jsx', '*.ts', '*.mts', '*.cts', '*.tsx']
const SOURCE_EXCLUDE = [...REPO_LINK_EXCLUDE, '**/test/**', '**/tests/**', '**/specs/**', '**/__tests__/**']

// What follows a URL when it runs into a placeholder (`{id}`, `<id>`), not into an
// HTML tag (`<br>`, `</td>`).
// goatail: a short list of the tags a table cell or a paragraph carries; add one if it bites.
const PLACEHOLDER = /^(?:\{|<(?!\/|(?:br|hr|td|th|tr|p|a|li|span|div|sup|sub|code|em|strong|b|i|kbd)\b)[^<>\s]+>)/i

// Every URL on a line with trailing sentence punctuation and emphasis markers
// dropped. A URL that runs into a template or a placeholder (`https://${host}/`,
// `https://example.com/<id>`) is a sample, not a link.
function urlsIn (line) {
  const out = []
  for (const m of line.matchAll(URL_LIKE)) {
    if (PLACEHOLDER.test(line.slice(m.index + m[0].length)) || m[0].includes('$')) continue
    out.push(m[0].replace(/[.,;:!?*_~]+$/, ''))
  }
  return out
}

// An inline code span: a backtick run, then the next run of the same length.
const CODE_SPAN = /(`+)(?!`)[^\n]*?(?<!`)\1(?!`)/g

// Markdown lines as a reader sees their links: a code span is a sample and a
// comment, which can run over several lines, is not rendered. Code goes first, so
// a comment marker shown as code does not swallow the text after it. Line count is kept.
const visible = (lines) => lines.map((line) => line.replace(CODE_SPAN, '')).join('\n')
  .replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ''))
  .split('\n')

// Markdown with `fn` applied to everything a link can sit in: not fenced code and
// not a code span, but comments included, since a routing comment is one.
// release:bump pins through this, so a sample URL is never rewritten.
export function mapProse (text, fn) {
  let fence = null
  return text.split('\n').map((line) => {
    const was = fence
    fence = nextFence(fence, line)
    if (was || fence) return line
    let out = ''
    let last = 0
    for (const m of line.matchAll(CODE_SPAN)) {
      out += fn(line.slice(last, m.index)) + m[0]
      last = m.index + m[0].length
    }
    return out + fn(line.slice(last))
  }).join('\n')
}

// The fence state after `line`: null outside a block, or the opener's character
// and length. A block closes only on the same character, at least as long.
function nextFence (fence, line) {
  const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
  if (!m) return fence
  if (!fence) return m[1]
  return m[1][0] === fence[0] && m[1].length >= fence.length && line.trim() === m[1] ? null : fence
}

// Lines outside fenced code blocks, each with its 1-based line number.
function proseLines (text) {
  let fence = null
  const out = []
  text.split(/\r?\n/).forEach((line, i) => {
    const was = fence
    fence = nextFence(fence, line)
    if (!was && !fence) out.push([i + 1, line])
  })
  return out
}

// Resolves every in-repo link in the files given. Returns { failures, warnings,
// external: [{ url, file, line }], files (Markdown count), routingComments,
// repoLinks }; the last two are counts, read by the tests.
// `treeOf(ref)` lists the files at a tag, or returns null for a ref that is not one.
export function checkRepoLinks ({ markdown, tracked = markdown, linked = [], source = [], version, treeOf = () => null, read = (f) => readFileSync(f, 'utf8') }) {
  const markdownSet = new Set(markdown)
  // A tree as the resolver reads it: its files and every folder above them.
  const indexOf = (files) => {
    const directories = new Set()
    for (const f of files) {
      const parts = f.split('/')
      for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0, i).join('/'))
    }
    return { files: new Set(files), directories }
  }
  const working = indexOf(tracked)
  const trackedSet = working.files

  // The tree a ref's paths are checked against: the tag's own when the tag exists,
  // so a page added since is not linkable at it and a changelog may name a file
  // deleted since. Any other ref (main, a tag not cut yet) reads the working tree.
  const tagged = new Map()
  function treeAt (ref) {
    if (ref === 'main') return working
    if (!tagged.has(ref)) {
      const files = treeOf(ref)
      tagged.set(ref, files ? indexOf(files) : null)
    }
    return tagged.get(ref) ?? working
  }

  const cache = new Map()
  function anchorsOf (file) {
    const hit = cache.get(file)
    if (hit) return hit
    const anchors = new Set()
    const seen = new Map()
    for (const [, line] of proseLines(read(file))) {
      const heading = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line)
      if (heading) {
        const base = slug(heading[1].replace(/\s+#+\s*$/, ''))
        const n = seen.get(base) ?? 0
        seen.set(base, n + 1)
        anchors.add(n === 0 ? base : `${base}-${n}`)
      }
      for (const [, id] of line.matchAll(/<a\s[^>]*?(?:name|id)=["']([^"']+)["']/gi)) anchors.add(id)
    }
    cache.set(file, anchors)
    return anchors
  }

  // A repo-relative path as the tree knows it: the file itself, a directory's
  // README.md when it has one, the bare directory when it does not, or null.
  function resolveTreePath (p, { files, directories } = working) {
    if (p === '' || p === '.') return files.has('README.md') ? 'README.md' : p
    if (files.has(p)) return p
    if (!directories.has(p)) return null
    return files.has(`${p}/README.md`) ? `${p}/README.md` : p
  }

  // A bare directory is untracked; a fragment on it or on a .md must be a heading,
  // or a line anchor when the link asks for the source view. A fragment on any
  // other file, such as a line anchor on source, is left alone.
  // goatail: headings are read from the working tree, so a fragment on a file only
  // an older tag has is not checked.
  const badFragment = (resolved, fragment, { plain = false, tree = working } = {}) => Boolean(fragment) &&
    !(tree !== working && !trackedSet.has(resolved)) &&
    (!tree.files.has(resolved) || resolved.endsWith('.md')) &&
    !(plain && resolved.endsWith('.md') && LINE_ANCHOR.test(fragment)) &&
    !(markdownSet.has(resolved) && anchorsOf(resolved).has(fragment))

  const decode = (text) => {
    try { return decodeURIComponent(text) } catch { return text }
  }

  // Whether a relative link written in `file` names something the tree has.
  function relativeOk (file, target) {
    const [before, ...after] = target.split('#')
    const [rawRelative, query = ''] = before.split('?')
    const relative = decode(rawRelative)
    const joined = relative.startsWith('/') ? relative.slice(1) : path.posix.join(path.posix.dirname(file), relative)
    if (BUILD_OUTPUT.test(joined)) return true
    const resolved = relative === '' ? file : resolveTreePath(path.posix.normalize(joined).replace(/\/$/, ''))
    return resolved !== null && !badFragment(resolved, decode(after.join('#')), { plain: PLAIN.test(query) })
  }

  // The release bump pins every link to v<version>; `main` is what a new link is written with.
  const refNote = (file, ref) => version && ref !== 'main' && ref !== `v${version}` && !isHistory(file)
    ? `; ref "${ref}", expected main or v${version}`
    : ''
  // Why a path that the working tree may well have is not found at an existing tag.
  const tagNote = (file, ref) => treeAt(ref) === working
    ? ''
    : `; not in the tree at ${ref}${isHistory(file) ? '' : ', link to main until the next release'}`

  const failures = []
  const warnings = []
  const external = []
  let routingComments = 0
  let repoLinks = 0

  // A URL found in `file`: into this tree, so resolved here, or one for the network.
  function url (file, lineNo, found, { externals = true } = {}) {
    const m = REPO_URL.exec(found)
    if (!m) {
      if (externals && REACHABLE.test(found)) external.push({ url: found, file, line: lineNo })
      return
    }
    repoLinks++
    const [, ref, rawPath = '', query = '', rawFragment = ''] = m
    const target = decode(rawPath).replace(/\/$/, '')
    const fragment = decode(rawFragment)
    const tree = treeAt(ref)
    const resolved = resolveTreePath(target, tree)
    const note = refNote(file, ref) || (resolved ? '' : tagNote(file, ref))
    if (!resolved || badFragment(resolved, fragment, { plain: PLAIN.test(query), tree }) || note) {
      failures.push(`${file} -> ${target}${fragment ? '#' + fragment : ''} (repository link, line ${lineNo}${note})`)
    }
  }

  for (const file of markdown) {
    const lines = proseLines(read(file))
    const rendered = visible(lines.map(([, line]) => line))
    const links = rendered.join('\n')

    for (const re of [INLINE_LINK, REFERENCE_DEFINITION, HTML_ATTRIBUTE]) {
      for (const [, bracketed, bare] of links.matchAll(re)) {
        const target = bracketed ?? bare
        if (!SCHEME.test(target) && !relativeOk(file, target)) failures.push(`${file} -> ${target}`)
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const [lineNo, line] = lines[i]
      const m = ROUTING_COMMENT.exec(line)
      if (!m) {
        if (ROUTING_COMMENT_LIKE.test(line)) {
          routingComments++
          failures.push(`${file} -> ${line.trim()} (malformed routing comment, line ${lineNo})`)
          continue
        }
        // A port signal that routes to another repository publishes that URL, so it
        // is fetched like a link. Any other comment is not rendered and not read.
        for (const found of urlsIn(line.includes('docs@tether.io:') ? line : rendered[i])) url(file, lineNo, found)
        continue
      }
      routingComments++
      const [, name, ref, rawPath, rawFragment] = m
      const target = decode(rawPath)
      const fragment = rawFragment ? decode(rawFragment) : ''
      const shown = `${target}${fragment ? '#' + fragment : ''}`
      const where = `(routing comment, line ${lineNo})`

      const tree = treeAt(ref)
      const resolved = resolveTreePath(target, tree)
      if (!resolved && tree !== working) {
        failures.push(`${file} -> ${shown} (routing comment, line ${lineNo}${tagNote(file, ref)})`)
        continue
      }
      if (!resolved) {
        // A ref such as release/0.14.0 parses as ref "release" and path
        // "0.14.0/..."; name the path that would resolve so the row is legible.
        const segments = target.split('/')
        const meant = segments.slice(1).map((_, k) => segments.slice(k + 1).join('/')).find((p) => resolveTreePath(p))
        const hint = meant ? `; ref "${ref}" assumed, and ${meant} exists — refs containing "/" are not supported` : ''
        failures.push(`${file} -> ${shown} (routing comment, line ${lineNo}${hint})`)
        continue
      }
      if (badFragment(resolved, fragment, { tree })) {
        failures.push(`${file} -> ${shown} ${where}`)
        continue
      }
      const note = refNote(file, ref)
      if (note) {
        failures.push(`${file} -> ${shown} (routing comment, line ${lineNo}${note})`)
        continue
      }

      // The definition this comment sits under, walking up past other comment
      // lines. The port binds by position and never reads the comment's label,
      // so neither does this; a label naming another slug is only a warning.
      let label = null
      let definition = null
      for (let k = i - 1; k >= 0; k--) {
        const [, above] = lines[k]
        const def = /^\s*\[([^\]]+)\]:\s*<?(\S+?)>?(?:\s|$)/.exec(above)
        if (def) {
          [, label, definition] = def
          break
        }
        if (!HTML_COMMENT_LINE.test(above)) break
      }
      if (!definition) {
        failures.push(`${file} -> ${shown} (routing comment, line ${lineNo}; no link definition above it)`)
        continue
      }
      if (label.toLowerCase() !== name.toLowerCase()) {
        warnings.push(`${file}:${lineNo}: comment labelled ${name} sits under [${label}], which the port binds it to`)
      }
      if (/^[a-z][a-z0-9+.-]*:/i.test(definition)) continue
      const definitionPath = path.posix.normalize(path.posix.join(path.posix.dirname(file), definition.split('#')[0])).replace(/\/$/, '')
      const definitionShown = resolveTreePath(definitionPath) ?? definitionPath
      if (definitionShown !== resolved) {
        warnings.push(`${file}:${lineNo}: ${name} routes to ${resolved}, definition resolves to ${definitionShown}`)
      }
    }
  }

  // Other tracked files: a repository URL anywhere in them (a contract's $schema).
  for (const file of linked) {
    read(file).split(/\r?\n/).forEach((line, i) => {
      for (const found of urlsIn(line)) url(file, i + 1, found, { externals: false })
    })
  }

  // Source files: a comment is text someone reads, so its relative links and
  // external URLs count, in a block comment or after `//` (not the `//` of a URL).
  // A line heuristic, not a parser: a block opens on a `/*` that starts the line or
  // follows whitespace or punctuation, so the one in a glob (`'lib/*.js'`), a quoted
  // string or a URL does not turn the code after it into comment text. A `//` inside
  // a string still reads as a comment. Repository URLs were read above, wherever they sit.
  for (const file of source) {
    let block = false
    read(file).split(/\r?\n/).forEach((line, i) => {
      const lineComment = /(?:^|[^:])\/\/(.*)$/.exec(line)?.[1] ?? ''
      const opener = block ? null : /(?:^|[\s;,{}()=])(\/\*.*)$/.exec(line)
      if (opener && !lineComment.includes(opener[1])) block = true
      const comment = block ? (opener ? opener[1] : line) : lineComment
      for (const [, target] of comment.matchAll(COMMENT_LINK)) {
        if (!relativeOk(file, target)) failures.push(`${file} -> ${target} (comment, line ${i + 1})`)
      }
      for (const found of urlsIn(comment)) if (!REPO_URL.test(found)) url(file, i + 1, found)
      if (line.includes('*/')) block = false
    })
  }

  return { failures, warnings, external, files: markdown.length, routingComments, repoLinks }
}

// Tracked files matching `pattern`, like the listers in tracked-markdown.mjs.
function grepFiles (pattern, pathspecs, exclude, cwd) {
  try {
    // -I: a binary file is never a link source, and release:bump rewrites what this lists as text.
    return execFileSync('git', ['grep', '-I', '-l', '-E', pattern, '--', ...pathspecs, ...exclude.map((p) => `:(exclude,glob)${p}`)], { cwd, encoding: 'utf8' })
      .split('\n').filter(Boolean)
  } catch (err) {
    if (err.status === 1) return [] // git grep: no match
    throw err
  }
}

// Tracked files carrying a public URL into this tree. `exclude` adds glob pathspecs.
export const listRepoLinkFiles = ({ cwd = process.cwd(), exclude = [] } = {}) =>
  grepFiles(REPO_URL_GREP, ['.'], [...REPO_LINK_EXCLUDE, ...exclude], cwd)

// The files at tag `ref`, or null when this clone has no such tag (a shallow CI
// checkout, or a release not cut yet).
function listTagFiles (ref, cwd) {
  try {
    return execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', `refs/tags/${ref}`], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 })
      .split('\0').filter(Boolean)
  } catch {
    return null
  }
}

// Everything checkRepoLinks reads, from the tree at `cwd`.
export function listInputs (cwd = process.cwd()) {
  return {
    treeOf: (ref) => listTagFiles(ref, cwd),
    markdown: listTrackedMarkdown(cwd),
    tracked: listTrackedFiles(cwd),
    linked: listRepoLinkFiles({ cwd, exclude: ['**/*.md'] }),
    source: grepFiles('https?://|\\]\\(\\.\\.?/', SOURCE, SOURCE_EXCLUDE, cwd)
  }
}
