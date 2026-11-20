import { useState } from 'react'
import type { JSX } from 'react'
import type { SidebarMenuItem } from '@tetherto/mdk-react-devkit/primitives'
import { Button, Sidebar } from '@tetherto/mdk-react-devkit/primitives'
import { BarChartIcon, BellIcon, GearIcon, HomeIcon, PersonIcon } from '@radix-ui/react-icons'

const SIDEBAR_EXAMPLE_ITEMS: SidebarMenuItem[] = [
  { id: 'tab-1', label: 'Tab 1', icon: <HomeIcon /> },
  {
    id: 'tab-2',
    label: 'Tab 2',
    icon: <BarChartIcon />,
    items: [
      { id: 'tab-2-detail-1', label: 'Detail 1' },
      { id: 'tab-2-detail-2', label: 'Detail 2' },
    ],
  },
  {
    id: 'tab-3',
    label: 'Tab 3',
    icon: <PersonIcon />,
    items: [
      {
        id: 'tab-3-detail-1',
        label: 'Detail 1',
        items: [
          { id: 'tab-3-d1-sub-1', label: 'Detail of Detail 1' },
          { id: 'tab-3-d1-sub-2', label: 'Detail of Detail 2' },
        ],
      },
      { id: 'tab-3-detail-2', label: 'Detail 2' },
      { id: 'tab-3-detail-3', label: 'Detail 3' },
    ],
  },
  {
    id: 'tab-4',
    label: 'Tab 4',
    icon: <BellIcon />,
    items: [
      {
        id: 'tab-4-detail-1',
        label: 'Detail 1',
        items: [
          { id: 'tab-4-d1-sub-1', label: 'Detail of Detail 1' },
          { id: 'tab-4-d1-sub-2', label: 'Detail of Detail 2' },
          { id: 'tab-4-d1-sub-3', label: 'Detail of Detail 3' },
        ],
      },
      { id: 'tab-4-detail-2', label: 'Detail 2' },
      { id: 'tab-4-detail-3', label: 'Detail 3' },
      { id: 'tab-4-detail-4', label: 'Detail 4' },
    ],
  },
  {
    id: 'tab-5',
    label: 'Tab 5',
    icon: <GearIcon />,
    disabled: true,
    items: [
      {
        id: 'tab-5-detail-1',
        label: 'Detail 1',
        items: [
          { id: 'tab-5-d1-sub-1', label: 'Detail of Detail 1' },
          { id: 'tab-5-d1-sub-2', label: 'Detail of Detail 2' },
        ],
      },
      {
        id: 'tab-5-detail-2',
        label: 'Detail 2',
        items: [
          { id: 'tab-5-d2-sub-1', label: 'Detail of Detail 1' },
          { id: 'tab-5-d2-sub-2', label: 'Detail of Detail 2' },
          { id: 'tab-5-d2-sub-3', label: 'Detail of Detail 3' },
        ],
      },
      { id: 'tab-5-detail-3', label: 'Detail 3' },
      { id: 'tab-5-detail-4', label: 'Detail 4' },
      { id: 'tab-5-detail-5', label: 'Detail 5' },
    ],
  },
]

export const SidebarPage = (): JSX.Element => {
  const [sidebarActiveId, setSidebarActiveId] = useState('tab-1')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [controlledExpanded, setControlledExpanded] = useState(false)

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Sidebar</h2>
      <div className="demo-section__showcase demo-section__showcase--stretch">
        <section className="sidebar-demo__column">
          <h3>Inline (desktop)</h3>
          <p className="demo-section__label">
            Toggle expand/collapse. Hover collapsed groups for flyout.
          </p>
          <div className="sidebar-demo__frame">
            <Sidebar
              items={SIDEBAR_EXAMPLE_ITEMS}
              activeId={sidebarActiveId}
              onItemClick={(item) => setSidebarActiveId(item.id)}
            />
            <div className="sidebar-demo__content">
              <div className="sidebar-demo__status">
                <p className="sidebar-demo__status-text demo-section__mb-sm">
                  Active: <strong className="demo-section__text-primary">{sidebarActiveId}</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sidebar-demo__column">
          <h3>Controlled collapse</h3>
          <p className="demo-section__label">
            Pass <code>expanded</code> + <code>onExpandedChange</code> to drive the chevron from the
            outside — useful when a top-bar toggle or keyboard shortcut needs to control the
            sidebar.
          </p>
          <Button
            variant="secondary"
            onClick={() => setControlledExpanded((prev) => !prev)}
            className="demo-section__mb-md"
          >
            {controlledExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          </Button>
          <div className="sidebar-demo__frame">
            <Sidebar
              items={SIDEBAR_EXAMPLE_ITEMS}
              activeId={sidebarActiveId}
              expanded={controlledExpanded}
              onExpandedChange={setControlledExpanded}
              onItemClick={(item) => setSidebarActiveId(item.id)}
            />
            <div className="sidebar-demo__content">
              <p className="sidebar-demo__status-text">
                State: <strong>{controlledExpanded ? 'expanded' : 'collapsed'}</strong>
              </p>
            </div>
          </div>
        </section>

        <section className="sidebar-demo__column sidebar-demo__column--narrow">
          <h3>Overlay (mobile)</h3>
          <p className="demo-section__label">
            Fixed overlay with backdrop. Closes on backdrop click or Escape.
          </p>
          <Button variant="secondary" onClick={() => setMobileSidebarOpen(true)}>
            Open Mobile Sidebar
          </Button>
          <Sidebar
            items={SIDEBAR_EXAMPLE_ITEMS}
            activeId={sidebarActiveId}
            onItemClick={(item) => {
              setSidebarActiveId(item.id)
              setMobileSidebarOpen(false)
            }}
            overlay
            visible={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </section>
      </div>
    </section>
  )
}
