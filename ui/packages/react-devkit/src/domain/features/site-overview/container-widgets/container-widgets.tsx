import type { JSX } from "react"

import { cn, EmptyState, Spinner } from "@primitives"

import { ContainerWidgetCard } from "../../../components/container/container-widget-card"
import type { ContainerWidgetCardProps } from "../../../components/container/container-widget-card"

import "./container-widgets.scss"

/** One container's card data plus the stable id used for keys and click routing. */
export type ContainerWidgetItem = ContainerWidgetCardProps & { id: string }

export type ContainerWidgetsProps = {
  /** Card-ready data for every container, shaped by the data hook. */
  containers: ContainerWidgetItem[]
  /** Section heading. */
  title?: string
  /** Shows a spinner while the first load is in flight. */
  isLoading?: boolean
  /** Error message shown in place of the grid. */
  errorMessage?: string
  /** Invoked with the container id when a card is clicked. */
  onContainerClick?: (id: string) => void
  className?: string
}

/**
 * Site Overview → Container Widgets: the read-only grid of per-container
 * summary cards. Purely presentational — the shell page feeds it the shaped
 * `containers` array (from the container-widgets data hook) and handles
 * navigation via `onContainerClick`.
 *
 * @category features
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const ContainerWidgets = ({
  containers,
  title,
  isLoading = false,
  errorMessage,
  onContainerClick,
  className,
}: ContainerWidgetsProps): JSX.Element => {
  return (
    <div className={cn("mdk-container-widgets", className)}>
      {title && <div className="mdk-container-widgets__title">{title}</div>}

      {isLoading && <Spinner type="circle" />}

      {!isLoading && !!errorMessage && <EmptyState description={errorMessage} />}

      {!isLoading && !errorMessage && containers.length === 0 && (
        <EmptyState description="No containers" />
      )}

      {!isLoading && !errorMessage && containers.length > 0 && (
        <div className="mdk-container-widgets__grid">
          {containers.map(({ id, ...cardProps }) => (
            <ContainerWidgetCard
              key={id}
              {...cardProps}
              onClick={onContainerClick ? () => onContainerClick(id) : cardProps.onClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

ContainerWidgets.displayName = "ContainerWidgets"
