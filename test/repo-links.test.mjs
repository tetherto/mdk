import test from 'node:test'
import assert from 'node:assert/strict'

import { checkRepoLinks, mapProse, slug } from '../docs/scripts/lib/repo-links.mjs'

// Every fixture is a map of tracked path -> content. `markdown` is derived
// from it, so a fixture never has to list the same file twice.
function run (files, { tracked = [], ...rest } = {}) {
  const markdown = Object.keys(files).filter((f) => f.endsWith('.md'))
  return checkRepoLinks({
    markdown,
    tracked: [...Object.keys(files), ...tracked],
    read: (f) => {
      if (!(f in files)) throw new Error(`fixture has no ${f}`)
      return files[f]
    },
    ...rest
  })
}

const PUBLIC = 'https://github.com/tetherto/mdk/blob/main/'

test('slug follows GitHub heading ids: code, emphasis and punctuation stripped, spaces to hyphens', () => {
  assert.equal(slug('Contract validation'), 'contract-validation')
  assert.equal(slug('`mdk-contract.json` (v1)'), 'mdk-contractjson-v1')
  assert.equal(slug('**Bold** and _italic_ and [a link](x.md)'), 'bold-and-italic-and-a-link')
  assert.equal(slug('`SFW_UNKNOWN_HOST_ACTION` and snake_case'), 'sfw_unknown_host_action-and-snake_case')
})

test('a relative anchor that resolves passes; one that does not fails in the file -> target shape', () => {
  const r = run({
    'docs/a.md': '# A\n\n[ok](./b.md#section-two) [bad](./b.md#nope) [self](#a) [self-bad](#missing)',
    'docs/b.md': '# B\n\n## Section two\n'
  })
  assert.deepEqual(r.failures, ['docs/a.md -> ./b.md#nope', 'docs/a.md -> #missing'])
  assert.deepEqual(r.warnings, [])
})

test('duplicate headings get GitHub suffixes, and explicit <a name> anchors count', () => {
  const r = run({
    'docs/a.md': '[one](./b.md#step) [two](./b.md#step-1) [named](./b.md#custom)',
    'docs/b.md': '## Step\n\n## Step\n\n<a name="custom"></a>\n'
  })
  assert.deepEqual(r.failures, [])
})

test('links and routing comments inside fenced code blocks are ignored on both sides', () => {
  const r = run({
    'docs/a.md': [
      '```markdown',
      '[example](./b.md#not-real)',
      '[slug]: ./b.md',
      `<!-- docs@tether.io: slug → ${PUBLIC}does/not/exist.md -->`,
      '```',
      '[real](./b.md#real)'
    ].join('\n'),
    'docs/b.md': '```\n## Not real\n```\n\n## Real\n'
  })
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.warnings, [])
})

test('a routing comment whose fragment the target lacks fails; one whose path is untracked fails', () => {
  const r = run({
    'docs/g.md': [
      `[a]: ../backend/README.md#gone\n<!-- docs@tether.io: a → ${PUBLIC}backend/README.md#gone -->`,
      `[b]: ../backend/missing.md\n<!-- docs@tether.io: b → ${PUBLIC}backend/missing.md -->`
    ].join('\n'),
    'backend/README.md': '# Backend\n'
  })
  assert.deepEqual(r.failures, [
    'docs/g.md -> ../backend/README.md#gone',
    'docs/g.md -> ../backend/missing.md',
    'docs/g.md -> backend/README.md#gone (routing comment, line 2)',
    'docs/g.md -> backend/missing.md (routing comment, line 4)'
  ])
})

test('a routing comment may point at a non-Markdown file or a bare directory, blob or tree; a fragment on source is left alone', () => {
  const r = run({
    'docs/g.md': [
      `[lic]: ../LICENSE\n<!-- docs@tether.io: lic → ${PUBLIC}LICENSE -->`,
      '[dir]: ../backend/tests/published/\n<!-- docs@tether.io: dir → https://github.com/tetherto/mdk/tree/main/backend/tests/published -->',
      `[dir2]: ../backend/tests/published/\n<!-- docs@tether.io: dir2 → ${PUBLIC}backend/tests/published/ -->`,
      `[js]: ../backend/core/kernel/index.js\n<!-- docs@tether.io: js → ${PUBLIC}backend/core/kernel/index.js#L12 -->`
    ].join('\n'),
    LICENSE: 'Apache',
    'backend/core/kernel/index.js': '',
    'backend/tests/published/data.json': '{}'
  })
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.warnings, [])
  assert.equal(r.routingComments, 4)
})

