# TagInput

An input that stores typed or selected values as removable tag chips, with an optional dropdown, keyboard navigation, and a `renderDropdown` escape hatch for fully custom dropdown content.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `value` | `string[]` | no | `[]` | Controlled list of tag values |
| `onTagsChange` | `(tags: string[]) => void` | no | — | Fired when tags are added or removed |
| `onInputChange` | `(value: string) => void` | no | — | Fired on every keystroke; useful for async option loading |
| `onSubmit` | `(tags: string[]) => void` | no | — | Fired when the user presses Enter |
| `options` | `TagInputOption[]` | no | `[]` | Dropdown options (string or `{ value, label, disabled? }`) |
| `placeholder` | `string` | no | `'Search...'` | Input placeholder when no tags are selected |
| `size` | `'sm' \| 'md' \| 'lg'` | no | `'lg'` | Controls input height |
| `disabled` | `boolean` | no | `false` | Disables the input |
| `allowCustomTags` | `boolean` | no | `true` | Allows adding arbitrary typed text as a tag via Enter |
| `filterOptions` | `(options: TagInputOption[], query: string) => TagInputOption[]` | no | case-insensitive includes | Custom option filter function |
| `variant` | `'default' \| 'search'` | no | `'search'` | `'search'` shows a magnifying-glass icon (doubles as a clear-all button) |
| `label` | `string` | no | — | Label rendered above the input |
| `id` | `string` | no | auto-generated | HTML id for the input element |
| `className` | `string` | no | — | Additional class for the inner `<input>` |
| `wrapperClassName` | `string` | no | — | Additional class for the root wrapper |
| `dropdownMinHeight` | `string` | no | — | CSS min-height for the dropdown panel |
| `dropdownMaxHeight` | `string` | no | `'12rem'` | CSS max-height for the dropdown panel |
| `renderDropdown` | `(props: TagInputDropdownProps) => React.ReactNode` | no | — | Replaces the built-in dropdown with custom content |

### `TagInputRef` (imperative handle)

When `ref` is forwarded to `TagInput`, it exposes:

| Method | Description |
| ------ | ----------- |
| `clearInputValue()` | Clears the text input |
| `focus()` | Focuses the input |
| `blur()` | Blurs the input |
| `getInputValue()` | Returns the current input string |

## Example

```tsx
import { TagInput } from "@tetherto/mdk-core-ui"

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

- Selecting an option that is already tagged removes it (toggle behaviour).
- Pressing Backspace on an empty input removes the last tag.
- The search-variant clear icon only appears when there are active tags.
