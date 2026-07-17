# Docs maintainer plumbing

The maintainer surface for this monorepo's documentation: authoring conventions, the SDK / Worker contract, the tag overlay, the port-pipeline signals, and the hand-maintained integrations catalogue. Read this folder when you are **changing the docs themselves** — adding a Worker that needs a catalogue row, adding a new docs page that needs port signals, tweaking the IA. Skip it if you only want to **use** MDK — start at [`../../README.md`](../../README.md) instead.

| File | What it owns |
|------|--------------|
| [`ia.md`](ia.md) | Information architecture: one fact / one folder, where docs live, integration ontology, the proposed QA gates, and the [Derived vocabulary](ia.md#derived-vocabulary) target. |
| [`agent-ready-sdk.md`](agent-ready-sdk.md) | Contract for `backend/core/` and `backend/workers/` artefacts: what `mdk-contract.json` already ships, and the `USAGE.md` + `examples/` conventions added on top. |
| [`port-signals.md`](port-signals.md) | Comment vocabulary that authors emit beside reference-style links and GFM callouts so the port pipeline to [https://docs.mdk.tether.io/](https://docs.mdk.tether.io/) can rewrite targets and convert alerts to fumadocs `<Callout>` JSX. Enforced by `check:port-signals`. |
| [`tag-vocab.yaml`](tag-vocab.yaml) | Presentation overlay: slug → display labels for tags that originate in `mdk-contract.json` and UI JSDoc, plus the docs-only `integration-kinds` browse roll-up. Not a constraint surface. |
| [`integrations/`](integrations/index.md) | Hand-maintained catalogue of what MDK can talk to (hardware, pool integrations, external services). Lives here, not at `docs/integrations/`, because the tables drift silently from shipping Workers until [`check:integrations-fresh`](ia.md#checkintegrations-fresh) lands. Each index page carries an invisible `<!-- mdk-monorepo: hand-maintained ... -->` reminder for the editing maintainer. |
| [`plans/`](plans/operational-centre-pages.md) | Draft implementation plans for MDK shell pages and features (Operational Centre, Pool Manager, and related sprint backlogs). Planning-only artefacts — not ported to the public docs site. |
| [`linters.md`](linters.md) | Documentation linting tooling: linkinator nightly + PR-time link verification (with the fragment-check rollout policy), Vale spelling, deferred Markdownlint. Distinct from the IA-specific gates in [`ia.md`](ia.md#qa-gates). |
| [`worker-runtime-legacy-services.md`](worker-runtime-legacy-services.md) | `WorkerRuntime`'s migration history from `MDKWorkerAdapter`/`ThingManager`, and the `opts.services` legacy worker-infra surface (`service-builtins.js`) that lets a host answer adapter-era queries and commands from a manager's store. |

Together these files describe how an artefact in `*/packages/**/` shows up in the docs catalogue: contract authority lives with the engineers (`mdk-contract.schema.json`, UI registry generator), the docs side adds prose, wires in the runnable examples, a thin presentation overlay, and the port-signal hints that let the public docs site rewrite cross-references on port.

The end-user-facing content (`concepts/`, `tutorials/`, `guides/`) and the role-based router (`README.md`) live in [`docs/`](../../README.md).