test('a directory target with a fragment resolves through its README; a bare directory cannot carry one', () => {
  const r = run({
    'docs/g.md': [
      '[site]: ../examples/site/README.md#prerequisites\n<!-- docs@tether.io: site → https://github.com/tetherto/mdk/tree/main/examples/site#prerequisites -->',
      '[bare]: ../examples/bare/\n<!-- docs@tether.io: bare → https://github.com/tetherto/mdk/tree/main/examples/bare#setup -->'
    ].join('\n'),
    'examples/site/README.md': '## Prerequisites\n',
    'examples/bare/index.js': ''
  })
  assert.deepEqual(r.failures, ['docs/g.md -> examples/bare#setup (routing comment, line 4)'])
  assert.deepEqual(r.warnings, [])
})

test('a comment that routes a slug somewhere other than its definition is a warning without the " -> " shape', () => {
  const r = run({
    'docs/guides/w.md': `[writes]: ../concepts/control-plane.md#approval-gated-writes\n<!-- docs@tether.io: writes → ${PUBLIC}backend/core/kernel/README.md#actionmanager -->`,
    'docs/concepts/control-plane.md': '## Approval-gated writes\n',
    'backend/core/kernel/README.md': '## ActionManager\n'
  })
  assert.deepEqual(r.failures, [])
  assert.equal(r.warnings.length, 1)
  assert.match(r.warnings[0], /^docs\/guides\/w\.md:2: writes routes to backend\/core\/kernel\/README\.md, definition resolves to docs\/concepts\/control-plane\.md$/)
  assert.ok(!r.warnings[0].includes(' -> '), 'warnings must not look like broken rows to the nightly grep')
})

test('the definition is found past intervening comment lines, and a full-URL definition is not compared', () => {
  const r = run({
    'docs/g.md': [
      '[two]: ../backend/README.md',
      '<!-- mdk-monorepo: temp -->',
      `<!-- docs@tether.io: two → ${PUBLIC}backend/README.md -->`,
      '[ext]: https://github.com/tetherto/mdk/blob/main/backend/README.md',
      `<!-- docs@tether.io: ext → ${PUBLIC}backend/README.md -->`
    ].join('\n'),
    'backend/README.md': '# Backend\n'
  })
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.warnings, [])
})

test('comments that route to another repository are not routing comments for this tree', () => {
  const r = run({
    'docs/g.md': '[demo]: https://github.com/tetherto/mdk-app-demo\n<!-- docs@tether.io: demo → https://github.com/tetherto/mdk-app-demo/blob/main/README.md -->'
  })
  assert.deepEqual(r.failures, [])
  assert.equal(r.routingComments, 0)
})

test('a comment that names this repository but does not parse as a routing comment fails instead of being skipped', () => {
  const r = run({
    'docs/g.md': [
      `[a]: ../backend/README.md\n<!-- docs@tether.io: a -> ${PUBLIC}backend/missing.md -->`,
      `[two words]: ../backend/README.md\n<!-- docs@tether.io: two words → ${PUBLIC}backend/missing.md -->`
    ].join('\n'),
    'backend/README.md': '# Backend\n'
  })
  assert.deepEqual(r.failures, [
    `docs/g.md -> <!-- docs@tether.io: a -> ${PUBLIC}backend/missing.md --> (malformed routing comment, line 2)`,
    `docs/g.md -> <!-- docs@tether.io: two words → ${PUBLIC}backend/missing.md --> (malformed routing comment, line 4)`
  ])
  assert.equal(r.routingComments, 2)
})

