# Tabs

Tabbed content panels built on Radix UI. Compose with `TabsList`,
`TabsTrigger`, and `TabsContent`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `defaultValue` | Optional | `string` | - | Uncontrolled initial active value |
| `onValueChange` | Optional | `((value: string) => void)` | - | Fired when the active tab changes |
| `orientation` | Optional | `"horizontal" \| "vertical"` | `"horizontal"` | Keyboard navigation orientation |
| `value` | Optional | `string` | - | Controlled active tab value |
| `variant` | Optional | `"default" \| "side" \| "underline"` | - | - |
<!-- END GENERATED: props -->

## `TabsList` / `TabsTrigger` Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

Both accept a `variant` prop that has no effect on `Tabs` itself. `TabsList` and
`TabsTrigger` are internal sub-components not emitted to the registry, so this
table is the source of truth for their `variant` until they are surfaced there.

| Prop      | Status   | Type | Default     | Description |
| --------- | -------- | ---- | ----------- | ----------- |
| `variant` | Optional | `"default" \| "side" \| "underline"` | `"default"` | `default` (baseline), `side` (left rail), or `underline` (per-tab underline indicator, white active label) |

## Example

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="alerts">Alerts</TabsTrigger>
    <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    <p>Operational metrics…</p>
  </TabsContent>
  <TabsContent value="alerts">
    <CurrentAlerts data={[]} />
  </TabsContent>
</Tabs>
```

## Notes

- Each `TabsContent` is matched to its `TabsTrigger` by `value`
- Set `variant="side"` on `TabsList` and each `TabsTrigger` for a left-side tab rail layout
- Set `variant="underline"` on `TabsList` and each `TabsTrigger` for a top tab bar with a per-tab underline
  indicator and a white active label
