import * as React from 'react'
import type { ControllerProps, FieldPath, FieldValues } from 'react-hook-form'

import type { CascaderOption, CascaderValue } from '../cascader'
import { Cascader } from '../cascader'
import { Checkbox } from '../checkbox'
import { DatePicker } from '../date-picker'
import { Input } from '../input'
import { Label } from '../label'
import { Radio, RadioGroup } from '../radio'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'
import { Switch } from '../switch'
import type { TagInputOption } from '../tag-input'
import { TagInput } from '../tag-input'
import { TextArea } from '../textarea'

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './index'

// ─── Types ───────────────────────────────────────────────────────────────────

type BaseFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<ControllerProps<TFieldValues, TName>, 'render'> & {
  label?: string
  description?: string
  placeholder?: string
}

// ─── FormInput ───────────────────────────────────────────────────────────────

export type FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  type?: React.ComponentProps<typeof Input>['type']
  variant?: React.ComponentProps<typeof Input>['variant']
  inputProps?: Omit<React.ComponentProps<typeof Input>, 'type' | 'variant'>
}

/**
 * Pre-built Input field component with integrated form state.
 * Reduces boilerplate by combining FormField, FormItem, FormLabel, FormControl, and FormMessage.
 *
 * @example
 * ```tsx
 * <FormInput
 *   control={form.control}
 *   name="email"
 *   label="Email"
 *   type="email"
 *   placeholder="user@example.com"
 *   description="We'll never share your email"
 * />
 * ```
 */
export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  placeholder,
  type,
  variant,
  inputProps,
  ...fieldProps
}: FormInputProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type={type}
              variant={variant}
              placeholder={placeholder}
              {...inputProps}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── FormTextArea ────────────────────────────────────────────────────────────

export type FormTextAreaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  textAreaProps?: React.ComponentProps<typeof TextArea>
}

/**
 * Pre-built TextArea field component with integrated form state.
 *
 * @example
 * ```tsx
 * <FormTextArea
 *   control={form.control}
 *   name="bio"
 *   label="Bio"
 *   placeholder="Tell us about yourself"
 *   description="Max 200 characters"
 * />
 * ```
 */
export function FormTextArea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  placeholder,
  textAreaProps,
  ...fieldProps
}: FormTextAreaProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <TextArea placeholder={placeholder} {...textAreaProps} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── FormSelect ──────────────────────────────────────────────────────────────

export type FormSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  options: FormSelectOption[]
  selectProps?: Omit<React.ComponentProps<typeof Select>, 'onValueChange' | 'defaultValue'>
}

/**
 * Pre-built Select field component with integrated form state.
 *
 * @example
 * ```tsx
 * <FormSelect
 *   control={form.control}
 *   name="role"
 *   label="Role"
 *   placeholder="Select a role"
 *   options={[
 *     { value: 'admin', label: 'Admin' },
 *     { value: 'user', label: 'User' },
 *   ]}
 *   description="Your access level"
 * />
 * ```
 */
export function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  placeholder,
  options,
  selectProps,
  ...fieldProps
}: FormSelectProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <Select onValueChange={field.onChange} defaultValue={field.value} {...selectProps}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map(({ value, label, disabled }) => (
                <SelectItem key={value} value={value} disabled={disabled}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── FormCheckbox ────────────────────────────────────────────────────────────

export type FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  checkboxProps?: React.ComponentProps<typeof Checkbox>
  layout?: 'row' | 'column'
}

/**
 * Pre-built Checkbox field component with integrated form state.
 *
 * @example
 * ```tsx
 * <FormCheckbox
 *   control={form.control}
 *   name="terms"
 *   label="Accept terms and conditions"
 *   description="You must agree to continue"
 * />
 * ```
 */
export function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  checkboxProps,
  layout = 'row',
  ...fieldProps
}: FormCheckboxProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          <div
            style={{
              display: 'flex',
              flexDirection: layout,
              alignItems: layout === 'row' ? 'center' : 'flex-start',
              gap: layout === 'row' ? '0.5rem' : '0.75rem',
            }}
          >
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} {...checkboxProps} />
            </FormControl>
            {label && <FormLabel>{label}</FormLabel>}
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── FormSwitch ──────────────────────────────────────────────────────────────

export type FormSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  switchProps?: Omit<React.ComponentProps<typeof Switch>, 'checked' | 'onCheckedChange'>
  layout?: 'row' | 'column'
}

/**
 * Pre-built Switch field component with integrated form state.
 *
 * @example
 * ```tsx
 * <FormSwitch
 *   control={form.control}
 *   name="notifications"
 *   label="Enable notifications"
 *   description="Receive alerts when miners go offline"
 * />
 * ```
 */
export function FormSwitch<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  switchProps,
  layout = 'row',
  ...fieldProps
}: FormSwitchProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          <div
            style={{
              display: 'flex',
              flexDirection: layout,
              alignItems: layout === 'row' ? 'center' : 'flex-start',
              gap: layout === 'row' ? '0.75rem' : '0.75rem',
            }}
          >
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} {...switchProps} />
            </FormControl>
            {label && <FormLabel>{label}</FormLabel>}
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── FormRadioGroup ──────────────────────────────────────────────────────────

