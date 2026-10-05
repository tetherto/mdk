import { cn, SkeletonBlock } from '@primitives'
import { useVirtualizer } from '@tanstack/react-virtual'
import { forwardRef, useRef } from 'react'
import { IncidentRow } from './incident-row'
import type { TIncidentRowProps } from './incident-row'

export type ActiveIncidentsCardPartialProps = Partial<{
  /**
   * Header label shown above the list
   * @default "Active Alerts"
   */
  label: string
  /**
   * Show skeleton rows instead of items
   * @default false
   */
  isLoading: boolean
  /** Additional class names appended to the root */
  className: string
  /**
   * Number of skeleton rows shown when `isLoading`
   * @default 4
   */
  skeletonRows: number
  /** Message rendered when no items */
  emptyMessage: string
  /**
   * Incident rows to render
   * @default []
   */
  items: TIncidentRowProps[]
  /** Called with the incident id when a row is clicked */
  onItemClick: (id: string) => void
}>

const ROW_ESTIMATED_PX = 92
const ROW_GAP_PX = 20
const VIRTUAL_OVERSCAN = 6

/**
 * Summary card displaying a list of active incidents/alerts with severity
 * indicators, loading skeleton, and empty state. Rows are virtualized via
 * `@tanstack/react-virtual` so the card stays responsive with thousands of
 * incidents.
 *
 * @category cards
 * @kernelCapability incident-alerts
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <ActiveIncidentsCard
 *   label="Active Alerts"
 *   items={alerts}
 *   onItemClick={(id) => router.push(`/alerts/${id}`)}
 * />
 * ```
 * @tier agent-ready
 */
const ActiveIncidentsCard = forwardRef<HTMLDivElement, ActiveIncidentsCardPartialProps>(
  (
    {
      className,
      items = [],
      onItemClick,
      emptyMessage,
      skeletonRows = 4,
      isLoading = false,
      label = 'Active Alerts',
      ...props
    },
    ref,
  ) => {
    const scrollRef = useRef<HTMLDivElement | null>(null)
    const virtualizer = useVirtualizer({
      count: items.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: () => ROW_ESTIMATED_PX,
      overscan: VIRTUAL_OVERSCAN,
      gap: ROW_GAP_PX,
      getItemKey: (index) => items[index]?.id ?? index,
    })

    return (
      <div ref={ref} className={cn('mdk-active-incidents-card', className)} {...props}>
        {label && (
          <div className="mdk-active-incidents-card__header">
            <span className="mdk-active-incidents-card__label">{label}</span>
          </div>
        )}

        {isLoading ? (
          <div className="mdk-active-incidents-card__skeleton-container">
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <SkeletonBlock key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mdk-active-incidents-card__empty">{emptyMessage}</div>
        ) : (
          <div ref={scrollRef} className="mdk-active-incidents-card__list">
            <div
              className="mdk-active-incidents-card__virtual-spacer"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = items[virtualItem.index]
                if (!item) return null
                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    className="mdk-active-incidents-card__virtual-row"
                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                  >
                    <IncidentRow {...item} onClick={onItemClick} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  },
)

ActiveIncidentsCard.displayName = 'ActiveIncidentsCard'

export { ActiveIncidentsCard }
export type { TIncidentRowProps }
