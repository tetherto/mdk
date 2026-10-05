# TagInput

An input that stores typed or selected values as removable tag chips, with an optional dropdown, keyboard navigation, and a `renderDropdown` escape hatch for fully custom dropdown content.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `allowCustomTags` | Optional | `boolean` | `true` | Whether to allow adding custom tags by typing and pressing Enter |
| `className` | Optional | `string` | - | Additional class for the inner `<input>` |
| `disabled` | Optional | `boolean` | `false` | Disabled state |
| `dropdownMaxHeight` | Optional | `string` | `"12rem"` | Maximum height of the dropdown (CSS value, e.g. '300px', '20rem') |
| `dropdownMinHeight` | Optional | `string` | - | Minimum height of the dropdown (CSS value, e.g. '100px', '6rem') |
| `filterOptions` | Optional | `((options: TagInputOption[], query: string) => TagInputOption[])` | `case-insensitive includes` | Filter options by input value. Receives options and query, returns filtered options. When undefined, filters by case-insensitive includes |
| `id` | Optional | `string` | `auto-generated` | HTML id for the input |
| `label` | Optional | `string` | - | Label for the input |
| `onInputChange` | Optional | `((value: string) => void)` | - | Callback when input value changes (typing). Receives current input value. Useful for async option loading or custom filtering |
| `onSubmit` | Optional | `((tags: string[]) => void)` | - | Callback when user presses Enter (submit). Receives current tags. Called after adding a tag from selection or typed text, if applicable |
| `onTagsChange` | Optional | `((tags: string[]) => void)` | - | Callback when tags change (add/remove) |
| `options` | Optional | `TagInputOption[]` | `[]` | Options to show in the dropdown when input is focused |
| `placeholder` | Optional | `string` | `"Search..."` | Placeholder when input is empty |
| `renderDropdown` | Optional | `((props: TagInputDropdownProps) => React.ReactNode)` | - | Render custom dropdown content. When provided, replaces the default dropdown. Use this to apply your own styling or structure |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"lg"` | Size of the tag input — matches Select sizes - `sm`: 24px height - `md`: 32px height - `lg`: 40px height |
| `value` | Optional | `string[]` | `[]` | Controlled tags (array of tag values) |
| `variant` | Optional | `"search" \| "default"` | `"search"` | Input variant; `'search'` shows a magnifying-glass icon that doubles as a clear-all button |
| `wrapperClassName` | Optional | `string` | - | Custom className for the wrapper |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

### `TagInputRef` (imperative handle)

When `ref` is forwarded to `TagInput`, it exposes:

| Method              | Description                      |
| ------------------- | -------------------------------- |
| `clearInputValue()` | Clears the text input            |
| `focus()`           | Focuses the input                |
| `blur()`            | Blurs the input                  |
| `getInputValue()`   | Returns the current input string |

## Example

```tsx
import { TagInput } from "@tetherto/mdk-react-devkit"

// Basic with options
const [tags, setTags] = useState<string[]>([])

<TagInput
  value={tags}
  onTagsChange={setTags}
  options={["Antminer S19", "Avalon A1346", "Whatsminer M50"]}
  placeholder="Search models..."
  onSubmit={(t) => applySearch(t)}
/>

// Custom dropdown (e.g. with checkmarks)
<TagInput
  value={tags}
  onTagsChange={setTags}
  options={options}
  renderDropdown={({ filteredOptions, selectedTags, onSelect, getOptionValue, getOptionLabel, listboxId }) => (
    <div id={listboxId} role="listbox">
      {filteredOptions.map((opt) => (
        <div
          key={getOptionValue(opt)}
          role="option"
          aria-selected={selectedTags.includes(getOptionValue(opt))}
          onMouseDown={(e) => { e.preventDefault(); onSelect(opt) }}
        >
          {getOptionLabel(opt)}
        </div>
      ))}
    </div>
  )}
/>
```

## Notes

- Selecting an option that is already tagged removes it (toggle behavior)
- Pressing Backspace on an empty input removes the last tag
- The search-variant clear icon only appears when there are active tags
