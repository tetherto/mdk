# Examples convention — core

Core has no per-scenario examples tree. No package under [`backend/core/`](../README.md) carries an `examples/` directory,
and none is planned until a package gains a scenario its README cannot show in one snippet.

What stands in for examples today:

- The end-to-end example is [`examples/mvp-site/`](../../../examples/mvp-site/README.md): a Kernel, a Gateway, several
  Workers against bundled mocks, and a dashboard, run from one directory.
- A single Worker runs against its bundled mock through `npm run mock` plus the boot script in its guide, for example
  [run an Avalon Worker](../../../docs/guides/miners/run-avalon-worker.md).
- Each package README shows its own API in short fenced snippets, which the
  [example-path check](../../../docs/reference/maintainers/linters.md#nightly-example-path-verification) keeps pointing at
  files that exist.

When a core package does gain examples, it follows the convention the Worker side already uses, set out in
[`agent-ready-sdk.md`](../../../docs/reference/maintainers/agent-ready-sdk.md#examples-convention): a flat `examples/`
directory, one runnable `.js` file per scenario named `run-<scenario>.js`, and subdirectories only when a feature has many
variants, so an agent can read exactly the file it needs.
