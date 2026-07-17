import { Slot } from '@radix-ui/react-slot'
import { Controller, FormProvider, useFormContext } from 'react-hook-form'
import type {
  ControllerProps,
  FieldPath,
  FieldValues,
  UseFormGetFieldState,
  UseFormReturn,
} from 'react-hook-form'

import { Label } from '../label'
import { cn } from '../../utils'
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  createContext,
  forwardRef,
  type JSX,
  type ReactNode,
  useContext,
  useId,
} from 'react'

// ─── Contexts ────────────────────────────────────────────────────────────────

type FormFieldContextValue = {
  name: string
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null)

type FormItemContextValue = {
  id: string
}

const FormItemContext = createContext<FormItemContextValue | null>(null)

// ─── useFormField ────────────────────────────────────────────────────────────

/**
 * Hook to access the current form field's state and generated IDs.
 * Must be used inside a `<FormField>` and `<FormItem>`.
 */
type UseFormFieldReturn = ReturnType<UseFormGetFieldState<FieldValues>> & {
  id: string
  name: string
  formItemId: string
  formDescriptionId: string
  formMessageId: string
}

/**
 * Read-only context hook for form field children — returns the field's id, error state, and ARIA attributes.
 *
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const useFormField = (): UseFormFieldReturn => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error('useFormField must be used within a <FormField>')
  }

  const fieldState = getFieldState(fieldContext.name, formState)
  const id = itemContext?.id ?? ''

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

// ─── Form ────────────────────────────────────────────────────────────────────

/**
 * Form wrapper that provides react-hook-form context to child components.
 *
 * @example
 * ```tsx
 * const form = useForm({ resolver: zodResolver(schema) })
 *
 * <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
 *   <FormField control={form.control} name="email" render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Email</FormLabel>
 *       <FormControl><Input {...field} /></FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )} />
 * </Form>
 * ```
 */
type FormProps<TFieldValues extends FieldValues = FieldValues> = Omit<
  ComponentProps<'form'>,
  'children'
> & {
  form: UseFormReturn<TFieldValues>
  children: ReactNode
}

/**
 * React Hook Form provider wrapper. Pass the result of `useForm()` as
 * `form` and render fields via `FormField` / `FormItem` / `FormLabel` /
 * `FormControl` / `FormMessage`.
 *
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const Form = <TFieldValues extends FieldValues = FieldValues>({
  form,
  children,
  className,
  ...props
}: FormProps<TFieldValues>): JSX.Element => {
  return (
    <FormProvider {...form}>
      <form className={cn('mdk-form', className)} {...props}>
        {children}
      </form>
    </FormProvider>
  )
}

// ─── FormField ───────────────────────────────────────────────────────────────

/**
 * Wraps react-hook-form's Controller and provides field context to descendants.
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>): JSX.Element => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

// ─── FormItem ────────────────────────────────────────────────────────────────

/**
 * Layout wrapper for a form field. Generates a unique ID for accessibility linking.
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const FormItem = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    const id = useId()

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('mdk-form-item', className)} {...props} />
      </FormItemContext.Provider>
    )
  },
)

FormItem.displayName = 'FormItem'

// ─── FormLabel ───────────────────────────────────────────────────────────────

/**
 * Label that auto-links to the form field input via generated IDs.
 * Applies error styling when the field has a validation error.
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const FormLabel = forwardRef<ComponentRef<typeof Label>, ComponentPropsWithoutRef<typeof Label>>(
  ({ className, ...props }, ref) => {
    const { error, formItemId } = useFormField()

    return (
      <Label
        ref={ref}
        className={cn('mdk-form-label', error && 'mdk-form-label--error', className)}
        htmlFor={formItemId}
        {...props}
      />
    )
  },
)

FormLabel.displayName = 'FormLabel'

// ─── FormControl ─────────────────────────────────────────────────────────────

/**
 * Slot-based wrapper that injects ARIA attributes onto its child input element
 * without adding an extra DOM wrapper.
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const FormControl = forwardRef<ComponentRef<typeof Slot>, ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

    return (
      <Slot
        ref={ref}
        id={formItemId}
        aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
        aria-invalid={!!error}
        {...props}
      />
    )
  },
)

FormControl.displayName = 'FormControl'

// ─── FormDescription ─────────────────────────────────────────────────────────

/**
 * Optional helper text displayed below the input.
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const FormDescription = forwardRef<HTMLParagraphElement, ComponentProps<'p'>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField()

    return (
      <p
        ref={ref}
        id={formDescriptionId}
        className={cn('mdk-form-description', className)}
        {...props}
      />
    )
  },
)

FormDescription.displayName = 'FormDescription'

// ─── FormMessage ─────────────────────────────────────────────────────────────

/**
 * Displays the validation error message from react-hook-form field state.
 * Falls back to children if no error is present.
 * Always renders to prevent layout shift when errors appear.
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const FormMessage = forwardRef<HTMLParagraphElement, ComponentProps<'p'>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField()
    const body = error ? String(error.message) : children

    return (
      <p
        ref={ref}
        id={formMessageId}
        className={cn('mdk-form-message', !body && 'mdk-form-message--empty', className)}
        role={body ? 'alert' : undefined}
        aria-live={body ? 'polite' : undefined}
        {...props}
      >
        {body || '\u00A0'}
      </p>
    )
  },
)

FormMessage.displayName = 'FormMessage'

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
}

export type { FormProps, UseFormFieldReturn }

// Re-export pre-built field components
export {
  FormCascader,
  FormCheckbox,
  FormDatePicker,
  FormInput,
  FormRadioGroup,
  FormSelect,
  FormSwitch,
  FormTagInput,
  FormTextArea,
} from './form-fields'

export type {
  FormCascaderProps,
  FormCheckboxProps,
  FormDatePickerProps,
  FormInputProps,
  FormRadioGroupProps,
  FormRadioOption,
  FormSelectOption,
  FormSelectProps,
  FormSwitchProps,
  FormTagInputProps,
  FormTextAreaProps,
} from './form-fields'

// Re-export hooks
export { useFormReset } from './form-hooks'

export type { UseFormResetOptions, UseFormResetReturn } from './form-hooks'

// Re-export utilities and validators
export {
  contactSchema,
  createConditionalRequired,
  createDateRange,
  createFieldNames,
  createPasswordMatch,
  loginSchema,
  profileSchema,
  registerSchema,
  validators,
} from './form-utils'

export type { FieldName } from './form-utils'