test('a ref containing a slash fails with a hint naming the path it was probably meant to be', () => {
  const r = run({
    'docs/g.md': '[b]: ../backend/README.md\n<!-- docs@tether.io: b → https://github.com/tetherto/mdk/blob/release/0.14.0/backend/README.md -->',
    'backend/README.md': '# Backend\n'
  })
  assert.deepEqual(r.failures, [
    'docs/g.md -> 0.14.0/backend/README.md (routing comment, line 2; ref "release" assumed, and backend/README.md exists — refs containing "/" are not supported)'
  ])
})

test('a comment binds to the definition above it as the port does; a label differing only in case is silent', () => {
  const r = run({
    'docs/g.md': `[D]: ../docs/other.md\n<!-- docs@tether.io: d → ${PUBLIC}backend/README.md -->`,
    'docs/other.md': '# Other\n',
    'backend/README.md': '# Backend\n'
  })
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.warnings, ['docs/g.md:2: d routes to backend/README.md, definition resolves to docs/other.md'])
})

test('a label that names a different slug from the definition above it is a warning', () => {
  const r = run({
    'docs/g.md': `[kernel]: ../backend/README.md\n<!-- docs@tether.io: gateway → ${PUBLIC}backend/README.md -->`,
    'backend/README.md': '# Backend\n'
  })
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.warnings, ['docs/g.md:2: comment labelled gateway sits under [kernel], which the port binds it to'])
})

test('a routing comment with no link definition above it fails, since the port drops it', () => {
  const r = run({
    'docs/g.md': `Some prose.\n<!-- docs@tether.io: lost → ${PUBLIC}backend/README.md -->`,
    'backend/README.md': '# Backend\n'
  })
  assert.deepEqual(r.failures, ['docs/g.md -> backend/README.md (routing comment, line 2; no link definition above it)'])
})

// Links into this tree from files that are not Markdown (a contract's $schema, a JSDoc link). The
// release bump pins them to a tag that does not exist yet, so they are resolved here, offline.
function runLinked (files, linked) {
  return checkRepoLinks({
    markdown: Object.keys(files).filter((f) => f.endsWith('.md')),
    tracked: Object.keys(files),
    linked,
    read: (f) => files[f]
  })
}

test('a repository link in a non-Markdown file resolves against the tree, for blob, tree and raw URLs on any ref', () => {
  const r = runLinked({
    'backend/w/mdk-contract.json': '{\n  "$schema": "https://raw.githubusercontent.com/tetherto/mdk/v0.14.0/backend/core/schema.json",\n  "x": 1\n}\n',
    'ui/hook.ts': ' * [auth](https://github.com/tetherto/mdk/blob/main/backend/README.md#auth-plugin)\n * [dir](https://github.com/tetherto/mdk/tree/v0.14.0/backend/).\n',
    'backend/core/schema.json': '{}',
    'backend/README.md': '# Backend\n\n## Auth plugin\n'
  }, ['backend/w/mdk-contract.json', 'ui/hook.ts'])
  assert.deepEqual(r.failures, [])
  assert.equal(r.repoLinks, 3)
})

test('a repository link in a non-Markdown file fails on a missing path or a missing heading, with its line', () => {
  const r = runLinked({
    'backend/w/mdk-contract.json': '{\n  "$schema": "https://raw.githubusercontent.com/tetherto/mdk/main/backend/core/gone.json"\n}\n',
    'ui/hook.ts': '// x\n * [auth](https://github.com/tetherto/mdk/blob/v0.14.0/backend/README.md#nope)\n',
    'backend/README.md': '# Backend\n'
  }, ['backend/w/mdk-contract.json', 'ui/hook.ts'])
  assert.deepEqual(r.failures, [
    'backend/w/mdk-contract.json -> backend/core/gone.json (repository link, line 2)',
    'ui/hook.ts -> backend/README.md#nope (repository link, line 2)'
  ])
})

test('links to other repositories and release pages are not repository links', () => {
  const r = runLinked({
    'a.ts': 'https://github.com/tetherto/mdk-docs/blob/main/x.md https://github.com/tetherto/mdk/releases/tag/v0.14.0'
  }, ['a.ts'])
  assert.deepEqual(r.failures, [])
  assert.equal(r.repoLinks, 0)
})

// Relative links: the tree is the reference, so a folder is as valid a target as a file.

