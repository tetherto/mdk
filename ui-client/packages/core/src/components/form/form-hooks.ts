import type { FieldValues, UseFormReturn } from 'react-hook-form'

// ─── useFormReset ────────────────────────────────────────────────────────────

export type UseFormResetOptions<TFieldValues extends FieldValues = FieldValues> = {
  /**
   * The form instance from useForm()
   */
  form: UseFormReturn<TFieldValues>

  /**
   * Optional callback called before reset
   */
  onBeforeReset?: VoidFunction

  /**
   * Optional callback called after reset
   */
  onAfterReset?: VoidFunction
}

export type UseFormResetReturn = {
  /**
   * Reset the form to default values
   */
  resetForm: VoidFunction

  /**
   * Whether the form has been modified from its default values
   */
  isDirty: boolean
}

/**
 * Hook to handle form reset with callbacks.
 *
 * @example
 * ```tsx
 * const form = useForm<FormValues>({ defaultValues: { email: '' } })
 * const { resetForm, isDirty } = useFormReset({
 *   form,
 *   onAfterReset: () => toast.info('Form reset'),
 * })
 *
 * return (
 *   <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
 *     <FormInput control={form.control} name="email" label="Email" />
 *     <Button type="button" onClick={resetForm} disabled={!isDirty}>
 *       Reset
 *     </Button>
 *   </Form>
 * )
 * ```
 */
export function useFormReset<TFieldValues extends FieldValues = FieldValues>({
  form,
  onBeforeReset,
  onAfterReset,
}: UseFormResetOptions<TFieldValues>): UseFormResetReturn {
  const resetForm = (): void => {
    onBeforeReset?.()
    form.reset()
    onAfterReset?.()
  }

  return {
    resetForm,
    isDirty: form.formState.isDirty,
  }
}
