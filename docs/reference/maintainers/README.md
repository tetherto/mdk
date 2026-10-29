# Docs maintainer plumbing

The maintainer surface for this monorepo's documentation: authoring conventions, the SDK / Worker contract, the tag overlay, the port-pipeline signals, and the hand-maintained integrations catalogue. Read this folder when you are **changing the docs themselves** — adding a Worker that needs a catalogue row, adding a new docs page that needs port signals, tweaking the IA. Skip it if you only want to **use** MDK — start at [`../../README.md`](../../README.md) instead.

| File | What it owns |
|------|--------------|
| [`ia.md`](ia.md) | Information architecture: one fact / one folder, where docs live, integration ontology, the proposed QA gates, and the [Derived vocabulary](ia.md#derived-vocabulary) target. |
| [`agent-ready-sdk.md`](agent-ready-sdk.md) | Contract for [`backend/core/`](../../../backend/core/README.md) and [`backend/workers/`](../../../backend/workers/README.md) artefacts: what `mdk-contract.json` already ships, and the `USAGE.md` + `examples/` conventions added on top. |
| [`single-source-of-truth.md`](single-source-of-truth.md) | Comment vocabulary that authors emit beside reference-style links and GFM callouts so the port pipeline to [https://docs.mdk.tether.io/](https://docs.mdk.tether.io/) can rewrite targets and convert alerts to fumadocs `<Callout>` JSX. Enforced by `check:port-signals`. Also covers the UI manifest generation workflow, and the [generated pages](single-source-of-truth.md#generation-scripts) that a script rather than a person writes: which pages they are, which generator owns each, and the `npm run regenerate-docs` command that rewrites them all or reports what has gone stale. |
| [`tag-vocab.yaml`](tag-vocab.yaml) | Presentation overlay: slug → display labels for tags that originate in `mdk-contract.json` and UI JSDoc, plus the docs-only `integration-kinds` browse roll-up. Not a constraint surface. |
| [`integrations/`](integrations/index.md) | Hand-maintained catalogue of what MDK can talk to (hardware, pool integrations, external services). Lives here, not at `docs/integrations/`, because the tables drift silently from shipping Workers until [`check:integrations-fresh`](ia.md#checkintegrations-fresh) lands. Each index page carries an invisible `<!-- mdk-monorepo: hand-maintained ... -->` reminder for the editing maintainer. |
| [`linters.md`](linters.md) | Documentation linting tooling: linkinator nightly + PR-time link verification (with the fragment-check rollout policy), Vale spelling, deferred Markdownlint. Distinct from the IA-specific gates in [`ia.md`](ia.md#qa-gates). |

Together these files describe how an artefact in `*/packages/**/` shows up in the docs catalogue: contract authority lives with the engineers ([`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json), UI registry generator), the docs side adds prose, wires in the runnable examples, a thin presentation overlay, and the port-signal hints that let the public docs site rewrite cross-references on port.

The end-user-facing content ([`concepts/`](../../concepts/), [`tutorials/`](../../tutorials/), [`guides/`](../../guides/)) and the role-based router ([`README.md`](./README.md)) live in [`docs/`](../../README.md).

## Docs-code parity

> This is the product-change flow; a reader-reported gap in existing docs uses a
> `docs-needed` issue.

The north star is that docs ship in the same release as their code. A `docs-required` and `docs-review-required` label can be added to signal
to maintainers that action is needed. From v1 a [hard gate](#hard-gate-v1) is proposed on the release PR.

The labels are added by hand, or by checking the box in the PR template. This
 allows an open source contributor to flag that docs need the same way an internal engineer does.
 Each checkbox adds its own label through the labeler workflow:

- `docs-required`: the code change ships without its docs
- `docs-review-required`: the docs are included in the PR; the engineer requests review from the docs maintainer

If a reviewer decides a label should apply but it was omitted, the reviewer adds the label, or amends the PR description if they
have write access.

This flow does not gate a contributor's merge. Once the docs work is complete, the maintainer removes the label.

### Hard gate (v1)

From v1, it is proposed that CI enforces the hold that the release checklist enforces by hand today. A release-scoped workflow,
triggered on a PR to `main` from a `release/*` branch, runs the queue command as
[`RELEASING.md`](../../../RELEASING.md) and fails only when an item recorded in the prior version's [`CHANGELOG.md`](../../../CHANGELOG.md) entry still carries `docs-required`.

Items new in the current cycle warn; they never fail the run. The gate can only fail the release PR, which the release engineer
owns; a contributor's PR has no docs check to fail.

Wiring: branch protection marks the workflow a required check on `main`. Branch protection is a repo setting and settings do not
mirror, so DevOps would need to apply it in both repos. The workflow follows the conventions of the scheduled docs checks, pinned action
commits and a concurrency group as in `table-refs.yml`.