export type FormRadioOption = {
  value: string
  label: string
  disabled?: boolean
}

export type FormRadioGroupProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  options: FormRadioOption[]
  orientation?: 'horizontal' | 'vertical'
  radioGroupProps?: Omit<
    React.ComponentProps<typeof RadioGroup>,
    'onValueChange' | 'defaultValue' | 'orientation'
  >
}

/**
 * Pre-built RadioGroup field component with integrated form state.
 *
 * @example
 * ```tsx
 * <FormRadioGroup
 *   control={form.control}
 *   name="priority"
 *   label="Priority"
 *   options={[
 *     { value: 'low', label: 'Low' },
 *     { value: 'medium', label: 'Medium' },
 *     { value: 'high', label: 'High' },
 *   ]}
 *   orientation="horizontal"
 * />
 * ```
 */
export function FormRadioGroup<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  options,
  orientation = 'vertical',
  radioGroupProps,
  ...fieldProps
}: FormRadioGroupProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              orientation={orientation}
              {...radioGroupProps}
            >
              {options.map(({ value, label, disabled }) => {
                const id = `${field.name}-${value}`
                return (
                  <div
                    key={value}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                  >
                    <Radio value={value} id={id} disabled={disabled} />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                )
              })}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── FormDatePicker ──────────────────────────────────────────────────────────

export type FormDatePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  datePickerProps?: Omit<React.ComponentProps<typeof DatePicker>, 'selected' | 'onSelect'>
}

/**
 * Pre-built DatePicker field component with integrated form state.
 *
 * @example
 * ```tsx
 * <FormDatePicker
 *   control={form.control}
 *   name="startDate"
 *   label="Start Date"
 *   placeholder="Pick a date"
 *   description="When should this take effect?"
 * />
 * ```
 */
export function FormDatePicker<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  placeholder,
  datePickerProps,
  ...fieldProps
}: FormDatePickerProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <DatePicker
              selected={field.value}
              onSelect={field.onChange}
              placeholder={placeholder}
              {...datePickerProps}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── FormTagInput ────────────────────────────────────────────────────────────

export type FormTagInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  options?: TagInputOption[]
  allowCustomTags?: boolean
  variant?: 'default' | 'search'
  tagInputProps?: Omit<
    React.ComponentProps<typeof TagInput>,
    'value' | 'onTagsChange' | 'label' | 'placeholder'
  >
}

/**
 * Pre-built TagInput field component with integrated form state.
 * Perfect for multi-select with search and tag display.
 *
 * @example
 * ```tsx
 * <FormTagInput
 *   control={form.control}
 *   name="tags"
 *   label="Tags"
 *   placeholder="Add tags..."
 *   options={['React', 'TypeScript', 'Node.js']}
 *   description="Select or type tags"
 * />
 * ```
 */
export function FormTagInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  placeholder,
  options,
  allowCustomTags = true,
  variant = 'search',
  tagInputProps,
  ...fieldProps
}: FormTagInputProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <TagInput
              value={field.value || []}
              onTagsChange={field.onChange}
              options={options}
              placeholder={placeholder}
              allowCustomTags={allowCustomTags}
              variant={variant}
              {...tagInputProps}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── FormCascader ────────────────────────────────────────────────────────────

export type FormCascaderProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & {
  options: CascaderOption[]
  multiple?: boolean
  cascaderProps?: Omit<
    React.ComponentProps<typeof Cascader>,
    'value' | 'onChange' | 'options' | 'placeholder'
  >
}

/**
 * Pre-built Cascader field component with integrated form state.
 * Perfect for hierarchical selections like categories and subcategories.
 *
 * @example
 * ```tsx
 * <FormCascader
 *   control={form.control}
 *   name="category"
 *   label="Category"
 *   placeholder="Select category..."
 *   options={[
 *     {
 *       value: 'electronics',
 *       label: 'Electronics',
 *       children: [
 *         { value: 'phones', label: 'Phones' },
 *         { value: 'laptops', label: 'Laptops' },
 *       ],
 *     },
 *   ]}
 *   description="Choose a category and subcategory"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Multiple selection mode
 * <FormCascader
 *   control={form.control}
 *   name="categories"
 *   label="Categories"
 *   placeholder="Select categories..."
 *   options={categoryOptions}
 *   multiple
 *   description="Select multiple categories"
 * />
 * ```
 */
export function FormCascader<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  placeholder,
  options,
  multiple = false,
  cascaderProps,
  ...fieldProps
}: FormCascaderProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormField
      {...fieldProps}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Cascader
              value={field.value as CascaderValue | CascaderValue[]}
              onChange={field.onChange}
              options={options}
              placeholder={placeholder}
              multiple={multiple}
              {...cascaderProps}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