test('a relative link resolves to a tracked file, a folder with or without a README, or fails', () => {
  const r = run({
    'docs/a.md': [
      '[file](./b.md) [asset](../LICENSE) [folder](../backend/core/) [bare](../backend/tests) ![img](img/x.png)',
      '[gone](./gone.md) [gone-dir](../backend/nope/) [out](../../outside.md)',
      '<a href="./b.md">ok</a> <img src="./missing.png">',
      '[ref]: ../backend/gone.js'
    ].join('\n'),
    'docs/b.md': '# B\n',
    'docs/img/x.png': '',
    LICENSE: '',
    'backend/core/README.md': '# Core\n',
    'backend/tests/data.json': '{}'
  })
  assert.deepEqual(r.failures, [
    'docs/a.md -> ./gone.md',
    'docs/a.md -> ../backend/nope/',
    'docs/a.md -> ../../outside.md',
    'docs/a.md -> ../backend/gone.js',
    'docs/a.md -> ./missing.png'
  ])
})

test('a fragment on a folder link resolves through its README; query strings, mailto and build output are not paths', () => {
  const r = run({
    'docs/a.md': '[ok](../backend/core/#setup) [bad](../backend/core/#nope) [q](./b.md?plain=1) [m](mailto:a@b.c) [line](../x.js#L3) [built](../ui/dist/registry.json)',
    'docs/b.md': '# B\n',
    'x.js': '',
    'backend/core/README.md': '## Setup\n'
  })
  assert.deepEqual(r.failures, ['docs/a.md -> ../backend/core/#nope'])
})

test('a link shown in inline code is a sample, not a link', () => {
  const r = run({ 'docs/a.md': 'Write `[text](./nope.md)` or `https://github.com/tetherto/mdk/blob/main/nope.md`.' })
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.external, [])
})

test('a repository URL in Markdown prose resolves against the tree like any other', () => {
  const r = run({
    'docs/a.md': `[ok](${PUBLIC}backend/README.md) [raw](${PUBLIC}backend/README.md?plain=1#backend) [bad](${PUBLIC}backend/gone.md) [%](${PUBLIC}backend/100%.md)`,
    'backend/README.md': '# Backend\n'
  })
  assert.deepEqual(r.failures, [
    'docs/a.md -> backend/gone.md (repository link, line 1)',
    'docs/a.md -> backend/100%.md (repository link, line 1)'
  ])
  assert.equal(r.repoLinks, 4)
  assert.deepEqual(r.external, [])
})

test('with a version, a ref other than main or that release tag fails, except in changelogs', () => {
  const stale = 'https://github.com/tetherto/mdk/blob/v0.13.0/backend/README.md'
  const r = run({
    'docs/g.md': [
      `[a]: ../backend/README.md\n<!-- docs@tether.io: a → ${stale} -->`,
      `[b]: ../backend/README.md\n<!-- docs@tether.io: b → ${PUBLIC}backend/README.md -->`,
      `[c]: ../backend/README.md\n<!-- docs@tether.io: c → ${stale.replace('0.13.0', '0.14.0')} -->`
    ].join('\n'),
    'CHANGELOG.md': `[old](${stale})`,
    'docs/reference/changelog-archive/2026-archive.md': `[old](${stale})`,
    'a.ts': `// ${stale}`,
    'backend/README.md': '# Backend\n'
  }, { version: '0.14.0', linked: ['a.ts'] })
  assert.deepEqual(r.failures, [
    'docs/g.md -> backend/README.md (routing comment, line 2; ref "v0.13.0", expected main or v0.14.0)',
    'a.ts -> backend/README.md (repository link, line 1; ref "v0.13.0", expected main or v0.14.0)'
  ])
})

