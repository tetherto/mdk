import type { JSX, ReactNode } from "react"

import { cn } from "@primitives"

import "./explorer-layout.scss"

export type ExplorerLayoutProps = {
  /** Page heading. */
  title?: string
  /** Optional header controls (export button, etc.) shown next to the title. */
  headerActions?: ReactNode
  /** The list column — typically a tab switch plus the device/container table. */
  list: ReactNode
  /** The detail column content (shown in the sticky panel when `hasSelection`). */
  detail?: ReactNode
  /**
   * When true the layout splits into list (70%) + a sticky detail column (30%);
   * otherwise the list fills the width. Driven by whether a row is selected.
   */
  hasSelection?: boolean
  className?: string
}

/**
 * Explorer split-view shell: a header, a scrollable list column, and a sticky
 * detail column that appears when a row is selected (stacking on narrow
 * viewports). Purely presentational — the page supplies the list (tabs + table)
 * and the detail panel, and owns selection/routing state.
 *
 * @category features
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const ExplorerLayout = ({
  title,
  headerActions,
  list,
  detail,
  hasSelection = false,
  className,
}: ExplorerLayoutProps): JSX.Element => {
  const showDetail = hasSelection && detail !== undefined

  return (
    <div className={cn("mdk-explorer-layout", className)}>
      {(title || headerActions) && (
        <div className="mdk-explorer-layout__header">
          {title && <h2 className="mdk-explorer-layout__title">{title}</h2>}
          {headerActions && <div className="mdk-explorer-layout__actions">{headerActions}</div>}
        </div>
      )}

      <div
        className={cn(
          "mdk-explorer-layout__row",
          showDetail && "mdk-explorer-layout__row--split",
        )}
      >
        <div className="mdk-explorer-layout__list">{list}</div>
        {showDetail && <aside className="mdk-explorer-layout__detail">{detail}</aside>}
      </div>
    </div>
  )
}

ExplorerLayout.displayName = "ExplorerLayout"
