---
title: Agent skills
description: "[⏱️ ~4 min] Install the MDK Developer Skill suite so your coding agent knows MDK conventions, component props, and the page recipe"
docs@tether_slug: guides/ui/agent-skills
---

## Overview

The **MDK Developer Skill suite** (`@tetherto/mdk-skill`) is how an AI coding agent learns to build with MDK. It ships
procedural context in the universal Agent Skills format (`SKILL.md`), so any skills-aware agent (Cursor, Claude Code, and
others) becomes fluent in MDK conventions as soon as the suite is installed.

> [!NOTE]
> Nothing here calls a network or a model. Each skill is a file the agent reads, bundled with the component registry MDK
> builds from its own source. Install once, then let the agent do the rest.

## Prerequisites

- `mdk` on your PATH (see [Install the CLI][install-the-cli])

## Install

From your project root:

```bash
mdk skill add   # Adds both Cursor and Claude Code
```

<details>
<summary>Optional flags</summary>

Use `--client` to target a named agent, or `--dir` to install into another directory, for example:

- `mdk skill add --client cursor`      # .cursor/skills/
- `mdk skill add --client claude`      # .claude/skills/
- `mdk skill add --dir path/to/app`    # target another directory

The [CLI reference][cli-reference] lists the options. `mdk onboard` also offers the install as one of its
steps.

</details>

Skills land flat: one directory per skill, each with its own `SKILL.md`. Agents discover them automatically, so there is
no rule file to wire by hand. Installs are copies, not links: rerun `mdk skill add` after upgrading MDK to refresh
them. The rerun also removes MDK-shipped skills the new version no longer includes, so a renamed or dropped skill
cannot linger and keep triggering. Skills you authored yourself in the same directory are left alone.

## What the suite covers

The suite ships a router plus workflows for device workers, apps, UI pages, and stack deployment. Each skill's
`description` frontmatter is its routing trigger, so you state an intent in plain language and the right skill activates;
composite prompts route as an ordered chain through the router. See the [skill suite][skill-suite] for the current
inventory and each skill's triggers, and the [routing prompts][routing-prompts] for worked examples.

## What the UI skill knows

Use the [`mdk-ui-component`][ui-skill] skill to build dashboards. Alongside its [workflow][ui-workflow] it carries:

- The React Devkit's **generated component registry**, listing every [agent-ready component][component-reference] with its exact
prop names and types, so an agent can't invent props that do not exist. It's generated from the devkit's source on every release and
  never hand-written.
- The [page recipe][page-recipe]: the layer-by-layer contract a page follows.

A page is composition only: data comes from a Gateway route, a hook shapes the payload, the page is thin glue that calls the hook, and the
visuals come from the Devkit. The [page recipe][page-recipe] spells out each layer's responsibilities.

## Verify the install

Open the project in a skills-aware agent and state one of the intents above. The agent should name the skill it
activated. If nothing activates, confirm the skill files landed in your project (for example under `.cursor/skills/` or
`.claude/skills/`). `mdk skill add` does not edit `.gitignore`. Add the installed skill directories to yours so the
suite stays per developer, not committed. Ignore the suite's directories by name rather than the whole skills folder,
which may also hold your team's own committed skills:

```text
.claude/skills/mdk/
.claude/skills/mdk-app-rbac/
.claude/skills/mdk-app-routes/
.claude/skills/mdk-create-app/
.claude/skills/mdk-deployment/
.claude/skills/mdk-publish-security/
.claude/skills/mdk-site-sizing/
.claude/skills/mdk-ui-component/
.claude/skills/mdk-worker/
```

Repeat for `.cursor/skills/` if you install there. `.claude/skills/mdk*/` is a shorter alternative, but it also hides
any skill of your own whose name starts with `mdk`.

## Next steps

- [Build a dashboard][build-a-dashboard]: hand-assemble the Worker, route, and page layers the skills automate
- See [the end-to-end flow the skill follows][ui-workflow]
- Review [each layer's responsibilities][page-recipe]
- Browse the [components][component-reference] the agent composes

## Links

[install-the-cli]: ../cli/install.md
<!-- docs@tether.io: install-the-cli → guides/cli/run-with-npm -->

[build-a-dashboard]: ../../tutorials/build-a-dashboard.md
<!-- docs@tether.io: build-a-dashboard → tutorials/build-a-dashboard -->

[cli-reference]: ../../reference/tooling/cli.md#mdk-skill-add
<!-- docs@tether.io: cli-reference → reference/tooling/cli#mdk-skill-add -->

[skill-suite]: ../../../packages/mdk-skill/README.md
<!-- docs@tether.io: skill-suite → https://github.com/tetherto/mdk/blob/main/packages/mdk-skill/README.md -->

[routing-prompts]: ../../../packages/mdk-skill/README.md#try-it--routing-prompts
<!-- docs@tether.io: routing-prompts → https://github.com/tetherto/mdk/blob/main/packages/mdk-skill/README.md#try-it--routing-prompts -->

[component-reference]: ../../../ui/packages/react-devkit/README.md
<!-- docs@tether.io: component-reference → reference/ui/components -->

[page-recipe]: ../../../packages/mdk-skill/src/skills/mdk-ui-component/references/page-recipe.md
<!-- docs@tether.io: page-recipe → https://github.com/tetherto/mdk/blob/main/packages/mdk-skill/src/skills/mdk-ui-component/references/page-recipe.md -->

[ui-workflow]: ../../../packages/mdk-skill/src/skills/mdk-ui-component/SKILL.md#workflow
<!-- docs@tether.io: ui-workflow → https://github.com/tetherto/mdk/blob/main/packages/mdk-skill/src/skills/mdk-ui-component/SKILL.md#workflow -->

[ui-skill]: ../../../packages/mdk-skill/src/skills/mdk-ui-component/SKILL.md
<!-- docs@tether.io: ui-skill → https://github.com/tetherto/mdk/blob/main/packages/mdk-skill/src/skills/mdk-ui-component/SKILL.md -->
