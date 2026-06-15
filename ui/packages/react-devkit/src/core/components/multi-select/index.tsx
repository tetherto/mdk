import _includes from 'lodash/includes'
import _isString from 'lodash/isString'
import _map from 'lodash/map'
import {
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Checkbox } from '../checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { cn } from '../../utils'

export type MultiSelectSize = 'sm' | 'md' | 'lg'
export type MultiSelectVariant = 'default' | 'colored'

export type MultiSelectOption = {
  value: string
  label: ReactNode
  disabled?: boolean
}

export type MultiSelectProps = {
  options: MultiSelectOption[]
  /** Controlled selected values. Omit to use `defaultValue` for uncontrolled mode. */
  value?: string[]
  /** Initial values for uncontrolled mode. Ignored when `value` is provided. */
  defaultValue?: string[]
  onValueChange?: (next: string[]) => void
  placeholder?: ReactNode
  disabled?: boolean
  size?: MultiSelectSize
  variant?: MultiSelectVariant
  /** Rendered inside the popover when `options` is empty. */
  emptyMessage?: ReactNode
  /**
   * Max number of selected chips rendered in the trigger before collapsing the rest into a
   * "+N more" badge. `undefined` (default) renders every chip.
   */
  maxSelectedDisplay?: number
  className?: string
  contentClassName?: string
  /** Accessible label - applied to the trigger button. */
  'aria-label'?: string
  id?: string
  name?: string
}

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.276 8.652a.91.91 0 0 1 1.272.024L12 13.402l4.452-4.726a.91.91 0 0 1 1.296 1.272l-5.1 5.4a.91.91 0 0 1-1.296 0l-5.1-5.4a.91.91 0 0 1 .024-1.296Z"
      fill="currentColor"
    />
  </svg>
)

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const arraysEqual = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean => {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Multi-select picker built on Radix Popover + Checkbox. Sibling to `<Select>`
 * for cases where consumers need to pick more than one option (filter rows,
 * multi-target actions, tag-style inputs). The popover stays open on toggle;
 * Esc / outside-click closes it. Selected values render as removable chips in
 * the trigger, with an optional "clear all" affordance and a `+N more`
 * overflow chip via `maxSelectedDisplay`.
 *
 * Controlled vs uncontrolled is decided by the presence of `value` (mirrors
 * Radix Select's convention): pass `value` for controlled, `defaultValue` for
 * uncontrolled.
 *
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
export const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      onValueChange,
      placeholder = 'Select...',
      disabled = false,
      size = 'lg',
      variant = 'default',
      emptyMessage = 'No options',
      maxSelectedDisplay,
      className,
      contentClassName,
      'aria-label': ariaLabel,
      id,
      name,
    },
    ref,
  ) => {
    const isControlled = value !== undefined
    const [uncontrolledValue, setUncontrolledValue] = useState<string[]>(defaultValue ?? [])
    const selected = isControlled ? value : uncontrolledValue

    const [open, setOpen] = useState(false)
    const [activeIdx, setActiveIdx] = useState(0)
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
    const generatedId = useId()
    const triggerId = id ?? generatedId

    const commit = useCallback(
      (next: string[]) => {
        if (!isControlled) setUncontrolledValue(next)
        if (!arraysEqual(next, selected)) onValueChange?.(next)
      },
      [isControlled, onValueChange, selected],
    )

    const toggle = useCallback(
      (optionValue: string) => {
        const isSelected = _includes(selected, optionValue)
        const next = isSelected
          ? selected.filter((v) => v !== optionValue)
          : [...selected, optionValue]
        commit(next)
      },
      [commit, selected],
    )

    const removeOne = useCallback(
      (optionValue: string) => {
        commit(selected.filter((v) => v !== optionValue))
      },
      [commit, selected],
    )

    const clearAll = useCallback(() => {
      commit([])
    }, [commit])

    const labelByValue = useMemo(() => {
      const map = new Map<string, ReactNode>()
      for (const opt of options) map.set(opt.value, opt.label)
      return map
    }, [options])

    const selectedOptions = useMemo(
      () => selected.map((v) => ({ value: v, label: labelByValue.get(v) ?? v })),
      [labelByValue, selected],
    )

    const visibleChips =
      typeof maxSelectedDisplay === 'number' && maxSelectedDisplay >= 0
        ? selectedOptions.slice(0, maxSelectedDisplay)
        : selectedOptions
    const overflowCount = selectedOptions.length - visibleChips.length

    const focusOption = useCallback((idx: number) => {
      const el = optionRefs.current[idx]
      if (el) {
        el.focus()
      }
    }, [])

    const handleContentKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (options.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = Math.min(activeIdx + 1, options.length - 1)
        setActiveIdx(next)
        focusOption(next)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const next = Math.max(activeIdx - 1, 0)
        setActiveIdx(next)
        focusOption(next)
      } else if (e.key === 'Home') {
        e.preventDefault()
        setActiveIdx(0)
        focusOption(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        const next = options.length - 1
        setActiveIdx(next)
        focusOption(next)
      }
    }

    const stopChipClickFromOpeningPopover = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
    }

    const onChipRemove = (e: MouseEvent<HTMLButtonElement>, optionValue: string) => {
      stopChipClickFromOpeningPopover(e)
      e.preventDefault()
      if (disabled) return
      removeOne(optionValue)
    }

    const onClearAllClick = (e: MouseEvent<HTMLButtonElement>) => {
      stopChipClickFromOpeningPopover(e)
      e.preventDefault()
      if (disabled) return
      clearAll()
    }

    const handleOptionFocus = (e: FocusEvent<HTMLButtonElement>) => {
      if (e.currentTarget !== e.target) return
      const idx = Number(e.currentTarget.dataset.index)
      setActiveIdx(idx)
    }

    const handleOptionClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      const idx = Number(e.currentTarget.dataset.index)
      const opt = options[idx]
      if (!opt || opt.disabled) return
      toggle(opt.value)
    }

    const handleCheckboxClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
    }

    return (
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger
          ref={ref}
          id={triggerId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-disabled={disabled || undefined}
          data-disabled={disabled || undefined}
          data-placeholder={selected.length === 0 || undefined}
          disabled={disabled}
          name={name}
          className={cn(
            'mdk-multi-select__trigger',
            `mdk-multi-select__trigger--${size}`,
            variant === 'colored' && 'mdk-multi-select__trigger--colored',
            className,
          )}
        >
          <div className="mdk-multi-select__chips">
            {selected.length === 0 ? (
              <span className="mdk-multi-select__placeholder">{placeholder}</span>
            ) : (
              <>
                {visibleChips.map((chip) => (
                  <span key={chip.value} className="mdk-multi-select__token">
                    <span className="mdk-multi-select__token-label">{chip.label}</span>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={
                        _isString(chip.label) ? `Remove ${chip.label}` : `Remove ${chip.value}`
                      }
                      className="mdk-multi-select__token-clear"
                      onMouseDown={stopChipClickFromOpeningPopover}
                      onPointerDown={stopChipClickFromOpeningPopover}
                      onClick={(e) => onChipRemove(e, chip.value)}
                    >
                      <CloseIcon />
                    </button>
                  </span>
                ))}
                {overflowCount > 0 && (
                  <span className="mdk-multi-select__token mdk-multi-select__token--overflow">
                    +{overflowCount} more
                  </span>
                )}
              </>
            )}
          </div>
          {selected.length >= 2 && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear all"
              className="mdk-multi-select__clear-all"
              onMouseDown={stopChipClickFromOpeningPopover}
              onPointerDown={stopChipClickFromOpeningPopover}
              onClick={onClearAllClick}
            >
              <CloseIcon />
            </button>
          )}
          <ChevronDownIcon className="mdk-multi-select__icon" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className={cn('mdk-multi-select__content', contentClassName)}
          onKeyDown={handleContentKeyDown}
          // Radix returns focus to the trigger on close - we want it to stay there.
          onOpenAutoFocus={(e) => {
            // Move focus to the first option (or first selected one) when the popover opens.
            e.preventDefault()
            const initial = Math.max(
              0,
              options.findIndex((opt) => selected.includes(opt.value)),
            )
            const idx = initial === -1 ? 0 : initial
            setActiveIdx(idx)
            // Wait for the option ref to be attached before focusing.
            queueMicrotask(() => focusOption(idx))
          }}
        >
          {options.length === 0 ? (
            <div className="mdk-multi-select__empty">{emptyMessage}</div>
          ) : (
            <div role="listbox" aria-multiselectable="true" className="mdk-multi-select__list">
              {_map(options, (opt, idx) => {
                const { value: optValue, label: optLabel, disabled: optDisabled } = opt
                const isSelected = _includes(selected, optValue)
                const isOptionDisabled = Boolean(optDisabled)

                return (
                  <button
                    key={optValue}
                    ref={(el) => {
                      optionRefs.current[idx] = el
                    }}
                    type="button"
                    role="option"
                    data-index={idx}
                    aria-selected={isSelected}
                    aria-disabled={isOptionDisabled || undefined}
                    data-disabled={isOptionDisabled || undefined}
                    data-state={isSelected ? 'checked' : 'unchecked'}
                    disabled={isOptionDisabled}
                    tabIndex={idx === activeIdx ? 0 : -1}
                    className="mdk-multi-select__option"
                    onFocus={handleOptionFocus}
                    onClick={handleOptionClick}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isOptionDisabled}
                      // Visual only - clicks bubble from the row button.
                      tabIndex={-1}
                      className="mdk-multi-select__option-checkbox"
                      onClick={handleCheckboxClick}
                    />
                    <span className="mdk-multi-select__option-label">{optLabel}</span>
                  </button>
                )
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  },
)

MultiSelect.displayName = 'MultiSelect'