// Comments are text someone reads: their relative links resolve from the source file.
test('a relative link in a comment resolves from its file; code is not read', () => {
  const r = run({
    'backend/core/plugin.js': [
      '/**',
      ' * [loader](./lib/loader.js) and [guide](../../docs/a.md#setup)',
      ' * [gone](./lib/gone.js) and [bad](../../docs/a.md#nope)',
      ' */',
      "const s = '[not a link](./nope.js)' // [line comment](./nope2.js)",
      '/* [plain block](./nope3.js) */',
      "const u = 'https://example.com/[x](./nope4.js)'"
    ].join('\n'),
    'backend/core/lib/loader.js': '',
    'docs/a.md': '## Setup\n'
  }, { source: ['backend/core/plugin.js'] })
  assert.deepEqual(r.failures, [
    'backend/core/plugin.js -> ./lib/gone.js (comment, line 3)',
    'backend/core/plugin.js -> ../../docs/a.md#nope (comment, line 3)',
    'backend/core/plugin.js -> ./nope2.js (comment, line 5)',
    'backend/core/plugin.js -> ./nope3.js (comment, line 6)'
  ])
})

// What is left for the network: every other http(s) URL a reader can follow, with where it sits.
test('external URLs come from Markdown prose and source comments, each with file and line', () => {
  const r = run({
    'docs/a.md': [
      '[x](https://example.com/a#frag) and <https://example.org/b>, bare https://example.net/c.',
      'Open http://localhost:3000/ or http://10.0.0.4:3000 or https://…/x: samples, never fetched.',
      '```',
      'curl https://fenced.example/',
      '```',
      'Run `curl https://inline.example/`. <!-- https://comment.example/ --> <!-- TODO: later',
      'https://multiline-comment.example/ -->',
      '[ref]: https://example.com/ref "title"',
      `[repo](${PUBLIC}backend/README.md) [tag](https://github.com/tetherto/mdk/releases/tag/v0.14.0)`
    ].join('\n'),
    'ui/hook.ts': [
      '/**',
      ' * See https://example.com/hook and https://$' + '{host}/x and https://api.<region>.example/.',
      ' */',
      "fetch('https://code.example/') // from https://line.example/docs",
      '/* https://block.example/ */'
    ].join('\n'),
    'backend/README.md': '# Backend\n'
  }, { source: ['ui/hook.ts'] })
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.external, [
    { url: 'https://example.com/a#frag', file: 'docs/a.md', line: 1 },
    { url: 'https://example.org/b', file: 'docs/a.md', line: 1 },
    { url: 'https://example.net/c', file: 'docs/a.md', line: 1 },
    { url: 'https://example.com/ref', file: 'docs/a.md', line: 8 },
    { url: 'https://github.com/tetherto/mdk/releases/tag/v0.14.0', file: 'docs/a.md', line: 9 },
    { url: 'https://example.com/hook', file: 'ui/hook.ts', line: 2 },
    { url: 'https://line.example/docs', file: 'ui/hook.ts', line: 4 },
    { url: 'https://block.example/', file: 'ui/hook.ts', line: 5 }
  ])
})

test('a routing comment to another repository is fetched; a comment opener or a double-backtick span shown as code hides nothing after it', () => {
  const r = run({
    'docs/a.md': [
      '[demo]: https://github.com/tetherto/mdk-app-demo',
      '<!-- docs@tether.io: demo → https://github.com/tetherto/mdk-app-demo/blob/main/README.md -->',
      'Write `<!--` to open a comment. [after](./nope.md) https://after.example/',
      'Use ``a`b`` then [x](./nope2.md).'
    ].join('\n')
  })
  assert.deepEqual(r.failures, ['docs/a.md -> ./nope.md', 'docs/a.md -> ./nope2.md'])
  assert.deepEqual(r.external.map((e) => `${e.line} ${e.url}`), [
    '1 https://github.com/tetherto/mdk-app-demo',
    '2 https://github.com/tetherto/mdk-app-demo/blob/main/README.md',
    '3 https://after.example/'
  ])
})

test('a fence closes only on its own character at its own length, so a nested fence hides nothing after the block', () => {
  const r = run({
    'docs/a.md': ['````md', '```', '[in](./sample.md)', '````', '[after](./nope.md)', '```', '~~~', '[in](./sample.md)', '```', '[after2](./nope2.md)'].join('\n')
  })
  assert.deepEqual(r.failures, ['docs/a.md -> ./nope.md', 'docs/a.md -> ./nope2.md'])
})

test('mapProse reaches prose and comments, never fenced code or a code span', () => {
  const text = ['a `a` a <!-- a -->', '```', 'a', '```', 'a ``a`a`` a'].join('\n')
  assert.equal(mapProse(text, (part) => part.replaceAll('a', 'B')), ['B `a` B <!-- B -->', '```', 'a', '```', 'B ``a`a`` B'].join('\n'))
})

