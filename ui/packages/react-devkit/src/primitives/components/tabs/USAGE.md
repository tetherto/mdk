# Tabs

Tabbed content panels built on Radix UI. Compose with `TabsList`,
`TabsTrigger`, and `TabsContent`.

## `Tabs` (root) props

| Prop           | Type                          | Required | Default     | Description                              |
| -------------- | ----------------------------- | -------- | ----------- | ---------------------------------------- |
| `value`        | `string`                      | no       | —           | Controlled active tab value.             |
| `defaultValue` | `string`                      | no       | —           | Uncontrolled initial active value.       |
| `onValueChange`| `(value: string) => void`     | no       | —           | Fired when the active tab changes.       |
| `variant`      | `"default" \| "side" \| "underline"` | no  | `"default"` | `default` (baseline), `side` (left rail), or `underline` (per-tab underline indicator, white active label). |
| `orientation`  | `"horizontal" \| "vertical"`   | no       | `"horizontal"` | Keyboard navigation orientation.      |
| `className`    | `string`                      | no       | —           | Root class names.                        |

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

- Each `TabsContent` is matched to its `TabsTrigger` by `value`.
- Set `variant="side"` for a left-side tab rail layout.
- Set `variant="underline"` for a top tab bar with a per-tab underline
  indicator and a white active label — pass it to both `Tabs`/`TabsList`
  and each `TabsTrigger`.
