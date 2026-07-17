# MultiLevelSelect

Grouped select control with collapsible sections, built on the MDK `Select` primitive.

## Sub-components

All sub-components are accessed through the `MultiLevelSelect` namespace.

| Export | Description |
| ------ | ----------- |
| `MultiLevelSelect.Root` | Select root (controls open state and value). |
| `MultiLevelSelect.Trigger` | Button that opens the dropdown. |
| `MultiLevelSelect.Value` | Displays the currently selected value. |
| `MultiLevelSelect.Content` | Floating list panel. |
| `MultiLevelSelect.Item` | Selectable option. |
| `MultiLevelSelect.Section` | Collapsible group of items with a section header. |

## Props — MultiLevelSelect.Section

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `sectionTitle` | `ReactNode` | yes | — | Title displayed in the section header. |
| `children` | `ReactNode` | no | — | `MultiLevelSelect.Item` elements in the section. |
| `open` | `boolean` | no | — | Controlled open state. |
| `defaultOpen` | `boolean` | no | `false` | Initial open state (uncontrolled). |
| `onToggle` | `(open: boolean) => void` | no | — | Called when the section is expanded or collapsed. |

## Example

```tsx
<MultiLevelSelect.Root>
  <MultiLevelSelect.Trigger>
    <MultiLevelSelect.Value placeholder="Select a pool" />
  </MultiLevelSelect.Trigger>
  <MultiLevelSelect.Content>
    <MultiLevelSelect.Section sectionTitle="Region A" defaultOpen>
      <MultiLevelSelect.Item value="pool-1">Pool 1</MultiLevelSelect.Item>
      <MultiLevelSelect.Item value="pool-2">Pool 2</MultiLevelSelect.Item>
    </MultiLevelSelect.Section>
  </MultiLevelSelect.Content>
</MultiLevelSelect.Root>
```

## Notes

- `MultiLevelSelect.Root`, `Trigger`, `Value`, `Content`, and `Item` are pass-through re-exports of the base `Select` primitives.
- `MultiLevelSelect.Section` supports both controlled (`open` + `onToggle`) and uncontrolled (`defaultOpen`) patterns.
