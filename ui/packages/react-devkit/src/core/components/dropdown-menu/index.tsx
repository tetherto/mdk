import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

import { cn } from '../../utils'
import { Checkbox } from '../checkbox'
import { Input } from '../input'
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  createContext,
  type FC,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useState,
} from 'react'

// Re-export Radix primitives
const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal

// Types
type DropdownMenuSize = 'sm' | 'md' | 'lg'

type BaseStaticItemProps = {
  disabled?: boolean
  active?: boolean
}

// Context for size propagation
const DropdownMenuSizeContext = createContext<DropdownMenuSize>('md')

// Content
type DropdownMenuContentProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
  alignWidth?: boolean
  /** @default 'md' */
  size?: DropdownMenuSize
}

const DropdownMenuContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, alignWidth = false, size = 'md', ...props }, ref) => (
  <DropdownMenuSizeContext.Provider value={size}>
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'mdk-dropdown-menu__content',
          `mdk-dropdown-menu__content--size-${size}`,
          alignWidth && 'mdk-dropdown-menu__content--align-width',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  </DropdownMenuSizeContext.Provider>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

type DropdownMenuStaticContentProps = HTMLAttributes<HTMLDivElement> & {
  /** @default 'md' */
  size?: DropdownMenuSize
}

const DropdownMenuStaticContent = forwardRef<HTMLDivElement, DropdownMenuStaticContentProps>(
  ({ className, size = 'md', ...props }, ref) => (
    <DropdownMenuSizeContext.Provider value={size}>
      <div
        ref={ref}
        className={cn(
          'mdk-dropdown-menu__content',
          `mdk-dropdown-menu__content--size-${size}`,
          className,
        )}
        {...props}
      />
    </DropdownMenuSizeContext.Provider>
  ),
)
DropdownMenuStaticContent.displayName = 'DropdownMenuStaticContent'

// Item
type DropdownMenuItemProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
  icon?: ReactNode
}

const DropdownMenuItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, icon, children, ...props }, ref) => {
  const size = useContext(DropdownMenuSizeContext)

  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn('mdk-dropdown-menu__item', `mdk-dropdown-menu__item--size-${size}`, className)}
      {...props}
    >
      {icon && <span className="mdk-dropdown-menu__item-icon">{icon}</span>}
      {children}
    </DropdownMenuPrimitive.Item>
  )
})
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

type DropdownMenuStaticItemProps = HTMLAttributes<HTMLDivElement> &
  BaseStaticItemProps & {
    icon?: ReactNode
  }

const DropdownMenuStaticItem = forwardRef<HTMLDivElement, DropdownMenuStaticItemProps>(
  ({ className, icon, disabled, active, children, ...props }, ref) => {
    const size = useContext(DropdownMenuSizeContext)

    return (
      <div
        ref={ref}
        className={cn(
          'mdk-dropdown-menu__item',
          `mdk-dropdown-menu__item--size-${size}`,
          className,
        )}
        data-disabled={disabled || undefined}
        data-active={active || undefined}
        {...props}
      >
        {icon && <span className="mdk-dropdown-menu__item-icon">{icon}</span>}
        {children}
      </div>
    )
  },
)
DropdownMenuStaticItem.displayName = 'DropdownMenuStaticItem'

type DropdownMenuCheckboxItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.CheckboxItem
>

const DropdownMenuCheckboxItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  DropdownMenuCheckboxItemProps
>(({ className, children, checked, ...props }, ref) => {
  const size = useContext(DropdownMenuSizeContext)

  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn('mdk-dropdown-menu__item', `mdk-dropdown-menu__item--size-${size}`, className)}
      checked={checked}
      {...props}
    >
      <Checkbox checked={checked === true} size="xs" />
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
})
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

type DropdownMenuStaticCheckboxItemProps = HTMLAttributes<HTMLDivElement> &
  BaseStaticItemProps & {
    checked?: boolean
  }

const DropdownMenuStaticCheckboxItem = forwardRef<
  HTMLDivElement,
  DropdownMenuStaticCheckboxItemProps
