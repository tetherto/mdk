import { CheckIcon, ChevronDownIcon, Cross1Icon } from '@radix-ui/react-icons'
import * as React from 'react'

import type { ComponentSize } from '../../types'
import { cn } from '../../utils'
import { Popover, PopoverAnchor, PopoverContent } from '../popover'

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 8 8" fill="none">
    <path
      d="M7.28145 1.28145C7.57441 0.988477 7.57441 0.512695 7.28145 0.219727C6.98848 -0.0732422 6.5127 -0.0732422 6.21973 0.219727L3.75176 2.69004L1.28145 0.22207C0.988477 -0.0708985 0.512695 -0.0708985 0.219727 0.22207C-0.0732422 0.515039 -0.0732422 0.99082 0.219727 1.28379L2.69004 3.75176L0.22207 6.22207C-0.0708984 6.51504 -0.0708984 6.99082 0.22207 7.28379C0.515039 7.57676 0.99082 7.57676 1.28379 7.28379L3.75176 4.81348L6.22207 7.28145C6.51504 7.57441 6.99082 7.57441 7.28379 7.28145C7.57676 6.98848 7.57676 6.5127 7.28379 6.21973L4.81348 3.75176L7.28145 1.28145Z"
      fill="currentColor"
    />
  </svg>
)

export type TagInputOption = string | { value: string; label: string; disabled?: boolean }

export type TagInputRef = {
  /** Clear the input value programmatically */
  clearInputValue: VoidFunction
  /** Focus the input */
  focus: VoidFunction
  /** Blur the input */
  blur: VoidFunction
  /** Get current input value */
  getInputValue: () => string
}

export type TagInputDropdownProps = {
  /** Filtered options to display */
  filteredOptions: TagInputOption[]
  /** Current tags (selected values) - use to show selected state in custom dropdown */
  selectedTags: string[]
  /** Index of the currently highlighted option (for keyboard nav) */
  highlightedIndex: number
  /** Call to update highlighted index (e.g. on mouse enter) */
  setHighlightedIndex: (index: number) => void
  /** Call when user selects an option */
  onSelect: (opt: TagInputOption) => void
  /** Current input value (for custom filtering) */
  inputValue: string
  /** HTML id for the combobox (for aria) */
  id: string
  /** ID for the listbox element */
  listboxId: string
  /** Helper to get option id for aria-activedescendant. Use: id={getOptionId(i)} */
  getOptionId: (index: number) => string
  /** Helper to get option value from TagInputOption */
  getOptionValue: (opt: TagInputOption) => string
  /** Helper to get option label from TagInputOption */
  getOptionLabel: (opt: TagInputOption) => string
  /** Helper to check if option is disabled */
  isOptionDisabled: (opt: TagInputOption) => boolean
}

export type TagInputProps = {
  /**
   * Controlled tags (array of tag values)
   */
  value?: string[]
  /**
   * Callback when tags change (add/remove)
   */
  onTagsChange?: (tags: string[]) => void
  /**
   * Callback when input value changes (typing). Receives current input value. Useful for async option loading or custom filtering.
   */
  onInputChange?: (value: string) => void
  /**
   * Callback when user presses Enter (submit). Receives current tags.
   * Called after adding a tag from selection or typed text, if applicable.
   */
  onSubmit?: (tags: string[]) => void
  /**
   * Options to show in the dropdown when input is focused
   */
  options?: TagInputOption[]
  /**
   * Placeholder when input is empty
   */
  placeholder?: string
  /**
   * Disabled state
   */
  disabled?: boolean
  /**
   * Whether to allow adding custom tags by typing and pressing Enter
   * @default true
   */
  allowCustomTags?: boolean
  /**
   * Filter options by input value. Receives options and query, returns filtered options.
   * When undefined, filters by case-insensitive includes.
   */
  filterOptions?: (options: TagInputOption[], query: string) => TagInputOption[]
  /**
   * Input variant - 'search' shows magnifying glass icon
   * @default 'search'
   */
  variant?: 'default' | 'search'
  /**
   * Label for the input
   */
  label?: string
  /**
   * HTML id for the input
   */
  id?: string
  /**
   * Custom className for the root
   */
  className?: string
  /**
   * Custom className for the wrapper
   */
  wrapperClassName?: string
  /**
   * Minimum height of the dropdown (CSS value, e.g. '100px', '6rem')
   */
  dropdownMinHeight?: string
  /**
   * Maximum height of the dropdown (CSS value, e.g. '300px', '20rem')
   * @default '12rem'
   */
  dropdownMaxHeight?: string
  // ... existing props
  /**
   * Size of the tag input — matches Select sizes
   * - `sm`: 24px height
   * - `md`: 32px height
   * - `lg`: 40px height
   * @default 'lg'
   */
  size?: ComponentSize
  /**
   * Render custom dropdown content. When provided, replaces the default dropdown.
   * Use this to apply your own styling or structure.
   */
  renderDropdown?: (props: TagInputDropdownProps) => React.ReactNode
}

