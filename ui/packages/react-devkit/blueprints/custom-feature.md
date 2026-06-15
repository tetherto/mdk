---
id: custom-feature
title: Custom Feature (Out-of-Scope Domain)
intent: >
  Guidance for building features in domains MDK does not ship — weather,
  inventory, social, marketing, etc. The honest answer to "can MDK build me
  an X dashboard?" when X isn't mining-operations, financial-reporting, or
  device-management.
domain: generic
orkCapabilities: []
components:
  - Button
  - DataTable
  - LineChart
  - AreaChart
  - Input
  - Select
  - DatePicker
  - DateRangePicker
  - Form
  - Sidebar
hooks: []
demoRoute: /core
---

## When to use

Pick this blueprint when the user's goal does not map to any of MDK's
shipped mining domains. Examples:

- "Add a weather widget."
- "Build an inventory tracker."
- "Display Twitter mentions."
- "Show me a generic line chart of arbitrary data."

MDK does **not** ship domain components for these. What it does ship is a
set of solid, themed, accessible **core primitives** that compose into any
feature. Use them; don't try to repurpose mining-operations components.

## How to compose

```tsx
import {
  AreaChart,
  Button,
  DataTable,
  DatePicker,
  Form,
  Input,
  LineChart,
  Select,
  Sidebar,
} from "@tetherto/mdk-react-devkit";

export default function WeatherDashboardExample() {
  // Author the feature in your app: fetch with your own hooks, hold state
  // however you normally do, and reach for MDK core primitives for the
  // visible surface. Styling and theming are inherited automatically.
  return (
    <main>
      <Sidebar>{/* your nav */}</Sidebar>
      <section>
        <Form>{/* Input, Select, DatePicker as needed */}</Form>
        <LineChart data={/* your data */ []} />
        <AreaChart data={/* your data */ []} />
        <DataTable columns={/* your columns */ []} data={/* your data */ []} />
      </section>
    </main>
  );
}
```

## What MDK gives you for free

- **Theming**: every component reads CSS variables; your custom feature
  inherits the same look as the mining dashboards.
- **Cascade layers**: the devkit's CSS lives in `@layer mdk` so any unlayered
  custom styles in your app automatically win without specificity hacks.
- **Accessibility**: primitives are built on Radix UI — keyboard navigation,
  focus management, and ARIA semantics work out of the box.
- **Form & validation**: `Form` integrates React Hook Form + Zod.
- **Tables**: `DataTable` is a typed wrapper around TanStack React Table.

## What MDK does NOT give you

- Domain components for non-mining areas. **Don't fork** mining components
  for a weather widget — start from core primitives.
- Data fetching for non-mining APIs. Use your app's own data layer.
- State stores for non-mining domains. Use your app's existing state.

## Promoting to a first-class domain

If a custom feature graduates into a long-lived domain (e.g. it gets reused
across multiple consuming apps), open a proposal:

1. Define the domain identifier and ORK capabilities it covers.
2. Add a tiered set of agent-ready components under
   `src/foundation/components/<domain>/`.
3. Author a dedicated blueprint here.

Until then, custom features live in the consuming app.