>(({ className, checked, disabled, active, children, ...props }, ref) => {
  const size = useContext(DropdownMenuSizeContext)

  return (
    <div
      ref={ref}
      className={cn('mdk-dropdown-menu__item', `mdk-dropdown-menu__item--size-${size}`, className)}
      data-disabled={disabled || undefined}
      data-active={active || undefined}
      {...props}
    >
      <Checkbox checked={checked} size="xs" />
      {children}
    </div>
  )
})
DropdownMenuStaticCheckboxItem.displayName = 'DropdownMenuStaticCheckboxItem'

const DropdownMenuSeparator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('mdk-dropdown-menu__separator', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuLabel = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => {
  const size = useContext(DropdownMenuSizeContext)

  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn(
        'mdk-dropdown-menu__label',
        `mdk-dropdown-menu__label--size-${size}`,
        className,
      )}
      {...props}
    />
  )
})
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

type DropdownMenuSearchProps = ComponentPropsWithoutRef<typeof Input>

const DropdownMenuSearch = forwardRef<HTMLInputElement, DropdownMenuSearchProps>(
  ({ className, placeholder = 'Search', ...props }, ref) => {
    const size = useContext(DropdownMenuSizeContext)

    return (
      <div className={cn('mdk-dropdown-menu__search', `mdk-dropdown-menu__search--size-${size}`)}>
        <Input
          ref={ref}
          variant="search"
          placeholder={placeholder}
          className={cn('mdk-dropdown-menu__search-input', className)}
          {...props}
        />
      </div>
    )
  },
)
DropdownMenuSearch.displayName = 'DropdownMenuSearch'

type DropdownMenuEmptyProps = HTMLAttributes<HTMLDivElement> & {
  /** @default 'No matching results found' */
  message?: string
}

const DropdownMenuEmpty = forwardRef<HTMLDivElement, DropdownMenuEmptyProps>(
  ({ className, message = 'No matching results found', children, ...props }, ref) => {
    const size = useContext(DropdownMenuSizeContext)

    return (
      <div
        ref={ref}
        className={cn(
          'mdk-dropdown-menu__empty',
          `mdk-dropdown-menu__empty--size-${size}`,
          className,
        )}
        {...props}
      >
        {children || message}
      </div>
    )
  },
)
DropdownMenuEmpty.displayName = 'DropdownMenuEmpty'

type SearchableItem = {
  label: string
  icon?: ReactNode
} & BaseStaticItemProps

type DropdownMenuSearchableProps = {
  items: SearchableItem[]
  /** @default 'Search' */
  placeholder?: string
  /** @default 'No matching results found' */
  emptyMessage?: string
  onItemSelect?: (item: SearchableItem) => void
}

const DropdownMenuSearchable: FC<DropdownMenuSearchableProps> = ({
  items,
  placeholder = 'Search',
  emptyMessage = 'No matching results found',
  onItemSelect,
}) => {
  const [search, setSearch] = useState('')

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <DropdownMenuSearch
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filteredItems.length > 0 ? (
        filteredItems.map((item) => (
          <DropdownMenuStaticItem
            key={item.label}
            disabled={item.disabled}
            active={item.active}
            icon={item.icon}
            onClick={() => onItemSelect?.(item)}
          >
            {item.label}
          </DropdownMenuStaticItem>
        ))
      ) : (
        <DropdownMenuEmpty message={emptyMessage} />
      )}
    </>
  )
}
DropdownMenuSearchable.displayName = 'DropdownMenuSearchable'

/**
 * Dropdown menu component with support for items, checkboxes, search, and labels.
 * @category navigation
 * @domain generic
 * @tier agent-ready
 */
export {
  DropdownMenuCheckboxItem as CheckboxItem,
  DropdownMenuContent as Content,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSearch,
  DropdownMenuSearchable,
  DropdownMenuSeparator,
  DropdownMenuStaticCheckboxItem,
  DropdownMenuStaticContent,
  DropdownMenuStaticItem,
  DropdownMenuTrigger,
  DropdownMenuEmpty as Empty,
  DropdownMenuGroup as Group,
  DropdownMenuItem as Item,
  DropdownMenuLabel as Label,
  DropdownMenuPortal as Portal,
  DropdownMenu as Root,
  DropdownMenuSearch as Search,
  DropdownMenuSearchable as Searchable,
  DropdownMenuSeparator as Separator,
  DropdownMenuStaticCheckboxItem as StaticCheckboxItem,
  DropdownMenuStaticContent as StaticContent,
  DropdownMenuStaticItem as StaticItem,
  DropdownMenuTrigger as Trigger,
}