test('a link pinned to a tag that exists resolves against that tag\'s tree, not the working tree', () => {
  const at = { 'v0.14.0': ['docs/a.md', 'docs/b.md'], 'v0.12.0': ['docs/a.md', 'backend/old.js'] }
  const r = run({
    'docs/a.md': [
      '[new](https://github.com/tetherto/mdk/blob/v0.14.0/docs/new.md)',
      '[kept](https://github.com/tetherto/mdk/blob/v0.14.0/docs/b.md#b)',
      '[new]: ./new.md',
      '<!-- docs@tether.io: new → https://github.com/tetherto/mdk/blob/v0.14.0/docs/new.md -->'
    ].join('\n'),
    'docs/b.md': '# B\n',
    'docs/new.md': '# New\n',
    'CHANGELOG.md': '[gone](https://github.com/tetherto/mdk/blob/v0.12.0/backend/old.js) [never](https://github.com/tetherto/mdk/blob/v0.12.0/backend/never.js)'
  }, { version: '0.14.0', treeOf: (ref) => at[ref] ?? null })
  assert.deepEqual(r.failures, [
    'docs/a.md -> docs/new.md (repository link, line 1; not in the tree at v0.14.0, link to main until the next release)',
    'docs/a.md -> docs/new.md (routing comment, line 4; not in the tree at v0.14.0, link to main until the next release)',
    'CHANGELOG.md -> backend/never.js (repository link, line 1; not in the tree at v0.12.0)'
  ])
})

test('a tag that does not exist yet falls back to the working tree', () => {
  const r = run({
    'docs/a.md': '[new](https://github.com/tetherto/mdk/blob/v0.14.0/docs/new.md)',
    'docs/new.md': '# New\n'
  }, { version: '0.14.0', treeOf: () => null })
  assert.deepEqual(r.failures, [])
})

test('a line anchor on a Markdown file is valid with ?plain=1 and a heading id without it', () => {
  const r = run({
    'docs/a.md': `[ok](${PUBLIC}docs/b.md?plain=1#L3) [range](./b.md?plain=1#L1-L2) [bad](./b.md#L3)`,
    'docs/b.md': '# B\n'
  })
  assert.deepEqual(r.failures, ['docs/a.md -> ./b.md#L3'])
})

test('slug keeps an underscore that is literal inside a code span', () => {
  assert.equal(slug('Use `_id` field'), 'use-_id-field')
  assert.equal(slug('`__init__` and _emphasis_'), '__init__-and-emphasis')
})

test('a URL that runs into an HTML tag is a link; one that runs into a placeholder is a sample', () => {
  const r = run({
    'docs/a.md': `| ${PUBLIC}docs/gone.md<br>next |\n<td>https://real.example.com/path</td>\nhttps://api.example.com/<id> https://<host>/x`
  })
  assert.deepEqual(r.failures, ['docs/a.md -> docs/gone.md (repository link, line 1)'])
  assert.deepEqual(r.external.map((e) => e.url), ['https://real.example.com/path'])
})

test('an angle-bracket destination may hold a space', () => {
  const r = run({
    'docs/a.md': '[x](<./my file.md>) [y](<./no file.md>)\n\n[z]: <./my file.md>',
    'docs/my file.md': '# M\n'
  })
  assert.deepEqual(r.failures, ['docs/a.md -> ./no file.md'])
})

test('a /* inside a string, a glob or a URL does not open a block comment', () => {
  const r = run({}, {
    source: ['src/a.js'],
    tracked: ['src/a.js'],
    read: () => [
      "const glob = 'lib/*.js'",
      '// see https://api.example.com/*',
      "const api = 'https://internal.example.com/v1'",
      'call() /* https://block.example.com/doc',
      '   https://more.example.com/doc */',
      "const after = 'https://after.example.com/'"
    ].join('\n')
  })
  assert.deepEqual(r.external.map((e) => e.url), ['https://api.example.com/', 'https://block.example.com/doc', 'https://more.example.com/doc'])
})