const getOptionValue = (opt: TagInputOption): string => (typeof opt === 'string' ? opt : opt.value)

const getOptionLabel = (opt: TagInputOption): string => (typeof opt === 'string' ? opt : opt.label)

const isOptionDisabled = (opt: TagInputOption): boolean =>
  typeof opt === 'object' && opt.disabled === true

const defaultFilter = (options: TagInputOption[], query: string): TagInputOption[] => {
  if (!query.trim()) return options
  const q = query.toLowerCase()
  return options.filter((opt) => getOptionLabel(opt).toLowerCase().includes(q))
}

const getLabelFromTag = (tag: string, options: TagInputOption[]): string => {
  const opt = options.find((o) => getOptionValue(o) === tag)
  return opt ? getOptionLabel(opt) : tag
}

/**
 * TagInput - Input with dropdown options and tag display
 *
 * - Click to show dropdown with options
 * - Select option or type + Enter to add tag
 * - Enter triggers onSubmit
 * - Tags are removable via × button
 *
 * @example
 * ```tsx
 * <TagInput
 *   value={tags}
 *   onTagsChange={setTags}
 *   onSubmit={(tags) => console.log('Search', tags)}
 *   options={['Bitdeer M30', 'Bitdeer A1346']}
 *   placeholder="Search..."
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Custom dropdown with selected state (checkmark + different background)
 * <TagInput
 *   value={tags}
 *   onTagsChange={setTags}
 *   options={options}
 *   renderDropdown={({ filteredOptions, selectedTags, highlightedIndex, setHighlightedIndex, onSelect, listboxId, getOptionId, getOptionValue, getOptionLabel }) => (
 *     <div id={listboxId} role="listbox" className="my-custom-list">
 *       {filteredOptions.map((opt, i) => {
 *         const isSelected = selectedTags.includes(getOptionValue(opt))
 *         return (
 *           <div
 *             key={getOptionValue(opt)}
 *             id={getOptionId(i)}
 *             role="option"
 *             aria-selected={i === highlightedIndex}
 *             onMouseDown={(e) => { e.preventDefault(); onSelect(opt) }}
 *             onMouseEnter={() => setHighlightedIndex(i)}
 *           >
 *             {getOptionLabel(opt)}
 *             {isSelected && <CheckIcon />}
 *           </div>
 *         )
 *       })}
 *     </div>
 *   )}
 * />
 * ```
 */

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none">
    <g clipPath="url(#search-icon-clip)">
      <path
        d="M11.375 5.6875C11.375 6.94258 10.9676 8.10195 10.2812 9.04258L13.743 12.507C14.0848 12.8488 14.0848 13.4039 13.743 13.7457C13.4012 14.0875 12.8461 14.0875 12.5043 13.7457L9.04258 10.2812C8.10195 10.9703 6.94258 11.375 5.6875 11.375C2.5457 11.375 0 8.8293 0 5.6875C0 2.5457 2.5457 0 5.6875 0C8.8293 0 11.375 2.5457 11.375 5.6875ZM5.6875 9.625C6.20458 9.625 6.7166 9.52315 7.19432 9.32528C7.67204 9.1274 8.1061 8.83736 8.47173 8.47173C8.83736 8.1061 9.1274 7.67204 9.32528 7.19432C9.52315 6.7166 9.625 6.20458 9.625 5.6875C9.625 5.17042 9.52315 4.6584 9.32528 4.18068C9.1274 3.70296 8.83736 3.2689 8.47173 2.90327C8.1061 2.53764 7.67204 2.2476 7.19432 2.04972C6.7166 1.85185 6.20458 1.75 5.6875 1.75C5.17042 1.75 4.6584 1.85185 4.18068 2.04972C3.70296 2.2476 3.2689 2.53764 2.90327 2.90327C2.53764 3.2689 2.2476 3.70296 2.04972 4.18068C1.85185 4.6584 1.75 5.17042 1.75 5.6875C1.75 6.20458 1.85185 6.7166 2.04972 7.19432C2.2476 7.67204 2.53764 8.1061 2.90327 8.47173C3.2689 8.83736 3.70296 9.1274 4.18068 9.32528C4.6584 9.52315 5.17042 9.625 5.6875 9.625Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="search-icon-clip">
        <path d="M0 0H14V14H0V0Z" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const TagInput = React.forwardRef<TagInputRef | HTMLInputElement, TagInputProps>(
  (
    {
      value = [],
      onTagsChange,
      onSubmit,
      onInputChange,
      options = [],
      placeholder = 'Search...',
      size = 'lg',
      disabled = false,
      allowCustomTags = true,
      filterOptions = defaultFilter,
      variant = 'search',
      label,
      id: idProp,
      className,
      wrapperClassName,
      dropdownMinHeight,
      dropdownMaxHeight,
      renderDropdown,
    },
    ref,
  ) => {
    const id = idProp ?? React.useId()
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState('')
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const listRef = React.useRef<HTMLDivElement>(null)
    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    const openChangeTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>()

    const [dropdownWidth, setDropdownWidth] = React.useState<number | undefined>(undefined)

    React.useEffect(() => {
      const el = wrapperRef.current
      if (!el) return
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        setDropdownWidth(entry.borderBoxSize[0]?.inlineSize ?? entry.contentRect.width)
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [])

    const tags = value
    const setTags = onTagsChange ?? (() => {})

    const filteredOptions = React.useMemo(
      () => filterOptions(options, inputValue),
      [options, inputValue, filterOptions],
    )

    const addTag = React.useCallback(
      (tagValue: string) => {
        const trimmed = tagValue.trim()
        if (!trimmed || tags.includes(trimmed)) return false
        setTags([...tags, trimmed])
        setInputValue('')
        return true
      },
      [tags, setTags],
    )

    const removeTag = React.useCallback(
      (index: number) => {
        const next = tags.filter((_, i) => i !== index)
        setTags(next)
      },
      [tags, setTags],
    )

    const clearInputValue = React.useCallback(() => {
      setInputValue('')
    }, [])

    React.useImperativeHandle(
      ref,
      () => ({
        clearInputValue,
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        getInputValue: () => inputValue,
      }),
      [clearInputValue, inputValue],
    )

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          let nextTags = tags
          const opt = filteredOptions[highlightedIndex]
          if (opt !== undefined) {
            const v = getOptionValue(opt)
            const idx = tags.indexOf(v)
            if (idx >= 0) {
              nextTags = tags.filter((_, i) => i !== idx)
              removeTag(idx)
            } else if (addTag(v)) {
              nextTags = [...tags, v]
            }
          } else if (allowCustomTags && inputValue.trim()) {
            const v = inputValue.trim()
            if (addTag(v)) nextTags = [...tags, v]
          }
          onSubmit?.(nextTags)
          return
        }
        if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
          e.preventDefault()
          removeTag(tags.length - 1)
          return
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setHighlightedIndex((i) => Math.max(i - 1, 0))
        }

        setOpen(true)
      },
      [
        inputValue,
        tags,
        filteredOptions,
        highlightedIndex,
        addTag,
        removeTag,
        allowCustomTags,
        onSubmit,
      ],
    )

    const handleOptionSelect = (opt: TagInputOption): void => {
      const v = getOptionValue(opt)
      const index = tags.indexOf(v)
      if (index >= 0) {
        removeTag(index)
      } else {
        addTag(v)
      }
      inputRef.current?.focus()
    }

    const showSearchIcon = variant === 'search'

    const handleOpenChange = (next: boolean): void => {
      if (openChangeTimeoutRef.current) {
        clearTimeout(openChangeTimeoutRef.current)
      }

      // Debounce to avoid race conditions between manual toggle and Radix's interact outside
      openChangeTimeoutRef.current = setTimeout(() => {
        // Keep open when input is focused (user is typing) - Radix may try to close on "interact outside"
        if (!next && inputRef.current === document.activeElement) {
          return
        }

        setOpen(next)
      }, 150)
    }

    const handleWrapperClick = (e: React.MouseEvent): void => {
      // Don't toggle dropdown when disabled
      if (disabled) return

      // Check if click is on the remove tag button or icon
      const target = e.target as HTMLElement
      if (target.closest('.mdk-tag-input__tag-remove') || target.closest('.mdk-tag-input__icon')) {
        return
      }

      // Toggle dropdown if input is already focused
      if (document.activeElement === inputRef.current) {
        setOpen((prev) => !prev)
      } else {
        inputRef.current?.focus()
        setOpen((prev) => {
          if (prev) {
            inputRef.current?.blur()
          }
          return !prev
        })
      }
    }

    const removeAllTags = React.useCallback(() => {
      setTags([])
      inputRef.current?.focus()
    }, [setTags])

    React.useEffect(() => {
      return () => {
        if (openChangeTimeoutRef.current) {
          clearTimeout(openChangeTimeoutRef.current)
        }
      }
    }, [])

    const content = (
      <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
        <PopoverAnchor asChild>
          <div className="mdk-tag-input__container">
            <div
              ref={wrapperRef}
              className={cn(
                'mdk-tag-input__wrapper',
                `mdk-tag-input__wrapper--${size}`,
                showSearchIcon && 'mdk-tag-input__wrapper--search',
                disabled && 'mdk-tag-input__wrapper--disabled',
                wrapperClassName,
              )}
              data-has-tags={tags.length > 0}
              onClick={handleWrapperClick}
            >
              <div className="mdk-tag-input__inner">
                {tags.map((tag, i) => (
                  <span key={`${tag}-${i}`} className="mdk-tag-input__tag">
                    <span className="mdk-tag-input__tag-chip">
                      {getLabelFromTag(tag, options)}
                      <button
                        type="button"
                        className="mdk-tag-input__tag-remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeTag(i)
                        }}
                        onMouseDown={(e) => {
                          // Prevent input blur which would close the dropdown
                          e.preventDefault()
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation()
                        }}
                        aria-label={`Remove ${tag}`}
                        tabIndex={-1}
                      >
                        <CloseIcon />
                      </button>
                    </span>
                  </span>
                ))}
                <input
                  ref={(node) => {
                    ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
                    if (typeof ref === 'function') ref(node)
                    else if (ref)
                      (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
                  }}
                  id={id}
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    onInputChange?.(e.target.value)
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  placeholder={tags.length === 0 ? placeholder : ''}
                  className={cn('mdk-tag-input__input', className)}
                  autoComplete="off"
                  aria-autocomplete="list"
                  data-open={open}
                  aria-expanded={open}
                  aria-controls={open ? `${id}-listbox` : undefined}
                  aria-activedescendant={
                    open && filteredOptions.length > 0
                      ? `${id}-option-${highlightedIndex}`
                      : undefined
                  }
                  role="combobox"
                  aria-haspopup="listbox"
                />
              </div>
            </div>
            {showSearchIcon ? (
              <span
                className="mdk-tag-input__icon"
                aria-hidden
                data-has-tags={tags.length > 0}
                onClick={removeAllTags}
              >
                <SearchIcon className="mdk-tag-input__icon--glass" />
                <Cross1Icon className="mdk-tag-input__icon--cross" />
              </span>
            ) : (
              <span className="mdk-tag-input__arrow" aria-hidden>
                <ChevronDownIcon />
              </span>
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          ref={dropdownRef}
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="mdk-tag-input__dropdown"
          style={
            {
              ...(dropdownWidth !== undefined ? { width: `${dropdownWidth}px` } : {}),
              ...(dropdownMinHeight
                ? { '--mdk-tag-input-dropdown-min-height': dropdownMinHeight }
                : {}),
              ...(dropdownMaxHeight
                ? { '--mdk-tag-input-dropdown-max-height': dropdownMaxHeight }
                : {}),
            } as React.CSSProperties
          }
        >
          {renderDropdown ? (
            renderDropdown({
              filteredOptions,
              selectedTags: tags,
              highlightedIndex,
              setHighlightedIndex,
              onSelect: handleOptionSelect,
              inputValue,
              id,
              listboxId: `${id}-listbox`,
              getOptionId: (i) => `${id}-option-${i}`,
              getOptionValue,
              getOptionLabel,
              isOptionDisabled,
            })
          ) : (
            <div ref={listRef} id={`${id}-listbox`} role="listbox" className="mdk-tag-input__list">
              {filteredOptions.length === 0 ? (
                <div className="mdk-tag-input__empty">No options</div>
              ) : (
                filteredOptions.map((opt, i) => {
                  const isSelected = tags.includes(getOptionValue(opt))
                  const disabled = isOptionDisabled(opt)
                  return (
                    <div
                      key={getOptionValue(opt)}
                      id={`${id}-option-${i}`}
                      role="option"
                      aria-selected={i === highlightedIndex}
                      aria-disabled={disabled}
                      className={cn(
                        'mdk-tag-input__option',
                        i === highlightedIndex && 'mdk-tag-input__option--highlighted',
                        isSelected && 'mdk-tag-input__option--selected',
                        disabled && 'mdk-tag-input__option--disabled',
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (!disabled) handleOptionSelect(opt)
                      }}
                      onMouseEnter={() => !disabled && setHighlightedIndex(i)}
                    >
                      <span className="mdk-tag-input__option-label">{getOptionLabel(opt)}</span>
                      {isSelected && <CheckIcon className="mdk-tag-input__option-check" />}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    )

    if (label) {
      return (
        <div className={cn('mdk-tag-input-root', wrapperClassName)}>
          <label htmlFor={id} className="mdk-tag-input__label">
            {label}
          </label>
          {content}
        </div>
      )
    }

    return content
  },
)

TagInput.displayName = 'TagInput'

export { TagInput }
