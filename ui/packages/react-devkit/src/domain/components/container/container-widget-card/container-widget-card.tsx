import type { ReactNode } from "react"

import { cn } from "@primitives"
import type { ErrorWithTimestamp } from "@primitives"

import { MinersActivityChart } from "../../explorer/details-view/miners-activity-chart/miners-activity-chart"
import { WidgetTopRow } from "../../widget-top-row"
import type { WidgetTopRowProps } from "../../widget-top-row"
import { MinersSummaryBox } from "../miners-summary-box"
import type { MinersSummaryParam } from "../miners-summary-box"

import "./container-widget-card.scss"

/** Miner-state counts fed to the embedded activity chart (online / offline / faulted / …). */
export type ContainerActivityData = { total?: number } & Record<string, number | undefined>

/** Error envelope surfaced by the activity chart when its data fails to load. */
export type ContainerActivityError = { data?: { message?: string }; [key: string]: unknown } | null

export type ContainerWidgetCardProps = {
  /** Container display name shown in the header row. */
  title: string
  /** Latest container power draw in watts (rendered in kW by the top row). */
  power?: number
  /** Power unit label shown next to the reading. */
  powerUnit?: string
  /** Per-category alarm badges for the header row. */
  alarms?: WidgetTopRowProps["alarms"]
  /** Raw stats error surfaced as a tooltip in place of the power reading. */
  statsErrorMessage?: string | ErrorWithTimestamp[] | null
  /** Pre-formatted miners-summary rows (label + display value incl. units). */
  summary: MinersSummaryParam[]
  /** Miner-state activity counts for the embedded chart. */
  activity?: ContainerActivityData
  /** Activity chart loading state. */
  isActivityLoading?: boolean
  /** Activity chart error state. */
  isActivityError?: boolean
  /** Activity chart error payload. */
  activityError?: ContainerActivityError
  /** Render the offline banner instead of the body. */
  isOffline?: boolean
  /** Container-level error message; renders an error banner instead of the body. */
  errorMessage?: string
  /**
   * Critical-high alarm flash. Computed upstream (by the data hook) so the card
   * stays presentational — never derive alarm state inside this component.
   */
  flash?: boolean
  /**
   * Optional vendor-specific content (supply-liquid / tanks / immersion /
   * MicroBT boxes) rendered above the miners summary. Kept as a slot so the
   * generic card carries no per-model branching.
   */
  vendorContent?: ReactNode
  /** Invoked when the card is clicked (navigation is the caller's concern). */
  onClick?: () => void
  className?: string
}

/**
 * Presentational summary card for a single container in the Site Overview
 * widgets grid: a header row (title / alarms / power), then either an
 * offline / error banner or the body (optional vendor content, a miners
 * summary, and a miner-activity chart).
 *
 * Fully props-driven — no data fetching, formatting, or alarm math. The owning
 * feature/hook shapes every value (including `flash` and `summary`).
 *
 * @example
 * ```tsx
 * <ContainerWidgetCard
 *   title="Container A"
 *   power={412_000}
 *   powerUnit="kW"
 *   summary={[
 *     { label: "Hash Rate", value: "1.24 PH/s" },
 *     { label: "Max Temp", value: "72 °C" },
 *     { label: "Avg Temp", value: "65 °C" },
 *   ]}
 *   activity={{ total: 210, online: 200, offline: 10 }}
 * />
 * ```
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const ContainerWidgetCard = ({
  title,
  power,
  powerUnit,
  alarms,
  statsErrorMessage,
  summary,
  activity = {},
  isActivityLoading = false,
  isActivityError = false,
  activityError = null,
  isOffline = false,
  errorMessage,
  flash = false,
  vendorContent,
  onClick,
  className,
}: ContainerWidgetCardProps) => {
  const showBody = !isOffline && !errorMessage

  return (
    <div
      className={cn("mdk-container-widget-card", flash && "mdk-container-widget-card--flash", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <WidgetTopRow
        title={title}
        power={power}
        unit={powerUnit}
        alarms={alarms}
        statsErrorMessage={statsErrorMessage}
      />

      {isOffline && <div className="mdk-container-widget-card__banner">Offline</div>}
      {!!errorMessage && (
        <div className="mdk-container-widget-card__banner mdk-container-widget-card__banner--error">
          {errorMessage}
        </div>
      )}

      {showBody && (
        <div className="mdk-container-widget-card__body">
          {vendorContent}
          <MinersSummaryBox params={summary} />
          <div className="mdk-container-widget-card__activity">
            <MinersActivityChart
              variant="tiles"
              data={activity}
              isLoading={isActivityLoading}
              isError={isActivityError}
              error={activityError}
            />
          </div>
        </div>
      )}
    </div>
  )
}

ContainerWidgetCard.displayName = "ContainerWidgetCard"
