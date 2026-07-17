# Form

Form primitives built on react-hook-form. Use with a `useForm()` instance.

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
  `FormDatePicker`, `FormCascader`, etc.) live in `form-fields.tsx`.
- See the directory's `README.md` and `QUICK_REFERENCE.md` for the full
  pattern catalog.
