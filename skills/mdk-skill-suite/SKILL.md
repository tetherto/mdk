---
name: mdk-skill-suite
description: >
  The MDK product skill suite (mdk, mdk-worker-plugin, mdk-gateway-plugin,
  mdk-create-app, mdk-ui-component, mdk-deployment, mdk-site-sizing) is not
  installed in this checkout. Use this whenever a task mentions MDK, a worker,
  a Worker Plugin, a Gateway plugin, scaffolding or creating an MDK App, a UI
  component for worker/plugin data, deploying an MDK stack, or sizing a site
  from a description.
---

# MDK skill suite 

Run from the repo root:

```bash
npm run install:skills --workspace=packages/mdk-skill
```

The installed directories are gitignored — regenerate anytime, never hand-edit, never commit them.

See [`packages/mdk-skill/README.md`](../../packages/mdk-skill/README.md) for the full build/install/publish story.
