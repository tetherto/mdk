import { ArrowLeftIcon } from '@radix-ui/react-icons'
import type { JSX, ReactNode } from 'react'

import { Button, cn, EmptyState, Tabs, TabsList, TabsTrigger } from '@primitives'

import './container-detail.scss'

/** A single tab in the container detail strip. */
export type ContainerDetailTab = {
  /** Route segment / Radix value, e.g. `"home"`, `"pdu"`. */
  key: string
  /** Human label, e.g. `"PDU Layout"`. */
  label: string
}

export type ContainerDetailProps = {
  /**
   * Container display name shown in the header. Optional — omit it when the
   * host already renders the container name as the page title (e.g. the shell's
   * `PageLayout`), so the name is not shown twice.
   */
  name?: ReactNode
  /** Ordered tabs for this container model (already resolved by the page). */
  tabs: ContainerDetailTab[]
  /** Currently active tab key. */
  activeTab: string
  /** Fired with the next tab key when the operator switches tabs. */
  onTabChange: (tab: string) => void
  /** Fired when the back link is clicked (the page decides where to go). */
  onBack: () => void
  /**
   * Back-link label. Defaults to "Explorer".
   * @default "Explorer"
   */
  backLabel?: ReactNode
  /** The active tab's body — supplied by the page (real content or a placeholder). */
  children?: ReactNode
  /** Additional class for the root element */
  className?: string
}

/**
 * Container detail page shell: a back link, the container name, and a per-model
 * tab strip. Purely presentational — the page resolves the tab list (via the
 * foundation tab matrix), owns the active tab / routing, and supplies the tab
 * body as `children`. This is the frame every container detail tab mounts into.
 *
 * @category features
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const ContainerDetail = ({
  name,
  tabs,
  activeTab,
  onTabChange,
  onBack,
  backLabel = 'Explorer',
  children,
  className,
}: ContainerDetailProps): JSX.Element => (
  <div className={cn('mdk-container-detail', className)}>
    <div className="mdk-container-detail__header">
      <Button
        variant="link"
        icon={<ArrowLeftIcon />}
        className="mdk-container-detail__back"
        onClick={onBack}
      >
        {backLabel}
      </Button>
      {name !== undefined && <h2 className="mdk-container-detail__title">{name}</h2>}
    </div>

    {tabs.length > 0 ? (
      <>
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mdk-container-detail__panel">{children}</div>
      </>
    ) : (
      <EmptyState description="This container type has no detail tabs." />
    )}
  </div>
)

ContainerDetail.displayName = 'ContainerDetail'
