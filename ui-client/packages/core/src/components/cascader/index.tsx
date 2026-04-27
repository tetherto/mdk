import * as React from 'react'

import { ChevronRightIcon } from '@radix-ui/react-icons'
import { cn } from '../../utils'
import { Checkbox } from '../checkbox'
import { EmptyState } from '../empty-state'
import { Radio, RadioGroup } from '../radio'
import type { TagInputOption, TagInputRef } from '../tag-input'
import { TagInput } from '../tag-input'

/**
 * Cascader option type - represents a hierarchical option with optional children
 */
export type CascaderOption = {
  /** Unique value for the option */
  value: string | number | boolean
  /** Display label for the option */
  label: string
  /** Child options (creates a nested category) */
  children?: CascaderOption[]
  /** Whether the option is disabled */
  disabled?: boolean
}

/**
 * Cascader value type - array representing the path from parent to child
 * Example: ['electronics', 'phones'] means category 'electronics', option 'phones'
 */
export type CascaderValue = (string | number | boolean)[]

/**
 * Cascader component props
 */
export type CascaderProps = {
  /**
   * Hierarchical options to display in the cascader
   * Parent options with children appear in the left panel
   * Child options appear in the right panel when parent is selected
   */
  options: CascaderOption[]

  /**
   * Current selected value(s)
   * - For single select: CascaderValue (e.g., ['category', 'option'])
   * - For multiple select: CascaderValue[] (e.g., [['cat1', 'opt1'], ['cat2', 'opt2']])
   */
  value?: CascaderValue[] | CascaderValue

  /**
   * Callback when selection changes
   * - For single select: receives CascaderValue or null
   * - For multiple select: receives CascaderValue[] or null
   */
  onChange?: (value: CascaderValue[] | CascaderValue | null) => void

  /**
   * Enable multiple selection mode
   * - true: Shows checkboxes, allows multiple selections, displays selected items as tags
   * - false: Shows radio buttons, allows single selection
   * @default false
   */
  multiple?: boolean

  /**
   * Placeholder text shown in the input when no selections are made
   * @default 'Select...'
   */
  placeholder?: string

  /**
   * Disable the entire cascader (input and all options)
   * @default false
   */
  disabled?: boolean

  /**
   * Custom className for the root cascader element
   */
  className?: string

  /**
   * Custom className for the dropdown panels container
   */
  dropdownClassName?: string
}

/**
 * Cascader - A two-panel hierarchical selection component
 *
 * Features:
 * - Two-column layout: categories on left, options on right
 * - Single or multiple selection modes
 * - Search/filter functionality via TagInput
 * - Category-level selection (select/deselect all children)
 * - Indeterminate state for partial selections
 * - Tag display for multiple selections
 * - Keyboard navigation support
 * - Disabled state support
 *
 * @example
 * // Single select mode
 * ```tsx
 * const [value, setValue] = useState<CascaderValue>(['electronics', 'phones'])
 *
 * <Cascader
 *   options={[
 *     {
 *       value: 'electronics',
 *       label: 'Electronics',
 *       children: [
 *         { value: 'phones', label: 'Phones' },
 *         { value: 'laptops', label: 'Laptops' }
 *       ]
 *     }
 *   ]}
 *   value={value}
 *   onChange={(val) => setValue(val as CascaderValue)}
 * />
 * ```
 *
 * @example
 * // Multiple select mode with search
 * ```tsx
 * const [values, setValues] = useState<CascaderValue[]>([
 *   ['electronics', 'phones'],
 *   ['electronics', 'laptops']
 * ])
 *
 * <Cascader
 *   options={[
 *     {
 *       value: 'electronics',
 *       label: 'Electronics',
 *       children: [
 *         { value: 'phones', label: 'Phones' },
 *         { value: 'laptops', label: 'Laptops' },
 *         { value: 'tablets', label: 'Tablets' }
 *       ]
 *     },
 *     {
 *       value: 'clothing',
 *       label: 'Clothing',
 *       children: [
 *         { value: 'mens', label: "Men's" },
 *         { value: 'womens', label: "Women's" }
 *       ]
 *     }
 *   ]}
 *   value={values}
 *   onChange={(val) => setValues(val as CascaderValue[])}
 *   multiple
 *   placeholder="Select categories..."
 * />
 * ```
 *
 * @example
 * // With disabled options
 * ```tsx
 * <Cascader
 *   options={[
 *     {
 *       value: 'status',
 *       label: 'Status',
 *       children: [
 *         { value: 'active', label: 'Active' },
 *         { value: 'maintenance', label: 'Maintenance', disabled: true }
 *       ]
 *     }
 *   ]}
 *   value={value}
 *   onChange={setValue}
 * />
 * ```
 *
 * @example
 * // Filter/Alert use case
 * ```tsx
 * const filterOptions = [
 *   {
 *     value: 'severity',
 *     label: 'Severity',
 *     children: [
 *       { value: 'critical', label: 'Critical' },
 *       { value: 'high', label: 'High' },
 *       { value: 'medium', label: 'Medium' },
 *       { value: 'low', label: 'Low' }
 *     ]
 *   },
 *   {
 *     value: 'status',
 *     label: 'Status',
 *     children: [
 *       { value: 'active', label: 'Active' },
 *       { value: 'resolved', label: 'Resolved' }
 *     ]
 *   }
 * ]
 *
 * const [filters, setFilters] = useState<CascaderValue[]>([
 *   ['severity', 'critical'],
 *   ['status', 'active']
 * ])
 *
 * <Cascader
 *   options={filterOptions}
 *   value={filters}
 *   onChange={setFilters}
 *   multiple
 *   placeholder="Filter alerts..."
 * />
 * ```
 */

