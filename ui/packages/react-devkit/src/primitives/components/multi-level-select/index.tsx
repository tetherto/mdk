import { type ReactNode, useState } from 'react'

import { cn } from '../../utils'
import {
  SelectContent as MultiLevelSelectContent,
  SelectItem as MultiLevelSelectItem,
  Select as MultiLevelSelectRoot,
  SelectTrigger as MultiLevelSelectTrigger,
  SelectValue as MultiLevelSelectValue,
} from '../select'

export type {
  SelectProps as MultiLevelSelectRootProps,
  SelectTriggerProps as MultiLevelSelectTriggerProps,
} from '../select'

export type MultiLevelSelectSectionProps = {
  /** Controlled open state */
  open?: boolean
  /** `MultiLevelSelect.Item` elements in the section */
  children?: ReactNode
  /**
   * Initial open state (uncontrolled)
   * @default false
   */
  defaultOpen?: boolean
  /** Title displayed in the section header */
  sectionTitle: ReactNode
  /** Called when the section is expanded or collapsed */
  onToggle?: (open: boolean) => void
}

const MultiLevelSelectSection = ({
  children,
  onToggle,
  sectionTitle,
  open: openProp,
  defaultOpen = false,
}: MultiLevelSelectSectionProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen

  const setOpen = (next: boolean) => {
    onToggle?.(next)

    if (!isControlled) {
      setUncontrolledOpen(next)
    }
  }

  return (
    <div className={cn('mdk-multi-level-select__section')}>
      <div
        className="mdk-multi-level-select__section-header"
        onPointerDown={(e) => e.preventDefault()}
      >
        <span className="mdk-multi-level-select__section-title">{sectionTitle}</span>
        <button
          type="button"
          className="mdk-multi-level-select__section-toggle"
          aria-expanded={open}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={() => setOpen(!open)}
        >
          {open ? '−' : '+'}
        </button>
      </div>
      <div
        className={cn(
          'mdk-multi-level-select__section-body',
          !open && 'mdk-multi-level-select__section-body--collapsed',
        )}
      >
        {children}
      </div>
    </div>
  )
}

MultiLevelSelectSection.displayName = 'MultiLevelSelect.Section'

/**
 * Multi-level select component with collapsible sections.
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
export const MultiLevelSelect = {
  Root: MultiLevelSelectRoot,
  Trigger: MultiLevelSelectTrigger,
  Value: MultiLevelSelectValue,
  Content: MultiLevelSelectContent,
  Item: MultiLevelSelectItem,
  Section: MultiLevelSelectSection,
}
