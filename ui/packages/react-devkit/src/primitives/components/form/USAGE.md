# Form

Form primitives built on react-hook-form. Use with a `useForm()` instance.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `Form` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Required | `React.ReactNode` | - | - |
| `form` | Required | `UseFormReturn<TFieldValues>` | - | - |

### `FormCascader` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `options` | Required | `CascaderOption[]` | - | - |
| `cascaderProps` | Optional | `Omit<CascaderProps & React.RefAttributes<HTMLDivElement>, "onChange" \| "value" \| "options" \| "placeholder">` | - | - |
| `description` | Optional | `string` | - | - |
| `label` | Optional | `string` | - | - |
| `multiple` | Optional | `boolean` | - | - |
| `placeholder` | Optional | `string` | - | - |

### `FormCheckbox` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `checkboxProps` | Optional | `({ checked?: CheckedState \| undefined; defaultChecked?: CheckedState \| undefined; disabled?: boolean \| undefined; size?: CheckboxSize \| undefined; color?: ComponentColor \| undefined; radius?: BorderRadius \| undefined; className?: string \| u… /* see source */` | - | - |
| `description` | Optional | `string` | - | - |
| `label` | Optional | `string` | - | - |
| `layout` | Optional | `"row" \| "column"` | - | - |
| `placeholder` | Optional | `string` | - | - |

### `FormDatePicker` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `datePickerProps` | Optional | `object` | - | - |
| `description` | Optional | `string` | - | - |
| `label` | Optional | `string` | - | - |
| `placeholder` | Optional | `string` | - | - |

### `FormInput` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `description` | Optional | `string` | - | - |
| `inputProps` | Optional | `Omit<Omit<InputProps, "ref"> & React.RefAttributes<HTMLInputElement>, "type" \| "variant">` | - | - |
| `label` | Optional | `string` | - | - |
| `placeholder` | Optional | `string` | - | - |
| `type` | Optional | `React.HTMLInputTypeAttribute` | - | - |
| `variant` | Optional | `"search" \| "default"` | - | - |

### `FormLabel` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `htmlFor` | Optional | `string` | - | Id of the input being labelled |

### `FormRadioGroup` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `options` | Required | `FormRadioOption[]` | - | - |
| `description` | Optional | `string` | - | - |
| `label` | Optional | `string` | - | - |
| `orientation` | Optional | `"horizontal" \| "vertical"` | - | - |
| `placeholder` | Optional | `string` | - | - |
| `radioGroupProps` | Optional | `object` | - | - |

### `FormSelect` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `options` | Required | `FormSelectOption[]` | - | - |
| `description` | Optional | `string` | - | - |
| `label` | Optional | `string` | - | - |
| `placeholder` | Optional | `string` | - | - |
| `selectProps` | Optional | `object` | - | - |

### `FormSwitch` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `description` | Optional | `string` | - | - |
| `label` | Optional | `string` | - | - |
| `layout` | Optional | `"row" \| "column"` | - | - |
| `placeholder` | Optional | `string` | - | - |
| `switchProps` | Optional | `object` | - | - |

### `FormTagInput` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `allowCustomTags` | Optional | `boolean` | - | - |
| `description` | Optional | `string` | - | - |
| `label` | Optional | `string` | - | - |
| `options` | Optional | `TagInputOption[]` | - | - |
| `placeholder` | Optional | `string` | - | - |
| `tagInputProps` | Optional | `object` | - | - |
| `variant` | Optional | `"search" \| "default"` | - | - |

### `FormTextArea` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `description` | Optional | `string` | - | - |
| `label` | Optional | `string` | - | - |
| `placeholder` | Optional | `string` | - | - |
| `textAreaProps` | Optional | `(Omit<TextAreaProps, "ref"> & React.RefAttributes<HTMLTextAreaElement>)` | - | - |
<!-- END GENERATED: props -->

## Pieces

- `Form` — wraps a `<form>` and provides `FormProvider` context.
- `FormField` — wraps react-hook-form's `Controller` and provides field context.
- `FormItem` — layout wrapper that generates IDs for accessibility linking.
- `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` — slots.

## Example

```tsx
const schema = z.object({ email: z.string().email() });
const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "" } });

<Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  <Button type="submit">Submit</Button>
</Form>
```

## Notes

- Pre-built field helpers (`FormInput`, `FormSelect`, `FormCheckbox`,
  `FormDatePicker`, `FormCascader`, etc.) live in [`form-fields.tsx`](./form-fields.tsx).
- See the directory's [`README.md`](./README.md) and [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) for the full
  pattern catalog.
