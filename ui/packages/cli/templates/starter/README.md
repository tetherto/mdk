# {{appName}}

An MDK-powered app scaffolded with `mdk-ui create`.

## Getting started

```bash
npm run dev      # start the dev server on http://localhost:5173
npm run build    # type-check and build for production
npm run preview  # preview the production build
```

## Adding a new page

The CLI automates page creation and routing:

```bash
npx mdk-ui add page Hashrate --component LineChartCard
```

This generates `src/pages/Hashrate.tsx` and appends a route entry to
`src/routes.ts`. The sidebar updates automatically because it reads from
the same `ROUTES` array.

To remove a generated page:

```bash
npx mdk-ui remove page Hashrate
```

## Project layout

```
src/
  main.tsx          React entrypoint, wraps the app in <MdkProvider>
  App.tsx           Layout shell (sidebar + outlet)
  router.tsx        React Router config, dynamically built from routes.ts
  routes.ts         Single source of truth for routes — extended by the CLI
  pages/            One file per route
```

## Agent context

This project ships with agent-first context files:

- `.mdk/context.md` — high-level conventions
- `.cursor/rules/mdk.mdc` — Cursor rule
