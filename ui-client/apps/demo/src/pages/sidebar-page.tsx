import { useState } from 'react'
import type { SidebarMenuItem } from '@tetherto/core'
import { Button, Sidebar } from '@tetherto/core'
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

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Sidebar</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <section style={{ flex: 1, minWidth: '360px' }}>
          <h3>Inline (desktop)</h3>
          <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '12px' }}>
            Toggle expand/collapse. Hover collapsed groups for flyout.
          </p>
          <div
            style={{
              height: '420px',
              border: '1px solid #ffffff1a',
              display: 'flex',
              overflow: 'hidden',
              borderRadius: '4px',
            }}
          >
            <Sidebar
              items={SIDEBAR_EXAMPLE_ITEMS}
              activeId={sidebarActiveId}
              onItemClick={(item) => setSidebarActiveId(item.id)}
            />
            <div
              style={{
                flex: 1,
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                  Active: <strong style={{ color: '#f7931a' }}>{sidebarActiveId}</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ flex: 1, minWidth: '260px' }}>
          <h3>Overlay (mobile)</h3>
          <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '12px' }}>
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