// ... (keep all existing types)

const Cascader = React.forwardRef<HTMLDivElement, CascaderProps>(
  (
    {
      options,
      value,
      onChange,
      multiple = false,
      placeholder = 'Select...',
      disabled = false,
      className,
      dropdownClassName,
    },
    ref,
  ) => {
    const tagInputRef = React.useRef<TagInputRef>(null)
    // Track which category is currently active (shown in right panel)
    const [activeCategory, setActiveCategory] = React.useState<string | null>(null)
    const [showLeftPanel, setShowLeftPanel] = React.useState(true)
    const [searchValue, setSearchValue] = React.useState('')
    const [selectedTags, setSelectedTags] = React.useState<{ label: string; id: string }[]>([])

    // Normalize value to array format for consistent internal handling
    const normalizedValue = React.useMemo(() => {
      if (!value) return []
      if (multiple) {
        return value as CascaderValue[]
      }
      return [value as CascaderValue]
    }, [value, multiple])

    // Convert selections to Set for O(1) lookup performance
    const selectedSet = React.useMemo(() => {
      const set = new Set<string>()
      normalizedValue.forEach((selection) => {
        set.add(JSON.stringify(selection))
      })
      return set
    }, [normalizedValue])

    const isSelected = React.useCallback(
      (selection: CascaderValue) => {
        return selectedSet.has(JSON.stringify(selection))
      },
      [selectedSet],
    )

    const isCategorySelected = React.useCallback(
      (categoryValue: string | number | boolean) => {
        const category = options.find(({ value }) => value === categoryValue)
        if (!category?.children) return false

        return category.children
          .filter((child) => !child.disabled)
          .every((child) => isSelected([categoryValue, child.value]))
      },
      [options, isSelected],
    )

    const isCategoryIndeterminate = React.useCallback(
      (categoryValue: string | number | boolean) => {
        const category = options.find(({ value }) => value === categoryValue)
        if (!category?.children) return false

        const selectedChildren = category.children.filter((child) =>
          isSelected([categoryValue, child.value]),
        )

        return selectedChildren.length > 0 && selectedChildren.length < category.children.length
      },
      [options, isSelected],
    )

    const handleSelect = React.useCallback(
      (selection: CascaderValue, checked?: boolean) => {
        if (disabled) return

        let newValue: CascaderValue[] | CascaderValue | null

        if (multiple) {
          if (checked) {
            newValue = [...normalizedValue, selection]
          } else {
            newValue = normalizedValue.filter(
              (s) => JSON.stringify(s) !== JSON.stringify(selection),
            )
          }
        } else {
          newValue = selection
        }

        onChange?.(newValue)
      },
      [disabled, multiple, normalizedValue, onChange],
    )

    const handleRadioChange = React.useCallback(
      (selectionString: string) => {
        if (disabled) return
        const selection = JSON.parse(selectionString) as CascaderValue
        onChange?.(selection)
      },
      [disabled, onChange],
    )

    const handleCategoryToggle = React.useCallback(
      (categoryValue: string | number | boolean, checked: boolean) => {
        const category = options.find(({ value }) => value === categoryValue)
        if (!category?.children) return

        let newValue: CascaderValue[]

        if (checked) {
          const childSelections = category.children
            .filter((child) => !child.disabled)
            .map((child) => [categoryValue, child.value] as CascaderValue)
            .filter((sel) => !isSelected(sel))
          newValue = [...normalizedValue, ...childSelections]
        } else {
          newValue = normalizedValue.filter((sel) => sel[0] !== categoryValue)
        }
        onChange?.(newValue)
      },
      [options, normalizedValue, onChange, isSelected],
    )

    const activeOptions = React.useMemo(() => {
      if (!activeCategory) return []
      const category = options.find(({ value }) => String(value) === activeCategory)
      return category?.children || []
    }, [activeCategory, options])

    /**
     * Flatten all options with their parent labels for search
     * Format: "Category / Option"
     */
    const flattenedOptions = React.useMemo(() => {
      const flattened: Array<{
        selection: CascaderValue
        label: string
        categoryLabel: string
        optionLabel: string
        disabled?: boolean
      }> = []

      options.forEach((parent) => {
        if (parent.children) {
          parent.children.forEach((child) => {
            flattened.push({
              selection: [parent.value, child.value],
              label: `${parent.label} / ${child.label}`,
              categoryLabel: parent.label,
              optionLabel: child.label,
              disabled: parent.disabled || child.disabled,
            })
          })
        }
      })

      return flattened
    }, [options])

    const highlightText = React.useCallback((text: string, search: string): React.ReactNode => {
      if (!search.trim()) return text

      const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      const parts = text.split(regex)

      return (
        <>
          {parts.map((part, index) =>
            regex.test(part) ? (
              <span key={index} className="mdk-cascader__highlight">
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </>
      )
    }, [])
    /**
     * Filter options based on search input
     * Searches in both category and option labels
     */
    const filteredOptions = React.useMemo(() => {
      if (!searchValue.trim()) return flattenedOptions

      const search = searchValue.toLowerCase()
      return flattenedOptions.filter(
        ({ categoryLabel, optionLabel, label }) =>
          categoryLabel.toLowerCase().includes(search) ||
          optionLabel.toLowerCase().includes(search) ||
          label.toLowerCase().includes(search),
      )
    }, [flattenedOptions, searchValue])

    React.useEffect(() => {
      if (!multiple) {
        setSelectedTags([])
        return
      }

      const tags = normalizedValue.map((sel) => {
        const lastValue = sel[sel.length - 1]
        for (const parent of options) {
          if (parent.children) {
            const child = parent.children.find((c) => c.value === lastValue)
            if (child) {
              return {
                label: child.label,
                id: `${parent.value}__${child.value}`,
              }
            }
          }
        }
        return {
          label: String(lastValue),
          id: String(lastValue),
        }
      })
      setSelectedTags(tags)
    }, [normalizedValue, multiple, options])

    const tagInputOptions = React.useMemo(() => {
      const allOptions: TagInputOption[] = []
      options.forEach((parent) => {
        if (parent.children) {
          parent.children.forEach((child) => {
            allOptions.push({
              value: String(child.value),
              label: child.label,
            })
          })
        }
      })
      return allOptions
    }, [options])

    const handleTagRemove = React.useCallback(
      (tags: string[]) => {
        if (!multiple) return

        // Map tags to their corresponding CascaderValue by matching label and id
        const newTags = tags.map((tagLabel) => {
          const foundTag = selectedTags.find((t) => t.label === tagLabel)
          return foundTag || { label: tagLabel, id: tagLabel }
        })

        // Convert tags to CascaderValue using id (format: parent-child)
        const newValue = newTags.map((tag) => {
          const [parentValue, childValue] = tag.id.split('__')

          if (childValue) {
            return [parentValue, childValue] as CascaderValue
          }
          return [parentValue, tag.label.toLowerCase()] as CascaderValue
        })

        setSelectedTags(newTags)
        onChange?.(newValue)
      },
      [multiple, selectedTags, onChange],
    )

    const currentRadioValue = React.useMemo(() => {
      if (multiple || normalizedValue.length === 0) return undefined
      return JSON.stringify(normalizedValue[0])
    }, [multiple, normalizedValue])

    // Determine if we should show search results (flat list) or category panels
    const showSearchResults = searchValue.trim().length > 0

    return (
      <div ref={ref} className={cn('mdk-cascader', className)}>
        <TagInput
          ref={tagInputRef}
          value={selectedTags.map((tag) => tag.label)}
          onTagsChange={handleTagRemove}
          options={tagInputOptions}
          placeholder={placeholder}
          disabled={disabled}
          variant="search"
          onInputChange={(value) => {
            setSearchValue(value)
            // When searching, show search results instead of panels
            if (value.trim()) {
              setShowLeftPanel(true)
              setActiveCategory(null)
            }
          }}
          allowCustomTags={false}
          className={className}
          renderDropdown={({ inputValue }) => (
            <div className={cn('mdk-cascader__panels', dropdownClassName)}>
              {/* Search Results View - Flat list */}
              {showSearchResults ? (
                <div
                  className={cn(
                    'mdk-cascader__panel mdk-cascader__panel--search',
                    !filteredOptions.length && 'mdk-cascader__panel--empty',
                  )}
                >
                  <div className="mdk-cascader__options-list">
                    {multiple ? (
                      // Multiple select mode with checkboxes
                      <>
                        {filteredOptions.map((option) => {
                          const selected = isSelected(option.selection)

                          return (
                            <label
                              key={JSON.stringify(option.selection)}
                              className={cn(
                                'mdk-cascader__option',
                                'mdk-cascader__option--search',
                                option.disabled && 'mdk-cascader__option--disabled',
                              )}
                            >
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => {
                                  tagInputRef.current?.clearInputValue()
                                  setSearchValue('')
                                  handleSelect(option.selection, checked as boolean)
                                }}
                                className="mdk-cascader__category-checkbox"
                                disabled={option.disabled}
                                size="sm"
                                color="primary"
                              />
                              <span className="mdk-cascader__option-label">
                                <span className="mdk-cascader__option-category">
                                  {highlightText(option.categoryLabel, searchValue)}
                                </span>
                                <span className="mdk-cascader__option-separator"> / </span>
                                <span className="mdk-cascader__option-name">
                                  {highlightText(option.optionLabel, searchValue)}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                      </>
                    ) : (
                      // Single select mode with radio buttons
                      <RadioGroup
                        value={currentRadioValue}
                        onValueChange={handleRadioChange}
                        className="mdk-cascader__radio-group"
                      >
                        {filteredOptions.map((option) => {
                          const selectionString = JSON.stringify(option.selection)

                          return (
                            <label
                              key={selectionString}
                              className={cn(
                                'mdk-cascader__option',
                                'mdk-cascader__option--search',
                                option.disabled && 'mdk-cascader__option--disabled',
                              )}
                            >
                              <Radio
                                value={selectionString}
                                disabled={option.disabled}
                                size="sm"
                                color="primary"
                              />
                              <span className="mdk-cascader__option-label">
                                <span className="mdk-cascader__option-category">
                                  {option.categoryLabel}
                                </span>
                                <span className="mdk-cascader__option-separator"> / </span>
                                <span className="mdk-cascader__option-name">
                                  {option.optionLabel}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                      </RadioGroup>
                    )}

                    {/* Empty state for search */}
                    {filteredOptions.length === 0 && <EmptyState description="No data" size="sm" />}
                  </div>
                </div>
              ) : (
                // Category Panels View - Two columns
                <>
                  {/* Left Panel - Categories */}
                  {showLeftPanel && (
                    <div className="mdk-cascader__panel mdk-cascader__panel--categories">
                      {options.map(({ value, label, disabled }) => {
                        const isActive = String(value) === activeCategory
                        const categorySelected = isCategorySelected(value)
                        const categoryIndeterminate = isCategoryIndeterminate(value)

                        return (
                          <div
                            key={String(value)}
                            className={cn(
                              'mdk-cascader__category',
                              isActive && 'mdk-cascader__category--active',
                              disabled && 'mdk-cascader__category--disabled',
                            )}
                          >
                            {multiple && (
                              <Checkbox
                                checked={
                                  categorySelected
                                    ? true
                                    : categoryIndeterminate
                                      ? 'indeterminate'
                                      : false
                                }
                                onCheckedChange={(checked) =>
                                  handleCategoryToggle(value, checked as boolean)
                                }
                                disabled={disabled}
                                size="sm"
                                color="primary"
                                className="mdk-cascader__category-checkbox"
                              />
                            )}
                            <button
                              type="button"
                              className="mdk-cascader__category-button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                if (!disabled) setActiveCategory(String(value))
                              }}
                              disabled={disabled}
                            >
                              <span className="mdk-cascader__category-label">{label}</span>
                              <ChevronRightIcon className="mdk-cascader__category-arrow" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Right Panel - Options for active category */}
                  {activeCategory && (
                    <div className="mdk-cascader__panel mdk-cascader__panel--options">
                      <div className="mdk-cascader__options-list">
                        {multiple ? (
                          <>
                            {activeOptions
                              .filter(({ label }) => {
                                if (!inputValue.trim()) return true
                                return label.toLowerCase().includes(inputValue.toLowerCase())
                              })
                              .map((option) => {
                                const selection = [
                                  options.find((o) => String(o.value) === activeCategory)?.value,
                                  option.value,
                                ].filter(Boolean) as CascaderValue
                                const selected = isSelected(selection)

                                return (
                                  <label
                                    key={String(option.value)}
                                    className={cn(
                                      'mdk-cascader__option',
                                      option.disabled && 'mdk-cascader__option--disabled',
                                    )}
                                  >
                                    <Checkbox
                                      checked={selected}
                                      onCheckedChange={(checked) =>
                                        handleSelect(selection, checked as boolean)
                                      }
                                      className="mdk-cascader__category-checkbox"
                                      disabled={option.disabled}
                                      size="sm"
                                      color="primary"
                                    />
                                    <span
                                      className="mdk-cascader__option-label"
                                      title={option.label}
                                    >
                                      {option.label}
                                    </span>
                                  </label>
                                )
                              })}
                          </>
                        ) : (
                          <RadioGroup
                            value={currentRadioValue}
                            onValueChange={handleRadioChange}
                            className="mdk-cascader__radio-group"
                          >
                            {activeOptions
                              .filter(({ label }) => {
                                if (!inputValue.trim()) return true
                                return label.toLowerCase().includes(inputValue.toLowerCase())
                              })
                              .map((option) => {
                                const selection = [
                                  options.find((o) => String(o.value) === activeCategory)?.value,
                                  option.value,
                                ].filter(Boolean) as CascaderValue
                                const selectionString = JSON.stringify(selection)

                                return (
                                  <label
                                    key={String(option.value)}
                                    className={cn(
                                      'mdk-cascader__option',
                                      option.disabled && 'mdk-cascader__option--disabled',
                                    )}
                                  >
                                    <Radio
                                      value={selectionString}
                                      disabled={option.disabled}
                                      size="sm"
                                      color="primary"
                                    />
                                    <span className="mdk-cascader__option-label">
                                      {option.label}
                                    </span>
                                  </label>
                                )
                              })}
                          </RadioGroup>
                        )}

                        {activeOptions.filter(({ label }) => {
                          if (!inputValue.trim()) return true
                          return label.toLowerCase().includes(inputValue.toLowerCase())
                        }).length === 0 && (
                          <EmptyState description={inputValue ? 'No data' : 'No options'} />
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        />
      </div>
    )
  },
)

Cascader.displayName = 'Cascader'

export { Cascader }
